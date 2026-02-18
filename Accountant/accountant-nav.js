(() => {
  const NAV_ITEMS = [
    { key: 'dashboard', href: 'dashboards.html', icon: 'fa fa-chart-line', label: 'Dashboard' },
    { key: 'clients', href: 'clients.html', icon: 'fa fa-users', label: 'Clients' },
    { key: 'directory', href: 'clients-directory.html', icon: 'fa fa-address-book', label: 'Directory' },
    { key: 'documents', href: 'documents.html', icon: 'fa fa-file', label: 'Documents' },
    { key: 'review', href: 'review-queue.html', icon: 'fa fa-clipboard-check', label: 'Review Queue' },
    { key: 'tasks', href: 'tasks.html', icon: 'fa fa-tasks', label: 'Tasks' },
    { key: 'messages', href: 'messages.html', icon: 'fa fa-message', label: 'Messages' },
    { key: 'settings', href: 'settings.html', icon: 'fa fa-gear', label: 'Settings' }
  ];

  const page = window.location.pathname.split('/').pop().toLowerCase();
  const activeMap = {
    'dashboards.html': 'dashboard',
    'clients.html': 'clients',
    'clients-directory.html': 'directory',
    'client-profile.html': 'clients',
    'documents.html': 'documents',
    'documentview.html': 'review',
    'review-queue.html': 'review',
    'tasks.html': 'tasks',
    'messages.html': 'messages',
    'settings.html': 'settings',
    'set.html': 'settings',
    'preference.html': 'settings'
  };

  const activeKey = activeMap[page] || 'dashboard';

  function navMarkup(linkClass) {
    return NAV_ITEMS.map((item) => {
      const classes = [linkClass, item.key === activeKey ? 'active' : ''].filter(Boolean).join(' ');
      return '<a href="' + item.href + '" class="' + classes + '"><i class="' + item.icon + '"></i> ' + item.label + '</a>';
    }).join('');
  }

  function injectSharedShellIfMissing() {
    if (document.querySelector('.sidebar')) return;

    const style = document.createElement('style');
    style.textContent = `
      body.shared-shell { margin: 0; min-height: 100vh; }
      .shared-sidebar {
        width: 260px;
        background: linear-gradient(180deg,#0f172a,#020617);
        color: white;
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 900;
      }
      .shared-sidebar-header {
        padding: 22px;
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .shared-sidebar-header i { font-size: 30px; color: #60a5fa; }
      .shared-sidebar .nav { padding: 16px; flex: 1; overflow-y: auto; }
      .shared-sidebar .nav a {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 10px;
        color: #cbd5f5;
        text-decoration: none;
        margin-bottom: 6px;
      }
      .shared-sidebar .nav a:hover { background: #1e293b; }
      .shared-sidebar .nav a.active { background: #2563eb; color: white; }
      .shared-sidebar-footer { padding: 16px; }
      .shared-sidebar .user-box {
        background: #1e293b;
        padding: 12px;
        border-radius: 10px;
        margin-bottom: 12px;
      }
      .shared-sidebar .logout {
        width: 100%;
        background: none;
        border: none;
        color: #cbd5f5;
        padding: 12px;
        border-radius: 10px;
        cursor: pointer;
        text-align: left;
      }
      .shared-sidebar .logout:hover { background: #1e293b; }
      .shared-main {
        margin-left: 260px;
        min-height: 100vh;
      }
      @media (max-width: 900px) {
        .shared-sidebar {
          position: static;
          width: 100%;
          height: auto;
        }
        .shared-main { margin-left: 0; }
      }
    `;
    document.head.appendChild(style);

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar shared-sidebar';
    sidebar.innerHTML =
      '<div class="shared-sidebar-header">' +
      '<i class="fa-solid fa-shield-halved"></i>' +
      '<div><h3>Prospera</h3><small>Accountant Portal</small></div>' +
      '</div>' +
      '<nav class="nav">' + navMarkup('') + '</nav>' +
      '<div class="shared-sidebar-footer">' +
      '<div class="user-box"><p><strong>Sarah Johnson</strong></p><p>sarah@prospera.com</p><p class="role">Primary Accountant</p></div>' +
      '<button class="logout"><i class="fa fa-sign-out"></i> Logout</button>' +
      '</div>';

    const main = document.createElement('div');
    main.className = 'shared-main';

    const existingChildren = Array.from(document.body.childNodes);
    existingChildren.forEach((node) => main.appendChild(node));

    document.body.classList.add('shared-shell');
    document.body.appendChild(sidebar);
    document.body.appendChild(main);
  }

  function normalizeSidebarNav() {
    const navContainers = Array.from(document.querySelectorAll('.sidebar .nav, aside nav'));
    navContainers.forEach((nav) => {
      if (nav.closest('.bottom-nav')) return;
      const firstLink = nav.querySelector('a');
      const linkClass = firstLink && firstLink.classList.contains('nav-item') ? 'nav-item' : '';
      nav.innerHTML = navMarkup(linkClass);
    });
  }

  function wireCommonClicks() {
    document.querySelectorAll('.logout').forEach((button) => {
      button.addEventListener('click', () => {
        window.location.href = 'accountant logins/login.html';
      });
    });

    document.addEventListener('click', (event) => {
      const viewProfileBtn = event.target.closest('.btn-view');
      if (viewProfileBtn) {
        window.location.href = 'client-profile.html';
        return;
      }

      const iconEyeButton = event.target.closest('.icon-btn');
      if (iconEyeButton && iconEyeButton.querySelector('.fa-eye')) {
        window.location.href = 'documentview.html?id=1';
        return;
      }

      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) {
        window.location.href = routeTarget.getAttribute('data-route');
      }
    });
  }

  injectSharedShellIfMissing();
  normalizeSidebarNav();
  wireCommonClicks();
})();
