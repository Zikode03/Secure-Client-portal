import type { AccountantDashboardData, AdminDashboardData, ClientWorkflowSeed, ClientDocumentCenterData, DocumentRecord, ReviewWorkspaceData } from "../types/portal";
import { getClientComplianceCentreData, getAccountantComplianceCentreData } from "./complianceData";

// Empty loading state only. Business records are always fetched from authenticated APIs.
const emptyDocument = (): DocumentRecord => ({ id: "", clientId: "", clientName: "", documentType: "", fileName: "", monthLabel: "", description: "", status: "draft", uploadedBy: "", uploadedAt: "", sizeLabel: "", keywordTags: [], comments: [], auditTrail: [] });
const emptyDashboard = (): AccountantDashboardData => ({ summaryMetrics: [], portfolio: [], reviewQueue: [], deadlines: [], notifications: [], smartAlerts: [], reconciliationIssues: [], missingDocuments: [], expiringDocuments: [], rejectedDocuments: [], latestOverallDocuments: [] });
export const portalService = {
  getClientWorkflowSeed(): ClientWorkflowSeed {
    return { monthPack: { monthLabel: "", dueDate: "", deadlineStatus: "on_track", progressPercent: 0, completedCount: 0, totalCount: 0, canComplete: false, completionMessage: "Load a monthly pack to see its requirements.", submissionStatus: "open", slots: [] }, documents: [], invoices: [], bankTransactions: [], notifications: [], activity: [], currentMonthInvoiceCount: 0, previousMonthInvoiceCount: 0, currentMonthLabel: "", previousMonthLabel: "" };
  },
  getClientNotifications() { return [] as ClientWorkflowSeed["notifications"]; },
  getClientComplianceCentre: getClientComplianceCentreData,
  getClientDocumentCenter(): ClientDocumentCenterData { return { latestDocuments: [], previousMonthDocuments: [], expiringDocuments: [], rejectedDocuments: [] }; },
  getAccountantDashboard: emptyDashboard,
  getAccountantComplianceCentre: getAccountantComplianceCentreData,
  getAccountantNotifications() { return [] as ClientWorkflowSeed["notifications"]; },
  getReviewWorkspace(): ReviewWorkspaceData { return { queue: [], selectedDocument: emptyDocument() }; },
  getAdminDashboard(): AdminDashboardData { return { summaryMetrics: [], clients: [], policies: [], notifications: [] }; },
  getAdminClients() { return [] as AdminDashboardData["clients"]; },
  updateClientAssignment(_id: string, _name: string, _userId?: string): AdminDashboardData["clients"][number] { throw new Error("Assignments must be saved through the backend."); },
  getAdminPolicies() { return [] as AdminDashboardData["policies"]; },
  getDocumentById(_id: string) { return emptyDocument(); },
};
