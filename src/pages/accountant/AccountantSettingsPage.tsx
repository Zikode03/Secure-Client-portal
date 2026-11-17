import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, LockKeyhole, Bell, FolderCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { portalServiceApi } from "../../services/portalApi";
import { hasPermission } from "../../utils/permissions";
import { NotificationPreferencesPage } from "../shared/NotificationPreferencesPage";
import "./accountantSettings.css";

type Section = "account" | "security" | "notifications" | "filing";
interface FilingRule { id: string; category: string; isEnabled: boolean; description: string }
const sections = [
  { id: "account", label: "My account", icon: UserRound, description: "Your name and contact details in the portal." },
  { id: "security", label: "Security", icon: LockKeyhole, description: "Change the password you use to sign in." },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Choose which updates you receive and when." },
  { id: "filing", label: "Auto-filing", icon: FolderCheck, description: "Choose which accepted document categories are filed automatically." },
] as const;

export function AccountantSettingsPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("account");
  const [rules, setRules] = useState<FilingRule[]>([]);
  const [savedRules, setSavedRules] = useState<FilingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState("");
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesNotice, setRulesNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ error: boolean; text: string } | null>(null);
  const passwordFlight = useRef(false);
  const rulesFlight = useRef(false);
  const canEditRules = hasPermission(user, "review:documents");
  useEffect(() => {
    let active = true;
    setRulesLoading(true); setRulesError("");
    void portalServiceApi.getFilingRules().then(result => {
      if (!Array.isArray(result)) throw new Error("Invalid filing rules");
      if (active) { setRules(result); setSavedRules(result); }
    }).catch(() => { if (active) setRulesError("Filing rules could not be loaded. Try again."); }).finally(() => { if (active) setRulesLoading(false); });
    return () => { active = false; };
  }, [user?.id, revision]);

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (passwordFlight.current) return;
    if (!currentPassword.trim()) { setPasswordNotice({ error: true, text: "Enter your current password." }); return; }
    if (Array.from(password).length < 15) { setPasswordNotice({ error: true, text: "Use at least 15 characters for your new password." }); return; }
    if (password !== confirm) { setPasswordNotice({ error: true, text: "The new passwords do not match." }); return; }
    passwordFlight.current = true; setPasswordSaving(true); setPasswordNotice(null);
    try {
      const result = await changePassword(currentPassword, password);
      setPasswordNotice({ error: !result.ok, text: result.message || (result.ok ? "Password updated." : "Password could not be updated.") });
      if (result.ok) { setCurrentPassword(""); setPassword(""); setConfirm(""); }
    } catch { setPasswordNotice({ error: true, text: "Password could not be updated. Please try again." }); }
    finally { passwordFlight.current = false; setPasswordSaving(false); }
  }
  const changed = rules.filter(rule => savedRules.find(saved => saved.category === rule.category)?.isEnabled !== rule.isEnabled);
  async function saveRules() {
    if (!canEditRules || rulesLoading || rulesError || rulesFlight.current || !changed.length) return;
    rulesFlight.current = true; setRulesSaving(true); setRulesNotice("");
    try {
      for (const rule of changed) {
        const result = await portalServiceApi.updateFilingRule(rule.category, rule.isEnabled);
        if (!result.ok) throw new Error("Save failed");
        // Retain successful writes if a later category fails; retry only unsaved changes.
        setSavedRules(previous => previous.map(saved => saved.category === rule.category ? { ...saved, isEnabled: rule.isEnabled } : saved));
      }
      setRulesNotice("Auto-filing rules saved.");
    } catch { setRulesNotice("Some rules could not be saved. Your changes are kept; try saving again."); }
    finally { rulesFlight.current = false; setRulesSaving(false); }
  }
  const active = sections.find(item => item.id === section)!;
  return <div className="accountant-settings">
    <header className="accountant-settings-heading"><h1 className="workspace-duplicate-title ">Settings</h1><p>Manage your account, security and work preferences.</p></header>
    <div className="accountant-settings-layout">
      <nav className="accountant-settings-nav" aria-label="Settings sections"><div role="tablist" aria-label="Accountant settings">{sections.map((item, index) => <button key={item.id} id={`accountant-settings-tab-${item.id}`} role="tab" type="button" aria-controls="accountant-settings-panel" aria-selected={section === item.id} tabIndex={section === item.id ? 0 : -1} onClick={() => setSection(item.id)} onKeyDown={event => {
        const next = ["ArrowDown", "ArrowRight"].includes(event.key) ? (index + 1) % sections.length : ["ArrowUp", "ArrowLeft"].includes(event.key) ? (index + sections.length - 1) % sections.length : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); setSection(sections[next].id); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}><item.icon size={18} aria-hidden="true" /><span>{item.label}</span></button>)}</div><p>Firm access and assignments are managed by your administrator.</p></nav>
      <section className="accountant-settings-panel" id="accountant-settings-panel" role="tabpanel" aria-labelledby={`accountant-settings-tab-${section}`}>
        <div className="accountant-settings-panel-heading"><h2>{active.label}</h2><p>{active.description}</p></div>
        {section === "account" ? <><dl className="accountant-settings-account"><div><dt>Full name</dt><dd>{user?.fullName || "Not provided"}</dd></div><div><dt>Email address</dt><dd>{user?.email || "Not provided"}</dd></div><div><dt>Job title</dt><dd>{user?.title || "Not provided"}</dd></div><div><dt>Phone number</dt><dd>{user?.phone || "Not provided"}</dd></div><div><dt>Firm</dt><dd>{user?.company || "Not provided"}</dd></div><div><dt>Role</dt><dd>Accountant</dd></div></dl><div className="accountant-settings-footer"><span>Contact your administrator to change your email or role.</span><Button variant="secondary" onClick={() => navigate("/firm/profile?edit=true")}>Edit profile<ArrowRight size={15} aria-hidden="true" /></Button></div></> : null}
        {section === "security" ? <form className="accountant-settings-password" noValidate onSubmit={event => void savePassword(event)}><fieldset disabled={passwordSaving}><TextField id="accountant-current-password" label="Current password" autoComplete="current-password" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /><TextField id="accountant-new-password" label="New password" hint="Use a unique password with at least 15 characters." autoComplete="new-password" type="password" value={password} onChange={event => setPassword(event.target.value)} /><TextField id="accountant-confirm-password" label="Confirm new password" autoComplete="new-password" type="password" value={confirm} onChange={event => setConfirm(event.target.value)} /></fieldset>{passwordNotice ? <p className={`accountant-settings-notice ${passwordNotice.error ? "is-error" : ""}`} role={passwordNotice.error ? "alert" : "status"}>{passwordNotice.text}</p> : null}<div className="accountant-settings-footer"><Button type="submit" disabled={passwordSaving}>{passwordSaving ? "Updating..." : "Update password"}</Button></div></form> : null}
        {section === "notifications" ? <div className="accountant-settings-notifications"><NotificationPreferencesPage embedded /></div> : null}
        {section === "filing" ? <div className="accountant-settings-filing"><p className="accountant-settings-context">These rules apply across the firm. Documents must be accepted before auto-filing can run.</p>{rulesLoading ? <p role="status">Loading filing rules...</p> : rulesError ? <div role="alert" className="accountant-settings-notice is-error"><p>{rulesError}</p><Button variant="secondary" size="sm" onClick={() => setRevision(value => value + 1)}>Try again</Button></div> : !rules.length ? <p className="accountant-settings-context">No auto-filing rules have been configured.</p> : <fieldset disabled={rulesSaving || !canEditRules} className="accountant-settings-rule-list">{rules.map(rule => <label key={rule.id}><span><strong>{rule.category.replace(/_/g, " ")}</strong><small>{rule.description}</small></span><input type="checkbox" checked={rule.isEnabled} aria-label={`Auto-file ${rule.category.replace(/_/g, " ")}`} onChange={event => setRules(previous => previous.map(item => item.category === rule.category ? { ...item, isEnabled: event.target.checked } : item))} /></label>)}</fieldset>}{!canEditRules ? <p className="accountant-settings-context">Your account can view these rules. Review permission is required to change them.</p> : null}{rulesNotice ? <p role="status" className="accountant-settings-notice">{rulesNotice}</p> : null}<div className="accountant-settings-footer"><Button variant="secondary" disabled={rulesSaving || !changed.length} onClick={() => { setRules(savedRules); setRulesNotice(""); }}>Discard changes</Button><Button disabled={!canEditRules || rulesLoading || Boolean(rulesError) || !changed.length || rulesSaving} onClick={() => void saveRules()}>{rulesSaving ? "Saving..." : "Save filing rules"}</Button></div></div> : null}
      </section>
    </div>
  </div>;
}
