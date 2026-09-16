import { ClientComplianceCentreWorkspace } from "../../components/compliance/ClientComplianceCentreWorkspace";
import { ClientComplianceVerificationPanel } from "../../components/compliance/ClientComplianceVerificationPanel";

export function ClientComplianceCentrePage() {
  return <>
    <ClientComplianceCentreWorkspace />
    <ClientComplianceVerificationPanel />
  </>;
}
