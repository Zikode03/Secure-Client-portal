import { ComplianceMonitoringWorkspace } from "../../components/compliance/ComplianceMonitoringWorkspace";
import { ComplianceObligationsWorkspace } from "../../components/compliance/ComplianceObligationsWorkspace";

export function AccountantComplianceCentrePage() {
  return <ComplianceMonitoringWorkspace records={<ComplianceObligationsWorkspace mode="accountant" />} />;
}
