// Friendly guide: this module (WorkspaceLayout) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/auth";
import { useTheme } from "../app/theme";
import type { Role } from "../types/portal";
import { cn } from "../utils/cn";
import type { NavigationIcon, NavigationItem } from "../utils/navigation";
import { navigationByRole } from "../utils/navigation";

// Shared shape notes: these types keep UI and data contracts aligned.
interface WorkspaceLayoutProps {
  role: Role;
}

// Component flow: gather data first, then render a focused UI state.
function PortalMark() {
// Render output: this is the visual state users interact with.
  return (
    <svg className="h-7 w-7 text-brand-300" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3 19 6v6c0 4.9-2.8 8.7-7 10-4.2-1.3-7-5.1-7-10V6l7-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 9.5h5M8.5 12.5h4M14.5 16.5l1.3 1.3 2.7-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-[1.02rem] w-[1.02rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="m16.5 16.5 4 4M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v10A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5Zm5 0v13"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d={collapsed ? "m15 9 3 3-3 3" : "m17 9-3 3 3 3"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg className="h-[1rem] w-[1rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M9.5 5.5h-3A1.5 1.5 0 0 0 5 7v10a1.5 1.5 0 0 0 1.5 1.5h3M14 8l4 4-4 4m4-4H9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserAvatar({ initials }: { initials?: string }) {
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#18ac5f,#0a2f66)] text-[0.72rem] font-semibold text-white shadow-sm ring-1 ring-white/40">
      {initials || "U"}
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
    </span>
  );
}

function NavIcon({ icon }: { icon: NavigationIcon }) {
  const common = "h-[1.05rem] w-[1.05rem]";

  switch (icon) {
    case "dashboard":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M4 13h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 4h7v7H4z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "packs":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M3.5 7.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17.5v-10Zm0 0L6 4.5h12l2.5 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "requests":
    case "messages":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M6 18.5 3.5 20V7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v9A1.5 1.5 0 0 1 19 17.5H6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "documents":
    case "templates":
    case "policies":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M7 3.5h7l4 4v13A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5v-15A2 2 0 0 1 8 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M14 3.5v4h4M9 12h6M9 15.5h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "compliance":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M12 3 19 6v6c0 4.9-2.8 8.7-7 10-4.2-1.3-7-5.1-7-10V6l7-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "notifications":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M8 18.5h8m-9-2V11a5 5 0 1 1 10 0v5.5l1.5 2H5.5l1.5-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "settings":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="m12 3 1.5 2.7 3.1.5-.9 3 2.2 2.2-2.2 2.2.9 3-3.1.5L12 21l-1.5-2.7-3.1-.5.9-3L6 12l2.2-2.2-.9-3 3.1-.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "portfolio":
    case "clients":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M4 18.5h16M6.5 18.5v-10A1.5 1.5 0 0 1 8 7h8a1.5 1.5 0 0 1 1.5 1.5v10M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "review":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M12 3 19 6v6c0 4.9-2.8 8.7-7 10-4.2-1.3-7-5.1-7-10V6l7-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="m9.5 12 1.8 1.8 3.7-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "followups":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M12 6v12M6 12h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 1 0-15 0Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "exceptions":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M12 4.5 20 18.5H4L12 4.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M12 9.5v4m0 3h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "accountants":
    case "users":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a4.5 4.5 0 0 1 9 0M11.5 19a4.5 4.5 0 0 1 9 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "assignments":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M7 7.5h6M7 12h10M7 16.5h5M4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "deadlines":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24">
          <path d="M7 3v3M17 3v3M4 9h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
  }
}

function groupNavigation(items: NavigationItem[]) {
  return items.reduce<Record<string, NavigationItem[]>>((groups, item) => {
    if (!groups[item.section]) {
      groups[item.section] = [];
    }

    groups[item.section].push(item);
    return groups;
  }, {});
}

const prefetchedRoutes = new Set<string>();

const routePrefetchers: Array<{ match: (path: string) => boolean; load: () => Promise<unknown> }> = [
  { match: (path) => path.startsWith("/client/dashboard"), load: () => import("../pages/client/ClientDashboardPage") },
  { match: (path) => path.startsWith("/client/packs"), load: () => import("../pages/client/ClientMonthlyPacksPage") },
  { match: (path) => path.startsWith("/client/inbox"), load: () => import("../pages/client/ClientRequestsPage") },
  { match: (path) => path.startsWith("/client/requests"), load: () => import("../pages/client/ClientRequestsPage") },
  { match: (path) => path.startsWith("/client/documents"), load: () => import("../pages/client/ClientDocumentsPage") },
  { match: (path) => path.startsWith("/client/compliance"), load: () => import("../pages/client/ClientComplianceCentrePage") },
  { match: (path) => path.startsWith("/client/notifications"), load: () => import("../pages/client/ClientNotificationsPage") },
  { match: (path) => path.startsWith("/client/settings"), load: () => import("../pages/client/ClientSettingsPage") },
  { match: (path) => path.startsWith("/firm/dashboard"), load: () => import("../pages/accountant/AccountantDashboardPage") },
  { match: (path) => /^\/firm\/clients\/[^/]+(?:\/packs)?$/.test(path), load: () => import("../pages/accountant/AccountantClientWorkspacePage") },
  { match: (path) => path.startsWith("/firm/clients"), load: () => import("../pages/accountant/AccountantPortfolioPage") },
  { match: (path) => path.startsWith("/firm/documents"), load: () => import("../pages/accountant/AccountantDocumentsPage") },
  { match: (path) => path.startsWith("/firm/filing"), load: () => import("../pages/accountant/AccountantFilingPage") },
  { match: (path) => path.startsWith("/firm/review"), load: () => import("../pages/firm/FirmReviewQueuePage") },
  { match: (path) => path.startsWith("/firm/inbox"), load: () => import("../pages/firm/FirmRequestsPage") },
  { match: (path) => path.startsWith("/firm/inbox/"), load: () => import("../pages/firm/FirmRequestDetailPage") },
  { match: (path) => path.startsWith("/firm/requests"), load: () => import("../pages/firm/FirmRequestsPage") },
  { match: (path) => path.startsWith("/firm/requests/"), load: () => import("../pages/firm/FirmRequestDetailPage") },
  { match: (path) => path.startsWith("/firm/activity"), load: () => import("../pages/firm/FirmActivityFeedPage") },
  { match: (path) => path.startsWith("/firm/exceptions"), load: () => import("../pages/firm/FirmExceptionsQueuePage") },
  { match: (path) => path.startsWith("/firm/compliance/calendar"), load: () => import("../pages/firm/FirmComplianceCalendarPage") },
  { match: (path) => path.startsWith("/firm/compliance"), load: () => import("../pages/accountant/AccountantComplianceCentrePage") },
  { match: (path) => path.startsWith("/firm/notifications/preferences"), load: () => import("../pages/shared/NotificationPreferencesPage") },
  { match: (path) => path.startsWith("/firm/notifications"), load: () => import("../pages/accountant/AccountantNotificationsPage") },
  { match: (path) => path.startsWith("/firm/settings"), load: () => import("../pages/firm/FirmSettingsPage") },
  { match: (path) => path.startsWith("/firm/clients/") && path.endsWith("/profile"), load: () => import("../pages/firm/FirmClient360Page") },
  { match: (path) => path.startsWith("/firm/admin/accountants"), load: () => import("../pages/admin/AdminAccountantsPage") },
  { match: (path) => path.startsWith("/firm/admin/assignments"), load: () => import("../pages/admin/AdminAssignmentsPage") },
  { match: (path) => path.startsWith("/firm/admin/system-settings"), load: () => import("../pages/admin/AdminSettingsPage") },
  { match: (path) => path.startsWith("/firm/admin/request-state-machine"), load: () => import("../pages/admin/AdminRequestStateMachinePage") },
];

function prefetchRoute(path: string) {
  if (!path || prefetchedRoutes.has(path)) {
    return;
  }

  const prefetcher = routePrefetchers.find((entry) => entry.match(path));
  if (!prefetcher) {
    return;
  }

  prefetchedRoutes.add(path);
  void prefetcher.load().catch(() => {
    prefetchedRoutes.delete(path);
  });
}

export function WorkspaceLayout({ role }: WorkspaceLayoutProps) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navigation = navigationByRole[role];
  const groupedNavigation = useMemo(() => groupNavigation(navigation), [navigation]);
  const effectiveCollapsed = sidebarCollapsed && !mobileNavOpen;
  const denseSidebar = navigation.length > 10 && !effectiveCollapsed;
  const adminDenseSidebar = role === "admin" && denseSidebar;
  const showSectionLabels = !effectiveCollapsed;
  const showSidebarSearch = !effectiveCollapsed;
  const settingsPath =
    role === "admin" ? "/firm/admin/system-settings" : role === "client" ? "/client/settings" : "/firm/settings";
  const isDark = theme === "dark";

  const activeItem = useMemo(
    () =>
      navigation.find((item) => location.pathname.startsWith(item.to)) ?? navigation[0],
    [location.pathname, navigation],
  );
  const activePageLabel = location.pathname.startsWith(settingsPath)
    ? "Settings"
    : location.pathname.includes("/notifications/preferences")
      ? "Notification Preferences"
      : activeItem.label;
  const useWideContentCanvas =
    location.pathname.startsWith("/firm/inbox") || location.pathname.startsWith("/client/inbox");

  const navSurfaceClass = isDark
    ? "border-brand-700 bg-brand-800 text-slate-100 shadow-[14px_0_34px_rgba(10,47,102,0.28)]"
    : "border-slate-200 bg-white text-slate-800 shadow-[14px_0_34px_rgba(15,23,42,0.08)]";
  const navMutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const navHoverClass = isDark ? "hover:bg-white/8 hover:text-white" : "hover:bg-slate-100 hover:text-slate-950";
  const navActiveClass = isDark
    ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
    : "bg-slate-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]";
  const iconMutedClass = isDark ? "text-slate-300" : "text-slate-600";

  return (
    <div
      className={cn(
        "min-h-screen",
        isDark
          ? "bg-brand-900"
          : "bg-[#eef1f4]",
      )}
    >
      {mobileNavOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[88vw] max-w-[340px] -translate-x-full overflow-hidden border-r px-4 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0",
            adminDenseSidebar ? "py-3" : denseSidebar ? "py-3" : "py-4",
            effectiveCollapsed ? "lg:w-[84px]" : "lg:w-[280px]",
            navSurfaceClass,
            mobileNavOpen && "translate-x-0",
          )}
        >
          <div className="relative flex h-full min-h-0 flex-col">
            <div className={cn("flex", effectiveCollapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-3")}>
              {effectiveCollapsed ? (
                <button
                  aria-label="Expand sidebar"
                  className={cn(
                    "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition lg:inline-flex",
                    iconMutedClass,
                    navHoverClass,
                  )}
                  onClick={() => setSidebarCollapsed(false)}
                  type="button"
                >
                  <CollapseIcon collapsed />
                </button>
              ) : null}

              <div className={cn("flex min-w-0 items-center gap-2.5", effectiveCollapsed && "justify-center")}>
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-lg",
                    denseSidebar ? "h-[2.125rem] w-[2.125rem]" : "h-9 w-9",
                    isDark ? "bg-white/5" : "bg-brand-50",
                  )}
                >
                  <PortalMark />
                </div>
                {!effectiveCollapsed ? (
                  <div className="min-w-0">
                    <p className={cn("truncate font-semibold leading-5", denseSidebar ? "text-[0.88rem]" : "text-[0.92rem]", isDark ? "text-white" : "text-slate-950")}>
                      Compliance Portal
                    </p>
                    <p className={cn("truncate font-semibold uppercase tracking-[0.14em]", denseSidebar ? "text-[0.58rem]" : "text-[0.62rem]", navMutedClass)}>
                      {role === "client" ? "Client Workspace" : role === "admin" ? "Admin Workspace" : "Firm Workspace"}
                    </p>
                  </div>
                ) : null}
              </div>
              {!effectiveCollapsed ? (
                <button
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className={cn(
                    "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition lg:inline-flex",
                    iconMutedClass,
                    navHoverClass,
                  )}
                  onClick={() => setSidebarCollapsed((current) => !current)}
                  type="button"
                >
                  <CollapseIcon collapsed={sidebarCollapsed} />
                </button>
              ) : null}
            </div>

            {showSidebarSearch ? (
              <div className={cn(effectiveCollapsed ? "mt-4 flex justify-center" : "mt-4")}>
                <button
                  aria-label="Quick search"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border text-left transition",
                    "h-8",
                    effectiveCollapsed ? "w-10 justify-center px-0" : "w-full px-2.5",
                    isDark
                      ? "border-brand-400/20 bg-brand-700/45 text-slate-300 hover:bg-brand-700/70 hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800",
                  )}
                  type="button"
                >
                  <SearchIcon />
                  {!effectiveCollapsed ? (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[0.75rem]">Quick Search</span>
                      <span className={cn("text-[0.65rem]", navMutedClass)}>⌘K</span>
                    </>
                  ) : null}
                </button>
              </div>
            ) : null}

            <nav
  className={cn(
    "min-h-0 flex-1 overflow-y-auto",
    effectiveCollapsed
      ? "mb-3 mt-4 flex flex-col items-center gap-2"
      : "mb-3 mt-4 space-y-2.5 pr-1",
  )}
>
              {Object.entries(groupedNavigation).map(([section, items]) => (
  <div
    key={section}
    className={
      effectiveCollapsed
        ? "space-y-2"
        : cn(
            "rounded-lg px-2.5 py-2 backdrop-blur-md transition",
            isDark
              ? "bg-slate-400/8 border border-slate-300/20 shadow-[0_2px_8px_rgba(148,163,184,0.1)]"
              : "bg-gradient-to-br from-slate-50/80 to-gray-50/70 border border-slate-200/60 shadow-[0_2px_8px_rgba(203,213,225,0.3),inset_0_1px_0_rgba(255,255,255,1)]"
          )
    }
  >
                  {showSectionLabels ? (
                    <p
                      className={cn(
                        "px-1.5 font-semibold uppercase mb-1",
                        "text-[0.56rem] leading-[0.875rem] tracking-[0.08em]",
                        navMutedClass,
                      )}
                    >
                      {section}
                    </p>
                  ) : null}
                  <div
  className={cn(
    effectiveCollapsed
      ? "flex flex-col items-center space-y-2"
      : "space-y-1",
  )}
>
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        aria-label={effectiveCollapsed ? item.label : undefined}
                        title={effectiveCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center overflow-hidden rounded-md font-medium transition-all duration-150",
                            "text-[0.79rem]",
                            effectiveCollapsed
                              ? "h-9 w-9 justify-center"
                              : "h-9 gap-2.5 px-1.5",
                            isActive ? navActiveClass : cn(navMutedClass, navHoverClass),
                          )
                        }
                        to={item.to}
                        onMouseEnter={() => prefetchRoute(item.to)}
                        onFocus={() => prefetchRoute(item.to)}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={cn(
                                "absolute rounded-r-full transition",
                                effectiveCollapsed ? "bottom-2 left-0 top-2 w-0.5" : "bottom-1.5 left-0 top-1.5 w-0.5",
                                isActive ? "bg-brand-500" : "bg-transparent",
                              )}
                            />
                            <span
                              className={cn(
                                "relative flex shrink-0 items-center justify-center rounded-md transition",
                                effectiveCollapsed ? "h-9 w-9" : adminDenseSidebar ? "h-5 w-5" : denseSidebar ? "h-6 w-6" : "h-6 w-6",
                                isActive
                                  ? isDark ? "text-white" : "text-slate-950"
                                  : cn(iconMutedClass, isDark ? "group-hover:text-white" : "group-hover:text-slate-950"),
                              )}
                            >
                              <NavIcon icon={item.icon} />
                            </span>
                            {!effectiveCollapsed ? (
                              <span className="min-w-0 flex-1 truncate">
                                {item.label}
                              </span>
                            ) : null}
                            {!effectiveCollapsed && item.badge ? (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[0.64rem] font-semibold text-white">
                                {item.badge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className={cn("mt-auto border-t pt-3", isDark ? "border-white/10" : "border-slate-200")}>
              <div className="relative">
                <button
                  aria-expanded={accountMenuOpen}
                  aria-label="Open account menu"
                  className={cn(
                    "flex w-full items-center rounded-md text-left transition",
                    effectiveCollapsed
                      ? "h-10 justify-center px-0"
                      : "h-10 gap-2.5 px-3",
                    accountMenuOpen ? navActiveClass : navHoverClass,
                  )}
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  type="button"
                >
                  <UserAvatar initials={user?.initials} />
                  {!effectiveCollapsed ? (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-semibold text-[0.82rem]", isDark ? "text-white" : "text-slate-950")}>
                          {user?.fullName ?? user?.name}
                        </span>
                        <span className={cn("block truncate text-[0.68rem]", navMutedClass)}>
                          {user?.title}
                        </span>
                      </span>
                      <span className={cn("text-[0.9rem]", navMutedClass)}>v</span>
                    </>
                  ) : null}
                </button>

                {accountMenuOpen ? (
                  <div
                    className={cn(
                      "absolute bottom-[calc(100%+0.6rem)] z-50 w-[240px] rounded-lg border p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)]",
                      effectiveCollapsed ? "bottom-0 left-[calc(100%+0.75rem)]" : "left-0",
                      isDark ? "border-brand-400/20 bg-brand-800 text-slate-100" : "border-slate-200 bg-white text-slate-800",
                    )}
                  >
                    <div className="mb-3 flex flex-col gap-3 px-0 py-0 border-b pb-3" style={isDark ? {borderColor: 'rgba(255,255,255,0.1)'} : {borderColor: '#e2e8f0'}}>
                      <div className="flex items-center gap-2">
                        <UserAvatar initials={user?.initials} />
                        <div className="min-w-0">
                          <p className={cn("truncate text-[0.78rem] font-semibold", isDark ? "text-white" : "text-slate-950")}>
                            {user?.fullName ?? user?.name}
                          </p>
                          <p className={cn("truncate text-[0.66rem]", navMutedClass)}>{user?.email || (user?.company ?? user?.title)}</p>
                        </div>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em]" style={isDark ? {borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)'} : {borderColor: '#e2e8f0', color: '#64748b'}}>
                        {role === "client" ? "Client" : role === "admin" ? "Admin" : "Firm"}
                      </span>
                    </div>
                    <NavLink
                      className={({ isActive }) =>
                        cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.79rem] transition", isActive ? navActiveClass : navHoverClass)
                      }
                      to={settingsPath}
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setMobileNavOpen(false);
                      }}
                    >
                      <NavIcon icon="settings" />
                      <span>Settings</span>
                    </NavLink>
                    <button className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.79rem] transition", navHoverClass)} type="button">
                      <svg className="h-[1rem] w-[1rem]" fill="none" viewBox="0 0 24 24">
                        <path
                          d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 9v3m0 3h.01"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                      <span>Help & support</span>
                    </button>
                    <button
                      className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.79rem] transition text-red-600 hover:bg-red-50", isDark && "text-red-400 hover:bg-red-950/20")}
                      onClick={logout}
                      type="button"
                    >
                      <SignOutIcon />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </aside>

        <main className="min-w-0 flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/92 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Open navigation"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {role} workspace
                    </p>
                    {role === "admin" ? (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-amber-700">
                        Admin only
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1 text-[1.12rem] font-semibold text-slate-950">{activePageLabel}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={toggleTheme}
                  type="button"
                >
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
                {user?.company ? (
                  <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm text-slate-500 lg:inline-flex">
                    {user.company}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div
            className={cn(
              "mx-auto flex min-h-0 w-full flex-1 flex-col py-4",
              useWideContentCanvas ? "max-w-[1720px] px-3 sm:px-4 lg:px-6" : "max-w-[1320px] px-4 sm:px-6 lg:px-8",
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
