import type { ComplianceCentreData, ComplianceClientStatus } from "../types/portal";
import { summariseComplianceRecords, buildComplianceSummaryMetrics, buildComplianceCategoryGroup } from "../utils/compliance";

function emptyCentre(): ComplianceCentreData {
  return { snapshotDate: new Date().toISOString(), summaryMetrics: [], overallScore: 0, portfolioCompliancePercentage: 0, expiredCount: 0, expiringCount: 0, missingRequiredCount: 0, expiredDocuments: [], expiringDocuments: [], missingRequiredDocuments: [], categoryGroups: [], auditTrail: [], secureRules: [], reportGeneratedAt: "", retentionNote: "", clientStatuses: [] };
}
export const getClientComplianceCentreData = emptyCentre;
export const getAccountantComplianceCentreData = emptyCentre;
export function getComplianceClientStatusData(): ComplianceClientStatus[] { return []; }
export function getComplianceClientStatus(_id: string): ComplianceClientStatus { throw new Error("Load client compliance from the backend."); }
export function getComplianceSnapshotLabel() { return new Date().toLocaleDateString("en-ZA"); }
export function buildComplianceCentreDataFromStatuses(statuses: ComplianceClientStatus[], options: { helperLabel: string; includeClientStatuses: boolean }): ComplianceCentreData {
  const documents = statuses.flatMap(client => client.documents);
  const summary = summariseComplianceRecords(documents);
  const categories = [...new Map(documents.map(document => [document.categoryId, document.categoryName])).entries()];
  return { ...emptyCentre(), summaryMetrics: buildComplianceSummaryMetrics(0, summary.expiredCount, summary.expiringCount, summary.missingCount, options.helperLabel), overallScore: statuses.length ? Math.round(statuses.reduce((total, client) => total + client.score, 0) / statuses.length) : 0, portfolioCompliancePercentage: statuses.length ? Math.round(statuses.filter(client => client.riskStatus === "compliant").length * 100 / statuses.length) : 0, expiredCount: summary.expiredCount, expiringCount: summary.expiringCount, missingRequiredCount: summary.missingCount, expiredDocuments: documents.filter(document => document.status === "expired"), expiringDocuments: documents.filter(document => ["expiring", "expiring_soon"].includes(document.status)), missingRequiredDocuments: documents.filter(document => document.required && document.status === "missing"), categoryGroups: categories.map(([id, name]) => buildComplianceCategoryGroup(id, name, "", documents.filter(document => document.categoryId === id), new Date())), auditTrail: statuses.flatMap(client => client.auditTrail), clientStatuses: options.includeClientStatuses ? statuses : undefined };
}
