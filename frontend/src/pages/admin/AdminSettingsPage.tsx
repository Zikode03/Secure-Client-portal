// Friendly guide: this module (AdminSettingsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import type { Permission } from "../../types/portal";
import {
  getPermissionOverride,
  removePermissionOverride,
  setPermissionOverride,
} from "../../utils/userPermissionOverrides";

// Shared shape notes: these types keep UI and data contracts aligned.
type SettingsPage = "profile" | "team" | "submission_rules" | "notifications";
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
    portal.adminClients[0]?.assignedAccountant ?? "",
  );
  const [monthlySubmissionDeadline, setMonthlySubmissionDeadline] = useState("5th of each month");
  const [requiredMonthlyDocuments, setRequiredMonthlyDocuments] = useState("Standard monthly pack");
  const [autoReminders, setAutoReminders] = useState("3 reminders: 10 days, 3 days, due day");
  const [lateSubmissionHandling, setLateSubmissionHandling] = useState("Escalate to assigned accountant");
  const [emailReminders, setEmailReminders] = useState("enabled");
  const [accountantAlerts, setAccountantAlerts] = useState("enabled");
  const [clientReminders, setClientReminders] = useState("enabled");

  const assignmentOptions = useMemo(
    () => teamMembers.map((member) => ({ label: member.name, value: member.name })),
    [teamMembers],
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
    if (!assignmentClientId || !assignmentAccountant) {
      setFeedbackMessage("Choose a client and accountant before assigning.");
      return;
    }

    const result = portal.assignClientAccountant(assignmentClientId, assignmentAccountant);
    setFeedbackMessage(result.message);
  }

  function renderPageNavigation() {
    const items: Array<{ id: SettingsPage; label: string }> = [
      { id: "profile", label: "Firm Profile" },
      { id: "team", label: "Team Management" },
      { id: "submission_rules", label: "Client Submission Rules" },
      { id: "notifications", label: "Notifications" },
    ];

// Render output: this is the visual state users interact with.
    return (
      <SurfaceCard className="rounded-[1.35rem] border border-slate-200/80 bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
        <div className="grid gap-2 md:grid-cols-4">
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
            options={assignmentOptions}
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
          <Button onClick={() => setFeedbackMessage("System settings saved in the frontend workspace.")}>
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
        : activePage === "team"
          ? renderTeamPage()
          : activePage === "submission_rules"
            ? renderSubmissionRulesPage()
            : renderNotificationsPage()}
    </div>
  );
}