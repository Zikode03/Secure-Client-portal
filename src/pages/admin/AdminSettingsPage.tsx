// Friendly guide: this module (AdminSettingsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import type { Permission, Role } from "../../types/portal";
import {
  getPermissionOverride,
  removePermissionOverride,
  setPermissionOverride,
} from "../../utils/userPermissionOverrides";

// Shared shape notes: these types keep UI and data contracts aligned.
type SettingsPage =
  | "profile"
  | "users"
  | "clients"
  | "team"
  | "requirements"
  | "compliance_templates"
  | "permissions"
  | "monitoring"
  | "notifications";
type PermissionKey =
  | "review_documents"
  | "manage_requests"
  | "manage_compliance"
  | "assign_clients"
  | "manage_team";

const permissionLabels: Array<{ key: PermissionKey; label: string }> = [
  { key: "review_documents", label: "Review documents" },
  { key: "manage_requests", label: "Manage requests" },
  { key: "manage_compliance", label: "Manage compliance" },
  { key: "assign_clients", label: "Assign clients" },
  { key: "manage_team", label: "Manage team settings" },
];

const permissionMapByKey: Record<PermissionKey, Permission[]> = {
  review_documents: ["review:documents", "view:assigned_documents", "comment:documents"],
  manage_requests: ["comment:requests", "request:documents"],
  manage_compliance: ["view:assigned_compliance"],
  assign_clients: ["manage:assignments", "view:assigned_clients"],
  manage_team: ["manage:users", "manage:roles", "manage:system_settings"],
};

const rolePermissionOptions: Permission[] = [
  "view:assigned_clients",
  "view:all_clients",
  "view:assigned_documents",
  "view:all_documents",
  "view:assigned_review_queue",
  "view:firm_review_queue",
  "view:assigned_compliance",
  "view:firm_compliance",
  "manage:users",
  "manage:roles",
  "manage:assignments",
  "manage:templates",
  "manage:deadline_rules",
  "manage:system_settings",
  "export:firm_reports",
  "export:client_reports",
  "request:documents",
  "review:documents",
  "comment:documents",
  "comment:requests",
];

// Component flow: gather data first, then render a focused UI state.
function keysToPermissions(keys: PermissionKey[]): Permission[] {
  const permissions = keys.flatMap((key) => permissionMapByKey[key]);
  return Array.from(new Set(permissions));
}

function permissionsToKeys(permissions: Permission[]): PermissionKey[] {
  return permissionLabels
    .filter((permission) =>
      permissionMapByKey[permission.key].every((item) => permissions.includes(item)),
    )
    .map((permission) => permission.key);
}

export function AdminSettingsPage() {
  const portal = usePortal();
  const settingsStorageKey = "secure-client-portal.admin-settings";
  const [activePage, setActivePage] = useState<SettingsPage>("profile");
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [firmName, setFirmName] = useState("Finwell Advisory");
  const [logo, setLogo] = useState("https://example.com/logo.svg");
  const [email, setEmail] = useState("ops@finwelladvisory.co.za");
  const [phone, setPhone] = useState("+27 11 555 0100");
  const [address, setAddress] = useState("18 Rivonia Road, Sandton, Johannesburg");
  const [registrationNumber, setRegistrationNumber] = useState("2016/451003/07");
  const [vatNumber, setVatNumber] = useState("4560281976");
  const [branding, setBranding] = useState("Finwell Indigo");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [currency, setCurrency] = useState("ZAR");
  const [newAccountantName, setNewAccountantName] = useState("");
  const [newAccountantEmail, setNewAccountantEmail] = useState("");
  const [newAccountantPermissions, setNewAccountantPermissions] = useState<PermissionKey[]>([
    "review_documents",
    "manage_requests",
    "manage_compliance",
  ]);
  const [teamMembers, setTeamMembers] = useState(
    portal.managedAccountants.map((member) => ({
      email: member.email,
      id: member.id,
      name: member.name,
      permissions:
        permissionsToKeys(getPermissionOverride(member.email) ?? []).length > 0
          ? (permissionsToKeys(getPermissionOverride(member.email) ?? []) as PermissionKey[])
          : (["review_documents", "manage_requests", "manage_compliance"] as PermissionKey[]),
    })),
  );
  const [assignmentClientId, setAssignmentClientId] = useState(portal.adminClients[0]?.id ?? "");
  const [assignmentAccountant, setAssignmentAccountant] = useState(
    portal.adminClients[0]?.assignedAccountantUserId ??
      portal.managedAccountants.find(
        (accountant) => accountant.name === portal.adminClients[0]?.assignedAccountant,
      )?.id ??
      "",
  );
  const [monthlySubmissionDeadline, setMonthlySubmissionDeadline] = useState("5th of each month");
  const [requiredMonthlyDocuments, setRequiredMonthlyDocuments] = useState("Standard monthly pack");
  const [autoReminders, setAutoReminders] = useState("3 reminders: 10 days, 3 days, due day");
  const [lateSubmissionHandling, setLateSubmissionHandling] = useState("Escalate to assigned accountant");
  const [emailReminders, setEmailReminders] = useState("enabled");
  const [accountantAlerts, setAccountantAlerts] = useState("enabled");
  const [clientReminders, setClientReminders] = useState("enabled");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("accountant");
  const [newClientName, setNewClientName] = useState("");
  const [newClientIndustry, setNewClientIndustry] = useState("");
  const [newClientRequiredPack, setNewClientRequiredPack] = useState("Standard monthly pack");
  const [newClientDeadlinePolicy, setNewClientDeadlinePolicy] = useState("6th working day");
  const [newClientPrimaryAccountantId, setNewClientPrimaryAccountantId] = useState("");
  const [newClientBackupAccountantId, setNewClientBackupAccountantId] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const assignmentOptions = useMemo(
    () => portal.managedAccountants.map((member) => ({ label: member.name, value: member.id })),
    [portal.managedAccountants],
  );

  function togglePermission(
    currentPermissions: PermissionKey[],
    key: PermissionKey,
  ): PermissionKey[] {
    if (currentPermissions.includes(key)) {
      return currentPermissions.filter((permission) => permission !== key);
    }

    return [...currentPermissions, key];
  }

  function toggleNewAccountantPermission(key: PermissionKey) {
    setNewAccountantPermissions((current) => togglePermission(current, key));
  }

  function toggleTeamMemberPermission(memberId: string, key: PermissionKey) {
    setTeamMembers((current) => {
      const next = current.map((member) =>
        member.id === memberId
          ? { ...member, permissions: togglePermission(member.permissions, key) }
          : member,
      );
      const updatedMember = next.find((member) => member.id === memberId);
      if (updatedMember) {
        setPermissionOverride(updatedMember.email, keysToPermissions(updatedMember.permissions));
      }
      return next;
    });
  }

  function addAccountant() {
    if (!newAccountantName.trim() || !newAccountantEmail.trim()) {
      setFeedbackMessage("Enter accountant name and email before adding.");
      return;
    }

    setTeamMembers((current) => [
      ...current,
      {
        id: `accountant-local-${Date.now()}`,
        name: newAccountantName.trim(),
        email: newAccountantEmail.trim(),
        permissions: newAccountantPermissions,
      },
    ]);
    setPermissionOverride(newAccountantEmail.trim(), keysToPermissions(newAccountantPermissions));
    setNewAccountantName("");
    setNewAccountantEmail("");
    setNewAccountantPermissions(["review_documents", "manage_requests", "manage_compliance"]);
    setFeedbackMessage("Accountant added to team list.");
  }

  function removeAccountant(accountantId: string) {
    setTeamMembers((current) => {
      const member = current.find((item) => item.id === accountantId);
      if (member) {
        removePermissionOverride(member.email);
      }
      return current.filter((item) => item.id !== accountantId);
    });
    setFeedbackMessage("Accountant removed from team list.");
  }

  function assignAccountantToClient() {
    if (!assignmentClientId) {
      setFeedbackMessage("Choose a client before assigning.");
      return;
    }

    const selectedAccountant = portal.managedAccountants.find(
      (accountant) => accountant.id === assignmentAccountant,
    );
    const result = portal.assignClientAccountant(
      assignmentClientId,
      selectedAccountant?.name ?? "Unassigned",
      selectedAccountant?.id,
    );
    setFeedbackMessage(result.message);
  }

  function saveSettingsSnapshot() {
    const snapshot = {
      firmName,
      logo,
      email,
      phone,
      address,
      registrationNumber,
      vatNumber,
      branding,
      timezone,
      currency,
      teamMembers,
      monthlySubmissionDeadline,
      requiredMonthlyDocuments,
      autoReminders,
      lateSubmissionHandling,
      emailReminders,
      accountantAlerts,
      clientReminders,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(settingsStorageKey, JSON.stringify(snapshot));
    const parsedDeadlineDay = monthlySubmissionDeadline.startsWith("3")
      ? 3
      : monthlySubmissionDeadline.startsWith("7")
        ? 7
        : 5;
    const rulesResult = portal.updateMonthlyPackRules({
      submissionDeadlineDay: parsedDeadlineDay,
      requiredDocumentIds: portal.documentRequirementRules
        .filter((rule) => rule.required)
        .map((rule) => rule.id),
      optionalDocumentIds: portal.documentRequirementRules
        .filter((rule) => !rule.required)
        .map((rule) => rule.id),
      blockingDocumentIds: portal.documentRequirementRules
        .filter((rule) => rule.required)
        .map((rule) => rule.id),
      reminderDaysBeforeDue: autoReminders.startsWith("2")
        ? [7, 1]
        : autoReminders === "Off"
          ? []
          : [10, 3, 1],
    });
    setFeedbackMessage("System settings saved.");
    if (!rulesResult.ok) {
      setFeedbackMessage(rulesResult.message);
    }
  }

  function createUser() {
    const result = portal.createUserAccount({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      company: newUserRole === "client" ? "Client business" : "Finwell Advisory",
    });
    setFeedbackMessage(result.message);
    if (result.ok) {
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("accountant");
    }
  }

  function createClient() {
    const result = portal.addClientBusiness({
      clientName: newClientName,
      industry: newClientIndustry,
      requiredPack: newClientRequiredPack,
      deadlinePolicy: newClientDeadlinePolicy,
      assignedAccountantUserId: newClientPrimaryAccountantId || undefined,
      backupAccountantUserId: newClientBackupAccountantId || undefined,
    });
    setFeedbackMessage(result.message);
    if (result.ok) {
      setNewClientName("");
      setNewClientIndustry("");
      setNewClientPrimaryAccountantId("");
      setNewClientBackupAccountantId("");
    }
  }

  function renderPageNavigation() {
    const items: Array<{ id: SettingsPage; label: string }> = [
      { id: "profile", label: "Firm Profile" },
      { id: "users", label: "Users & Roles" },
      { id: "clients", label: "Clients" },
      { id: "team", label: "Team Management" },
      { id: "requirements", label: "Requirements & Rules" },
      { id: "compliance_templates", label: "Compliance Templates" },
      { id: "permissions", label: "Permission Matrix" },
      { id: "monitoring", label: "Firm Monitoring" },
      { id: "notifications", label: "Notifications" },
    ];

// Render output: this is the visual state users interact with.
    return (
      <SurfaceCard className="rounded-[1.35rem] border border-slate-200/80 bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => {
            const active = item.id === activePage;
            return (
              <button
                className={
                  active
                    ? "rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-left text-sm font-semibold text-brand-700 shadow-[0_10px_20px_rgba(84,66,255,0.08)]"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                }
                key={item.id}
                onClick={() => setActivePage(item.id)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </SurfaceCard>
    );
  }

  function renderUsersPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Manage users</h2>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          <p className="font-semibold">Admins create access for clients and accountants.</p>
          <p className="mt-1 text-emerald-800/90">
            New users are invited first, then set their own password from the access email before they can sign in.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <TextField
            hint="This name appears in audit history and email invites."
            id="admin-new-user-name"
            label="Full name"
            onChange={(event) => setNewUserName(event.target.value)}
            value={newUserName}
          />
          <TextField
            hint="The user will receive setup instructions at this email address."
            id="admin-new-user-email"
            label="Email"
            onChange={(event) => setNewUserEmail(event.target.value)}
            value={newUserEmail}
          />
          <SelectField
            label="Role"
            onChange={(event) => setNewUserRole(event.target.value as Role)}
            options={[
              { label: "Admin", value: "admin" },
              { label: "Accountant", value: "accountant" },
              { label: "Client", value: "client" },
            ]}
            value={newUserRole}
          />
          <div className="flex items-end">
            <Button onClick={createUser}>Create user &amp; send invite</Button>
          </div>
        </div>

        <div className="space-y-2">
          {portal.userAccounts.map((account) => (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto_auto_auto] md:items-center" key={account.id}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                <p className="text-xs text-slate-500">{account.email}</p>
              </div>
              <SelectField
                label="Role"
                onChange={(event) => {
                  const result = portal.assignUserRole(account.id, event.target.value as Role);
                  setFeedbackMessage(result.message);
                }}
                options={[
                  { label: "Admin", value: "admin" },
                  { label: "Accountant", value: "accountant" },
                  { label: "Client", value: "client" },
                ]}
                value={account.role}
              />
              <p className="text-sm text-slate-600">
                {account.status === "invited" ? "Awaiting password setup" : account.status}
              </p>
              <Button onClick={() => setFeedbackMessage(portal.resetUserAccess(account.id).message)} size="sm" variant="secondary">
                {account.status === "invited" ? "Resend invite" : "Send reset email"}
              </Button>
              <Button
                onClick={() =>
                  setFeedbackMessage(
                    account.status === "suspended"
                      ? portal.activateUserAccount(account.id).message
                      : portal.disableUserAccount(account.id).message,
                  )
                }
                size="sm"
                variant="secondary"
              >
                {account.status === "suspended" ? "Activate" : "Disable"}
              </Button>
            </div>
          ))}
        </div>
      </SurfaceCard>
    );
  }

  function renderClientsPage() {
    const filteredClients = portal.adminClients.filter((client) => {
      if (clientStatusFilter === "active") {
        return (client.isActive ?? true) === true;
      }

      if (clientStatusFilter === "inactive") {
        return (client.isActive ?? true) === false;
      }

      return true;
    });

    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Manage clients</h2>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all" as const, label: "All clients" },
            { id: "active" as const, label: "Active only" },
            { id: "inactive" as const, label: "Inactive only" },
          ].map((filter) => (
            <button
              className={
                clientStatusFilter === filter.id
                  ? "rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              }
              key={filter.id}
              onClick={() => setClientStatusFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Client name" onChange={(event) => setNewClientName(event.target.value)} value={newClientName} />
          <TextField label="Industry" onChange={(event) => setNewClientIndustry(event.target.value)} value={newClientIndustry} />
          <TextField label="Required pack" onChange={(event) => setNewClientRequiredPack(event.target.value)} value={newClientRequiredPack} />
          <TextField label="Deadline policy" onChange={(event) => setNewClientDeadlinePolicy(event.target.value)} value={newClientDeadlinePolicy} />
          <SelectField
            label="Primary accountant"
            onChange={(event) => setNewClientPrimaryAccountantId(event.target.value)}
            options={[{ label: "Unassigned", value: "" }, ...assignmentOptions]}
            value={newClientPrimaryAccountantId}
          />
          <SelectField
            label="Backup accountant"
            onChange={(event) => setNewClientBackupAccountantId(event.target.value)}
            options={[{ label: "None", value: "" }, ...assignmentOptions]}
            value={newClientBackupAccountantId}
          />
          <div className="md:col-span-3">
            <Button onClick={createClient}>Add client business</Button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredClients.map((client) => (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_0.9fr_0.9fr_auto_auto] md:items-center" key={client.id}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{client.clientName}</p>
                <p className="text-xs text-slate-500">{client.industry} / {client.deadlinePolicy}</p>
                <span
                  className={
                    (client.isActive ?? true)
                      ? "mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-700"
                      : "mt-1 inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600"
                  }
                >
                  {(client.isActive ?? true) ? "Active" : "Inactive"}
                </span>
              </div>
              <SelectField
                label="Primary"
                onChange={(event) => {
                  const selected = portal.managedAccountants.find((acct) => acct.id === event.target.value);
                  setFeedbackMessage(
                    portal.assignClientAccountant(client.id, selected?.name ?? event.target.value, selected?.id).message,
                  );
                }}
                options={[{ label: "Unassigned", value: "" }, ...assignmentOptions]}
                value={client.assignedAccountantUserId ?? ""}
              />
              <SelectField
                label="Backup"
                onChange={(event) => {
                  const selected = portal.managedAccountants.find((acct) => acct.id === event.target.value);
                  setFeedbackMessage(
                    portal.assignClientAccountantBackup(client.id, selected?.name ?? event.target.value, selected?.id).message,
                  );
                }}
                options={[{ label: "None", value: "" }, ...assignmentOptions]}
                value={client.backupAccountantUserId ?? ""}
              />
              <Button
                onClick={() => setFeedbackMessage(portal.setClientActiveState(client.id, !(client.isActive ?? true)).message)}
                size="sm"
                variant="secondary"
              >
                {(client.isActive ?? true) ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </SurfaceCard>
    );
  }

  function renderProfilePage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Firm profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Firm name" onChange={(event) => setFirmName(event.target.value)} value={firmName} />
          <TextField label="Logo URL" onChange={(event) => setLogo(event.target.value)} value={logo} />
          <TextField label="Email" onChange={(event) => setEmail(event.target.value)} value={email} />
          <TextField label="Phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
          <TextField label="Address" onChange={(event) => setAddress(event.target.value)} value={address} />
          <TextField
            label="Registration number"
            onChange={(event) => setRegistrationNumber(event.target.value)}
            value={registrationNumber}
          />
          <TextField label="VAT number" onChange={(event) => setVatNumber(event.target.value)} value={vatNumber} />
          <SelectField
            label="Branding"
            onChange={(event) => setBranding(event.target.value)}
            options={[
              { label: "Finwell Indigo", value: "Finwell Indigo" },
              { label: "Neutral Corporate", value: "Neutral Corporate" },
              { label: "Bold Modern", value: "Bold Modern" },
            ]}
            value={branding}
          />
          <SelectField
            label="Timezone"
            onChange={(event) => setTimezone(event.target.value)}
            options={[
              { label: "Africa/Johannesburg", value: "Africa/Johannesburg" },
              { label: "UTC", value: "UTC" },
              { label: "Europe/London", value: "Europe/London" },
            ]}
            value={timezone}
          />
          <SelectField
            label="Currency"
            onChange={(event) => setCurrency(event.target.value)}
            options={[
              { label: "ZAR", value: "ZAR" },
              { label: "USD", value: "USD" },
              { label: "GBP", value: "GBP" },
            ]}
            value={currency}
          />
        </div>
      </SurfaceCard>
    );
  }

  function renderTeamPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Team management</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Add accountant (name)"
            onChange={(event) => setNewAccountantName(event.target.value)}
            value={newAccountantName}
          />
          <TextField
            label="Add accountant (email)"
            onChange={(event) => setNewAccountantEmail(event.target.value)}
            value={newAccountantEmail}
          />
          <div className="flex items-end">
            <Button onClick={addAccountant}>Add accountant</Button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            New accountant permissions
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {permissionLabels.map((permission) => (
              <label
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                key={permission.key}
              >
                <input
                  checked={newAccountantPermissions.includes(permission.key)}
                  onChange={() => toggleNewAccountantPermission(permission.key)}
                  type="checkbox"
                />
                {permission.label}
              </label>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Effective permission keys
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {keysToPermissions(newAccountantPermissions).join(", ")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={member.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <Button onClick={() => removeAccountant(member.id)} size="sm" variant="secondary">
                  Remove accountant
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {permissionLabels.map((permission) => (
                  <label
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    key={`${member.id}-${permission.key}`}
                  >
                    <input
                      checked={member.permissions.includes(permission.key)}
                      onChange={() => toggleTeamMemberPermission(member.id, permission.key)}
                      type="checkbox"
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Effective permission keys
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {keysToPermissions(member.permissions).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Assign accountant to client"
            onChange={(event) => setAssignmentClientId(event.target.value)}
            options={portal.adminClients.map((client) => ({ label: client.clientName, value: client.id }))}
            value={assignmentClientId}
          />
          <SelectField
            label="Accountant"
            onChange={(event) => setAssignmentAccountant(event.target.value)}
            options={[{ label: "Unassigned", value: "" }, ...assignmentOptions]}
            value={assignmentAccountant}
          />
          <div className="flex items-end">
            <Button onClick={assignAccountantToClient}>Apply assignment</Button>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  function renderSubmissionRulesPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Client submission rules</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Monthly submission deadline"
            onChange={(event) => setMonthlySubmissionDeadline(event.target.value)}
            options={[
              { label: "3rd of each month", value: "3rd of each month" },
              { label: "5th of each month", value: "5th of each month" },
              { label: "7th of each month", value: "7th of each month" },
            ]}
            value={monthlySubmissionDeadline}
          />
          <SelectField
            label="Required monthly documents"
            onChange={(event) => setRequiredMonthlyDocuments(event.target.value)}
            options={[
              { label: "Standard monthly pack", value: "Standard monthly pack" },
              { label: "Extended monthly pack", value: "Extended monthly pack" },
              { label: "Industry-specific pack", value: "Industry-specific pack" },
            ]}
            value={requiredMonthlyDocuments}
          />
          <SelectField
            label="Auto reminders"
            onChange={(event) => setAutoReminders(event.target.value)}
            options={[
              { label: "3 reminders: 10 days, 3 days, due day", value: "3 reminders: 10 days, 3 days, due day" },
              { label: "2 reminders: 7 days, due day", value: "2 reminders: 7 days, due day" },
              { label: "Off", value: "Off" },
            ]}
            value={autoReminders}
          />
          <SelectField
            label="Late submission handling"
            onChange={(event) => setLateSubmissionHandling(event.target.value)}
            options={[
              { label: "Escalate to assigned accountant", value: "Escalate to assigned accountant" },
              { label: "Escalate to admin and accountant", value: "Escalate to admin and accountant" },
              { label: "Flag only", value: "Flag only" },
            ]}
            value={lateSubmissionHandling}
          />
        </div>
      </SurfaceCard>
    );
  }

  function renderRequirementsAndRulesPage() {
    return (
      <div className="space-y-5">
        <SurfaceCard className="space-y-5">
          <h2 className="text-xl font-semibold text-slate-950">Document requirements</h2>
          <div className="space-y-2">
            {portal.documentRequirementRules.map((rule) => (
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={rule.id}>
                <span className="text-sm font-medium text-slate-800">{rule.name}</span>
                <input
                  checked={rule.required}
                  onChange={(event) => {
                    const next = portal.documentRequirementRules.map((item) =>
                      item.id === rule.id ? { ...item, required: event.target.checked } : item,
                    );
                    setFeedbackMessage(portal.updateDocumentRequirements(next).message);
                  }}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </SurfaceCard>
        {renderSubmissionRulesPage()}
      </div>
    );
  }

  function renderComplianceTemplatesPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Compliance templates</h2>
        <div className="space-y-2">
          {portal.complianceTemplates.map((template) => (
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={template.id}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{template.category}</p>
                <p className="text-xs text-slate-500">{template.description}</p>
              </div>
              <input
                checked={template.active}
                onChange={(event) => {
                  const next = portal.complianceTemplates.map((item) =>
                    item.id === template.id ? { ...item, active: event.target.checked } : item,
                  );
                  setFeedbackMessage(portal.updateComplianceTemplates(next).message);
                }}
                type="checkbox"
              />
            </label>
          ))}
        </div>
      </SurfaceCard>
    );
  }

  function renderPermissionsPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Permission matrix</h2>
        <div className="space-y-3">
          {portal.rolePermissionMatrix.map((entry) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={entry.role}>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">{entry.role}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {rolePermissionOptions.map((permission) => (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700" key={`${entry.role}-${permission}`}>
                    <input
                      checked={entry.permissions.includes(permission)}
                      onChange={(event) => {
                        const nextMatrix = portal.rolePermissionMatrix.map((matrixEntry) => {
                          if (matrixEntry.role !== entry.role) {
                            return matrixEntry;
                          }

                          const nextPermissions = event.target.checked
                            ? Array.from(new Set([...matrixEntry.permissions, permission]))
                            : matrixEntry.permissions.filter((item) => item !== permission);

                          return {
                            ...matrixEntry,
                            permissions: nextPermissions,
                          };
                        });

                        const result = portal.updateRolePermissionMatrix(nextMatrix);
                        setFeedbackMessage(result.message);
                      }}
                      type="checkbox"
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    );
  }

  function renderMonitoringPage() {
    const portfolio = portal.accountantDashboard.portfolio;
    const missing = portfolio.filter((row) => row.missingCount > 0).length;
    const overdue = portfolio.filter((row) => row.status === "overdue").length;
    const workloadByAccountant = portal.managedAccountants.map((accountant) => ({
      name: accountant.name,
      clients: portfolio.filter((row) => row.assignedAccountant === accountant.name).length,
    }));
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Firm-wide monitoring</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Clients missing docs</p><p className="text-xl font-semibold text-slate-900">{missing}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Overdue submissions</p><p className="text-xl font-semibold text-slate-900">{overdue}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Review queue</p><p className="text-xl font-semibold text-slate-900">{portal.getReviewQueue().length}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Compliance risks</p><p className="text-xl font-semibold text-slate-900">{portal.accountantComplianceCentre.expiredCount + portal.accountantComplianceCentre.missingRequiredCount}</p></div>
        </div>
        <div className="space-y-2">
          {workloadByAccountant.map((row) => (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" key={row.name}>
              <span className="text-sm text-slate-700">{row.name}</span>
              <span className="text-sm font-semibold text-slate-900">{row.clients} clients</span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    );
  }

  function renderNotificationsPage() {
    return (
      <SurfaceCard className="space-y-5">
        <h2 className="text-xl font-semibold text-slate-950">Notifications</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Email reminders"
            onChange={(event) => setEmailReminders(event.target.value)}
            options={[
              { label: "Enabled", value: "enabled" },
              { label: "Disabled", value: "disabled" },
            ]}
            value={emailReminders}
          />
          <SelectField
            label="Accountant alerts"
            onChange={(event) => setAccountantAlerts(event.target.value)}
            options={[
              { label: "Enabled", value: "enabled" },
              { label: "Disabled", value: "disabled" },
            ]}
            value={accountantAlerts}
          />
          <SelectField
            label="Client reminders"
            onChange={(event) => setClientReminders(event.target.value)}
            options={[
              { label: "Enabled", value: "enabled" },
              { label: "Disabled", value: "disabled" },
            ]}
            value={clientReminders}
          />
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={saveSettingsSnapshot}>
            Save settings
          </Button>
        }
        description="Basic firm setup, team controls, submission rules, and communication settings for daily operations."
        eyebrow="Admin settings"
        title="System settings"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      {renderPageNavigation()}

      {activePage === "profile"
        ? renderProfilePage()
        : activePage === "users"
          ? renderUsersPage()
          : activePage === "clients"
            ? renderClientsPage()
        : activePage === "team"
          ? renderTeamPage()
          : activePage === "requirements"
            ? renderRequirementsAndRulesPage()
            : activePage === "compliance_templates"
              ? renderComplianceTemplatesPage()
              : activePage === "permissions"
                ? renderPermissionsPage()
                : activePage === "monitoring"
                  ? renderMonitoringPage()
                  : renderNotificationsPage()}
    </div>
  );
}
