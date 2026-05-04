import { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../app/auth";
import type { Role } from "../types/portal";
import { cn } from "../utils/cn";
import { navigationByRole } from "../utils/navigation";

interface WorkspaceLayoutProps {
  role: Role;
}

export function WorkspaceLayout({ role }: WorkspaceLayoutProps) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigation = navigationByRole[role];

  const activeItem = useMemo(
    () =>
      navigation.find((item) => location.pathname.startsWith(item.to)) ?? navigation[0],
    [location.pathname, navigation],
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white lg:w-72 lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Accounting Document Control
              </p>
              <h1 className="mt-2 text-xl font-semibold text-white">Compliance Portal</h1>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
              {user?.initials}
            </span>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="mt-1 text-sm text-slate-300">{user?.title}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
              {user?.company}
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-2xl px-4 py-3 transition",
                    isActive
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-white/8 hover:text-white",
                  )
                }
                to={item.to}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-inherit/70">{item.description}</p>
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-brand-400/30 bg-brand-500/10 p-4">
            <p className="text-sm font-medium text-white">Workflow rule</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Months stay open until every required slot is present and review comments are resolved.
            </p>
          </div>

          <button
            className="mt-8 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/8"
            onClick={logout}
            type="button"
          >
            Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {role}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{activeItem.label}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  Workflow-first, structured, and audit ready
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
                  Accounting Workspace
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
