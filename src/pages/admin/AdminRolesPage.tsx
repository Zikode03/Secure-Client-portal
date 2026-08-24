import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface RoleRecord {
  name: string;
  displayName: string;
  scope: string;
  permissionsJson: string;
  isSystemRole: boolean;
  isActive: boolean;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const permissionGroups: Array<{ label: string; permissions: string[] }> = [
  { label: "Access", permissions: ["access.admin", "access.accountant", "access.client"] },
  { label: "Clients", permissions: ["view:assigned_clients", "view:all_clients", "manage:assignments"] },
  { label: "Documents", permissions: ["view:assigned_documents", "view:all_documents", "review:documents", "comment:documents"] },
  { label: "Review & requests", permissions: ["view:assigned_review_queue", "view:firm_review_queue", "request:documents", "comment:requests"] },
  { label: "Compliance", permissions: ["view:assigned_compliance", "view:firm_compliance"] },
  { label: "Administration", permissions: ["manage:users", "manage:roles", "manage:templates", "manage:deadline_rules", "manage:system_settings"] },
  { label: "Reporting", permissions: ["export:firm_reports", "export:client_reports"] },
];

const allPermissions = permissionGroups.flatMap((group) => group.permissions);
const scopeOptions = [
  { label: "Admin", value: "admin" },
  { label: "Firm / accountant", value: "firm" },
  { label: "Client", value: "client" },
];

function readPermissions(role: RoleRecord) {
  try {
    const parsed = JSON.parse(role.permissionsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function AdminRolesPage() {
  const backendMode = hasApiBaseUrl();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [scope, setScope] = useState("firm");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newScope, setNewScope] = useState("firm");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  async function loadRoles() {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "Role administration requires the live backend API." });
      return;
    }

    try {
      const rows = await apiGetJson<RoleRecord[]>("/api/roles");
      setRoles(rows);
      const current = rows.find((role) => role.name === selectedRoleName) ?? rows[0];
      if (current) setSelectedRoleName(current.name);
      setFeedback(null);
    } catch (error) {
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
      await apiPutJson<RoleRecord, { displayName: string; scope: string; permissions: string[] }>(
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
      await apiPostJson<RoleRecord, Record<string, never>>(
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
      const created = await apiPostJson<RoleRecord, { name: string; displayName: string; scope: string; permissions: string[] }>(
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
    <div className="grid gap-4 lg:grid-cols-2">
      {permissionGroups.map((group) => (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={group.label}>
          <p className="text-sm font-semibold text-slate-950">{group.label}</p>
          <div className="mt-3 space-y-2">
            {group.permissions.map((permission) => (
              <label className="flex items-center gap-3 text-sm text-slate-700" key={permission}>
                <input
                  checked={current.includes(permission)}
                  onChange={() => togglePermission(permission, setter, current)}
                  type="checkbox"
                />
                <span>{permission}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="Define what each role can see and do across the portal."
        eyebrow="Administration"
        title="Roles & permissions"
      />

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard className="space-y-3">
          <div>
            <h2 className="portal-section-title text-slate-950">Role directory</h2>
            <p className="mt-1 text-sm text-slate-500">{roles.length} roles configured</p>
          </div>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                className={`w-full rounded-xl border px-4 py-3 text-left ${selectedRoleName === role.name ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`}
                key={role.name}
                onClick={() => setSelectedRoleName(role.name)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-950">{role.displayName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${role.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{role.isActive ? "Active" : "Inactive"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{role.scope} · {readPermissions(role).length} permissions</p>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-5">
          {selectedRole ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="portal-section-title text-slate-950">Edit {selectedRole.displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedRole.isSystemRole ? "System role" : "Custom role"} · {selectedRole.name}</p>
                </div>
                <Button disabled={busy} onClick={() => void toggleRoleActivation()} variant={selectedRole.isActive ? "danger" : "secondary"}>
                  {selectedRole.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Display name" onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
                <SelectField label="Scope" onChange={(event) => setScope(event.target.value)} options={scopeOptions} value={scope} />
              </div>
              {renderPermissions(permissions, setPermissions)}
              <div className="flex justify-end"><Button disabled={busy} onClick={() => void saveRole()}>Save role</Button></div>
            </>
          ) : <p className="text-sm text-slate-500">No roles are available.</p>}
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-5">
        <div>
          <h2 className="portal-section-title text-slate-950">Create custom role</h2>
          <p className="mt-1 text-sm text-slate-500">Use custom roles only when the standard Admin, Accountant and Client roles do not fit.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Role key" onChange={(event) => setNewRoleName(event.target.value)} value={newRoleName} />
          <TextField label="Display name" onChange={(event) => setNewDisplayName(event.target.value)} value={newDisplayName} />
          <SelectField label="Scope" onChange={(event) => setNewScope(event.target.value)} options={scopeOptions} value={newScope} />
        </div>
        {renderPermissions(newPermissions, setNewPermissions)}
        <div className="flex justify-end"><Button disabled={busy || !backendMode} onClick={() => void createRole()}>Create role</Button></div>
      </SurfaceCard>
    </div>
  );
}
