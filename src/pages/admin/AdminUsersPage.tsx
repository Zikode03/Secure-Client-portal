import { useActionDialog } from "../../components/ui/useActionDialog";
import { RecordActions } from "../../components/ui/RecordActions";
import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { PageSection } from "../../components/ui/PageSection";
import { TextField } from "../../components/ui/TextField";
import {
  ApiError,
  apiGetJson,
  apiPostJson,
  apiPutJson,
  hasApiBaseUrl,
} from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  company?: string | null;
  status?: string | null;
  securityStatus?: string | null;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const roleValues = ["admin", "accountant", "client"];
const createRoleOptions = roleValues.map((role) => ({ label: role[0].toUpperCase() + role.slice(1), value: role }));
const filterRoleOptions = [{ label: "All roles", value: "all" }, ...createRoleOptions];
const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Disabled / restricted", value: "inactive" },
];

function normalizedStatus(user: AdminUserRecord) {
  return (user.status ?? user.securityStatus ?? "active").trim().toLowerCase();
}

export function AdminUsersPage() {
  const actionDialog = useActionDialog();
  const navigate = useNavigate();
  const backendMode = hasApiBaseUrl();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("accountant");
  const [newUserCompany, setNewUserCompany] = useState("");

  async function loadUsers(clearFeedback = true) {
    if (!backendMode) {
      setFeedback({
        tone: "warning",
        title: "Backend required",
        message: "User administration is a live admin function and requires the backend API to be enabled.",
      });
      return;
    }

    setLoading(true);
    try {
      setUsers(await apiGetJson("/api/admin/users"));
      if (clearFeedback) setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Users could not be loaded",
        message: error instanceof ApiError ? error.message : "The admin user directory could not be loaded.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [backendMode]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.fullName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.company ?? "").toLowerCase().includes(needle);
      const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
      const status = normalizedStatus(user);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? status === "active" : status !== "active");
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const restrictedUsers = users.filter((user) => normalizedStatus(user) !== "active").length;

  async function createUser() {
    if (newUserRole === "client") { navigate("/firm/clients?add=1"); return; }
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setFeedback({ tone: "warning", title: "User details required", message: "Enter a name and email address before creating the user." });
      return;
    }

    setLoading(true);
    try {
      const created = await apiPostJson(
        "/api/admin/users",
        {
          fullName: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          company: newUserCompany.trim() || null,
        },
      );
      setNewUserName("");
      setNewUserEmail("");
      setNewUserCompany("");
      setFeedback({ tone: created.delivery === "smtp" ? "success" : "warning", title: "User created", message: created.delivery === "smtp" ? "A setup invitation was emailed to the user." : created.deliveryError ?? "The account was created, but no invitation email was sent. Check email settings and resend the invitation." });
      await loadUsers(false);
    } catch (error) {
      setFeedback({ tone: "danger", title: "User could not be created", message: error instanceof ApiError ? error.message : "The user could not be created." });
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(user: AdminUserRecord, role: string) {
    const currentRole = user.role.trim().toLowerCase();
    const nextRole = role.trim().toLowerCase();
    if (currentRole === nextRole) return;

    const confirmed = await actionDialog.confirm(
      `Change ${user.fullName}'s role from ${currentRole} to ${nextRole}? Their active sessions will be revoked and they will need to sign in again.`,
    );
    if (!confirmed) {
      // Force the controlled select back to the role currently stored by the API.
      setUsers((current) => [...current]);
      return;
    }

    setBusyUserId(user.id);
    try {
      await apiPutJson(`/api/admin/users/${user.id}/role`, { role: nextRole });
      await loadUsers(false);
      setFeedback({
        tone: "success",
        title: "Role updated",
        message: `${user.fullName} is now a ${nextRole}. Their active sessions were revoked.`,
      });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Role update failed", message: error instanceof ApiError ? error.message : "The user's role could not be changed." });
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleStatus(user: AdminUserRecord) {
    const active = normalizedStatus(user) === "active";
    if (active && !await actionDialog.confirm(`Disable access for ${user.fullName}? Active sessions will be revoked.`)) return;

    setBusyUserId(user.id);
    try {
      await apiPostJson(
        `/api/admin/users/${user.id}/${active ? "disable" : "enable"}`,
        {},
      );
      setFeedback({
        tone: "success",
        title: active ? "Access disabled" : "Access enabled",
        message: active
          ? `${user.fullName}'s active sessions have been revoked.`
          : `${user.fullName} can sign in again.`,
      });
      await loadUsers(false);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Status update failed", message: error instanceof ApiError ? error.message : "The user's access status could not be changed." });
    } finally {
      setBusyUserId(null);
    }
  }

  async function accessAction(user: AdminUserRecord, action: "resend-invitation" | "revoke-sessions") {
    if (action === "revoke-sessions" && !await actionDialog.confirm(`Sign out all sessions for ${user.fullName}? Their password and account status will stay the same.`)) return;
    setBusyUserId(user.id);
    try {
      const result = action === "resend-invitation" ? await apiPostJson(`/api/admin/users/${user.id}/resend-invitation`, {}) : await apiPostJson(`/api/admin/users/${user.id}/revoke-sessions`, {});
      setFeedback(action === "resend-invitation"
        ? { tone: "delivery" in result && result.delivery === "smtp" ? "success" : "warning", title: "delivery" in result && result.delivery === "smtp" ? "Invitation resent" : "Invitation not delivered", message: "delivery" in result && result.delivery === "smtp" ? `A new setup invitation was emailed to ${user.fullName}.` : ("deliveryError" in result ? result.deliveryError : null) ?? "Email delivery is disabled. Check email configuration before retrying." }
        : { tone: "success", title: "Sessions revoked", message: `${("revokedSessions" in result ? result.revokedSessions : 0) ?? 0} sessions signed out. The account remains enabled.` });
      await loadUsers(false);
    } catch (error) { setFeedback({ tone: "danger", title: "Access action failed", message: error instanceof ApiError ? error.message : "The operation could not be completed." }); }
    finally { setBusyUserId(null); }
  }

  async function resetPassword(user: AdminUserRecord) {
    const reason = await actionDialog.prompt("Reason for the password reset:", "Admin password reset");
    if (reason === null) return;

    setBusyUserId(user.id);
    try {
      const result = await apiPostJson(
        `/api/admin/users/${user.id}/reset-password`,
        { newPassword: null, reason: reason.trim() || null },
      );
      setFeedback({
        tone: "delivery" in result && result.delivery === "smtp" ? "success" : "warning",
        title: "delivery" in result && result.delivery === "smtp" ? "Reset email sent" : "Email delivery requires attention",
        message: "delivery" in result && result.delivery === "smtp" ? `A one-time reset link was emailed to ${user.fullName}. It expires in 30 minutes. MFA remains enabled.` : (("deliveryError" in result ? result.deliveryError : null) ?? "The reset email was not sent. Check SMTP configuration and retry."),
      });
      await loadUsers(false);
    } catch (error) {
      setFeedback({ tone: "danger", title: "Password reset failed", message: error instanceof ApiError ? error.message : "The user's password could not be reset." });
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      {actionDialog.dialog}
      <PageHeader
        description="Create users, control roles, manage account state, revoke access, and issue secure reset flows across the firm."
        eyebrow="Administration"
        title="Users & access"
      />

      {feedback ? (
        <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
      ) : null}

      <section aria-labelledby="add-user-heading" className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 [&_input]:rounded-lg [&_select]:rounded-lg">
        <div className="portal-page-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><UserPlus size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="add-user-heading" className="portal-section-title text-slate-950">Add user</h2>
              <p className="mt-1 text-sm text-slate-500">Set up access for a new team member or client.</p>
            </div>
          </div>
          <Button disabled={loading || !backendMode} onClick={() => void createUser()}>{newUserRole === "client" ? "Continue to client setup" : "Create user"}</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TextField label="Full name" placeholder="e.g. Alex Smith" autoComplete="name" onChange={(event) => setNewUserName(event.target.value)} value={newUserName} />
          <TextField label="Email" placeholder="name@company.co.za" type="email" autoComplete="email" onChange={(event) => setNewUserEmail(event.target.value)} value={newUserEmail} />
          <SelectField label="Role" onChange={(event) => setNewUserRole(event.target.value)} options={createRoleOptions} value={newUserRole} />
          <TextField label="Company" placeholder="Company name" autoComplete="organization" onChange={(event) => setNewUserCompany(event.target.value)} value={newUserCompany} />
        </div>
      </section>

      <PageSection className="space-y-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="portal-section-title text-slate-950">Firm directory</h2>
            <p className="text-xs text-slate-500">
              {users.length} {users.length === 1 ? "user" : "users"} · {restrictedUsers} disabled or restricted
            </p>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr] [&_input]:rounded-lg [&_select]:rounded-lg">
            <TextField label="Search" placeholder="Search name, email or company" onChange={(event) => setQuery(event.target.value)} value={query} />
            <SelectField label="Role" onChange={(event) => setRoleFilter(event.target.value)} options={filterRoleOptions} value={roleFilter} />
            <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} value={statusFilter} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Security actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((user) => {
                const status = normalizedStatus(user);
                const busy = busyUserId === user.id;
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{user.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        disabled={busy}
                        onChange={(event) => void changeRole(user, event.target.value)}
                        value={user.role.toLowerCase()}
                      >
                        {roleValues.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{user.company || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <RecordActions iconOnly label={`Security actions for ${user.fullName}`} disabled={busy} actions={[
                          status === "invited"
                            ? { label: "Resend invitation", onSelect: () => void accessAction(user, "resend-invitation") }
                            : { label: "Sign out sessions", onSelect: () => void accessAction(user, "revoke-sessions") },
                          { label: "Reset password", onSelect: () => void resetPassword(user) },
                          { label: status === "active" ? "Disable" : "Enable", destructive: status === "active", onSelect: () => void toggleStatus(user) },
                        ]} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredUsers.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>No users match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}
