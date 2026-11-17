import { getTeamProgress, type TeamProgress } from "../../services/teamProgressApi";
import { AdminOperationsPanel } from "./AdminOperationsPanel";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, FolderInput, Settings2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
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
  team: TeamProgress | null;
  audit: AuditRecord[];
}

const emptyState: DashboardState = {
  users: [],
  clients: [],
  assignments: [],
  team: null,
  audit: [],
};

function securityStatus(user: AdminUserRecord) {
  return (user.securityStatus ?? "active").trim().toLowerCase();
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
  const [operationsOpen, setOperationsOpen] = useState(false);
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
        apiGetJson("/api/admin/users"),
        apiGetJson("/api/clients"),
        apiGetJson("/api/assignments"),
        getTeamProgress(),
        apiGetJson("/api/audit-logs?limit=50"),
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
        team: reviews.status === "fulfilled" ? reviews.value : null,
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
      const hasPrimary = data.assignments.some((assignment) => assignment.clientId === client.id && assignment.isPrimary);
      const hasLegacyPrimary = client.assignedAccountantId && client.assignedAccountantId !== "00000000-0000-0000-0000-000000000000";
      return !hasPrimary && !hasLegacyPrimary;
    });
  }, [data.assignments, data.clients]);

  const atRiskClients = useMemo(
    () => [...data.clients]
      .filter((client) => client.status.toLowerCase() !== "active" || client.complianceHealth < 60)
      .sort((left, right) => left.complianceHealth - right.complianceHealth),
    [data.clients],
  );

  const capacityRows = useMemo(() => accountants.map(accountant => {
    const progress = data.team?.accountants.find(person => person.accountantId === accountant.id);
    return { accountant, assignedClients: progress?.primaryClients ?? 0, reviews: (progress?.awaitingReview ?? 0) + (progress?.inReview ?? 0), inReview: progress?.inReview ?? 0 };
  }).sort((left, right) => right.reviews - left.reviews), [accountants, data.team]);

  const recentAudit = useMemo(
    () => [...data.audit]
      .sort((left, right) => new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime())
      .slice(0, 6),
    [data.audit],
  );

  const actorName = (actorUserId?: string | null) =>
    data.users.find((user) => user.id === actorUserId)?.fullName ?? "System";

  const interventionCount = unassignedClients.length + restrictedUsers.length + atRiskClients.length + data.users.filter(user => securityStatus(user) === "invited").length;

  const invitedUsers = data.users.filter(user => securityStatus(user) === "invited");
  const staffAccounts = data.users.filter(user => ["admin", "accountant"].includes(user.role.toLowerCase()));
  const summaryCards = [
    { label: "Client businesses", value: data.clients.length, icon: <Building2 />, available: available.core, hint: "Registered with your firm", action: () => navigate("/firm/clients") },
    { label: "Staff accounts", value: staffAccounts.length, icon: <Users />, available: available.core, hint: "Administrators and accountants", action: () => navigate("/firm/admin/users") },
    { label: "Pending invitations", value: invitedUsers.length, icon: <UserPlus />, available: available.core, hint: "Waiting for account setup", action: () => navigate("/firm/admin/users") },
    { label: "Unassigned clients", value: unassignedClients.length, icon: <BriefcaseBusiness />, available: available.core, hint: "Need a primary accountant", action: () => navigate("/firm/admin/assignments") },
  ];
  const managementAreas = [
    { label: "Users & access", description: "Manage staff invitations, accounts and sign-in access.", icon: Users, path: "/firm/admin/users" },
    { label: "Client businesses", description: "Set up businesses and maintain their profiles.", icon: Building2, path: "/firm/clients" },
    { label: "Team progress", description: "See assignments, recorded activity and work progress.", icon: BriefcaseBusiness, path: "/firm/admin/team-progress" },
    { label: "Roles & permissions", description: "Control who can view records and take action.", icon: ShieldCheck, path: "/firm/admin/roles" },
    { label: "Import clients & documents", description: "Bring existing client records into the firm.", icon: FolderInput, path: "/firm/admin/migration" },
    { label: "Firm settings", description: "Maintain firm details, reminders and email settings.", icon: Settings2, path: "/firm/admin/system-settings" },
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
    ...invitedUsers.map(user => ({ id: `invite-${user.id}`, name: user.fullName, detail: "Invitation awaiting account setup", action: "Review invitation", path: "/firm/admin/users", category: "User onboarding" })),
    ...unassignedClients.map(client => ({
      id: `unassigned-${client.id}`, name: client.name, detail: "No accountant assigned",
      action: "Assign owner", path: "/firm/admin/assignments", category: "Ownership",
    })),
    ...restrictedUsers.map(user => ({
      id: `restricted-${user.id}`, name: user.fullName,
      detail: securityStatus(user).replace(/_/g, " "),
      action: "Review access", path: "/firm/admin/users", category: "Access",
    })),
    ...atRiskClients.map(client => ({
      id: `risk-${client.id}`, name: client.name,
      detail: `${client.complianceHealth}% compliance health · ${client.status}`,
      action: "View client", path: `/firm/clients/${client.id}/profile`, category: "Client risk",
    })),
  ];

  return (
    <div className="admin-overview space-y-6">
      <PageHeader
        actions={<Button onClick={() => navigate("/firm/clients?add=1")}><Building2 size={16} aria-hidden="true" />Add client</Button>}
        description="Manage your firm’s users, client businesses and system controls."
        title="Administration"
      />
      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <section aria-label="Administration metrics" className="admin-overview-metrics grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(card => (
          <button key={card.label} className="admin-overview-metric" onClick={card.action} type="button">
            <span className="admin-overview-metric-top"><span>{card.label}</span><span className="admin-overview-metric-icon" aria-hidden="true">{card.icon}</span></span>
            <span className="admin-overview-metric-value">{loading ? "…" : card.available ? card.value : "—"}</span>
            <span className="admin-overview-metric-link">{card.hint}</span>
          </button>
        ))}
      </section>

      <nav aria-label="Firm administration" className="admin-management">
        <div className="admin-management-heading"><h2>Manage your firm</h2><span>People, records and configuration</span></div>
        <div className="admin-management-grid">{managementAreas.map(({ label, description, icon: Icon, path }) => <button key={path} type="button" className="admin-management-area" onClick={() => navigate(path)}>
          <span className="admin-management-icon"><Icon size={20} aria-hidden="true" /></span>
          <span className="admin-management-copy"><strong>{label}</strong><small>{description}</small></span>
          <ArrowRight className="admin-management-arrow" size={16} aria-hidden="true" />
        </button>)}</div>
      </nav>

      <div className="admin-overview-columns">
        <div className="admin-overview-workspace min-w-0">
          <section id="admin-attention" tabIndex={-1} aria-labelledby="admin-attention-heading" className="admin-overview-section">
            <div className="admin-overview-section-heading">
              <div>
                <h2 id="admin-attention-heading" className="admin-overview-section-title text-slate-950">Needs attention</h2>
                <p className="mt-1 text-sm text-slate-500">Invitations, access changes and client ownership to follow up.</p>
              </div>
              {allAvailable && !loading && <span className="admin-overview-count">{interventionCount}</span>}
            </div>
            {loading || !allAvailable ? notice(false, "") : attentionItems.length ? (
              <ul className="admin-overview-list">
                {attentionItems.slice(0, 8).map(item => (
                  <li key={item.id} className="admin-overview-attention-row">
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
                  <p className="mt-1 text-sm text-slate-500">No pending invitations, access or client-ownership exceptions.</p>
                </div>
              </div>
            )}
            {!loading && allAvailable && attentionItems.length > 8 && <p className="mt-3 text-xs text-slate-500">Showing 8 of {attentionItems.length} exceptions. Open the relevant register to review all.</p>}
          </section>

          <section aria-labelledby="admin-team-heading" className="admin-overview-section">
            <div className="admin-overview-section-heading">
              <div>
                <h2 id="admin-team-heading" className="admin-overview-section-title text-slate-950">Accountant coverage</h2>
                <p className="mt-1 text-sm text-slate-500">Client coverage and open reviews by accountant.</p>
              </div>
              {sectionLink("Team progress", "/firm/admin/team-progress")}
            </div>
            {loading || !allAvailable || !capacityRows.length ? notice(allAvailable, "No accountants have been added yet.") : (
              <div className="overflow-x-auto">
                <table className="admin-overview-table">
                  <thead><tr><th scope="col">Accountant</th><th scope="col">Clients</th><th scope="col">Awaiting decision</th><th scope="col">Recorded status</th><th scope="col">Actions</th></tr></thead>
                  <tbody>{capacityRows.slice(0, 6).map(row => {
                    return <tr key={row.accountant.id}>
                      <th scope="row"><span className="admin-overview-person">
                        <span aria-hidden="true" className="admin-overview-avatar">{row.accountant.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span>
                        <span>{row.accountant.fullName}</span>
                      </span></th>
                      <td className="tabular-nums">{row.assignedClients}</td>
                      <td className="tabular-nums">{row.reviews}</td>
                      <td><span className="admin-overview-status is-normal">{row.inReview ? "Reviews in progress" : row.reviews ? "Awaiting review" : "No pending reviews"}</span></td>
                      <td><Button variant="ghost" size="sm" aria-label={`View progress for ${row.accountant.fullName}`} onClick={() => navigate(`/firm/admin/team-progress?accountantId=${encodeURIComponent(row.accountant.id)}`)}>View</Button></td>
                    </tr>;
                  })}</tbody>
                </table>
                <p className="mt-3 text-xs text-slate-500">Primary assignments and saved review states. Open Team progress for client and month details.</p>
              </div>
            )}
          </section>

        </div>

        <aside className="admin-overview-activity" aria-labelledby="admin-activity-heading">
          <div className="admin-overview-section-heading">
            <div>
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

      <section className="admin-overview-system">
        <button type="button" className="admin-overview-system-toggle" aria-expanded={operationsOpen} aria-controls="admin-system-details" onClick={() => setOperationsOpen(value => !value)}>
          <span><strong>System status</strong><small>Email delivery, automation, storage and backups</small></span>
          <span className="admin-overview-system-action">{operationsOpen ? "Hide details" : "View details"}<ArrowRight size={16} aria-hidden="true" /></span>
        </button>
        <div id="admin-system-details" hidden={!operationsOpen}>{operationsOpen ? <AdminOperationsPanel /> : null}</div>
      </section>


    </div>
  );
}
