import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AdminSettingsPage() {
  const [retentionRule, setRetentionRule] = useState("5 years after return submission");
  const [mfaPolicy, setMfaPolicy] = useState("Planned for next phase");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={() => setFeedbackMessage("System settings saved in the frontend workspace.")}>Save settings</Button>}
        description="System settings cover retention, security posture, and the operational rules that affect every role in the portal."
        eyebrow="Admin settings"
        title="System settings"
      />

      {feedbackMessage ? (
        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="space-y-4">
        <SelectField
          label="Retention rule"
          onChange={(event) => setRetentionRule(event.target.value)}
          options={[
            { label: "5 years after return submission", value: "5 years after return submission" },
            { label: "Longer where legal hold applies", value: "Longer where legal hold applies" },
          ]}
          value={retentionRule}
        />
        <SelectField
          label="MFA policy"
          onChange={(event) => setMfaPolicy(event.target.value)}
          options={[
            { label: "Planned for next phase", value: "Planned for next phase" },
            { label: "Required for admin only", value: "Required for admin only" },
            { label: "Required for all roles", value: "Required for all roles" },
          ]}
          value={mfaPolicy}
        />
      </SurfaceCard>
    </div>
  );
}
