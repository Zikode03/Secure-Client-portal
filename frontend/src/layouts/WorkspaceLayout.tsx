import { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/auth";
import type { Role } from "../types/portal";
import { cn } from "../utils/cn";
import type { NavigationIcon, NavigationItem } from "../utils/navigation";
import { navigationByRole } from "../utils/navigation";

interface WorkspaceLayoutProps {
  role: Role;
}

function PortalMark() {
  return (
    <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
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

export function WorkspaceLayout({ role }: WorkspaceLayoutProps) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigation = navigationByRole[role];
  const groupedNavigation = useMemo(() => groupNavigation(navigation), [navigation]);

  const activeItem = useMemo(
    () =>
      navigation.find((item) => location.pathname.startsWith(item.to)) ?? navigation[0],
    [location.pathname, navigation],
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-800 bg-[linear-gradient(180deg,#151b34_0%,#10162c_100%)] px-4 py-5 text-white shadow-[8px_0_30px_rgba(15,23,42,0.18)] lg:w-[284px] lg:border-b-0 lg:border-r lg:border-slate-800 lg:px-3 lg:py-3">
          <div className="rounded-[1.35rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] px-4 py-4 lg:min-h-[calc(100vh-1.5rem)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/20">
                <PortalMark />
              </div>
              <div>
                <p className="text-[1.02rem] font-semibold leading-5 text-white">Compliance</p>
                <p className="text-[1.02rem] font-semibold leading-5 text-white/96">Portal</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-white/6 bg-white/[0.04] px-3.5 py-3.5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.28)]">
                  {user?.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.92rem] font-semibold text-white">{user?.name}</p>
                  <p className="mt-0.5 truncate text-[0.74rem] text-slate-300">{user?.title}</p>
                  <p className="mt-0.5 truncate text-[0.74rem] text-slate-300">{user?.company}</p>
                </div>
                <span className="mt-1 text-slate-400">...</span>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {Object.entries(groupedNavigation).map(([section, items]) => (
                <div key={section}>
                  <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {section}
                  </p>
                  <div className="mt-2 space-y-1">
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 transition",
                            isActive
                              ? "bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                              : "text-slate-300 hover:bg-white/5 hover:text-white",
                          )
                        }
                        to={item.to}
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-xl",
                                isActive
                                  ? "bg-indigo-500/18 text-indigo-300"
                                  : "text-slate-400",
                              )}
                            >
                              <NavIcon icon={item.icon} />
                            </span>
                            <span className="min-w-0 flex-1 text-[0.86rem] font-medium">
                              {item.label}
                            </span>
                            {item.badge ? (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[0.68rem] font-semibold text-white">
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
            </div>

            <div className="mt-6 rounded-[1rem] border border-white/6 bg-white/[0.04] px-3.5 py-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-slate-200">
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M8 11V8a4 4 0 1 1 8 0v3m-9 9h10a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.78rem] font-semibold text-white">Your data is safe</p>
                  <p className="mt-1 text-[0.72rem] leading-5 text-slate-400">
                    256-bit encrypted and audit-ready.
                  </p>
                </div>
                <span className="text-slate-500">{">"}</span>
              </div>
            </div>

            <button
              className="mt-4 flex w-full items-center justify-center rounded-[0.95rem] border border-white/8 px-3 py-2.5 text-[0.84rem] font-medium text-slate-200 transition hover:bg-white/6"
              onClick={logout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white/92 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {role} workspace
                </p>
                <h2 className="mt-1 text-[1.12rem] font-semibold text-slate-950">{activeItem.label}</h2>
              </div>
              <div className="flex items-center gap-3">
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
