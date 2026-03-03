(() => {
  const token = window.localStorage.getItem("authToken");
  const rawUser = window.localStorage.getItem("authUser");
  const loginPath = "../Clientlogins/login.html";
  let user = null;

  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (_error) {
    user = null;
  }

  if (!token || !user || user.role !== "client") {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("authUser");
    window.location.href = loginPath;
    return;
  }

  const NAV_ITEMS = [
    { key: "dashboard", href: "Clientportal.html", icon: "fa fa-chart-line", label: "Dashboard" },
    { key: "documents", href: "documents.html", icon: "fa fa-file", label: "Documents" },
    { key: "requests", href: "clientrequest.html", icon: "fa fa-file-alt", label: "Requests" },
    { key: "messages", href: "messages.html", icon: "fa fa-message", label: "Messages" },
    { key: "settings", href: "settings.html", icon: "fa fa-gear", label: "Settings" },
  ];

  const SIDEBAR_WIDTH_KEY = "clientSidebarWidth";
  const SIDEBAR_COLLAPSED_KEY = "clientSidebarCollapsed";
  const DEFAULT_WIDTH = 260;
  const MIN_WIDTH = 84;

  function pageActiveKey() {
    const bodyKey = document.body.getAttribute("data-client-nav");
    if (bodyKey) return bodyKey;
    const file = window.location.pathname.split("/").pop().toLowerCase();
    if (file === "clientportal.html" || file === "compliance-obligation.html") return "dashboard";
    if (file === "documents.html" || file === "upload.html") return "documents";
    if (file === "clientrequest.html") return "requests";
    if (file === "messages.html") return "messages";
    return "settings";
  }

  function navMarkup(activeKey) {
    return NAV_ITEMS.map((item) => {
      const activeClass = item.key === activeKey ? "active" : "";
      return `<a href="${item.href}" class="${activeClass}" data-nav="${item.key}">
        <i class="${item.icon}"></i>
        <span class="client-nav-label">${item.label}</span>
      </a>`;
    }).join("");
  }

  function injectStyles() {
    if (document.getElementById("clientNavSharedStyles")) return;
    const style = document.createElement("style");
    style.id = "clientNavSharedStyles";
    style.textContent = `
      .client-nav-toggle {
        margin-left: auto;
        border: 1px solid #334155;
        background: #0f172a;
        color: #cbd5f5;
        width: 30px;
        height: 30px;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .client-nav-toggle:hover { background: #1e293b; }
      .sidebar-icons-only .client-nav-label { display: none; }
      .sidebar-icons-only .nav a { justify-content: center; }
      .sidebar-icons-only .nav a i { margin: 0; }
    `;
    document.head.appendChild(style);
  }

  function normalizeSidebar() {
    const activeKey = pageActiveKey();
    const nav = document.querySelector(".sidebar .nav");
    if (nav) nav.innerHTML = navMarkup(activeKey);

    const nameTarget = document.querySelector("#sidebar-user-name, #sidebarName");
    const emailTarget = document.querySelector("#sidebar-user-email, #sidebarEmail");
    if (nameTarget) nameTarget.textContent = user.fullName || "Client";
    if (emailTarget) emailTarget.textContent = user.email || "";

    const logoutButtons = document.querySelectorAll(".logout, #logoutBtn, #logout-btn");
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        window.localStorage.removeItem("authToken");
        window.localStorage.removeItem("authUser");
        window.location.href = loginPath;
      });
    });
  }

  function setupSidebarToggle() {
    const header = document.querySelector(".sidebar .sidebar-header");
    const layout = document.querySelector(".app-layout, .layout");
    if (!header || !layout) return;

    let toggle = header.querySelector(".client-nav-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "client-nav-toggle";
      toggle.setAttribute("aria-label", "Toggle sidebar");
      header.appendChild(toggle);
    }

    const savedWidth = parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_KEY) || `${DEFAULT_WIDTH}`, 10);
    const width = Number.isFinite(savedWidth) ? Math.max(MIN_WIDTH, Math.min(360, savedWidth)) : DEFAULT_WIDTH;
    layout.style.setProperty("--sidebar-width", `${width}px`);

    const collapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    layout.classList.toggle("sidebar-icons-only", collapsed);
    if (collapsed) layout.style.setProperty("--sidebar-width", `${MIN_WIDTH}px`);

    const setToggleIcon = () => {
      const isCollapsed = layout.classList.contains("sidebar-icons-only");
      toggle.innerHTML = isCollapsed
        ? '<i class="fa-solid fa-angles-right"></i>'
        : '<i class="fa-solid fa-angles-left"></i>';
      toggle.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
    };
    setToggleIcon();

    toggle.addEventListener("click", () => {
      const isCollapsed = layout.classList.toggle("sidebar-icons-only");
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? "1" : "0");
      if (isCollapsed) {
        const current = parseInt(getComputedStyle(layout).getPropertyValue("--sidebar-width"), 10) || DEFAULT_WIDTH;
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(current));
        layout.style.setProperty("--sidebar-width", `${MIN_WIDTH}px`);
      } else {
        const restored = parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_KEY) || `${DEFAULT_WIDTH}`, 10);
        layout.style.setProperty("--sidebar-width", `${Math.max(MIN_WIDTH, Math.min(360, restored))}px`);
      }
      setToggleIcon();
    });
  }

  injectStyles();
  normalizeSidebar();
  setupSidebarToggle();
})();
