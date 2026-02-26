(function () {
  function getApiBaseUrl() {
    if (window.PortalConfig && window.PortalConfig.API_BASE_URL) {
      return window.PortalConfig.API_BASE_URL;
    }
    return "http://127.0.0.1:4010/api";
  }

  function loginPathForCurrentPage() {
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.includes("/client/")) return "../Clientlogins/login.html";
    if (path.includes("/accountant/")) return "../accountant logins/login.html";
    return "/Client/Clientlogins/login.html";
  }

  function clearSessionAndRedirect() {
    if (window.PortalAuth && typeof window.PortalAuth.clearSession === "function") {
      window.PortalAuth.clearSession();
    }
    window.location.href = loginPathForCurrentPage();
  }

  async function request(path, options) {
    const apiBase = getApiBaseUrl();
    const requestOptions = options || {};
    const finalUrl = path.startsWith("http") ? path : `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

    const token = window.PortalAuth && window.PortalAuth.getSession ? window.PortalAuth.getSession().token : "";
    const defaultHeaders = {};
    if (requestOptions.auth !== false && token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }
    if (requestOptions.body && !requestOptions.rawBody) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(finalUrl, {
      method: requestOptions.method || "GET",
      headers: { ...defaultHeaders, ...(requestOptions.headers || {}) },
      body: requestOptions.body
        ? requestOptions.rawBody
          ? requestOptions.body
          : JSON.stringify(requestOptions.body)
        : undefined,
      cache: requestOptions.cache || "no-store",
      signal: requestOptions.signal,
    });

    if (response.status === 401 && requestOptions.handle401 !== false) {
      clearSessionAndRedirect();
      throw new Error("Session expired");
    }

    return response;
  }

  async function requestJson(path, options) {
    const response = await request(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  window.PortalApi = {
    request,
    requestJson,
    clearSessionAndRedirect,
  };
})();
