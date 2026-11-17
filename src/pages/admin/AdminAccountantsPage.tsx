import { accountAccessStatus, type AccountAccessStatus } from "../../services/accountAccess";
import "./adminDirectories.css";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageSection } from "../../components/ui/PageSection";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";
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
  documentId: string;
  clientId?: string | null;
  clientName?: string | null;
  documentStatus?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

type TeamFilter = "all" | AccountAccessStatus;
interface AccountantDirectoryRecord { id: string; name: string; email: string; assignedClientCount: number; openReviews: number; status: AccountAccessStatus; }

function mapLiveAccountants(
  users: BackendAdminUserRecord[],
  assignments: BackendAssignmentRecord[],
  reviewQueue: BackendReviewQueueRecord[],
): AccountantDirectoryRecord[] {
  return users
    .filter((user) => user.role.trim().toLowerCase() === "accountant")
    .map((user) => {
      const assignedClientCount = assignments.filter(
        (assignment) => assignment.accountantUserId === user.id,
      ).length;
      const openReviews = reviewQueue.filter((item) => {
        const status = (item.documentStatus ?? "").trim().toLowerCase();
        return assignments.some(assignment => assignment.accountantUserId === user.id && assignment.clientId === item.clientId) && status !== "approved" && status !== "rejected";
      }).length;

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        title: "Accountant",
        assignedClientCount,
        openReviews,
        status: accountAccessStatus(user),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function statusClasses(status: AccountAccessStatus) {
  if (status === "disabled" || status === "locked") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-sky-50 text-sky-700 ring-sky-200";
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
  const [liveAccountants, setLiveAccountants] = useState<AccountantDirectoryRecord[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");

  useEffect(() => {
    if (!backendMode) return;

    let isMounted = true;
    async function loadLiveAccountants() {
      try {
        const [users, assignments, reviewQueue] = await Promise.all([
          apiGetJson("/api/admin/users"),
          apiGetJson("/api/assignments"),
          apiGetJson("/api/review-queue"),
        ]);
        if (!isMounted) return;
        setLiveAccountants(mapLiveAccountants(users, assignments, reviewQueue));
        setFeedbackNotice(null);
      } catch (error) {
        if (!isMounted) return;
        setFeedbackNotice({
          tone: "warning",
          title: "Live accountant view unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The accountant management page could not load live backend data. No demo records are being shown.",
        });
      }
    }

    void loadLiveAccountants();
    return () => { isMounted = false; };
  }, [backendMode]);

  const accountants = useMemo(
    () => (backendMode ? liveAccountants ?? [] : portal.managedAccountants.map(accountant => ({ ...accountant, status: accountant.status === "active" ? "active" as const : "unknown" as const }))),
    [backendMode, liveAccountants, portal.managedAccountants],
  );

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

  const activeCount = accountants.filter(accountant => accountant.status === "active").length;

  return (
    <div className="admin-directory admin-accountants">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate("/firm/admin/assignments")} variant="secondary">
              Manage assignments
            </Button>
            <Button onClick={() => navigate("/firm/admin/users")}>Manage user access</Button>
          </>
        }
        description="View client allocations and outstanding reviews across your team."
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

      <PageSection className="admin-register overflow-hidden">
        <div className="admin-directory-toolbar flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="portal-section-title text-slate-950">Accountant directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              {accountants.length} accountants · {activeCount} active accounts. Review counts show outstanding submissions, not available capacity.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search accountants"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or email"
                type="search"
                value={searchTerm}
              />
            </label>
            <select
              aria-label="Filter accountant account status"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
              onChange={(event) => setTeamFilter(event.target.value as TeamFilter)}
              value={teamFilter}
            >
              <option value="all">All account statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="disabled">Disabled</option><option value="locked">Locked</option><option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {backendMode && liveAccountants === null && !feedbackNotice ? <p role="status" className="admin-directory-loading">Loading accountants…</p> : filteredAccountants.length > 0 ? (
          <div className="admin-directory-table overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <th scope="col" className="px-5 py-3.5">Accountant</th>
                  <th scope="col" className="px-5 py-3.5">Assigned clients</th>
                  <th scope="col" className="px-5 py-3.5">Open reviews</th>

                  <th scope="col" className="px-5 py-3.5">Account status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
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
                          <p className="mt-0.5 truncate text-sm text-slate-500">{accountant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{accountant.assignedClientCount}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{accountant.openReviews}</td>

                    <td className="px-5 py-4">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", statusClasses(accountant.status))}>
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
            <p className="mt-1 text-sm text-slate-500">Clear the search or choose a different account status.</p>
          </div>
        )}
      </PageSection>
    </div>
  );
}
