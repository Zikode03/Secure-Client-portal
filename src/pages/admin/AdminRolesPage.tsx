import type { ApiResponse } from "../../services/apiContractTypes";
import "./adminRoles.css";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface RoleRecord {
  name: string;
  displayName: string;
  scope: string;
  permissionsJson?: string;
  permissions?: string[];
  isSystemRole: boolean;
  isActive: boolean;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const permissionGroups: Array<{ label: string; permissions: string[] }> = [
  { label: "Workspace access", permissions: ["access.admin", "access.accountant", "access.client"] },
  { label: "Clients", permissions: ["clients.read", "clients.create", "clients.update", "clients.status.update", "clients.profile.update", "clients.delete"] },
  { label: "Documents", permissions: ["documents.read", "documents.upload", "documents.update", "documents.review", "documents.delete"] },
  { label: "Requests", permissions: ["requests.read", "requests.create", "requests.comment", "requests.update", "requests.delete"] },
  { label: "Assignments", permissions: ["assignments.read", "assignments.create", "assignments.update", "assignments.delete"] },
  { label: "Users", permissions: ["users.read", "users.create", "users.update", "users.activate", "users.deactivate"] },
  { label: "Roles", permissions: ["roles.read", "roles.create", "roles.update", "roles.activate", "roles.deactivate"] },
  { label: "Settings and oversight", permissions: ["settings.read", "settings.update", "templates.update", "deadlines.update", "audit_logs.read", "compliance.read", "reports.export"] },
];

const permissionLabels: Record<string, string> = {
 "access.admin": "Open the admin workspace", "access.accountant": "Open the accountant workspace", "access.client": "Open the client workspace",
 "clients.read": "View clients", "clients.create": "Add clients", "clients.update": "Edit clients", "clients.status.update": "Activate or deactivate clients", "clients.profile.update": "Edit business profiles", "clients.delete": "Delete clients",
 "documents.read": "View documents", "documents.upload": "Upload documents", "documents.update": "Edit document details", "documents.review": "Approve documents and close months", "documents.delete": "Delete documents",
 "requests.read": "View conversations", "requests.create": "Create requests", "requests.comment": "Reply to conversations", "requests.update": "Update requests", "requests.delete": "Delete requests",
 "assignments.read": "View assignments", "assignments.create": "Assign accountants", "assignments.update": "Change assignments", "assignments.delete": "Remove assignments",
 "users.read": "View users", "users.create": "Invite users", "users.update": "Edit user access", "users.activate": "Enable users", "users.deactivate": "Disable users",
 "roles.read": "View roles", "roles.create": "Create roles", "roles.update": "Edit role permissions", "roles.activate": "Enable roles", "roles.deactivate": "Disable roles",
 "settings.read": "View firm settings", "settings.update": "Edit firm settings", "templates.update": "Edit templates", "deadlines.update": "Edit deadlines", "audit_logs.read": "View audit history", "compliance.read": "View compliance records", "reports.export": "Export reports",
};

const scopeOptions = [
  { label: "Admin", value: "admin" },
  { label: "Firm / accountant", value: "accountant" },
  { label: "Client", value: "client" },
];

function readPermissions(role: RoleRecord) {
  if (Array.isArray(role.permissions)) return role.permissions.filter((value): value is string => typeof value === "string");
  try {
    const parsed = JSON.parse(role.permissionsJson ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function AdminRolesPage() {
  const backendMode = hasApiBaseUrl();
  const [access, setAccess] = useState<ApiResponse<"/api/roles/access"> | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scope, setScope] = useState("accountant");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newScope, setNewScope] = useState("accountant");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  async function loadRoles() {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "Role administration requires the live backend API." });
      return;
    }

    try {
      const [rows, capabilities] = await Promise.all([apiGetJson("/api/roles"), apiGetJson("/api/roles/access").catch(() => null)]);
      setAccess(capabilities);
      setRoles(rows);
      const current = rows.find((role) => role.name === selectedRoleName) ?? rows[0];
      if (current) setSelectedRoleName(current.name);
      setFeedback(null);
    } catch (error) {
      setAccess(null);
      setFeedback({ tone: "danger", title: "Roles could not be loaded", message: error instanceof ApiError ? error.message : "The role directory could not be loaded." });
    }
  }

  useEffect(() => {
    void loadRoles();
  }, [backendMode]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.name === selectedRoleName) ?? null,
    [roles, selectedRoleName],
  );

  useEffect(() => {
    if (!selectedRole) return;
    setDisplayName(selectedRole.displayName);
    setScope(selectedRole.scope);
    setPermissions(readPermissions(selectedRole));
  }, [selectedRole]);

  function togglePermission(permission: string, setter: (next: string[]) => void, current: string[]) {
    setter(current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  async function saveRole() {
    if (!selectedRole) return;
    setBusy(true);
    try {
      await apiPutJson(
        `/api/roles/${selectedRole.name}`,
        { displayName: displayName.trim(), scope, permissions },
      );
      setFeedback({ tone: "success", title: "Role updated", message: `${displayName} permissions were saved.` });
      await loadRoles();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Role update failed", message: error instanceof ApiError ? error.message : "The role could not be updated." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleRoleActivation() {
    if (!selectedRole) return;
    setBusy(true);
    try {
      await apiPostJson(
        `/api/roles/${selectedRole.name}/${selectedRole.isActive ? "deactivate" : "activate"}`,
        {},
      );
      await loadRoles();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Role status update failed", message: error instanceof ApiError ? error.message : "The role status could not be changed." });
    } finally {
      setBusy(false);
    }
  }

  async function createRole() {
    if (!newRoleName.trim() || !newDisplayName.trim()) {
      setFeedback({ tone: "warning", title: "Role details required", message: "Enter a role name and display name." });
      return;
    }

    setBusy(true);
    try {
      const created = await apiPostJson(
        "/api/roles",
        { name: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"), displayName: newDisplayName.trim(), scope: newScope, permissions: newPermissions },
      );
      setNewRoleName("");
      setNewDisplayName("");
      setNewPermissions([]);
      setSelectedRoleName(created.name);
      setFeedback({ tone: "success", title: "Role created", message: `${created.displayName} is now available.` });
      await loadRoles();
    } catch (error) {
      setFeedback({ tone: "danger", title: "Role could not be created", message: error instanceof ApiError ? error.message : "The role could not be created." });
    } finally {
      setBusy(false);
    }
  }

  const renderPermissions = (current: string[], setter: (next: string[]) => void) => (
    <div className="role-permission-groups">
      {permissionGroups.map(group => <fieldset className="role-permission-group" key={group.label} disabled={busy}>
        <legend>{group.label}</legend>
        {group.permissions.map(permission => <label key={permission}>
          <input checked={current.includes(permission)} onChange={() => togglePermission(permission, setter, current)} type="checkbox" />
          <span>{permissionLabels[permission] || permission}</span>
        </label>)}
      </fieldset>)}
    </div>
  );
  const selectedPermissions = selectedRole ? readPermissions(selectedRole) : [];
  const unlistedPermissions = selectedPermissions.filter(permission => !permissionGroups.some(group => group.permissions.includes(permission)));

  return <div className="admin-role-settings">
    <PageHeader title="Roles & permissions" description="Review what each role can do. For everyday access changes, assign a role to the user instead." actions={<a className="role-users-link" href="/firm/admin/users">Manage user access →</a>} />
    {feedback && <FeedbackBanner {...feedback} onDismiss={() => setFeedback(null)} />}
    {!access?.canUpdate && <p className="text-sm text-slate-500">Roles are read-only for your account. Use Manage user access to assign an existing role. Permission changes are reserved for the designated system owner.</p>}
    <div className="role-workspace">
      <section className="role-directory" aria-label="Role directory">
        <h2>Roles</h2>
        <div role="group" aria-label="Select a role">{roles.map(role => <button type="button" key={role.name} aria-label={role.displayName} aria-pressed={selectedRoleName === role.name} aria-controls="role-editor" disabled={busy} onClick={() => setSelectedRoleName(role.name)}>
          <span>{role.displayName}</span><small>{role.isActive ? "Active" : "Inactive"} · {readPermissions(role).length} permissions</small>
        </button>)}</div>
      </section>
      <section className="role-overview" id="role-editor" aria-label="Role access overview">
        {selectedRole ? <>
          <header><div><h2>{selectedRole.displayName}</h2><p>{selectedRole.isSystemRole ? "Standard role" : "Custom role"} · {selectedRole.isActive ? "Active" : "Inactive"}</p></div><span className="role-scope">{scopeOptions.find(option => option.value === selectedRole.scope)?.label || selectedRole.scope} workspace</span></header>
          <div className="role-access-summary"><h3>What this role can do</h3><p>Based on the permissions currently saved for this role. Client access also depends on assignments and business membership.</p>
            {permissionGroups.map(group => {
              const granted = group.permissions.filter(permission => selectedPermissions.includes(permission));
              return granted.length ? <div className="role-access-row" key={group.label}><h4>{group.label}</h4><p>{granted.map(permission => permissionLabels[permission]).join(" · ")}</p></div> : null;
            })}
            {!selectedPermissions.length && <p>No permissions have been configured for this role.</p>}
            {!!unlistedPermissions.length && <p className="role-additional-access">{unlistedPermissions.length} additional service permission{unlistedPermissions.length === 1 ? " is" : "s are"} retained when you save.</p>}
          </div>
          {access?.canUpdate && <details className="role-advanced" key={selectedRole.name}><summary>Advanced: edit role permissions</summary><div className="role-advanced-content">
            <h3>Edit {selectedRole.displayName}</h3>
            <p className="role-warning">Changes affect everyone assigned this role. Administrator access does not automatically include document approval or month closing.</p>
            <fieldset disabled={busy} className="role-details-fields"><legend className="sr-only">Role details</legend><TextField label="Display name" value={displayName} onChange={event => setDisplayName(event.target.value)} /><SelectField label="Workspace" options={scopeOptions} value={scope} onChange={event => setScope(event.target.value)} /></fieldset>
            {renderPermissions(permissions, setPermissions)}
            <footer>{(selectedRole.isActive ? access.canDeactivate : access.canActivate) && <Button variant={selectedRole.isActive ? "danger" : "secondary"} disabled={busy} onClick={() => void toggleRoleActivation()}>{selectedRole.isActive ? "Deactivate" : "Activate"}</Button>}<Button disabled={busy || !displayName.trim()} onClick={() => void saveRole()}>{busy ? "Saving…" : "Save role"}</Button></footer>
          </div></details>}
        </> : <p className="role-empty">{feedback ? "Roles are unavailable. Check the connection and try again." : "Loading roles…"}</p>}
      </section>
    </div>
    {access?.canCreate && <details className="role-create"><summary>Create a custom role</summary><div className="role-advanced-content"><h2>Create custom role</h2><p>Use the standard roles unless your firm needs a different set of permissions.</p>
      <fieldset disabled={busy} className="role-details-fields"><legend className="sr-only">New role details</legend><TextField label="Role key" hint="An internal identifier, such as senior_accountant." value={newRoleName} onChange={event => setNewRoleName(event.target.value)} /><TextField label="Display name" value={newDisplayName} onChange={event => setNewDisplayName(event.target.value)} /><SelectField label="Workspace" options={scopeOptions} value={newScope} onChange={event => setNewScope(event.target.value)} /></fieldset>
      {renderPermissions(newPermissions, setNewPermissions)}<footer><Button disabled={busy || !backendMode} onClick={() => void createRole()}>Create role</Button></footer>
    </div></details>}
  </div>;
}
