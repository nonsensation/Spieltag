# Spieltag API proxy

A tiny [Cloudflare Worker](https://workers.cloudflare.com/) that makes the
`saisonmanager.de` API usable from a static site such as GitHub Pages.

## Why is this needed?

`saisonmanager.de` does two things that break direct browser requests from
`*.github.io`:

1. **CORS** – `Access-Control-Allow-Origin` is only sent for
   `https://saisonmanager.de`. A browser at `https://nonsensation.github.io`
   cannot read the response.
2. **Authentication** – public endpoints now return
   `401 {"code":"public_session_required"}`. Clients must either send an
   `X-Api-Key` header or obtain an anonymous session with
   `POST /api/v2/public_session`.

Both are impossible (or unsafe) in a static page, so this Worker does the
request server-side:

- It calls `POST https://saisonmanager.de/api/v2/public_session` once and
  caches the returned `sm_public_session` cookie for ~24h.
- It forwards `GET /api/v2/...` requests with that cookie.
- It adds CORS headers so the static page can read the JSON.
- It caches responses for 3 seconds at the edge to absorb polling traffic.
- It refreshes the session automatically on `401 public_session_required`.
- It also proxies `GET /api/storage/...` (team logos) with CORS, so the
  Thumbnail Generator can export PNGs with logos via `<canvas>`.

No API key and no secrets are required.

## Deploy (CLI)

Requires Node.js and a free Cloudflare account.

```bash
cd worker
npx wrangler login      # once
npx wrangler deploy
```

Wrangler prints a URL like:

```
https://spieltag-api.<your-subdomain>.workers.dev
```

Put that URL into `DEFAULT_API_BASE` in the repository root `config.js`:

```js
var DEFAULT_API_BASE = "https://spieltag-api.<your-subdomain>.workers.dev";
```

Commit and push. Done.

## Deploy (dashboard, no CLI)

1. Open <https://dash.cloudflare.com/> → **Workers & Pages** → **Create**.
2. Create a **Worker**, give it a name such as `spieltag-api`.
3. Replace the default code with the contents of [`src/index.js`](src/index.js).
4. Click **Deploy**.
5. Copy the `*.workers.dev` URL into `config.js` as described above.

## Test

```bash
curl https://spieltag-api.<your-subdomain>.workers.dev/health
curl https://spieltag-api.<your-subdomain>.workers.dev/api/v2/games/42941.json
```

If you already deployed the Worker before the Thumbnail Generator existed,
redeploy it once (`npx wrangler deploy`) so `/api/storage/*` is proxied too.
Without that, the thumbnail preview still works (logos load directly), but the
PNG export cannot embed the logos.

You can also test the site without redeploying by appending `?api=`:

```
https://nonsensation.github.io/Spieltag/?api=https://spieltag-api.<your-subdomain>.workers.dev
```

The override is read from the URL and also stored in `localStorage`
(`spieltagApiBase`).

## Optional configuration

In `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://nonsensation.github.io,http://localhost:8000"
```

When unset, every origin is allowed (`Access-Control-Allow-Origin: *`). The
proxied data is public, so this is mostly about avoiding unrelated sites
using your Worker quota.

## Limits

The free Cloudflare plan includes 100,000 requests/day. The public session is
rate-limited by saisonmanager to 300 requests/minute per session; the 3-second
edge cache keeps normal scoreboard polling far below that.
