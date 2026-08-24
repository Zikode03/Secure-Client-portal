import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
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

export function AdminFirmProfilePanel() {
  const backendMode = hasApiBaseUrl();
  const [profile, setProfile] = useState<FirmProfile>(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "Firm profile settings require the live backend API." });
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
  }, [backendMode]);

  async function save() {
    setSaving(true);
    try {
      await apiPutJson<SettingResponse, { valueJson: string }>("/api/admin/settings/firm.profile", {
        valueJson: JSON.stringify(profile),
      });
      setFeedback({ tone: "success", title: "Firm profile saved", message: "The organisation profile and regional defaults are now stored in the backend." });
    } catch (error) {
      setFeedback({ tone: "danger", title: "Firm profile could not be saved", message: error instanceof ApiError ? error.message : "The firm profile update failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="portal-section-title text-slate-950">Firm profile</h2>
          <p className="mt-1 text-sm text-slate-500">Company identity and regional defaults used across the administration workspace.</p>
        </div>
        <Button disabled={loading || saving || !backendMode} onClick={() => void save()}>
          {saving ? "Saving..." : "Save firm profile"}
        </Button>
      </div>

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="Firm name" onChange={(event) => setProfile({ ...profile, firmName: event.target.value })} value={profile.firmName} />
        <TextField label="Registration number" onChange={(event) => setProfile({ ...profile, registrationNumber: event.target.value })} value={profile.registrationNumber} />
        <TextField label="VAT number" onChange={(event) => setProfile({ ...profile, vatNumber: event.target.value })} value={profile.vatNumber} />
        <TextField label="Firm email" onChange={(event) => setProfile({ ...profile, email: event.target.value })} value={profile.email} />
        <TextField label="Phone" onChange={(event) => setProfile({ ...profile, phone: event.target.value })} value={profile.phone} />
        <TextField label="Timezone" onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} value={profile.timezone} />
        <TextField label="Currency" onChange={(event) => setProfile({ ...profile, currency: event.target.value })} value={profile.currency} />
        <div className="md:col-span-2 xl:col-span-2">
          <TextField label="Business address" onChange={(event) => setProfile({ ...profile, address: event.target.value })} value={profile.address} />
        </div>
      </div>
    </SurfaceCard>
  );
}
