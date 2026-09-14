import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardCheck, ShieldCheck, ShieldX, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";
import "./adminOverview.css";

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
  const [loading, setLoading] = useState(backendMode);
  const [available, setAvailable] = useState({ core: false, reviews: false, audit: false });
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
      setAvailable({ core: !criticalFailure, reviews: reviews.status === "fulfilled", audit: audit.status === "fulfilled" });

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
      label: "Needs attention",
      value: interventionCount,
      icon: <AlertTriangle />,
      available: available.core && available.reviews,
      action: () => document.getElementById("admin-attention")?.focus(),
    },
    {
      label: "Unassigned clients",
      value: unassignedClients.length,
      icon: <BriefcaseBusiness />,
      available: available.core,
      action: () => navigate("/firm/admin/assignments"),
    },
    {
      label: "Restricted users",
      value: restrictedUsers.length,
      icon: <ShieldX />,
      available: available.core,
      action: () => navigate("/firm/admin/users"),
    },
    {
      label: "Open reviews",
      value: openReviews.length,
      icon: <ClipboardCheck />,
      available: available.reviews,
      action: () => navigate("/firm/review"),
    },
  ];

  const allAvailable = available.core && available.reviews;
  const notice = (ready: boolean, empty: string) => (
    <p className="admin-overview-empty">{loading ? "Loading live data…" : ready ? empty : "Data unavailable. Please try again later."}</p>
  );
  const sectionLink = (label: string, path: string) => (
    <button className="admin-overview-link" onClick={() => navigate(path)} type="button">
      {label}<ArrowRight aria-hidden="true" size={15} />
    </button>
  );
  const attentionItems = [
    ...unassignedClients.map(client => ({
      id: `unassigned-${client.id}`, name: client.name, detail: "No accountant assigned",
      action: "Assign owner", path: "/firm/admin/assignments", category: "Ownership",
    })),
    ...restrictedUsers.map(user => ({
      id: `restricted-${user.id}`, name: user.fullName,
      detail: securityStatus(user).replace(/_/g, " "),
      action: "Review access", path: "/firm/admin/users", category: "Access",
    })),
    ...overloadedAccountants.map(row => ({
      id: `capacity-${row.accountant.id}`, name: row.accountant.fullName,
      detail: `${row.assignedClients} clients · ${row.reviews} open reviews`,
      action: "Review workload", path: "/firm/admin/accountants", category: "Workload",
    })),
    ...atRiskClients.map(client => ({
      id: `risk-${client.id}`, name: client.name,
      detail: `${client.complianceHealth}% compliance health · ${client.status}`,
      action: "View client", path: `/firm/clients/${client.id}/profile`, category: "Client risk",
    })),
  ];

  return (
    <div className="admin-overview space-y-6">
      <div className="admin-overview-hero">
      <PageHeader
        actions={<>
          <Button onClick={() => navigate("/firm/admin/users")} variant="secondary">Manage users</Button>
          <Button onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button>
        </>}
        description="A clear view of client ownership, team workload and account access."
        eyebrow="Firm overview"
        title="Your firm, at a glance"
      />
      <div className="admin-overview-hero-footer">
        <span><ShieldCheck size={16} aria-hidden="true" /> Administration workspace</span>
        {!loading && available.core && <span>{data.clients.length} {data.clients.length === 1 ? "client" : "clients"}<i aria-hidden="true" />{accountants.length} {accountants.length === 1 ? "accountant" : "accountants"}</span>}
      </div>
      </div>
      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <section aria-label="Administration metrics" className="admin-overview-metrics grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(card => (
          <KpiCard key={card.label} accent={card.available && card.value > 0} icon={card.icon}
            label={card.label} onClick={card.action}
            value={loading ? "…" : card.available ? card.value : "—"} />
        ))}
      </section>

      <div className="admin-overview-columns">
        <div className="admin-overview-workspace min-w-0">
          <section id="admin-attention" tabIndex={-1} aria-labelledby="admin-attention-heading" className="admin-overview-section">
            <div className="admin-overview-section-heading">
              <div>
                <h2 id="admin-attention-heading" className="admin-overview-section-title text-slate-950"><span className="admin-overview-section-icon is-amber"><AlertTriangle size={18} aria-hidden="true" /></span>Needs attention</h2>
                <p className="mt-1 text-sm text-slate-500">Ownership, access and risk decisions to follow up.</p>
              </div>
              {allAvailable && !loading && <span className="admin-overview-count">{interventionCount}</span>}
            </div>
            {loading || !allAvailable ? notice(false, "") : attentionItems.length ? (
              <ul className="admin-overview-list">
                {attentionItems.slice(0, 8).map(item => (
                  <li key={item.id} className="admin-overview-attention-row">
                    <span className="admin-overview-marker"><AlertTriangle aria-hidden="true" size={17} /></span>
                    <div className="min-w-0">
                      <p className="admin-overview-category">{item.category}</p>
                      <p className="break-words text-sm font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{item.detail}</p>
                    </div>
                    {sectionLink(item.action, item.path)}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-overview-clear">
                <CheckCircle2 aria-hidden="true" size={24} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">You're up to date</p>
                  <p className="mt-1 text-sm text-slate-500">No ownership, access, workload or client-risk exceptions.</p>
                </div>
              </div>
            )}
            {!loading && allAvailable && attentionItems.length > 8 && <p className="mt-3 text-xs text-slate-500">Showing 8 of {attentionItems.length} exceptions. Open the relevant register to review all.</p>}
          </section>

          <section aria-labelledby="admin-team-heading" className="admin-overview-section">
            <div className="admin-overview-section-heading">
              <div>
                <h2 id="admin-team-heading" className="admin-overview-section-title text-slate-950"><span className="admin-overview-section-icon is-blue"><Users size={18} aria-hidden="true" /></span>Team workload</h2>
                <p className="mt-1 text-sm text-slate-500">Client coverage and open reviews by accountant.</p>
              </div>
              {sectionLink("Manage team", "/firm/admin/accountants")}
            </div>
            {loading || !allAvailable || !capacityRows.length ? notice(allAvailable, "No accountants have been added yet.") : (
              <div className="overflow-x-auto">
                <table className="admin-overview-table">
                  <thead><tr><th scope="col">Accountant</th><th scope="col">Clients</th><th scope="col">Reviews</th><th scope="col">Workload</th></tr></thead>
                  <tbody>{capacityRows.slice(0, 6).map(row => {
                    const high = row.assignedClients >= 8 || row.reviews >= 5;
                    const low = row.assignedClients <= 2 && row.reviews <= 2;
                    return <tr key={row.accountant.id}>
                      <th scope="row"><span className="admin-overview-person">
                        <span aria-hidden="true" className="admin-overview-avatar">{row.accountant.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span>
                        <span>{row.accountant.fullName}</span>
                      </span></th>
                      <td className="tabular-nums">{row.assignedClients}</td>
                      <td className="tabular-nums">{row.reviews}</td>
                      <td><span className={`admin-overview-status ${high ? "is-warning" : "is-normal"}`}>{high ? "High workload" : low ? "Available" : "Balanced"}</span></td>
                    </tr>;
                  })}</tbody>
                </table>
                <p className="mt-3 text-xs text-slate-500">High workload: 8+ clients or 5+ open reviews.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="admin-risk-heading" className="admin-overview-section">
            <div className="admin-overview-section-heading">
              <div>
                <h2 id="admin-risk-heading" className="admin-overview-section-title text-slate-950"><span className="admin-overview-section-icon is-mint"><ShieldCheck size={18} aria-hidden="true" /></span>Client risk watch</h2>
                <p className="mt-1 text-sm text-slate-500">Compliance health below 60% or an inactive status.</p>
              </div>
              {sectionLink("All clients", "/firm/clients")}
            </div>
            {loading || !available.core || !atRiskClients.length ? notice(available.core, "No clients currently meet the risk criteria.") : (
              <ul className="admin-overview-list">
                {atRiskClients.slice(0, 6).map(client => (
                  <li key={client.id}>
                    <button className="admin-overview-risk-row" onClick={() => navigate(`/firm/clients/${client.id}/profile`)} type="button">
                      <span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-950">{client.name}</span>
                        <span className="mt-1 block text-xs text-slate-500">{client.entityType} · {client.status}</span></span>
                      <span className="admin-overview-status is-warning">{client.complianceHealth}% health</span>
                      <ArrowRight aria-hidden="true" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="admin-overview-activity" aria-labelledby="admin-activity-heading">
          <div className="admin-overview-section-heading">
            <div>
              <p className="admin-overview-category">Audit & security</p>
              <h2 id="admin-activity-heading" className="text-slate-950">Recent activity</h2>
            </div>
            {sectionLink("View log", "/firm/admin/audit")}
          </div>
          {loading || !available.audit || !recentAudit.length ? notice(available.audit, "No recent audit activity.") : (
            <ol className="admin-overview-timeline">
              {recentAudit.map(item => (
                <li key={item.id}>
                  <p className="break-words text-sm font-semibold text-slate-950">{formatAction(item.action)}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">{actorName(item.actorUserId)} · {item.actorRole} · {item.entityType}</p>
                  <time className="mt-2 block text-xs text-slate-500" dateTime={item.createdAtUtc}>{formatDate(item.createdAtUtc)}</time>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <nav aria-label="Administration shortcuts" className="admin-overview-shortcuts">
        <span className="admin-overview-category">Quick access</span>
        {sectionLink("Users & access", "/firm/admin/users")}
        {sectionLink("Roles & permissions", "/firm/admin/roles")}
        {sectionLink("Assignments", "/firm/admin/assignments")}
        {sectionLink("Audit & security", "/firm/admin/audit")}
        {sectionLink("System settings", "/firm/admin/system-settings")}
      </nav>
    </div>
  );
}
