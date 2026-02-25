(function () {
  const nav = [
    { key: "dashboard", href: "Clientportal.html", icon: "fa-chart-line", label: "Dashboard" },
    { key: "documents", href: "documents.html", icon: "fa-file", label: "Documents" },
    { key: "requests", href: "clientrequest.html", icon: "fa-file-alt", label: "Requests" },
    { key: "messages", href: "messages.html", icon: "fa-message", label: "Messages" },
    { key: "settings", href: "settings.html", icon: "fa-gear", label: "Settings" },
  ];

  function getSession() {
    try {
      return window.PortalAuth && window.PortalAuth.getSession ? window.PortalAuth.getSession() : { user: null };
    } catch (_err) {
      return { user: null };
    }
  }

  function applyUserFields(user) {
    const nameEl = document.getElementById("sidebarName");
    const emailEl = document.getElementById("sidebarEmail");
    if (nameEl) nameEl.textContent = user.fullName || user.name || "Client";
    if (emailEl) emailEl.textContent = user.email || "client@example.com";
  }

  function wireLogout() {
    const logout = document.getElementById("logoutBtn");
    if (!logout) return;
    logout.onclick = () => {
      if (window.PortalAuth && typeof window.PortalAuth.clearSession === "function") {
        window.PortalAuth.clearSession();
      }
      window.location.href = "../Clientlogins/login.html";
    };
  }

  function applyActiveNav(activeKey) {
    document.querySelectorAll(".nav a, .client-shell-nav a").forEach((a) => {
      const key = a.getAttribute("data-nav");
      if (key) a.classList.toggle("active", key === activeKey);
    });
  }

  function renderShellSidebar(host, user, activeKey) {
    host.innerHTML = `
      <div class="client-shell-header">
        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
        <div>
          <h1>Prospera</h1>
          <p>Secure Client Portal</p>
        </div>
      </div>
      <nav class="client-shell-nav" aria-label="Client Navigation">
        ${nav.map((item) => `
          <a href="${item.href}" data-nav="${item.key}" class="${item.key === activeKey ? "active" : ""}">
            <i class="fa ${item.icon}" aria-hidden="true"></i><span>${item.label}</span>
          </a>
        `).join("")}
      </nav>
      <div class="client-shell-footer">
        <div class="client-shell-user">
          <p><strong id="sidebarName">${user.fullName || user.name || "Client"}</strong></p>
          <p id="sidebarEmail">${user.email || "client@example.com"}</p>
          <p class="client-shell-role">Client</p>
        </div>
        <button type="button" class="client-shell-logout" id="logoutBtn">
          <i class="fa fa-sign-out" aria-hidden="true"></i> Logout
        </button>
      </div>
    `;
  }

  function renderHeader() {
    const host = document.getElementById("client-shell-header");
    if (!host) return;
    const title = host.getAttribute("data-title") || "Page";
    const subtitle = host.getAttribute("data-subtitle") || "";
    const actionLabel = host.getAttribute("data-action-label") || "";
    const actionHref = host.getAttribute("data-action-href") || "#";
    const actionIcon = host.getAttribute("data-action-icon") || "fa-plus";
    host.innerHTML = `
      <header class="client-page-head">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        ${actionLabel ? `<a class="btn primary" href="${actionHref}"><i class="fa ${actionIcon}" aria-hidden="true"></i>${actionLabel}</a>` : ""}
      </header>
    `;
  }

  function initResizer() {
    const appLayout = document.querySelector(".app-layout");
    const resizer = document.getElementById("sidebarResizer");
    if (!appLayout || !resizer || !window.PointerEvent) return;
    const min = 86;
    const max = 380;
    const def = 260;
    function set(w) {
      const value = Math.max(min, Math.min(max, w));
      appLayout.style.setProperty("--sidebar-width", `${value}px`);
      localStorage.setItem("clientSidebarWidth", String(value));
    }
    const saved = Number(localStorage.getItem("clientSidebarWidth"));
    set(Number.isFinite(saved) && saved > 0 ? saved : def);
    let active = false;
    resizer.addEventListener("pointerdown", (e) => {
      active = true;
      resizer.setPointerCapture(e.pointerId);
    });
    resizer.addEventListener("pointermove", (e) => {
      if (!active) return;
      set(e.clientX);
    });
    resizer.addEventListener("pointerup", (e) => {
      active = false;
      resizer.releasePointerCapture(e.pointerId);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const activeKey = document.body.getAttribute("data-client-nav") || "";
    const session = getSession();
    const user = session.user || {};
    const shellHost = document.getElementById("client-shell-sidebar");
    if (shellHost) {
      renderShellSidebar(shellHost, user, activeKey);
    } else {
      applyUserFields(user);
      applyActiveNav(activeKey);
    }
    renderHeader();
    wireLogout();
    initResizer();
  });
})();
