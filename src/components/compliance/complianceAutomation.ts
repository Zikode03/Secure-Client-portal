import { apiGetJson, apiPostJson, apiPutJson } from "../../services/apiClient";

export interface ComplianceRuleDefinition {
  code: string;
  name: string;
  authority: string;
  categoryCode: string;
  cadenceMonths: number;
  dueOffsetMonths: number;
  dueDayOfMonth: number | null;
  applicabilityField: string;
  requiresSubmission: boolean;
  requiresPayment: boolean;
  requiredDocumentCategories: string[];
  effectiveFromUtc: string;
  effectiveToUtc: string | null;
  version: string;
}

export interface ComplianceRuleSet {
  version: string;
  rules: ComplianceRuleDefinition[];
  updatedAtUtc: string;
}

export interface ClientComplianceProfile {
  clientId: string;
  vatRegistered: boolean | null;
  vatCycleMonths: number;
  vatAnchorMonth: number;
  payeRegistered: boolean | null;
  uifRegistered: boolean | null;
  coidaRegistered: boolean | null;
  provisionalTaxpayer: boolean | null;
  companyTaxRegistered: boolean | null;
  cipcRegistered: boolean | null;
  financialYearEndMonth: number;
  updatedAtUtc: string;
}

export interface ComplianceObligation {
  id: string;
  clientId: string;
  clientName: string;
  code: string;
  name: string;
  authority: string;
  periodStartUtc: string;
  periodEndUtc: string;
  dueDateUtc: string | null;
  workflowStatus: string;
  readiness: string;
  preparationStatus: string;
  reviewStatus: string;
  submissionStatus: string;
  submittedAtUtc: string | null;
  submissionReference: string | null;
  amountPayable: number | null;
  amountRefundable: number | null;
  paymentRequired: boolean;
  paymentStatus: string;
  paidAtUtc: string | null;
  paymentReference: string | null;
  evidenceRequired: number;
  evidenceFound: number;
  missingEvidenceCategories: string[];
  responsibleAccountantId: string | null;
  ruleVersion: string;
  createdReason: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ComplianceAutomationRunResult {
  runAtUtc: string;
  clientsEvaluated: number;
  obligationsCreated: number;
  obligationsRefreshed: number;
  missingEvidenceRequestsCreated: number;
  notificationsCreated: number;
  warnings: string[];
}

export const complianceAutomationApi = {
  getRules: () => apiGetJson<ComplianceRuleSet>("/api/compliance/automation/rules"),
  updateRules: (value: { version: string; rules: ComplianceRuleDefinition[] }) =>
    apiPutJson<ComplianceRuleSet, typeof value>("/api/compliance/automation/rules", value),
  getProfile: (clientId: string) =>
    apiGetJson<ClientComplianceProfile>(`/api/compliance/automation/profiles/${encodeURIComponent(clientId)}`),
  updateProfile: (clientId: string, value: Omit<ClientComplianceProfile, "clientId" | "updatedAtUtc">) =>
    apiPutJson<ClientComplianceProfile, typeof value>(`/api/compliance/automation/profiles/${encodeURIComponent(clientId)}`, value),
  getObligations: (clientId?: string) =>
    apiGetJson<ComplianceObligation[]>(`/api/compliance/automation/obligations${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`),
  run: (clientId?: string) =>
    apiPostJson<ComplianceAutomationRunResult, Record<string, never>>(`/api/compliance/automation/run${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`, {}),
  preparation: (id: string, value: { complete: boolean; note?: string }) =>
    apiPostJson<ComplianceObligation, typeof value>(`/api/compliance/automation/obligations/${encodeURIComponent(id)}/preparation`, value),
  review: (id: string, value: { approved: boolean; note?: string }) =>
    apiPostJson<ComplianceObligation, typeof value>(`/api/compliance/automation/obligations/${encodeURIComponent(id)}/review`, value),
  submission: (id: string, value: { submittedAtUtc: string; submissionReference: string; amountPayable: number | null; amountRefundable: number | null; paymentRequired: boolean; note?: string }) =>
    apiPostJson<ComplianceObligation, typeof value>(`/api/compliance/automation/obligations/${encodeURIComponent(id)}/submission`, value),
  payment: (id: string, value: { paidAtUtc: string; paymentReference: string; amountPaid: number; note?: string }) =>
    apiPostJson<ComplianceObligation, typeof value>(`/api/compliance/automation/obligations/${encodeURIComponent(id)}/payment`, value),
  notApplicable: (id: string, reason: string) =>
    apiPostJson<ComplianceObligation, { reason: string }>(`/api/compliance/automation/obligations/${encodeURIComponent(id)}/not-applicable`, { reason }),
};

export const complianceStatusLabel = (value: string) => value
  .replaceAll("_", " ")
  .replace(/\b\w/g, letter => letter.toUpperCase());

export const formatCompliancePeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const format = new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric" });
  const a = format.format(startDate);
  const b = format.format(endDate);
  return a === b ? a : `${a} – ${b}`;
};
