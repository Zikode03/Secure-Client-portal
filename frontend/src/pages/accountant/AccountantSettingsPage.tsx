import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";

export function AccountantSettingsPage() {
  const [followUpWindow, setFollowUpWindow] = useState("2 business days");
  const [defaultEscalation, setDefaultEscalation] = useState("Open request");
  const [signature, setSignature] = useState("Daniel Mokoena");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={() => setFeedbackMessage("Accountant settings saved in the frontend workspace.")}>Save settings</Button>}
        description="These settings shape how the accountant workspace behaves when follow-ups, reviews, and client communication are triggered."
        eyebrow="Accountant settings"
        title="Workflow preferences"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Default review signature"
            onChange={(event) => setSignature(event.target.value)}
            value={signature}
          />
          <SelectField
            label="Default follow-up window"
            onChange={(event) => setFollowUpWindow(event.target.value)}
            options={[
              { label: "1 business day", value: "1 business day" },
              { label: "2 business days", value: "2 business days" },
              { label: "3 business days", value: "3 business days" },
            ]}
            value={followUpWindow}
          />
          <SelectField
            label="Escalation behaviour"
            onChange={(event) => setDefaultEscalation(event.target.value)}
            options={[
              { label: "Open request", value: "Open request" },
              { label: "Notify admin", value: "Notify admin" },
              { label: "Both", value: "Both" },
            ]}
            value={defaultEscalation}
          />
        </div>
      </SurfaceCard>
    </div>
  );
}
