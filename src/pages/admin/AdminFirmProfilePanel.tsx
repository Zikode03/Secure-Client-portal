import { useEffect, useState } from "react";
import { Building2, Check, Globe2, Mail, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface SettingResponse {
  key: string;
  valueJson: string;
}

interface FirmProfile {
  firmName: string;
  registrationNumber: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

const defaultProfile: FirmProfile = {
  firmName: "",
  registrationNumber: "",
  vatNumber: "",
  email: "",
  phone: "",
  address: "",
  timezone: "Africa/Johannesburg",
  currency: "ZAR",
};

export function AdminFirmProfilePanel({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const backendMode = hasApiBaseUrl();
  const [profile, setProfile] = useState<FirmProfile>(defaultProfile);
  const [saved, setSaved] = useState<FirmProfile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(backendMode);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Firm profile unavailable", message: "Connect to the portal service to load your firm profile." });
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const result = await apiGetJson<SettingResponse>("/api/admin/settings/firm.profile");
        if (!mounted) return;
        const parsed = JSON.parse(result.valueJson || "{}") as Partial<FirmProfile>;
        setProfile({ ...defaultProfile, ...parsed });
        setSaved({ ...defaultProfile, ...parsed });
        setLoaded(true);
        setFeedback(null);
      } catch (error) {
        if (!mounted) return;
        setFeedback({ tone: "danger", title: "Firm profile could not be loaded", message: error instanceof ApiError ? error.message : "The saved firm profile could not be loaded." });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [backendMode, loadAttempt]);

  const dirty = JSON.stringify(profile) !== JSON.stringify(saved);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!loaded) return;
    if (!profile.firmName.trim()) {
      setFeedback({ tone: "warning", title: "Enter your firm name", message: "A firm name is required before saving the profile." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await apiPutJson<SettingResponse, { valueJson: string }>("/api/admin/settings/firm.profile", {
        valueJson: JSON.stringify(profile),
      });
      setSaved(profile);
      setFeedback({ tone: "success", title: "Firm profile saved", message: "Your business details, contact information, and regional defaults have been saved." });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Firm profile could not be saved", message: error instanceof ApiError ? error.message : "The firm profile update failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Firm profile">
      <div className="settings-section-heading"><div><h2>Firm profile</h2><p>Manage your organisation’s identity, contact details, and regional preferences.</p></div></div>
      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}
      {loading ? <div className="settings-empty" role="status">Loading firm profile…</div> : !loaded ? <div className="settings-empty"><p>Your firm profile must load before it can be edited.</p><Button disabled={!backendMode} variant="secondary" onClick={() => setLoadAttempt(value => value + 1)}>Try again</Button></div> :
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset className="settings-profile" disabled={saving}><legend className="sr-only">Firm profile details</legend>
          <div className="settings-firm-identity"><span className="settings-firm-mark"><Building2 size={28} aria-hidden="true" /></span><div><h3>{profile.firmName || "Your firm"}</h3><p>{profile.email || "Add a contact email for your organisation"}</p></div></div>
          <section className="settings-profile-section"><div><Building2 size={20} aria-hidden="true" /><h3>Business details</h3><p>Your registered organisation and tax details.</p></div><div className="settings-fields">
            <div className="settings-full-width"><TextField required maxLength={200} label="Firm name" placeholder="e.g. Finwell Advisory" autoComplete="organization" onChange={event => setProfile({ ...profile, firmName: event.target.value })} value={profile.firmName} /></div>
            <TextField maxLength={80} label="Registration number" hint="Company registration number, if applicable." onChange={event => setProfile({ ...profile, registrationNumber: event.target.value })} value={profile.registrationNumber} />
            <TextField maxLength={80} label="VAT number" hint="Leave blank if your firm is not VAT registered." onChange={event => setProfile({ ...profile, vatNumber: event.target.value })} value={profile.vatNumber} />
          </div></section>
          <section className="settings-profile-section"><div><Mail size={20} aria-hidden="true" /><h3>Contact information</h3><p>The shared contact details for your firm.</p></div><div className="settings-fields">
            <TextField type="email" maxLength={254} label="Firm email" placeholder="hello@yourfirm.co.za" autoComplete="email" onChange={event => setProfile({ ...profile, email: event.target.value })} value={profile.email} />
            <TextField type="tel" maxLength={40} label="Phone number" placeholder="+27" autoComplete="tel" onChange={event => setProfile({ ...profile, phone: event.target.value })} value={profile.phone} />
            <div className="settings-full-width"><TextAreaField maxLength={500} label="Business address" autoComplete="street-address" onChange={event => setProfile({ ...profile, address: event.target.value })} value={profile.address} /></div>
          </div></section>
          <section className="settings-profile-section"><div><Globe2 size={20} aria-hidden="true" /><h3>Regional defaults</h3><p>Store your firm’s preferred timezone and reporting currency.</p></div><div className="settings-fields">
            <SelectField label="Timezone" options={Array.from(new Set([profile.timezone, "Africa/Johannesburg", "Africa/Nairobi", "Europe/London", "UTC", "America/New_York", "Australia/Sydney"])).map(value => ({ value, label: value === "Africa/Johannesburg" ? "South Africa — Johannesburg (UTC+02:00)" : value.split("_").join(" ") }))} onChange={event => setProfile({ ...profile, timezone: event.target.value })} value={profile.timezone} />
            <SelectField label="Currency" options={Array.from(new Set([profile.currency, "ZAR", "USD", "GBP", "EUR", "AUD"])).map(value => ({ value, label: ({ ZAR: "ZAR — South African rand", USD: "USD — US dollar", GBP: "GBP — British pound", EUR: "EUR — Euro", AUD: "AUD — Australian dollar" } as Record<string, string>)[value] ?? value }))} onChange={event => setProfile({ ...profile, currency: event.target.value })} value={profile.currency} />
          </div></section>
        </fieldset>
        <footer className="settings-save-bar"><p role="status">{dirty ? <><span className="settings-dirty-dot" />Unsaved firm profile changes</> : <><Check size={16} aria-hidden="true" />No unsaved changes</>}</p><div><Button type="button" variant="ghost" disabled={saving || !dirty} onClick={() => { setProfile(saved); setFeedback(null); }}>Discard changes</Button><Button type="submit" disabled={saving || !dirty}><Save size={16} aria-hidden="true" />{saving ? "Saving…" : "Save firm profile"}</Button></div></footer>
      </form>}
    </section>
  );
}
