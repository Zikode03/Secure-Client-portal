import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Building2 as BuildingIcon, ShieldCheck as ShieldIcon, Bell as BellIcon, FileText as DocumentIcon, LockKeyhole as LockIcon, Monitor as SessionIcon, Mail, Info, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { BusinessProfile, Tone } from "../../types/portal";
import { cn } from "../../utils/cn";
import "./clientSettings.css";

type SettingsSection = "business" | "security" | "notifications" | "documents";

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

interface BackendClientProfile {
  id: string;
  name: string;
  entityType: string;
  primaryContact: string;
  email: string;
  industry?: string;
  registrationNumber?: string;
  taxNumber?: string;
  vatNumber?: string;
  phone?: string;
  tradingName?: string;
  addressLine?: string;
  city?: string;
  country?: string;
  primaryContactJobTitle?: string;
}

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: () => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="settings-toggle" onClick={onChange}>
    <span><strong>{label}</strong><small>{description}</small></span>
    <span aria-hidden="true" className={cn("settings-switch", checked && "is-on")}><span /></span>
  </button>;
}
const sectionIcons = { business: BuildingIcon, security: ShieldIcon, notifications: BellIcon, documents: DocumentIcon };

function formatDateValue(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ClientSettingsPage() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();

  const notificationPreferences = portal.clientSettings.notificationPreferences;
  const securitySettings = portal.clientSettings.security;
  const initialProfile = useMemo(() => portal.clientProfile, [portal.clientProfile]);

  const [activeSection, setActiveSection] = useState<SettingsSection>("business");
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [industry, setIndustry] = useState("");
  const [profileLoading, setProfileLoading] = useState(backendMode);
  const [showPasswords, setShowPasswords] = useState(false);
  const [jobTitle, setJobTitle] = useState(user?.title ?? "");
  const [deadlineAlerts, setDeadlineAlerts] = useState(notificationPreferences.deadlineAlerts);
  const [rejectionAlerts, setRejectionAlerts] = useState(notificationPreferences.rejectionAlerts);
  const [complianceAlerts, setComplianceAlerts] = useState(notificationPreferences.complianceAlerts);
  const [weeklySummary, setWeeklySummary] = useState(notificationPreferences.weeklySummary);
  const [browserAlerts, setBrowserAlerts] = useState(notificationPreferences.browserAlerts);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setJobTitle(user?.title ?? "");
  }, [initialProfile, user]);

  useEffect(() => {
    setDeadlineAlerts(notificationPreferences.deadlineAlerts);
    setRejectionAlerts(notificationPreferences.rejectionAlerts);
    setComplianceAlerts(notificationPreferences.complianceAlerts);
    setWeeklySummary(notificationPreferences.weeklySummary);
    setBrowserAlerts(notificationPreferences.browserAlerts);
  }, [notificationPreferences]);

  useEffect(() => {
    const clientId = user?.clientIds[0];
    if (!backendMode || !clientId) {
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    void apiGetJson<BackendClientProfile>(`/api/clients/${encodeURIComponent(clientId)}`)
      .then((client) => {
        if (!active) return;
        setProfile((current) => ({
          ...current,
          legalName: client.name,
          primaryContact: client.primaryContact,
          financeEmail: client.email,
          registrationNumber: client.registrationNumber ?? "",
          taxNumber: client.taxNumber ?? "",
          vatNumber: client.vatNumber ?? "",
          phone: client.phone ?? "",
          tradingName: client.tradingName ?? "",
          addressLine: client.addressLine ?? "",
          city: client.city ?? "",
          country: client.country ?? "",
        }));
        setIndustry(client.industry ?? "");
        setJobTitle(client.primaryContactJobTitle ?? user?.title ?? "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFeedbackNotice({
          tone: "danger",
          title: "Profile unavailable",
          message: error instanceof ApiError ? error.message : "The live client profile could not be loaded.",
        });
      })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [backendMode, user?.clientIds]);

  const sections: Array<{
    id: SettingsSection;
    title: string;
    description: string;
    tone: string;
  }> = [
    {
      id: "business",
      title: "Business profile",
      description: "Company details and contact information",
      tone: "bg-brand-50 text-brand-600 ring-brand-100",
    },
    {
      id: "security",
      title: "Security",
      description: "Password and session security",
      tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Email alerts and reminder preferences",
      tone: "bg-amber-50 text-amber-500 ring-amber-100",
    },
    {
      id: "documents",
      title: "Document preferences",
      description: "Your documents and record handling",
      tone: "bg-sky-50 text-sky-600 ring-sky-100",
    },
  ];

  function handleSaveProfile() {
    if (backendMode) {
      setFeedbackNotice({
        tone: "info",
        title: "Profile managed by your firm",
        message: "Contact your accountant to change registered business or primary-contact details.",
      });
      return;
    }
    const result = portal.updateBusinessProfile(profile);
    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Settings saved" : "Save failed",
      message: result.message,
    });
  }

  function handleResetProfile() {
    setProfile(initialProfile);
    setIndustry("");
    setJobTitle(user?.title ?? "");
    setFeedbackNotice({
      tone: "info",
      title: "Changes reset",
      message: "Profile fields were reset to the current workspace values.",
    });
  }

  async function handlePasswordChange() {
    if (!currentPassword.trim()) {
      setFeedbackNotice({
        tone: "danger",
        title: "Current password required",
        message: "Enter your current password before choosing a new one.",
      });
      return;
    }

    if (Array.from(nextPassword).length < 15) {
      setFeedbackNotice({
        tone: "danger",
        title: "Password too short",
        message: "Use a new password with at least 15 characters.",
      });
      return;
    }

    if (nextPassword !== confirmPassword) {
      setFeedbackNotice({
        tone: "danger",
        title: "Passwords do not match",
        message: "Confirm the new password exactly before saving.",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
    const result = await changePassword(currentPassword, nextPassword);

    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Password updated" : "Password update failed",
      message:
        result.message ??
        (result.ok
          ? "Your password was updated successfully."
          : "The password could not be updated."),
    });

    if (result.ok) {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    }
    } catch (error) {
      setFeedbackNotice({ tone: "danger", title: "Password update failed", message: error instanceof Error ? error.message : "Please try again." });
    } finally { setIsUpdatingPassword(false); }
  }

  function handleSaveNotifications() {
    if (backendMode) {
      return;
    }
    const result = portal.updateClientNotificationPreferences({
      ...notificationPreferences,
      deadlineAlerts,
      rejectionAlerts,
      complianceAlerts,
      weeklySummary,
      browserAlerts,
    });

    setFeedbackNotice({
      tone: result.ok ? "success" : "danger",
      title: result.ok ? "Preferences saved" : "Save failed",
      message: result.message,
    });
  }


  const currentSection = sections.find(section => section.id === activeSection)!;
  const SectionIcon = sectionIcons[activeSection];
  const initials = (user?.fullName || user?.name || "Client").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("");
  function field(label: string, key: keyof BusinessProfile, type = "text") {
    return <TextField label={label} type={type} placeholder={backendMode ? "Not provided" : ""}
      readOnly={backendMode} value={profile[key] ?? ""}
      onChange={event => setProfile(value => ({ ...value, [key]: event.target.value }))} />;
  }

  return <div className="client-settings">
    <header className="settings-heading">
      <div><p className="settings-eyebrow">YOUR WORKSPACE</p><h1>Settings</h1><p>Business details, account access and the updates you receive.</p></div>
      <div className="settings-identity"><span className="settings-avatar" aria-hidden="true">{initials}</span><div><strong>{user?.fullName || user?.name || "Client account"}</strong><span>{user?.email}</span></div></div>
    </header>

    <div className="settings-tabs" role="tablist" aria-label="Settings sections">
      {sections.map((section, index) => {
        const Icon = sectionIcons[section.id];
        const active = activeSection === section.id;
        return <button type="button" role="tab" aria-selected={active} aria-controls={"settings-panel-" + section.id} id={"settings-tab-" + section.id}
          tabIndex={active ? 0 : -1} key={section.id} className={cn("settings-tab", active && "is-active")}
          onClick={() => { setActiveSection(section.id); setFeedbackNotice(null); }}
          onKeyDown={event => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % sections.length;
            else if (event.key === "ArrowLeft") next = (index + sections.length - 1) % sections.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = sections.length - 1;
            else return;
            event.preventDefault(); setActiveSection(sections[next].id); setFeedbackNotice(null);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}><Icon size={19} aria-hidden="true" /><span>{section.title}</span></button>;
      })}
    </div>

    {feedbackNotice && <FeedbackBanner {...feedbackNotice} onDismiss={() => setFeedbackNotice(null)} />}
    <section className="settings-panel" role="tabpanel" tabIndex={0} id={"settings-panel-" + activeSection} aria-labelledby={"settings-tab-" + activeSection}>
      <header className="settings-panel-heading"><div className="settings-section-title"><SectionIcon size={21} aria-hidden="true" /><div><h2>{currentSection.title}</h2><p>{currentSection.description}</p></div></div>
        {activeSection === "business" && backendMode && <span className="settings-label"><LockIcon size={13} aria-hidden="true" /> Managed by your firm</span>}
      </header>

      {activeSection === "business" && <>
        {profileLoading && <p role="status" className="settings-note">Loading your business details…</p>}
        <div className="settings-group"><div className="settings-group-label"><span>01 / BUSINESS</span><h3>Company details</h3><p>Your business identity as recorded by your firm.</p></div>
          <div className="settings-fields" aria-busy={profileLoading}>
            {field("Company name", "legalName")}{field("Trading name", "tradingName")}{field("Registration number", "registrationNumber")}{field("VAT number", "vatNumber")}
            <TextField label="Industry" readOnly={backendMode} placeholder={backendMode ? "Not provided" : ""} value={industry} onChange={event => setIndustry(event.target.value)} />
          </div>
        </div>
        <div className="settings-group"><div className="settings-group-label"><span>02 / CONTACT</span><h3>Primary contact</h3><p>The person your accountant contacts about documents and compliance.</p></div>
          <div className="settings-fields">{field("Full name", "primaryContact")}{field("Email address", "financeEmail", "email")}{field("Phone number", "phone", "tel")}
            <TextField label="Job title" readOnly={backendMode} placeholder={backendMode ? "Not provided" : ""} value={jobTitle} onChange={event => setJobTitle(event.target.value)} />
          </div>
        </div>
        <footer className="settings-footer">{backendMode
          ? <><p><Info size={16} aria-hidden="true" /> Need to update these details? Send your accountant a message.</p><Button variant="secondary" onClick={() => navigate("/client/requests")}>Contact your accountant <ArrowUpRight size={16} aria-hidden="true" /></Button></>
          : <><Button variant="secondary" onClick={handleResetProfile}>Reset changes</Button><Button onClick={handleSaveProfile}>Save changes</Button></>}</footer>
      </>}

      {activeSection === "security" && <>
        <div className="settings-group"><div className="settings-group-label"><span>01 / SIGN-IN</span><h3>Change password</h3><p>Choose a unique password with at least 15 characters.</p>
          <small>Last changed: {formatDateValue(securitySettings.passwordLastChangedAt)}</small></div>
          <form className="settings-password-form" onSubmit={event => { event.preventDefault(); void handlePasswordChange(); }}>
            <TextField required autoComplete="current-password" label="Current password" type={showPasswords ? "text" : "password"} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            <div className="settings-fields"><TextField required autoComplete="new-password" label="New password" type={showPasswords ? "text" : "password"} value={nextPassword} onChange={event => setNextPassword(event.target.value)} />
              <TextField required autoComplete="new-password" label="Confirm new password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></div>
            <div className="settings-form-actions"><button type="button" className="settings-text-button" aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}{showPasswords ? "Hide passwords" : "Show passwords"}</button>
              <Button type="submit" disabled={isUpdatingPassword}>{isUpdatingPassword ? "Updating password…" : "Update password"}</Button></div>
          </form>
        </div>
        <div className="settings-group"><div className="settings-group-label"><span>02 / ACCESS</span><h3>Session security</h3><p>Keep access to your account under your control.</p></div>
          <div className="settings-policy"><SessionIcon size={22} aria-hidden="true" /><div><strong>{backendMode ? "Protect your signed-in sessions" : "Active sessions"}</strong>
            <p>{backendMode ? "Changing your password signs out your other active sessions. A device-by-device list is not available here." : "Devices recorded in this workspace."}</p>
            {!backendMode && (securitySettings.activeSessions ?? []).map(session => <div className="settings-session" key={session.id}><strong>{session.label}{session.isCurrent ? " · Current session" : ""}</strong><p>{session.location} · {formatDateValue(session.lastActiveAt)}</p></div>)}
          </div></div>
        </div>
      </>}

      {activeSection === "notifications" && (backendMode
        ? <div className="settings-group"><div className="settings-group-label"><span>WORKFLOW UPDATES</span><h3>Stay up to date</h3><p>Find requests, document updates and reminders in your inbox.</p></div>
          <div className="settings-notification-info"><Mail size={28} aria-hidden="true" /><h3>Your updates, in one place</h3><p>Notification preferences cannot be changed on this page yet. You can still read and manage the notifications you receive.</p><Button variant="secondary" onClick={() => navigate("/client/notifications")}>Open notification inbox <ArrowUpRight size={16} aria-hidden="true" /></Button></div>
        </div>
        : <><div className="settings-group"><div className="settings-group-label"><span>YOUR PREFERENCES</span><h3>Choose your updates</h3><p>Adjust reminders and summaries to suit your workflow.</p></div><div className="settings-toggles">
          <Toggle checked={deadlineAlerts} label="Deadline reminders" description="When a monthly pack deadline is approaching." onChange={() => setDeadlineAlerts(value => !value)} />
          <Toggle checked={rejectionAlerts} label="Rejected document alerts" description="When a file needs correcting and uploading again." onChange={() => setRejectionAlerts(value => !value)} />
          <Toggle checked={complianceAlerts} label="Compliance expiry alerts" description="When compliance records are expiring." onChange={() => setComplianceAlerts(value => !value)} />
          <Toggle checked={weeklySummary} label="Weekly summary email" description="A summary of progress and outstanding work." onChange={() => setWeeklySummary(value => !value)} />
          <Toggle checked={browserAlerts} label="Browser alerts" description="Urgent updates while you are signed in." onChange={() => setBrowserAlerts(value => !value)} />
        </div></div><footer className="settings-footer"><p>Apply your changes when you are ready.</p><Button onClick={handleSaveNotifications}>Save preferences</Button></footer></>)}

      {activeSection === "documents" && <>
        <div className="settings-group"><div className="settings-group-label"><span>01 / UPLOADS</span><h3>Keep documents organised</h3><p>Use the correct monthly-pack slot for documents requested by your accountant.</p></div>
          <div className="settings-policy"><DocumentIcon size={23} aria-hidden="true" /><div><strong>Documents and monthly packs</strong><p>Your document register holds your records. Monthly packs group the documents needed for a particular period.</p>
            <div className="settings-links"><Button variant="secondary" onClick={() => navigate("/client/documents")}>Open documents <ArrowUpRight size={15} /></Button><Button variant="secondary" onClick={() => navigate("/client/packs")}>Open monthly packs <ArrowUpRight size={15} /></Button></div></div></div>
        </div>
        <div className="settings-group"><div className="settings-group-label"><span>02 / RECORDS</span><h3>Retention &amp; compliance</h3><p>Record-handling rules are managed by your firm.</p></div>
          <div className="settings-policy"><LockIcon size={23} aria-hidden="true" /><div><strong>Keeping your supporting records</strong><p>{portal.clientComplianceCentre.retentionNote || "Contact your accountant for your firm's document retention policy."}</p><Button variant="secondary" onClick={() => navigate("/client/compliance")}>Open compliance centre <ArrowUpRight size={15} /></Button></div></div>
        </div>
      </>}
    </section>
  </div>;
}
