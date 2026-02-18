(function () {
  function getStoredUser() {
    try {
      return JSON.parse(window.localStorage.getItem("authUser") || "null");
    } catch (_error) {
      return null;
    }
  }

  function getSession() {
    const token = window.localStorage.getItem("authToken") || "";
    const user = getStoredUser();
    return { token, user };
  }

  function clearSession() {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("authUser");
  }

  function authHeaders(token) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  }

  function requireRole(role, loginPath) {
    const { token, user } = getSession();
    if (!token || !user || (role && user.role !== role)) {
      clearSession();
      if (loginPath) {
        window.location.href = loginPath;
      }
      return null;
    }
    return { token, user };
  }

  window.PortalAuth = {
    getSession,
    clearSession,
    authHeaders,
    requireRole,
  };
})();