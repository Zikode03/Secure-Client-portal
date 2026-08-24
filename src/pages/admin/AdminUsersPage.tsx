import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
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

const roleOptions = ["admin", "accountant", "client"];

function normalizedStatus(user: AdminUserRecord) {
  return (user.status ?? user.securityStatus ?? "active").trim().toLowerCase();
}

export function AdminUsersPage() {
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

  async function loadUsers() {
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
      setUsers(await apiGetJson<AdminUserRecord[]>("/api/admin/users"));
      setFeedback(null);
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

  const counts = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role.toLowerCase() === "admin").length,
    accountants: users.filter((user) => user.role.toLowerCase() === "accountant").length,
    clients: users.filter((user) => user.role.toLowerCase() === "client").length,
  }), [users]);

  async function createUser() {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setFeedback({ tone: "warning", title: "User details required", message: "Enter a name and email address before creating the user." });
      return;
    }

    setLoading(true);
    try {
      await apiPostJson<AdminUserRecord, { fullName: string; email: string; role: string; company: string | null }>(
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
      setFeedback({ tone: "success", title: "User created", message: "The user has been added to the firm directory." });
      await loadUsers();
    } catch (error) {
      setFeedback({ tone: "danger", title: "User could not be created", message: error instanceof ApiError ? error.message : "The user could not be created." });
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(user: AdminUserRecord, role: string) {
    setBusyUserId(user.id);
    try {
      await apiPutJson<AdminUserRecord, { role: string }>(`/api/admin/users/${user.id}/role`, { role });
      await loadUsers();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Role update failed", message: error instanceof ApiError ? error.message : "The user's role could not be changed." });
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleStatus(user: AdminUserRecord) {
    const active = normalizedStatus(user) === "active";
    setBusyUserId(user.id);
    try {
      await apiPostJson<AdminUserRecord, Record<string, never>>(
        `/api/admin/users/${user.id}/${active ? "disable" : "enable"}`,
        {},
      );
      await loadUsers();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Status update failed", message: error instanceof ApiError ? error.message : "The user's access status could not be changed." });
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Create users, control roles, and immediately enable or disable access across the firm."
        eyebrow="Administration"
        title="Users & access"
      />

      {feedback ? (
        <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total users", counts.total],
          ["Administrators", counts.admins],
          ["Accountants", counts.accountants],
          ["Client users", counts.clients],
        ].map(([label, value]) => (
          <SurfaceCard className="space-y-2" key={String(label)}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="space-y-5">
        <div>
          <h2 className="portal-section-title text-slate-950">Add user</h2>
          <p className="mt-1 text-sm text-slate-500">Create a firm administrator, accountant, or client user from one controlled screen.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <TextField label="Full name" onChange={(event) => setNewUserName(event.target.value)} value={newUserName} />
          <TextField label="Email" onChange={(event) => setNewUserEmail(event.target.value)} value={newUserEmail} />
          <SelectField label="Role" onChange={(event) => setNewUserRole(event.target.value)} value={newUserRole}>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          <TextField label="Company" onChange={(event) => setNewUserCompany(event.target.value)} value={newUserCompany} />
        </div>
        <div className="flex justify-end">
          <Button disabled={loading || !backendMode} onClick={() => void createUser()}>Create user</Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="portal-section-title text-slate-950">Firm directory</h2>
            <p className="mt-1 text-sm text-slate-500">Manage account access without leaving the admin workspace.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
            <TextField label="Search" onChange={(event) => setQuery(event.target.value)} value={query} />
            <SelectField label="Role" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
              <option value="all">All roles</option>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </SelectField>
            <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Disabled / restricted</option>
            </SelectField>
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
                <th className="px-4 py-3 text-right">Access control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((user) => {
                const status = normalizedStatus(user);
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{user.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        disabled={busyUserId === user.id}
                        onChange={(event) => void changeRole(user, event.target.value)}
                        value={user.role.toLowerCase()}
                      >
                        {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{user.company || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        disabled={busyUserId === user.id}
                        onClick={() => void toggleStatus(user)}
                        variant="secondary"
                      >
                        {status === "active" ? "Disable access" : "Enable access"}
                      </Button>
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
      </SurfaceCard>
    </div>
  );
}
