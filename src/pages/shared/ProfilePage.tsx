import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, Pencil, UserRound } from "lucide-react";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const editing = params.get("edit") === "true";
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setTitle(user?.title ?? "");
    setPhone(user?.phone ?? "");
  }, [user, editing]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const result = await updateProfile({ fullName, title, phone });
      setNotice({ error: !result.ok, text: result.message || (result.ok ? "Your profile has been updated." : "Your profile could not be saved.") });
      if (result.ok) setParams({}, { replace: true });
    } catch {
      setNotice({ error: true, text: "Your profile could not be saved. Please try again." });
    } finally { setSaving(false); }
  }

  return <section className="workspace-profile-page">
    <div className="workspace-profile-page-heading"><div><p className="workspace-eyebrow">YOUR ACCOUNT</p><h1>My profile</h1><p>View and manage your personal information.</p></div>
      {!editing && <Button variant="secondary" onClick={() => { setNotice(null); setParams({ edit: "true" }); }}><Pencil size={16} aria-hidden="true" />Edit profile</Button>}
    </div>
    {notice && <div role={notice.error ? "alert" : "status"} className={`workspace-profile-notice ${notice.error ? "is-error" : ""}`}>{notice.text}</div>}
    <div className="workspace-profile-grid">
      <aside className="workspace-profile-summary"><span className="workspace-avatar workspace-avatar-large" aria-hidden="true">{user?.initials}</span><h2>{user?.fullName}</h2><p>{user?.title || "Portal member"}</p><span className="workspace-role-badge">{user?.role === "admin" ? "Administrator" : user?.role}</span><div className="workspace-profile-email"><Mail size={16} aria-hidden="true" /><span>{user?.email}</span></div></aside>
      <form className="workspace-profile-details" onSubmit={save}>
        <div className="workspace-profile-section-title"><UserRound size={20} aria-hidden="true" /><div><h2>Personal information</h2><p>Your name and contact details within the portal.</p></div></div>
        <fieldset disabled={saving} className="space-y-5">
          <TextField label="Full name" autoComplete="name" maxLength={200} required readOnly={!editing} value={fullName} onChange={event => setFullName(event.target.value)} />
          <div className="grid gap-5 sm:grid-cols-2"><TextField label="Job title" autoComplete="organization-title" maxLength={100} readOnly={!editing} value={title} onChange={event => setTitle(event.target.value)} /><TextField label="Phone number" type="tel" autoComplete="tel" maxLength={40} readOnly={!editing} value={phone} onChange={event => setPhone(event.target.value)} /></div>
          <TextField label="Email address" type="email" readOnly value={user?.email ?? ""} />
          <p className="text-sm text-slate-500">Contact your administrator to change your sign-in email or access role.</p>
        </fieldset>
        {editing && <div className="workspace-profile-form-actions"><Button variant="secondary" disabled={saving} onClick={() => { setNotice(null); setParams({}, { replace: true }); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>}
      </form>
    </div>
  </section>;
}
