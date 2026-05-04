import { useState } from "react";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";

export function ClientSettingsPage() {
  const portal = usePortal();
  const [profile, setProfile] = useState(portal.clientProfile);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  function handleSave() {
    const result = portal.updateBusinessProfile(profile);
    setFeedbackMessage(result.message);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={handleSave}>Save business settings</Button>}
        description="Keep the client profile accurate so auto-naming, compliance tracking, and accountant communication all use the right business details."
        eyebrow="Client settings"
        title="Business profile"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Legal name"
            onChange={(event) => setProfile((current) => ({ ...current, legalName: event.target.value }))}
            value={profile.legalName}
          />
          <TextField
            label="Trading name"
            onChange={(event) => setProfile((current) => ({ ...current, tradingName: event.target.value }))}
            value={profile.tradingName}
          />
          <TextField
            label="Registration number"
            onChange={(event) => setProfile((current) => ({ ...current, registrationNumber: event.target.value }))}
            value={profile.registrationNumber}
          />
          <TextField
            label="Tax number"
            onChange={(event) => setProfile((current) => ({ ...current, taxNumber: event.target.value }))}
            value={profile.taxNumber}
          />
          <TextField
            label="VAT number"
            onChange={(event) => setProfile((current) => ({ ...current, vatNumber: event.target.value }))}
            value={profile.vatNumber}
          />
          <TextField
            label="Primary contact"
            onChange={(event) => setProfile((current) => ({ ...current, primaryContact: event.target.value }))}
            value={profile.primaryContact}
          />
          <TextField
            label="Finance email"
            onChange={(event) => setProfile((current) => ({ ...current, financeEmail: event.target.value }))}
            value={profile.financeEmail}
          />
          <TextField
            label="Phone"
            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
            value={profile.phone}
          />
          <TextField
            label="Address line"
            onChange={(event) => setProfile((current) => ({ ...current, addressLine: event.target.value }))}
            value={profile.addressLine}
          />
          <TextField
            label="City"
            onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))}
            value={profile.city}
          />
        </div>
      </SurfaceCard>
    </div>
  );
}
