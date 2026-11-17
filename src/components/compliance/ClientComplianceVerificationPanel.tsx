import { useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
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
  if (!latest) return "Not recorded";
  if (latest.method === "authority_verified") return "Authorised authority response";
  return "Manual accountant check";
}

function statusLabel(check: MonitoringProfile["checks"][number]) {
  if (check.verificationStatus === "authority_verified") {
    return check.latestVerification?.method === "authority_verified" ? "Verified by authority" : "Verification unavailable";
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
  const generation = useRef(0);

  async function load() {
    if (!clientId) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await apiGetJson(`/api/compliance/monitoring/${encodeURIComponent(clientId)}`);
      if (!Array.isArray(result.checks)) throw new Error("Business checks could not be read. Please try again.");
      if (current === generation.current) setProfile(result);
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught.message : "Verification information could not be loaded.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  useEffect(() => { setProfile(null); void load(); return () => { generation.current++; }; }, [clientId]);

  if (!clientId) return null;

  return <section className="client-verification" aria-label="Recorded business checks">
    <div className="cv-toolbar">
      <button type="button" className="cv-refresh" disabled={loading} onClick={() => void load()}><RefreshCw size={15} className={loading ? "cv-spin" : ""} aria-hidden="true" />Refresh checks</button>
    </div>
    <p className="cv-note"><ShieldCheck size={16} aria-hidden="true" /><span>“Accountant confirmed” is a manual check. “Verified by authority” identifies an authorised authority response. Neither label guarantees overall business compliance.</span></p>
    {error ? <div className="cv-error" role="alert"><span>{error}</span><button type="button" className="cv-refresh" disabled={loading} onClick={() => void load()}>Try again</button></div>
      : loading && !profile ? <p role="status" className="cv-loading">Loading business checks…</p>
      : profile ? <div className="cv-checks">{profile.checks.map(check => {
        const latest = check.latestVerification;
        const notApplicable = check.applicability === "not_applicable";
        const hasDetails = (!!latest && !notApplicable) || !!check.reason || check.applicability === "undecided";
        const Row = hasDetails ? "details" : "div";
        const Header = hasDetails ? "summary" : "div";
        return <Row key={check.code} className="cv-check">
          <Header className="cv-check-header"><div className="cv-check-name"><strong>{check.name}</strong><span>{check.source}</span></div>
            <span className={`cv-status cv-status--${statusTone(check)}`}>{notApplicable ? "Not applicable" : statusLabel(check)}</span>{hasDetails ? <ChevronDown size={15} aria-hidden="true" /> : null}</Header>
          {hasDetails ? <div className="cv-check-details">
            {check.reason ? <p>{check.reason}</p> : null}
            {check.applicability === "undecided" ? <p>Your accountant still needs to confirm whether this check applies to your business.</p> : null}
            {latest && !notApplicable ? <dl><div><dt>Recorded result</dt><dd>{outcomeLabels[latest.outcome] ?? "Inconclusive"}</dd></div>
              <div><dt>How it was checked</dt><dd>{verificationSource(check)}</dd></div>
              <div><dt>Checked on</dt><dd>{checkDate(latest.checkedAtUtc)}</dd></div>
              <div><dt>Recorded by</dt><dd>{latest.recordedByName || "Name not recorded"}</dd></div>
              <div><dt>Next review</dt><dd>{checkDate(latest.reviewAfterUtc)}</dd></div></dl> : null}
          </div> : null}
        </Row>;
      })}</div> : null}
  </section>;
}
function checkDate(value: string) {
  return Number.isFinite(new Date(value).getTime()) ? formatDateLabel(value) : "Date not recorded";
}
