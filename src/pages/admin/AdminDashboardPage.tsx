import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  securityStatus?: string | null;
}

interface ClientRecord {
  id: string;
  name: string;
  entityType: string;
  status: string;
  complianceHealth: number;
  assignedAccountantId?: string | null;
}

interface AssignmentRecord {
  id: string;
  clientId: string;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
}

interface ReviewRecord {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  status?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
}

interface AuditRecord {
  id: string;
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  clientId?: string | null;
  createdAtUtc: string;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

interface DashboardState {
  users: AdminUserRecord[];
  clients: ClientRecord[];
  assignments: AssignmentRecord[];
  reviews: ReviewRecord[];
  audit: AuditRecord[];
}

const emptyState: DashboardState = {
  users: [],
  clients: [],
  assignments: [],
  reviews: [],
  audit: [],
};

function securityStatus(user: AdminUserRecord) {
  return (user.securityStatus ?? "active").trim().toLowerCase();
}

function isOpenReview(review: ReviewRecord) {
  const status = (review.status ?? "").trim().toLowerCase();
  return status !== "approved" && status !== "rejected" && status !== "completed" && status !== "closed";
}

function formatAction(action: string) {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const backendMode = hasApiBaseUrl();
  const [data, setData] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      setFeedback({
        tone: "warning",
        title: "Backend required",
        message: "The Admin Dashboard is a live control surface and requires the backend API.",
      });
      return;
    }

    let mounted = true;

    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        apiGetJson<AdminUserRecord[]>("/api/admin/users"),
        apiGetJson<ClientRecord[]>("/api/clients"),
        apiGetJson<AssignmentRecord[]>("/api/assignments"),
        apiGetJson<ReviewRecord[]>("/api/review-queue"),
        apiGetJson<AuditRecord[]>("/api/audit-logs?limit=50"),
      ]);

      if (!mounted) return;

      const [users, clients, assignments, reviews, audit] = results;
      const criticalFailure = users.status === "rejected" || clients.status === "rejected" || assignments.status === "rejected";

      if (criticalFailure) {
        const firstError = [users, clients, assignments].find((result) => result.status === "rejected");
        const reason = firstError?.status === "rejected" ? firstError.reason : null;
        setFeedback({
          tone: "danger",
          title: "Admin dashboard could not load",
          message: reason instanceof ApiError ? reason.message : "Core administration data could not be loaded.",
        });
      } else {
        setFeedback(
          reviews.status === "rejected" || audit.status === "rejected"
            ? {
                tone: "warning",
                title: "Partial admin data",
                message: "Core administration data loaded, but one secondary feed is currently unavailable.",
              }
            : null,
        );
      }

      setData({
        users: users.status === "fulfilled" ? users.value : [],
        clients: clients.status === "fulfilled" ? clients.value : [],
        assignments: assignments.status === "fulfilled" ? assignments.value : [],
        reviews: reviews.status === "fulfilled" ? reviews.value : [],
        audit: audit.status === "fulfilled" ? audit.value : [],
      });
      setLoading(false);
    }

    void load();
    return () => { mounted = false; };
  }, [backendMode]);

  const accountants = useMemo(
    () => data.users.filter((user) => user.role.trim().toLowerCase() === "accountant"),
    [data.users],
  );

  const restrictedUsers = useMemo(
    () => data.users.filter((user) => ["disabled", "locked", "reset_pending", "password_reset_required"].includes(securityStatus(user))),
    [data.users],
  );

  const unassignedClients = useMemo(() => {
    return data.clients.filter((client) => {
      const hasAssignment = data.assignments.some((assignment) => assignment.clientId === client.id);
      return !hasAssignment && !client.assignedAccountantId;
    });
  }, [data.assignments, data.clients]);

  const atRiskClients = useMemo(
    () => [...data.clients]
      .filter((client) => client.status.toLowerCase() !== "active" || client.complianceHealth < 60)
      .sort((left, right) => left.complianceHealth - right.complianceHealth),
    [data.clients],
  );

  const openReviews = useMemo(() => data.reviews.filter(isOpenReview), [data.reviews]);

  const capacityRows = useMemo(() => {
    return accountants
      .map((accountant) => {
        const assignedClients = data.assignments.filter((assignment) => assignment.accountantUserId === accountant.id).length;
        const reviews = openReviews.filter((review) => review.assignedToUserId === accountant.id).length;
        const score = assignedClients + reviews * 2;
        return { accountant, assignedClients, reviews, score };
      })
      .sort((left, right) => right.score - left.score);
  }, [accountants, data.assignments, openReviews]);

  const overloadedAccountants = useMemo(
    () => capacityRows.filter((row) => row.assignedClients >= 8 || row.reviews >= 5),
    [capacityRows],
  );

  const recentAudit = useMemo(
    () => [...data.audit]
      .sort((left, right) => new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime())
      .slice(0, 6),
    [data.audit],
  );

  const actorName = (actorUserId?: string | null) =>
    data.users.find((user) => user.id === actorUserId)?.fullName ?? "System";

  const interventionCount = unassignedClients.length + restrictedUsers.length + overloadedAccountants.length + atRiskClients.length;

  const summaryCards = [
    {
      label: "Admin interventions",
      value: interventionCount,
      helper: interventionCount === 0 ? "No immediate admin exceptions" : "Items requiring administrative attention",
      action: () => navigate("/firm/admin/audit"),
    },
    {
      label: "Unassigned clients",
      value: unassignedClients.length,
      helper: "Clients without accountant ownership",
      action: () => navigate("/firm/admin/assignments"),
    },
    {
      label: "Restricted users",
      value: restrictedUsers.length,
      helper: "Disabled, locked, or reset-pending accounts",
      action: () => navigate("/firm/admin/users"),
    },
    {
      label: "Open reviews",
      value: openReviews.length,
      helper: `${overloadedAccountants.length} accountants currently over threshold`,
      action: () => navigate("/firm/review"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate("/firm/admin/users")} variant="secondary">Manage users</Button>
            <Button onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button>
          </>
        }
        description="Monitor firm-wide access, ownership, workload, compliance risk, and security activity from one administration control centre."
        eyebrow="Administration"
        title="Admin control centre"
      />

      {feedback ? (
        <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <button className="text-left" key={card.label} onClick={card.action} type="button">
            <SurfaceCard className="h-full space-y-2 transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="text-[2rem] font-semibold tracking-tight text-slate-950">{card.value}</p>
              <p className="text-sm leading-6 text-slate-500">{card.helper}</p>
            </SurfaceCard>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="portal-section-title text-slate-950">Needs admin intervention</h2>
              <p className="mt-1 text-sm text-slate-500">Exceptions that require ownership, access, or workload decisions.</p>
            </div>
            <Button onClick={() => navigate("/firm/admin/assignments")} size="sm" variant="secondary">Open assignments</Button>
          </div>

          <div className="space-y-3">
            {unassignedClients.slice(0, 4).map((client) => (
              <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left" key={`unassigned-${client.id}`} onClick={() => navigate("/firm/admin/assignments")} type="button">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{client.name}</p>
                  <p className="mt-1 text-xs text-slate-600">No accountant assigned</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">Assign</span>
              </button>
            ))}

            {restrictedUsers.slice(0, 3).map((user) => (
              <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-left" key={`restricted-${user.id}`} onClick={() => navigate("/firm/admin/users")} type="button">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{user.fullName}</p>
                  <p className="mt-1 text-xs text-slate-600">{user.email} · {securityStatus(user).replace(/_/g, " ")}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-700">Review access</span>
              </button>
            ))}

            {overloadedAccountants.slice(0, 3).map((row) => (
              <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left" key={`capacity-${row.accountant.id}`} onClick={() => navigate("/firm/admin/accountants")} type="button">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{row.accountant.fullName}</p>
                  <p className="mt-1 text-xs text-slate-600">{row.assignedClients} clients · {row.reviews} open reviews</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Rebalance</span>
              </button>
            ))}

            {!loading && interventionCount === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
                <p className="text-sm font-semibold text-emerald-800">No immediate admin intervention required.</p>
                <p className="mt-1 text-sm text-emerald-700">Ownership, access, and workload thresholds are currently clear.</p>
              </div>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="portal-section-title text-slate-950">Team capacity</h2>
              <p className="mt-1 text-sm text-slate-500">Firm-wide assignment and review pressure by accountant.</p>
            </div>
            <Button onClick={() => navigate("/firm/admin/accountants")} size="sm" variant="secondary">Manage team</Button>
          </div>

          <div className="space-y-3">
            {capacityRows.slice(0, 6).map((row) => (
              <div className="rounded-2xl border border-slate-200 px-4 py-3" key={row.accountant.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.accountant.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.assignedClients} clients · {row.reviews} reviews</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.assignedClients >= 8 || row.reviews >= 5 ? "bg-rose-50 text-rose-700" : row.assignedClients <= 2 && row.reviews <= 2 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {row.assignedClients >= 8 || row.reviews >= 5 ? "Overloaded" : row.assignedClients <= 2 && row.reviews <= 2 ? "Capacity" : "Balanced"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="portal-section-title text-slate-950">Client risk watch</h2>
              <p className="mt-1 text-sm text-slate-500">Lowest compliance health and inactive client records.</p>
            </div>
            <Button onClick={() => navigate("/firm/clients")} size="sm" variant="secondary">Open clients</Button>
          </div>
          <div className="space-y-3">
            {atRiskClients.slice(0, 6).map((client) => (
              <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 text-left" key={client.id} onClick={() => navigate(`/firm/clients/${client.id}/profile`)} type="button">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{client.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{client.entityType} · {client.status}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${client.complianceHealth < 60 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{client.complianceHealth}% health</span>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="portal-section-title text-slate-950">Recent audit & security activity</h2>
              <p className="mt-1 text-sm text-slate-500">Latest administrative and system actions.</p>
            </div>
            <Button onClick={() => navigate("/firm/admin/audit")} size="sm" variant="secondary">View audit</Button>
          </div>
          <div className="space-y-3">
            {recentAudit.map((item) => (
              <div className="rounded-2xl border border-slate-200 px-4 py-3" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{formatAction(item.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">{actorName(item.actorUserId)} · {item.actorRole} · {item.entityType}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(item.createdAtUtc)}</span>
                </div>
              </div>
            ))}
            {!loading && recentAudit.length === 0 ? <p className="text-sm text-slate-500">No recent audit events were returned.</p> : null}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-4">
        <div>
          <h2 className="portal-section-title text-slate-950">Administration shortcuts</h2>
          <p className="mt-1 text-sm text-slate-500">Jump directly to the control area you need.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Button onClick={() => navigate("/firm/admin/users")} variant="secondary">Users & access</Button>
          <Button onClick={() => navigate("/firm/admin/roles")} variant="secondary">Roles & permissions</Button>
          <Button onClick={() => navigate("/firm/admin/assignments")} variant="secondary">Assignments</Button>
          <Button onClick={() => navigate("/firm/admin/audit")} variant="secondary">Audit & security</Button>
          <Button onClick={() => navigate("/firm/admin/system-settings")} variant="secondary">System settings</Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
