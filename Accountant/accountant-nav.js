(() => {
  const SIDEBAR_STATE_KEY = "accountantSidebarCollapsed";
  const LOGIN_PATH = "accountant logins/login.html";
  const token = window.localStorage.getItem("authToken");
  const rawUser = window.localStorage.getItem("authUser");
  let user = null;

  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (_error) {
    user = null;
  }

  const allowedRoles = ["accountant", "accountant_admin", "accountant_manager"];
  const role = String(user?.role || "").toLowerCase();
  const isTaskAdmin = role === "accountant_admin";
  if (!token || !user || !allowedRoles.includes(role)) {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("authUser");
    window.location.href = LOGIN_PATH;
    return;
  }

  const page = window.location.pathname.split("/").pop().toLowerCase();
  if (page === "tasks.html" && !isTaskAdmin) {
    window.location.href = "dashboards.html";
    return;
  }

  const NAV_ITEMS = [
    { key: "dashboard", href: "dashboards.html", icon: "fa fa-chart-line", label: "Dashboard" },
    { key: "clients", href: "clients.html", icon: "fa fa-users", label: "Clients" },
    { key: "documents", href: "documents.html", icon: "fa fa-file", label: "Documents" },
    { key: "review", href: "review-queue.html", icon: "fa fa-clipboard-check", label: "Review Queue" },
    { key: "compliance", href: "compliance-board.html", icon: "fa fa-shield-alt", label: "Compliance" },
    { key: "messages", href: "messages.html", icon: "fa fa-message", label: "Messages" },
    { key: "settings", href: "settings.html", icon: "fa fa-gear", label: "Settings" },
  ];
  if (isTaskAdmin) {
    NAV_ITEMS.splice(5, 0, { key: "tasks", href: "tasks.html", icon: "fa fa-tasks", label: "Tasks" });
  }

  const activeMap = {
    "dashboards.html": "dashboard",
    "clients.html": "clients",
    "clients-directory.html": "clients",
    "client-profile.html": "clients",
    "documents.html": "documents",
    "documentview.html": "review",
    "review-queue.html": "review",
    "compliance-board.html": "compliance",
    "tasks.html": "tasks",
    "messages.html": "messages",
    "settings.html": "settings",
    "set.html": "settings",
    "preference.html": "settings",
  };
  const activeKey = activeMap[page] || "dashboard";

  function navMarkup() {
    return NAV_ITEMS.map((item) => `
      <a href="${item.href}" class="${item.key === activeKey ? "active" : ""}">
        <span class="nav-icon"><i class="${item.icon}"></i></span>
        <span class="nav-label">${item.label}</span>
      </a>
    `).join("");
  }

  function injectUnifiedStyles() {
    if (document.getElementById("accountantUnifiedSidebarStyles")) return;
    const style = document.createElement("style");
    style.id = "accountantUnifiedSidebarStyles";
    style.textContent = `
      body { margin: 0; }
      body .sidebar {
        width: 260px !important;
        background: linear-gradient(180deg,#0f172a,#020617) !important;
        color: #ffffff !important;
        display: flex !important;
        flex-direction: column !important;
        position: fixed !important;
        inset: 0 auto 0 0 !important;
        height: 100vh !important;
        padding: 0 !important;
        z-index: 900 !important;
      }
      body .sidebar .sidebar-header {
        padding: 18px 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        border-bottom: 1px solid rgba(148,163,184,.2) !important;
      }
      body .sidebar .sidebar-header i {
        font-size: 22px !important;
        color: #60a5fa !important;
      }
      body .sidebar .sidebar-header h1 {
        margin: 0 !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        line-height: 1.2 !important;
      }
      body .sidebar .sidebar-header p {
        margin: 0 !important;
        color: #94a3b8 !important;
        font-size: 11px !important;
      }
      body .sidebar .sidebar-header .sidebar-toggle {
        margin-left: auto !important;
        width: 30px !important;
        height: 30px !important;
        border-radius: 8px !important;
        border: 1px solid #334155 !important;
        background: #0f172a !important;
        color: #cbd5f5 !important;
        cursor: pointer !important;
      }
      body .sidebar .sidebar-header .sidebar-toggle:hover { background: #1e293b !important; }
      body .sidebar .nav {
        padding: 14px !important;
        flex: 1 !important;
        overflow-y: auto !important;
      }
      body .sidebar .nav a {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        margin-bottom: 6px !important;
        padding: 10px 12px !important;
        border-radius: 10px !important;
        color: #cbd5f5 !important;
        text-decoration: none !important;
        white-space: nowrap !important;
      }
      body .sidebar .nav a:hover { background: #1e293b !important; }
      body .sidebar .nav a.active { background: #2563eb !important; color: #ffffff !important; }
      body .sidebar .nav .nav-icon {
        width: 18px !important;
        display: inline-flex !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
      body .sidebar .sidebar-footer {
        padding: 14px !important;
        border-top: 1px solid rgba(148,163,184,.2) !important;
      }
      body .sidebar .sidebar-footer .user-box {
        background: #1e293b !important;
        border-radius: 10px !important;
        padding: 10px !important;
        margin-bottom: 10px !important;
      }
      body .sidebar .sidebar-footer .user-box p {
        margin: 0 0 4px !important;
        font-size: 12px !important;
        color: #cbd5f5 !important;
      }
      body .sidebar .sidebar-footer .user-box p:last-child { margin-bottom: 0 !important; }
      body .sidebar .sidebar-footer .role {
        color: #60a5fa !important;
        font-size: 11px !important;
      }
      body .sidebar .sidebar-footer .logout {
        width: 100% !important;
        border: none !important;
        background: transparent !important;
        color: #cbd5f5 !important;
        border-radius: 10px !important;
        padding: 10px !important;
        text-align: left !important;
        cursor: pointer !important;
      }
      body .sidebar .sidebar-footer .logout:hover { background: #1e293b !important; }

      body .main,
      body .page,
      body .main-content,
      body .auto-main {
        margin-left: 260px !important;
      }

      body.sidebar-collapsed .sidebar { width: 88px !important; }
      body.sidebar-collapsed .main,
      body.sidebar-collapsed .page,
      body.sidebar-collapsed .main-content,
      body.sidebar-collapsed .auto-main { margin-left: 88px !important; }
      body.sidebar-collapsed .sidebar .nav-label,
      body.sidebar-collapsed .sidebar .sidebar-header h1,
      body.sidebar-collapsed .sidebar .sidebar-header p,
      body.sidebar-collapsed .sidebar .sidebar-footer .user-box p:not(:first-child),
      body.sidebar-collapsed .sidebar .sidebar-footer .logout span { display: none !important; }
      body.sidebar-collapsed .sidebar .nav a { justify-content: center !important; }
      body.sidebar-collapsed .sidebar .sidebar-header { justify-content: center !important; }

      @media (max-width: 900px) {
        body .sidebar {
          position: static !important;
          width: 100% !important;
          height: auto !important;
        }
        body .main,
        body .page,
        body .main-content,
        body .auto-main {
          margin-left: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLayoutAndSidebar() {
    let sidebar = document.querySelector(".sidebar");
    let primary = document.querySelector(".main, .page, .main-content, .auto-main");

    if (!sidebar && !primary) {
      const wrapper = document.createElement("div");
      wrapper.className = "auto-main";
      const children = Array.from(document.body.childNodes);
      children.forEach((node) => wrapper.appendChild(node));
      document.body.appendChild(wrapper);
      primary = wrapper;
    }

    if (!sidebar) {
      sidebar = document.createElement("aside");
      sidebar.className = "sidebar";
      if (primary && primary.parentNode) {
        primary.parentNode.insertBefore(sidebar, primary);
      } else {
        document.body.prepend(sidebar);
      }
    }

    if (!primary) {
      const wrapper = document.createElement("div");
      wrapper.className = "auto-main";
      const siblings = Array.from(document.body.childNodes).filter((node) => node !== sidebar);
      siblings.forEach((node) => wrapper.appendChild(node));
      document.body.appendChild(wrapper);
      primary = wrapper;
    }

    let header = sidebar.querySelector(".sidebar-header");
    if (!header) {
      header = document.createElement("div");
      header.className = "sidebar-header";
      sidebar.prepend(header);
    }
    header.innerHTML = `
      <i class="fa-solid fa-shield-halved"></i>
      <div>
        <h1>Prospera</h1>
        <p>Accountant Portal</p>
      </div>
    `;

    let nav = sidebar.querySelector(".nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav";
      sidebar.appendChild(nav);
    }
    nav.innerHTML = navMarkup();

    let footer = sidebar.querySelector(".sidebar-footer");
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "sidebar-footer";
      sidebar.appendChild(footer);
    }
    footer.innerHTML = `
      <div class="user-box">
        <p><strong>${user.fullName || "Accountant"}</strong></p>
        <p>${user.email || "-"}</p>
        <p class="role">Primary Accountant</p>
      </div>
      <button type="button" class="logout"><i class="fa fa-sign-out"></i> <span>Logout</span></button>
    `;

    return { sidebar };
  }

  function mountCollapseToggle(sidebar) {
    const header = sidebar.querySelector(".sidebar-header");
    if (!header) return;
    let btn = header.querySelector(".sidebar-toggle");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-toggle";
      btn.setAttribute("aria-label", "Toggle sidebar");
      header.appendChild(btn);
    }

    const sync = () => {
      const collapsed = document.body.classList.contains("sidebar-collapsed");
      btn.innerHTML = collapsed
        ? '<i class="fa-solid fa-angles-right"></i>'
        : '<i class="fa-solid fa-angles-left"></i>';
      btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    };

    const collapsedSaved = window.localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
    document.body.classList.toggle("sidebar-collapsed", collapsedSaved);
    sync();

    btn.addEventListener("click", () => {
      const next = document.body.classList.toggle("sidebar-collapsed");
      window.localStorage.setItem(SIDEBAR_STATE_KEY, next ? "1" : "0");
      sync();
    });
  }

  function wireLogout() {
    document.querySelectorAll(".logout").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.localStorage.removeItem("authToken");
        window.localStorage.removeItem("authUser");
        window.location.href = LOGIN_PATH;
      });
    });
  }

  async function validateSession() {
    try {
      const apiBase = window.PortalConfig && window.PortalConfig.API_BASE_URL
        ? window.PortalConfig.API_BASE_URL
        : "http://127.0.0.1:4010/api";
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Invalid session");
      const payload = await response.json().catch(() => ({}));
      const remoteRole = String(payload?.user?.role || "").toLowerCase();
      if (!payload.user || !allowedRoles.includes(remoteRole)) throw new Error("Invalid role");
      window.localStorage.setItem("authUser", JSON.stringify(payload.user));
    } catch (_error) {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("authUser");
      window.location.href = LOGIN_PATH;
    }
  }

  injectUnifiedStyles();
  const { sidebar } = ensureLayoutAndSidebar();
  mountCollapseToggle(sidebar);
  wireLogout();
  validateSession();
})();
