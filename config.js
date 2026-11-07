/**
 * Central API configuration for Spieltag.
 *
 * saisonmanager.de no longer allows direct browser requests from other
 * origins (CORS) and now requires an API key or an anonymous public session.
 * A static GitHub Pages site therefore needs a small proxy.
 *
 * Deploy worker/ (see worker/README.md) and put the resulting URL here:
 */
(function () {
    var DEFAULT_API_BASE = "https://spieltag-api.sm-spieltag.workers.dev";

    // Optional overrides for testing:
    //   index.html?api=https://my-worker.workers.dev
    //   localStorage.setItem('spieltagApiBase', 'https://my-worker.workers.dev')
    var params = new URLSearchParams(window.location.search);
    var stored = null;
    try {
        stored = localStorage.getItem("spieltagApiBase");
    } catch (e) {
        /* localStorage may be unavailable */
    }

    var base = (params.get("api") || stored || DEFAULT_API_BASE).replace(/\/+$/, "");

    window.SPIELTAG_API_BASE = base;
    window.SPIELTAG_API_READY = !/your-subdomain/i.test(base);

    window.spieltagApiUrl = function (path) {
        return base + (path.charAt(0) === "/" ? path : "/" + path);
    };

    /**
     * fetch() replacement for saisonmanager API calls.
     * Gives a readable error while the proxy URL is still the placeholder.
     */
    window.spieltagFetch = function (path, init) {
        if (!window.SPIELTAG_API_READY) {
            return Promise.reject(
                new Error(
                    "API-Proxy nicht konfiguriert. Bitte worker/ deployen und die URL in config.js eintragen."
                )
            );
        }
        return fetch(window.spieltagApiUrl(path), init);
    };
})();
