import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, CircleAlert, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/auth";
import { apiGetJson } from "../../services/apiClient";
import { formatDateLabel } from "../../utils/formatters";
import type { MonitoringProfile } from "./ComplianceMonitoringWorkspace";
import "./clientComplianceVerification.css";

const outcomeLabels: Record<string, string> = {
  pass: "No issue recorded",
  fail: "Issue recorded",
  unknown: "Inconclusive",
};

const verificationLabels: Record<string, string> = {
  not_checked: "Not checked yet",
  accountant_confirmed: "Accountant confirmed",
  stale: "Review due",
  identifiers_changed: "Details changed — recheck required",
  authority_verified: "Verified by authority",
};

function verificationSource(check: MonitoringProfile["checks"][number]) {
  const latest = check.latestVerification;
  if (!latest) return `${check.source} · No verification recorded`;
  if (latest.method === "authority_verified") return `${check.source} · Authority verification`;
  return `${check.source} · Checked by your accountant`;
}

function statusLabel(check: MonitoringProfile["checks"][number]) {
  if (check.latestVerification?.method === "authority_verified" && check.verificationStatus === "authority_verified") {
    return "Verified by authority";
  }
  return verificationLabels[check.verificationStatus] ?? "Verification unavailable";
}

function statusTone(check: MonitoringProfile["checks"][number]) {
  if (check.applicability === "not_applicable") return "neutral";
  if (check.verificationStatus === "stale" || check.verificationStatus === "identifiers_changed") return "warning";
  if (check.latestVerification?.outcome === "fail") return "danger";
  if (check.latestVerification?.outcome === "pass") return "success";
  return "neutral";
}

export function ClientComplianceVerificationPanel() {
  const { user } = useAuth();
  const clientId = user?.clientIds?.[0] ?? "";
  const [profile, setProfile] = useState<MonitoringProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setProfile(await apiGetJson<MonitoringProfile>(`/api/compliance/monitoring/${encodeURIComponent(clientId)}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [clientId]);

  const counts = useMemo(() => {
    const checks = profile?.checks ?? [];
    return {
      confirmed: checks.filter(check => check.verificationStatus === "accountant_confirmed" || check.verificationStatus === "authority_verified").length,
      review: checks.filter(check => check.verificationStatus === "stale" || check.verificationStatus === "identifiers_changed").length,
      unchecked: checks.filter(check => check.verificationStatus === "not_checked").length,
    };
  }, [profile]);

  if (!clientId) return null;

  return <section className="client-verification" aria-labelledby="client-verification-title">
    <div className="cv-heading">
      <div>
        <span className="cv-eyebrow"><ShieldCheck size={14} aria-hidden="true" /> Compliance verification</span>
        <h2 id="client-verification-title">Authority checks</h2>
        <p>See what has been checked, who checked it and when it should be reviewed again.</p>
      </div>
      <button type="button" className="cv-refresh" disabled={loading} onClick={() => void load()}>
        <RefreshCw size={15} className={loading ? "cv-spin" : ""} aria-hidden="true" /> Refresh
      </button>
    </div>

    <div className="cv-note">
      <CircleAlert size={17} aria-hidden="true" />
      <p>Manual accountant checks are labelled <strong>Accountant confirmed</strong>. This portal only shows <strong>Verified by authority</strong> when the saved verification method came from an authorised authority integration.</p>
    </div>

    {error ? <div className="cv-error" role="alert">{error}</div> : loading && !profile ? <div className="cv-loading">Loading verification information…</div> : profile ? <>
      <div className="cv-summary" aria-label="Verification summary">
        <span><CheckCircle2 size={16} aria-hidden="true" /><strong>{counts.confirmed}</strong> confirmed</span>
        <span><Clock3 size={16} aria-hidden="true" /><strong>{counts.review}</strong> need review</span>
        <span><Building2 size={16} aria-hidden="true" /><strong>{counts.unchecked}</strong> not checked</span>
      </div>

      <div className="cv-table-wrap">
        <table className="cv-table">
          <thead><tr><th>Check</th><th>Status</th><th>Result</th><th>Source</th><th>Checked</th><th>Checked by</th><th>Next review</th></tr></thead>
          <tbody>{profile.checks.map(check => {
            const latest = check.latestVerification;
            return <tr key={check.code}>
              <td><strong>{check.name}</strong><small>{check.source}</small></td>
              <td><span className={`cv-status cv-status--${statusTone(check)}`}>{check.applicability === "not_applicable" ? "Not applicable" : statusLabel(check)}</span></td>
              <td>{check.applicability === "not_applicable" ? "—" : latest ? outcomeLabels[latest.outcome] ?? "Inconclusive" : "Not checked"}</td>
              <td>{verificationSource(check)}</td>
              <td>{latest ? formatDateLabel(latest.checkedAtUtc) : "—"}</td>
              <td>{latest ? latest.recordedByName : "—"}</td>
              <td>{latest ? formatDateLabel(latest.reviewAfterUtc) : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </> : null}
  </section>;
}
