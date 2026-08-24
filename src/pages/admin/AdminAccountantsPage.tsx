import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, ClipboardCheck, Search, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { ManagedAccountant, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";

interface BackendAdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profileJson?: string | null;
  securityJson?: string | null;
  securityStatus?: string | null;
}

interface BackendAssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
  createdAtUtc: string;
}

interface BackendReviewQueueRecord {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  status?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

type TeamFilter = "all" | ManagedAccountant["status"];

function normalizeAccountantStatus(status?: string | null): ManagedAccountant["status"] {
  switch ((status ?? "").trim().toLowerCase()) {
    case "invited":
      return "capacity_available";
    case "disabled":
    case "locked":
      return "busy";
    default:
      return "active";
  }
}

function mapLiveAccountants(
  users: BackendAdminUserRecord[],
  assignments: BackendAssignmentRecord[],
  reviewQueue: BackendReviewQueueRecord[],
): ManagedAccountant[] {
  return users
    .filter((user) => user.role.trim().toLowerCase() === "accountant")
    .map((user) => {
      const assignedClientCount = assignments.filter(
        (assignment) => assignment.accountantUserId === user.id,
      ).length;
      const openReviews = reviewQueue.filter((item) => {
        const status = (item.status ?? "").trim().toLowerCase();
        return item.assignedToUserId === user.id && status !== "approved" && status !== "rejected";
      }).length;

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        title: "Accountant",
        assignedClientCount,
        openReviews,
        status:
          openReviews >= 8
            ? "busy"
            : assignedClientCount <= 2
              ? "capacity_available"
              : normalizeAccountantStatus(user.securityStatus),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function statusClasses(status: ManagedAccountant["status"]) {
  if (status === "busy") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "capacity_available") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function workloadLabel(openReviews: number) {
  if (openReviews >= 8) return "High review pressure";
  if (openReviews >= 4) return "Moderate review load";
  return "Healthy review load";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminAccountantsPage() {
  const navigate = useNavigate();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveAccountants, setLiveAccountants] = useState<ManagedAccountant[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isMounted = true;

    async function loadLiveAccountants() {
      try {
        const [users, assignments, reviewQueue] = await Promise.all([
          apiGetJson<BackendAdminUserRecord[]>("/api/admin/users"),
          apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
          apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
        ]);

        if (!isMounted) {
          return;
        }

        setLiveAccountants(mapLiveAccountants(users, assignments, reviewQueue));
        setFeedbackNotice(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedbackNotice({
          tone: "warning",
          title: "Live accountant view unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The accountant management page could not load live backend data. The seeded workspace is shown only as a temporary fallback.",
        });
      }
    }

    void loadLiveAccountants();

    return () => {
      isMounted = false;
    };
  }, [backendMode]);

  const accountants = useMemo(
    () => (backendMode && liveAccountants ? liveAccountants : portal.managedAccountants),
    [backendMode, liveAccountants, portal.managedAccountants],
  );

  const summary = useMemo(() => {
    const totalClients = accountants.reduce((sum, accountant) => sum + accountant.assignedClientCount, 0);
    const totalReviews = accountants.reduce((sum, accountant) => sum + accountant.openReviews, 0);
    const busy = accountants.filter((accountant) => accountant.status === "busy").length;
    const available = accountants.filter((accountant) => accountant.status === "capacity_available").length;

    return { totalClients, totalReviews, busy, available };
  }, [accountants]);

  const filteredAccountants = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return accountants.filter((accountant) => {
      const matchesSearch =
        !query ||
        accountant.name.toLowerCase().includes(query) ||
        accountant.email.toLowerCase().includes(query);
      const matchesFilter = teamFilter === "all" || accountant.status === teamFilter;
      return matchesSearch && matchesFilter;
    });
  }, [accountants, searchTerm, teamFilter]);

  const metrics = [
    {
      label: "Accountants",
      value: accountants.length,
      helper: `${summary.available} with capacity`,
      icon: UsersRound,
    },
    {
      label: "Assigned clients",
      value: summary.totalClients,
      helper: "Across the current team",
      icon: BriefcaseBusiness,
    },
    {
      label: "Open reviews",
      value: summary.totalReviews,
      helper: "Current review workload",
      icon: ClipboardCheck,
    },
    {
      label: "Capacity risks",
      value: summary.busy,
      helper: summary.busy > 0 ? "Rebalancing may be needed" : "No overloaded accountants",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => navigate("/firm/admin/assignments")}
              variant="secondary"
            >
              Manage assignments
            </Button>
            <Button onClick={() => navigate("/firm/admin/system-settings")}>
              Manage user access
            </Button>
          </>
        }
        description="Manage accountant capacity, portfolio ownership, review pressure, and access from one operational team view."
        eyebrow="Admin · Team"
        title="Accountant management"
      />

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <SurfaceCard className="space-y-4" key={metric.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-brand-700 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="text-sm text-slate-500">{metric.helper}</p>
            </SurfaceCard>
          );
        })}
      </div>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Team capacity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review individual workloads before assigning additional clients or month-end reviews.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or email"
                type="search"
                value={searchTerm}
              />
            </label>
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
              onChange={(event) => setTeamFilter(event.target.value as TeamFilter)}
              value={teamFilter}
            >
              <option value="all">All capacity states</option>
              <option value="active">Active</option>
              <option value="capacity_available">Capacity available</option>
              <option value="busy">Busy</option>
            </select>
          </div>
        </div>

        {filteredAccountants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-3.5">Accountant</th>
                  <th className="px-5 py-3.5">Assigned clients</th>
                  <th className="px-5 py-3.5">Open reviews</th>
                  <th className="px-5 py-3.5">Workload</th>
                  <th className="px-5 py-3.5">Capacity</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAccountants.map((accountant) => (
                  <tr className="transition hover:bg-slate-50/70" key={accountant.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
                          {getInitials(accountant.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{accountant.name}</p>
                          <p className="mt-0.5 truncate text-[13px] text-slate-500">{accountant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {accountant.assignedClientCount}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {accountant.openReviews}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {workloadLabel(accountant.openReviews)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset",
                          statusClasses(accountant.status),
                        )}
                      >
                        {accountant.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="text-sm font-semibold text-brand-700 transition hover:text-brand-800"
                        onClick={() => navigate("/firm/admin/assignments")}
                        type="button"
                      >
                        Review allocation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">No accountants match this view.</p>
            <p className="mt-1 text-sm text-slate-500">Clear the search or choose a different capacity filter.</p>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
