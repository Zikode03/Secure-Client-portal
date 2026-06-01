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

function SupportIcon() {
  return (
    <svg className="h-[1.05rem] w-[1.05rem]" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 12a6.5 6.5 0 1 1 13 0v4.25a1.75 1.75 0 0 1-1.75 1.75H15.5v-4.75h3M5.5 13.25h3V18H7.25A1.75 1.75 0 0 1 5.5 16.25V12Zm6.5 6h2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
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
  const navigation = navigationByRole[role];
  const groupedNavigation = useMemo(() => groupNavigation(navigation), [navigation]);

  const activeItem = useMemo(
    () =>
      navigation.find((item) => location.pathname.startsWith(item.to)) ?? navigation[0],
    [location.pathname, navigation],
  );

  return (
    <div className="min-h-screen bg-slate-100">
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
            "fixed inset-y-0 left-0 z-40 w-[86vw] max-w-[320px] -translate-x-full border-b px-4 py-5 text-white shadow-[8px_0_30px_rgba(15,23,42,0.18)] transition-transform lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-3",
            "lg:w-[280px]",
            theme === "dark"
              ? "border-slate-900 bg-[linear-gradient(180deg,#0a0f1e_0%,#060b16_100%)] lg:border-slate-900"
              : "border-brand-900/70 bg-[linear-gradient(180deg,#0a2f66_0%,#07244f_100%)] lg:border-brand-900/70",
            mobileNavOpen && "translate-x-0",
          )}
        >
          <div className="flex h-full min-h-0 flex-col rounded-[1.25rem] border border-white/8 bg-white/[0.02] px-3 py-3">
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                  <PortalMark />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.92rem] font-semibold leading-5 text-white">Compliance Portal</p>
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-slate-300/80">
                    {role} workspace
                  </p>
                </div>
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent]">
              {Object.entries(groupedNavigation).map(([section, items]) => (
                <div key={section}>
                  <p className="px-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-300/65">
                    {section}
                  </p>
                  <div className="mt-2 space-y-1">
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2 transition-all duration-150",
                            isActive
                              ? "bg-white/12 text-white ring-1 ring-white/20"
                              : "text-slate-200/90 hover:bg-white/7 hover:text-white",
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
                                "absolute bottom-1.5 top-1.5 left-0 w-0.5 rounded-r-full transition",
                                isActive ? "bg-brand-300" : "bg-transparent",
                              )}
                            />
                            <span
                              className={cn(
                                "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition",
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "text-slate-300/80 group-hover:bg-white/8 group-hover:text-white",
                              )}
                            >
                              <NavIcon icon={item.icon} />
                            </span>
                            <span className="min-w-0 flex-1 text-[0.83rem] font-medium">
                              {item.label}
                            </span>
                            {item.badge ? (
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

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                    {user?.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.86rem] font-semibold text-white">{user?.name}</p>
                    <p className="truncate text-[0.72rem] text-slate-300/90">{user?.title}</p>
                  </div>
                </div>
              </div>

              <button
                className="mt-2.5 flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-slate-200/90 transition hover:bg-white/7 hover:text-white"
                type="button"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/8 text-slate-100">
                  <SupportIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.81rem] font-medium">Need help?</span>
                  <span className="block text-[0.7rem] text-slate-300/80">Contact support</span>
                </span>
                <span className="text-slate-300/70">{">"}</span>
              </button>

              <button
                className="mt-2 flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/8 px-3 py-2.5 text-[0.8rem] font-medium text-white transition hover:bg-white/15"
                onClick={logout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
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
                  <h2 className="mt-1 text-[1.12rem] font-semibold text-slate-950">{activeItem.label}</h2>
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

          <div className="mx-auto w-full max-w-[1320px] px-4 py-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
