/**
 * Spieltag API proxy (Cloudflare Worker)
 *
 * saisonmanager.de blocks cross-origin requests (CORS only allows
 * saisonmanager.de itself) and now requires either an API key or an
 * anonymous "public session" cookie. A static page on GitHub Pages cannot
 * do either, so this Worker fetches the data server-side and re-serves it
 * with CORS headers.
 *
 * It needs no API key: it uses the official anonymous session:
 *   POST https://saisonmanager.de/api/v2/public_session
 * The returned `sm_public_session` cookie is cached in the Worker and
 * reused until shortly before it expires (24h).
 *
 * Deploy:
 *   cd worker
 *   npx wrangler deploy
 */

const UPSTREAM = "https://saisonmanager.de";
const SESSION_ENDPOINT = `${UPSTREAM}/api/v2/public_session`;
const ALLOWED_PREFIX = "/api/v2/";

// How long (seconds) a JSON response may be served from the edge cache.
// Keeps polling scoreboards from hammering saisonmanager and from burning
// the per-session rate limit (300 requests/minute).
const CACHE_TTL_SECONDS = 3;

// Module-scoped cache; one per Worker isolate.
let session = null;

/** Always answer with CORS headers, whatever the status. */
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", resolveOrigin(request, env));
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  // Session cookies belong to saisonmanager and must not leak to the browser.
  headers.delete("Set-Cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function resolveOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return "*";
  const origin = request.headers.get("Origin");
  return origin && allowed.includes(origin) ? origin : allowed[0];
}

function errorResponse(message, status, request, env) {
  return withCors(
    new Response(JSON.stringify({ success: false, message }), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
    request,
    env,
  );
}

function setCookiesFrom(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  return response.headers.getAll ? response.headers.getAll("set-cookie") : [];
}

async function getSession(force = false) {
  if (!force && session && session.expiresAt - 5 * 60 * 1000 > Date.now()) {
    return session;
  }

  const response = await fetch(SESSION_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`public_session failed with HTTP ${response.status}`);
  }

  const body = await response.json().catch(() => ({}));
  const cookie = setCookiesFrom(response)
    .map((c) => c.split(";")[0])
    .filter((c) => c.startsWith("sm_public_session="))
    .join("; ");

  if (!cookie) throw new Error("public_session returned no session cookie");

  const expiresAt = body.expires_at
    ? Date.parse(body.expires_at)
    : Date.now() + 12 * 60 * 60 * 1000;

  session = { cookie, expiresAt };
  return session;
}

async function fetchUpstream(pathAndQuery, forceNewSession = false) {
  const { cookie } = await getSession(forceNewSession);
  return fetch(`${UPSTREAM}${pathAndQuery}`, {
    headers: {
      Cookie: cookie,
      Accept: "application/json",
      "User-Agent": "Spieltag-API-Proxy (GitHub Pages)",
    },
  });
}

async function proxyApi(pathAndQuery) {
  let upstream = await fetchUpstream(pathAndQuery);

  if (upstream.status === 401) {
    // The public session expired or was revoked -> get a fresh one and retry once.
    const body = await upstream.clone().json().catch(() => null);
    if (body && body.code === "public_session_required") {
      upstream = await fetchUpstream(pathAndQuery, true);
    }
  }

  return upstream;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    if (request.method !== "GET") {
      return errorResponse("Method not allowed", 405, request, env);
    }

    if (url.pathname === "/health") {
      return withCors(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
        request,
        env,
      );
    }

    if (!url.pathname.startsWith(ALLOWED_PREFIX)) {
      return errorResponse("Only /api/v2/* is proxied", 404, request, env);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    let response = await cache.match(cacheKey);

    if (!response) {
      response = await proxyApi(url.pathname + url.search);

      if (response.ok) {
        response = new Response(response.body, response);
        response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL_SECONDS}`);
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
    }

    return withCors(response, request, env);
  },
};
