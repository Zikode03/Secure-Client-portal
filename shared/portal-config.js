(function () {
  const DEFAULT_API_BASE_URL = "http://localhost:4000/api";

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // no-op
    }
  }

  function normalizeApiBaseUrl(value) {
    const source = String(value || "").trim();
    if (!source) return DEFAULT_API_BASE_URL;
    return source.replace(/\/$/, "");
  }

  function resolveApiBaseUrl() {
    const fromGlobal = typeof window.PORTAL_API_BASE_URL === "string" ? window.PORTAL_API_BASE_URL : "";
    const fromStorage = safeGet("portalApiBaseUrl") || safeGet("apiBaseUrl");
    return normalizeApiBaseUrl(fromGlobal || fromStorage || DEFAULT_API_BASE_URL);
  }

  async function checkApiOnline(timeoutMs = 4000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${PortalConfig.API_BASE_URL.replace(/\/api$/, "")}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      return response.ok;
    } catch (_error) {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const PortalConfig = {
    API_BASE_URL: resolveApiBaseUrl(),
    setApiBaseUrl(nextUrl) {
      const normalized = normalizeApiBaseUrl(nextUrl);
      safeSet("portalApiBaseUrl", normalized);
      this.API_BASE_URL = normalized;
      return normalized;
    },
    checkApiOnline,
  };

  window.PortalConfig = PortalConfig;
})();