// Friendly guide: this module (portal) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import {
  createContext,
// Shared shape notes: these types keep UI and data contracts aligned.
  type ReactNode,
  useEffect,
  useContext,
  useMemo,
  useState,
} from "react";
import { buildComplianceCentreDataFromStatuses } from "../services/complianceData";
import { portalService } from "../services/portalData";
import {
  buildExpiringDocuments,
  buildInvoiceReviewQueue,
  buildLatestInvoices,
  buildLatestOverallDocuments,
  buildLatestUploadedDocuments,
  buildMissingDocuments,
  buildPreviousMonthComparison,
  buildRejectedDocuments,
  buildReconciliationIssues,
  buildReviewDocumentFromInvoice,
  buildSmartAlerts,
  buildUnifiedSearchResults,
  createSummaryMetrics,
  filterUnifiedSearchResults,
  recalculatePack,
} from "../services/workflowEngine";
import {
  appendComplianceDocumentVersion,
  appendComplianceRequestAudit,
  buildComplianceCategoryGroup,
  buildCompliancePriorityItems,
  buildComplianceRequestDetails,
  buildComplianceRiskStatus,
  calculateComplianceScore,
  COMPLIANCE_REFERENCE_DATE,
  summariseComplianceRecords,
} from "../utils/compliance";
import type {
  AccountantDashboardData,
  ActivityItem,
  AuditTrailEntry,
  BusinessProfile,
  ClientDocumentPreferences,
  ClientNotificationPreferences,
  ClientSecuritySettings,
  ClientSettingsState,
  ClientWorkflowSeed,
  ComplianceCentreData,
  ComplianceClientStatus,
  ComplianceDocumentRecord,
  ComplianceRequestType,
  DocumentComment,
  DocumentPolicy,
  DocumentRecord,
  FirmClientAccount,
  InvoiceRecord,
  ManagedAccountant,
  MonthlyPack,
  NotificationActivityEntry,
  NotificationItem,
  NotificationState,
  PortfolioStatus,
  ReviewQueueItem,
  Role,
  ScheduledReport,
  SessionUser,
  Tone,
  UnifiedSearchFilters,
  UnifiedSearchResult,
  UploadSubmission,
  UserAccountRecord,
  WorkflowRequest,
} from "../types/portal";

const clone = <Value,>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value;

const accountantAssignments: Record<string, string> = {
  "client-apex": "Daniel Mokoena",
  "firm-client-1": "Daniel Mokoena",
  "firm-client-2": "Lerato Nkosi",
  "firm-client-3": "Daniel Mokoena",
  "firm-client-4": "Daniel Mokoena",
  "firm-client-5": "Lerato Nkosi",
};

const initialProfile: BusinessProfile = {
  clientId: "client-apex",
  legalName: "Apex Trading Ltd",
  tradingName: "Apex Trading",
  registrationNumber: "2017/118822/07",
  taxNumber: "9305174281",
  vatNumber: "4780294112",
  primaryContact: "Sarah Jacobs",
  financeEmail: "finance@apextrading.co.za",
  phone: "+27 11 555 0198",
  addressLine: "21 Rivonia Road",
  city: "Sandton",
  country: "South Africa",
};

const initialRequests: WorkflowRequest[] = [
  {
    id: "request-1",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Re-upload invoice support with readable VAT details",
    description:
      "Three supplier receipts are cropped and two VAT numbers cannot be read clearly enough for review.",
    monthLabel: "April 2026",
    status: "awaiting_client",
    priority: "high",
    relatedDocumentId: "doc-1002",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-05T17:00:00.000Z",
    createdAt: "2026-04-30T09:15:00.000Z",
    comments: [
      {
        id: "request-comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message:
          "Please upload the corrected stationery and fuel invoice support into the same April invoices slot.",
        createdAt: "2026-04-30T09:15:00.000Z",
      },
    ],
    auditTrail: [
      {
        id: "request-audit-1",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-04-30T09:15:00.000Z",
        note: "Requested corrected supplier evidence for the rejected April invoice support file.",
      },
    ],
  },
  {
    id: "request-2",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Upload missing bank statement",
    description:
      "The April month pack cannot move into accountant review until the operating account statement is attached.",
    monthLabel: "April 2026",
    status: "open",
    priority: "high",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-06T17:00:00.000Z",
    createdAt: "2026-05-03T09:15:00.000Z",
    comments: [],
    auditTrail: [
      {
        id: "request-audit-2",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-05-03T09:15:00.000Z",
        note: "Raised because invoices were already uploaded without the matching bank statement.",
      },
    ],
  },
];

const initialAccountants: ManagedAccountant[] = [
  {
    id: "accountant-1",
    name: "Daniel Mokoena",
    email: "accountant@example.com",
    title: "Senior Accountant",
    assignedClientCount: 8,
    openReviews: 5,
    status: "busy",
  },
  {
    id: "accountant-2",
    name: "Lerato Nkosi",
    email: "lerato@finwelladvisory.co.za",
    title: "Accounting Manager",
    assignedClientCount: 7,
    openReviews: 3,
    status: "active",
  },
  {
    id: "accountant-3",
    name: "Sipho Maseko",
    email: "sipho@finwelladvisory.co.za",
    title: "Compliance Accountant",
    assignedClientCount: 5,
    openReviews: 2,
    status: "capacity_available",
  },
];

const initialUsers: UserAccountRecord[] = [
  {
    id: "user-client-1",
    name: "Sarah Jacobs",
    email: "client@example.com",
    role: "client",
    status: "active",
    company: "Apex Trading Ltd",
  },
  {
    id: "user-accountant-1",
    name: "Daniel Mokoena",
    email: "accountant@example.com",
    role: "accountant",
    status: "active",
    company: "Finwell Advisory",
  },
  {
    id: "user-admin-1",
    name: "Priya Naidoo",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    company: "Finwell Advisory",
  },
];

const CLIENT_PORTAL_STORAGE_KEY = "accounting-document-control-client-portal";

// Component flow: gather data first, then render a focused UI state.
function createInitialMonthPack(seed: ClientWorkflowSeed) {
  return recalculatePack({
    ...clone(seed.monthPack),
    submissionStatus: "open" as const,
    slots: clone(seed.monthPack.slots).map((slot) => ({
      ...slot,
      assignedOwner: slot.assignedOwner ?? "Client",
      dueDate: slot.dueDate ?? seed.monthPack.dueDate,
    })),
  });
}

function createInitialClientSettings(
  profile: BusinessProfile = initialProfile,
): ClientSettingsState {
  return {
    notificationPreferences: {
      deadlineAlerts: true,
      rejectionAlerts: true,
      complianceAlerts: true,
      weeklySummary: false,
      browserAlerts: true,
    },
    security: {
      mfaEnabled: false,
      passwordLastChangedAt: "2026-04-19T09:00:00.000Z",
      recoveryEmail: profile.financeEmail,
      activeSessions: [
        {
          id: "session-current-browser",
          label: "Chrome on Windows",
          lastActiveAt: "2026-05-07T07:45:00.000Z",
          location: "Johannesburg, South Africa",
          isCurrent: true,
        },
        {
          id: "session-mobile",
          label: "Safari on iPhone",
          lastActiveAt: "2026-05-06T18:20:00.000Z",
          location: "Johannesburg, South Africa",
          isCurrent: false,
        },
      ],
    },
    documentPreferences: {
      structuredUploadsOnly: true,
      autoNamingLocked: true,
      retentionMode: "audit_ready",
      preferredExport: "pdf",
      acceptedFormats: ["PDF", "CSV", "XLSX"],
    },
  };
}

const defaultScheduledReports: ScheduledReport[] = [
  {
    id: "client-report-monthly",
    frequency: "monthly",
    nextRunAt: "2026-06-01T06:00:00.000Z",
    recipients: ["finance@apextrading.co.za"],
    lastScheduledAt: "2026-05-01T09:00:00.000Z",
  },
];

interface PersistedClientPortalState {
  monthPack: MonthlyPack;
  documents: DocumentRecord[];
  invoices: InvoiceRecord[];
  notifications: NotificationItem[];
  activity: ActivityItem[];
  requests: WorkflowRequest[];
  clientProfile: BusinessProfile;
  clientSettings: ClientSettingsState;
  scheduledReports: ScheduledReport[];
  complianceAuditTrail: ComplianceCentreData["auditTrail"];
  reportGeneratedAt: string;
}

function createInitialNotifications(seed: ClientWorkflowSeed) {
  return clone(seed.notifications).map((notification) => ({
    ...notification,
    state: notification.state ?? "unread",
    activity: clone(notification.activity ?? []),
  }));
}

function createInitialClientPortalState(
  seed: ClientWorkflowSeed,
  compliance: ComplianceCentreData,
): PersistedClientPortalState {
  return {
    monthPack: createInitialMonthPack(seed),
    documents: clone(seed.documents),
    invoices: clone(seed.invoices),
    notifications: createInitialNotifications(seed),
    activity: clone(seed.activity),
    requests: clone(initialRequests),
    clientProfile: clone(initialProfile),
    clientSettings: createInitialClientSettings(),
    scheduledReports: clone(defaultScheduledReports),
    complianceAuditTrail: [],
    reportGeneratedAt: compliance.reportGeneratedAt,
  };
}

function readPersistedClientPortalState(
  seed: ClientWorkflowSeed,
  compliance: ComplianceCentreData,
): PersistedClientPortalState {
  const fallback = createInitialClientPortalState(seed, compliance);

  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(CLIENT_PORTAL_STORAGE_KEY);
  if (!storedValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedClientPortalState>;
    const persistedProfile = parsed.clientProfile
      ? { ...fallback.clientProfile, ...parsed.clientProfile }
      : fallback.clientProfile;

    return {
      monthPack: parsed.monthPack ? recalculatePack(parsed.monthPack) : fallback.monthPack,
      documents: parsed.documents ? clone(parsed.documents) : fallback.documents,
      invoices: parsed.invoices
        ? clone(parsed.invoices).map((invoice) => ({
            ...invoice,
            comments: clone(invoice.comments ?? []),
            auditTrail: clone(invoice.auditTrail ?? []),
          }))
        : fallback.invoices,
      notifications: parsed.notifications
        ? clone(parsed.notifications).map((notification) => ({
            ...notification,
            state: notification.state ?? "unread",
            activity: clone(notification.activity ?? []),
          }))
        : fallback.notifications,
      activity: parsed.activity ? clone(parsed.activity) : fallback.activity,
      requests: parsed.requests ? clone(parsed.requests) : fallback.requests,
      clientProfile: persistedProfile,
      clientSettings: parsed.clientSettings
        ? {
            notificationPreferences: {
              ...fallback.clientSettings.notificationPreferences,
              ...parsed.clientSettings.notificationPreferences,
            },
            security: {
              ...fallback.clientSettings.security,
              ...parsed.clientSettings.security,
              activeSessions: parsed.clientSettings.security?.activeSessions
                ? clone(parsed.clientSettings.security.activeSessions)
                : fallback.clientSettings.security.activeSessions,
            },
            documentPreferences: {
              ...fallback.clientSettings.documentPreferences,
              ...parsed.clientSettings.documentPreferences,
            },
          }
        : createInitialClientSettings(persistedProfile),
      scheduledReports: parsed.scheduledReports
        ? clone(parsed.scheduledReports)
        : fallback.scheduledReports,
      complianceAuditTrail: parsed.complianceAuditTrail
        ? clone(parsed.complianceAuditTrail)
        : fallback.complianceAuditTrail,
      reportGeneratedAt: parsed.reportGeneratedAt ?? fallback.reportGeneratedAt,
    };
  } catch {
    return fallback;
  }
}

function writePersistedClientPortalState(state: PersistedClientPortalState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLIENT_PORTAL_STORAGE_KEY, JSON.stringify(state));
}

export interface PortalActionResult {
  ok: boolean;
  message: string;
}

export interface ClientWorkspaceView {
  client: FirmClientAccount;
  monthPack: MonthlyPack;
  documents: DocumentRecord[];
  invoices: InvoiceRecord[];
  requests: WorkflowRequest[];
  compliance: ComplianceClientStatus | null;
  missingDocuments: ReturnType<typeof buildMissingDocuments>;
  expiringDocuments: ReturnType<typeof buildExpiringDocuments>;
  rejectedDocuments: ReturnType<typeof buildRejectedDocuments>;
  latestOverallDocuments: ReturnType<typeof buildLatestOverallDocuments>;
  auditTrail: AuditTrailEntry[];
}

interface ReviewActionPayload {
  recordId: string;
  action: "accepted" | "rejected" | "under_review";
  reviewer: string;
  reason?: string;
}

interface FollowUpRequestPayload {
  clientId: string;
  clientName: string;
  monthLabel: string;
  title: string;
  description: string;
  dueDate: string;
  actor: SessionUser;
  relatedDocumentId?: string;
  requestType?: ComplianceRequestType;
  complianceCategoryId?: WorkflowRequest["complianceCategoryId"];
  complianceCategoryName?: string;
  complianceItemId?: string;
  complianceItemName?: string;
  monthlyPeriod?: string;
}

interface ClientRequestPayload {
  clientId: string;
  clientName: string;
  monthLabel: string;
  title: string;
  description: string;
  dueDate: string;
  priority: WorkflowRequest["priority"];
  actor: SessionUser;
  assignedAccountant: string;
}

interface ComplianceRequestPayload {
  clientId: string;
  complianceItemId: string;
  requestType: ComplianceRequestType;
  dueDate: string;
  actor: SessionUser;
  comments?: string;
}

interface ComplianceVersionUploadPayload {
  clientId: string;
  complianceItemId: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  note?: string;
}

interface PortalContextValue {
  clientProfile: BusinessProfile;
  clientSettings: ClientSettingsState;
  scheduledReports: ScheduledReport[];
  clientWorkflow: {
    seed: ClientWorkflowSeed;
    monthPack: MonthlyPack;
    documents: DocumentRecord[];
    invoices: InvoiceRecord[];
    notifications: NotificationItem[];
    activity: ClientWorkflowSeed["activity"];
    requests: WorkflowRequest[];
    summaryMetrics: ReturnType<typeof createSummaryMetrics>;
    missingRequiredDocuments: ReturnType<typeof buildMissingDocuments>;
    expiringDocuments: ReturnType<typeof buildExpiringDocuments>;
    rejectedDocuments: ReturnType<typeof buildRejectedDocuments>;
    latestUploadedDocuments: ReturnType<typeof buildLatestUploadedDocuments>;
    latestInvoices: ReturnType<typeof buildLatestInvoices>;
    latestOverallDocuments: ReturnType<typeof buildLatestOverallDocuments>;
    previousMonthComparison: ReturnType<typeof buildPreviousMonthComparison>;
    previousMonthDocuments: DocumentRecord[];
    smartAlerts: ReturnType<typeof buildSmartAlerts>;
    reconciliationIssues: ReturnType<typeof buildReconciliationIssues>;
    unifiedSearchResults: UnifiedSearchResult[];
  };
  accountantDashboard: AccountantDashboardData;
  adminClients: FirmClientAccount[];
  adminPolicies: DocumentPolicy[];
  managedAccountants: ManagedAccountant[];
  userAccounts: UserAccountRecord[];
  clientComplianceCentre: ComplianceCentreData;
  accountantComplianceCentre: ComplianceCentreData;
  uploadToSlot: (
    submission: UploadSubmission,
    actor: Pick<SessionUser, "name" | "fullName">,
  ) => PortalActionResult;
  submitMonth: (actorName: string) => PortalActionResult;
  finaliseInvoice: (invoiceId: string) => PortalActionResult;
  reviewRecord: (payload: ReviewActionPayload) => PortalActionResult;
  addDocumentComment: (
    recordId: string,
    author: string,
    role: Role,
    message: string,
  ) => PortalActionResult;
  updateNotificationState: (
    notificationId: string,
    state: NotificationState,
    actorName: string,
  ) => PortalActionResult;
  addRequestComment: (
    requestId: string,
    author: string,
    role: Role,
    message: string,
  ) => PortalActionResult;
  createClientRequest: (payload: ClientRequestPayload) => PortalActionResult;
  createFollowUpRequest: (payload: FollowUpRequestPayload) => PortalActionResult;
  createComplianceRequest: (payload: ComplianceRequestPayload) => PortalActionResult;
  uploadComplianceVersion: (payload: ComplianceVersionUploadPayload) => PortalActionResult;
  resolveRequest: (requestId: string, actorName: string) => PortalActionResult;
  updateBusinessProfile: (profile: BusinessProfile) => PortalActionResult;
  updateClientNotificationPreferences: (
    preferences: ClientNotificationPreferences,
  ) => PortalActionResult;
  updateClientDocumentPreferences: (
    preferences: ClientDocumentPreferences,
  ) => PortalActionResult;
  updateClientSecuritySettings: (
    security: ClientSecuritySettings,
  ) => PortalActionResult;
  downloadComplianceReport: (actorName: string) => PortalActionResult;
  scheduleComplianceReport: (
    frequency: ScheduledReport["frequency"],
    recipients: string[],
    actorName: string,
  ) => PortalActionResult;
  assignClientAccountant: (clientId: string, accountantName: string) => PortalActionResult;
  updateClientDeadlinePolicy: (clientId: string, deadlinePolicy: string) => PortalActionResult;
  filterSearchResults: (
    results: UnifiedSearchResult[],
    filters: UnifiedSearchFilters,
  ) => UnifiedSearchResult[];
  resetClientPortalDemoState: () => PortalActionResult;
  getClientWorkspace: (clientId: string) => ClientWorkspaceView;
  getReviewQueue: () => ReviewQueueItem[];
  getReviewRecord: (recordId: string) => DocumentRecord;
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

function appendActivity(
  current: ClientWorkflowSeed["activity"],
  title: string,
  detail: string,
  tone: ClientWorkflowSeed["activity"][number]["tone"],
  actor?: string,
  relatedLabel?: string,
) {
  return [
    {
      id: `activity-${current.length + 10}`,
      title,
      detail,
      timestamp: new Date().toISOString(),
      tone,
      actor,
      relatedLabel,
    },
    ...current,
  ].slice(0, 12);
}

function appendNotificationActivity(
  current: NotificationActivityEntry[] | undefined,
  title: string,
  detail: string,
  tone: Tone,
  actor?: string,
) {
  return [
    {
      id: `notification-activity-${(current?.length ?? 0) + 1}-${Date.now()}`,
      title,
      detail,
      timestamp: new Date().toISOString(),
      tone,
      actor,
    },
    ...(current ?? []),
  ].slice(0, 8);
}

function buildFallbackReviewDescription(documentType: string) {
  const normalized = documentType.toLowerCase();

  if (normalized.includes("bank")) {
    return "Operating account bank statement submitted for reconciliation and month-end verification.";
  }

  if (normalized.includes("invoice")) {
    return "Invoice evidence bundle submitted for accountant review and filing checks.";
  }

  if (normalized.includes("payroll")) {
    return "Payroll summary and statutory deduction schedule submitted for month-end review.";
  }

  if (normalized.includes("vat")) {
    return "VAT working papers and supporting calculations submitted for tax review.";
  }

  if (normalized.includes("signed")) {
    return "Signed approvals and authorisation documents submitted for completeness checks.";
  }

  if (normalized.includes("supplier")) {
    return "Supplier statement submitted to support balance confirmation and reconciliations.";
  }

  if (normalized.includes("proof")) {
    return "Updated proof of address submitted for compliance verification.";
  }

  if (normalized.includes("credit")) {
    return "Credit note submitted to support invoice adjustments and revenue corrections.";
  }

  if (normalized.includes("purchase")) {
    return "Purchase order submitted as source support for supplier billing and approvals.";
  }

  if (normalized.includes("delivery")) {
    return "Delivery note submitted as proof of fulfilment for billed goods or services.";
  }

  if (normalized.includes("receipt")) {
    return "Expense receipt batch submitted to support business purchases and VAT claims.";
  }

  return "Client-submitted support document waiting for accountant review.";
}

function buildFallbackReviewFileName(clientName: string, documentType: string, monthLabel: string) {
  const normalized = documentType.toLowerCase();
  const extension =
    normalized.includes("payroll") || normalized.includes("working papers") ? "xlsx" : "pdf";

  const clientToken = clientName.replace(/[^A-Za-z0-9]+/g, "");
  const typeToken = documentType.replace(/[^A-Za-z0-9]+/g, "");
  const monthToken = monthLabel.replace(/[^A-Za-z0-9]+/g, "_");

  return `${clientToken}_${typeToken}_${monthToken}.${extension}`;
}

function buildFallbackReviewRecord(item: ReviewQueueItem): DocumentRecord {
  const description = buildFallbackReviewDescription(item.documentType);
  const fileName = buildFallbackReviewFileName(
    item.clientName,
    item.documentType,
    item.monthLabel,
  );
  const uploadedBy = `${item.clientName} Finance Team`;
  const extractedText = [
    `${item.documentType} review pack for ${item.clientName}.`,
    `${item.monthLabel} submission routed to ${item.assignedAccountant}.`,
    description,
  ].join(" ");

  return {
    id: item.id,
    clientId: item.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    clientName: item.clientName,
    documentType: item.documentType,
    fileName,
    monthLabel: item.monthLabel,
    description,
    status: item.status,
    uploadedBy,
    uploadedAt: item.submittedAt,
    reviewedBy: item.status === "under_review" ? item.assignedAccountant : undefined,
    reviewedAt: item.status === "under_review" ? item.submittedAt : undefined,
    sizeLabel: fileName.endsWith(".xlsx") ? "540 KB" : "1.8 MB",
    keywordTags: item.documentType.toLowerCase().split(/\s+/),
    extractedText,
    comments:
      item.status === "under_review"
        ? [
            {
              id: `${item.id}-comment-1`,
              author: item.assignedAccountant,
              role: "accountant",
              message: `${item.documentType} is under review for ${item.monthLabel}.`,
              createdAt: item.submittedAt,
            },
          ]
        : [],
    auditTrail: [
      {
        id: `${item.id}-audit-1`,
        status: "Uploaded",
        actor: uploadedBy,
        timestamp: item.submittedAt,
        note: `${item.documentType} was submitted into the accountant review queue.`,
      },
      ...(item.status === "under_review"
        ? [
            {
              id: `${item.id}-audit-2`,
              status: "Under Review",
              actor: item.assignedAccountant,
              timestamp: item.submittedAt,
              note: `${item.assignedAccountant} started the first-pass review.`,
            },
          ]
        : []),
    ],
  };
}

function isApexWorkspaceId(clientId: string) {
  return clientId === "client-apex" || clientId === "firm-client-1";
}

function requestBelongsToClient(request: WorkflowRequest, clientId: string) {
  return isApexWorkspaceId(clientId)
    ? isApexWorkspaceId(request.clientId)
    : request.clientId === clientId;
}

function buildComplianceReadinessSummary(client: ComplianceClientStatus) {
  if (client.expiredCount > 0 || client.missingCount > 0) {
    return `${client.expiredCount} expired and ${client.missingCount} missing required items still need attention.`;
  }

  if (client.expiringCount > 0) {
    return `${client.expiringCount} items are inside their 30-day renewal window.`;
  }

  return "All required compliance items are currently in a healthy state.";
}

function buildComplianceNextBestAction(priorities: ComplianceClientStatus["topPriorities"]) {
  const topPriority = priorities[0];

  if (!topPriority) {
    return "No immediate compliance action is required.";
  }

  if (topPriority.status === "expired") {
    return `Request renewal for ${topPriority.label}.`;
  }

  if (topPriority.status === "missing") {
    return `Request upload for ${topPriority.label}.`;
  }

  if (topPriority.status === "rejected") {
    return `Request a corrected re-upload for ${topPriority.label}.`;
  }

  return `Review ${topPriority.label} next.`;
}

function rebuildComplianceClientStatus(client: ComplianceClientStatus): ComplianceClientStatus {
  const categories = client.categories.map((category) =>
    buildComplianceCategoryGroup(
      category.id,
      category.name,
      category.description,
      category.documents,
      COMPLIANCE_REFERENCE_DATE,
    ),
  );
  const documents = categories.flatMap((category) => category.documents);
  const summary = summariseComplianceRecords(documents, COMPLIANCE_REFERENCE_DATE);
  const score = calculateComplianceScore(documents, COMPLIANCE_REFERENCE_DATE);
  const topPriorities = buildCompliancePriorityItems(documents, COMPLIANCE_REFERENCE_DATE);

  return {
    ...client,
    riskStatus: buildComplianceRiskStatus(documents, COMPLIANCE_REFERENCE_DATE),
    score,
    compliantCount: summary.compliantCount,
    totalRequiredItems: summary.totalRequiredItems,
    expiredCount: summary.expiredCount,
    expiringCount: summary.expiringCount,
    expiringSoonCount: summary.expiringCount,
    missingCount: summary.missingCount,
    missingRequiredCount: summary.missingCount,
    readinessSummary: buildComplianceReadinessSummary({
      ...client,
      expiredCount: summary.expiredCount,
      expiringCount: summary.expiringCount,
      missingCount: summary.missingCount,
    } as ComplianceClientStatus),
    nextBestAction: buildComplianceNextBestAction(topPriorities),
    topPriorities,
    categories,
    documents,
    auditTrail: [...documents.flatMap((document) => document.auditTrail)].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    ),
  };
}

function updateComplianceItemInClient(
  current: ComplianceClientStatus[],
  clientId: string,
  complianceItemId: string,
  updater: (record: ComplianceDocumentRecord) => ComplianceDocumentRecord,
) {
  return current.map((client) => {
    if (client.clientId !== clientId) {
      return client;
    }

    return rebuildComplianceClientStatus({
      ...client,
      categories: client.categories.map((category) => ({
        ...category,
        documents: category.documents.map((document) =>
          document.id === complianceItemId ? updater(document) : document,
        ),
      })),
    });
  });
}

function findComplianceItem(
  clients: ComplianceClientStatus[],
  clientId: string,
  complianceItemId: string,
) {
  return clients
    .find((client) => client.clientId === clientId)
    ?.documents.find((document) => document.id === complianceItemId);
}

function buildTemplateWorkspace(client: FirmClientAccount, source: ClientWorkspaceView): ClientWorkspaceView {
  const rename = (value: string) =>
    value
      .replace(/Apex Trading Ltd/g, client.clientName)
      .replace(/ApexTrading/g, client.clientName.replace(/[^A-Za-z0-9]/g, ""));

  const documents = source.documents.slice(0, 6).map((document, index) => ({
    ...clone(document),
    id: `${client.id}-doc-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
    fileName: rename(document.fileName),
  }));
  const invoices = source.invoices.slice(0, 6).map((invoice, index) => ({
    ...clone(invoice),
    id: `${client.id}-inv-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
    fileName: rename(invoice.fileName),
  }));
  const monthPack = recalculatePack({
    ...clone(source.monthPack),
    progressPercent: client.completionRate,
    slots: clone(source.monthPack.slots).map((slot) => ({
      ...slot,
      autoName: rename(slot.autoName),
    })),
  });
  const requests = source.requests.slice(0, 2).map((request, index) => ({
    ...clone(request),
    id: `${client.id}-request-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
  }));

  return {
    client,
    monthPack,
    documents,
    invoices,
    requests,
    compliance: source.compliance,
    missingDocuments: buildMissingDocuments(monthPack, client.clientName),
    expiringDocuments: buildExpiringDocuments(documents),
    rejectedDocuments: buildRejectedDocuments(documents, invoices),
    latestOverallDocuments: buildLatestOverallDocuments(documents, invoices),
    auditTrail: [
      {
        id: `${client.id}-audit-1`,
        status: "Workspace generated",
        actor: "Workflow engine",
        timestamp: new Date().toISOString(),
        note: "This is a seeded client workspace for role-based workflow testing.",
      },
    ],
  };
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const clientSeed = useMemo(() => portalService.getClientWorkflowSeed(), []);
  const baseAccountantDashboard = useMemo(() => portalService.getAccountantDashboard(), []);
  const baseAdminClients = useMemo(() => portalService.getAdminClients(), []);
  const baseAdminPolicies = useMemo(() => portalService.getAdminPolicies(), []);
  const baseClientComplianceCentre = useMemo(
    () => portalService.getClientComplianceCentre(),
    [],
  );
  const seededAccountantComplianceCentre = useMemo(
    () => portalService.getAccountantComplianceCentre(),
    [],
  );
  const initialClientState = useMemo(
    () => readPersistedClientPortalState(clientSeed, baseClientComplianceCentre),
    [baseClientComplianceCentre, clientSeed],
  );
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [monthPack, setMonthPack] = useState(() => initialClientState.monthPack);
  const [documents, setDocuments] = useState(() => initialClientState.documents);
  const [invoices, setInvoices] = useState(() => initialClientState.invoices);
  const [notifications, setNotifications] = useState(() => initialClientState.notifications);
  const [activity, setActivity] = useState(() => initialClientState.activity);
  const [requests, setRequests] = useState(() => initialClientState.requests);
  const [clientProfile, setClientProfile] = useState(() => initialClientState.clientProfile);
  const [clientSettings, setClientSettings] = useState(
    () => initialClientState.clientSettings,
  );
  const [scheduledReports, setScheduledReports] = useState(
    () => initialClientState.scheduledReports,
  );
  const [complianceClients, setComplianceClients] = useState<ComplianceClientStatus[]>(
    () => clone(seededAccountantComplianceCentre.clientStatuses ?? []),
  );
  const [complianceAuditTrail, setComplianceAuditTrail] = useState(
    () => initialClientState.complianceAuditTrail,
  );
  const [reportGeneratedAt, setReportGeneratedAt] = useState(
    () => initialClientState.reportGeneratedAt,
  );
  const [adminClients, setAdminClients] = useState(() => clone(baseAdminClients));
  const [adminPolicies] = useState(() => clone(baseAdminPolicies));
  const [managedAccountants] = useState(() => clone(initialAccountants));
  const [userAccounts] = useState(() => clone(initialUsers));

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    writePersistedClientPortalState({
      monthPack,
      documents,
      invoices,
      notifications,
      activity,
      requests,
      clientProfile,
      clientSettings,
      scheduledReports,
      complianceAuditTrail,
      reportGeneratedAt,
    });
  }, [
    activity,
    clientProfile,
    clientSettings,
    complianceAuditTrail,
    documents,
    invoices,
    monthPack,
    notifications,
    reportGeneratedAt,
    requests,
    scheduledReports,
  ]);

  const clientComplianceStatus = useMemo(
    () =>
      complianceClients.find((client) => client.clientId === "firm-client-1") ??
      complianceClients[0] ??
      null,
    [complianceClients],
  );

  const clientComplianceCentre = useMemo(() => {
    const baseData = buildComplianceCentreDataFromStatuses(
      clientComplianceStatus ? [clientComplianceStatus] : [],
      {
        helperLabel: "Compliance score",
        includeClientStatuses: false,
      },
    );

    return {
      ...baseData,
      auditTrail: [...complianceAuditTrail, ...baseData.auditTrail].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      ),
      reportGeneratedAt,
      retentionNote:
        clientSettings.documentPreferences.retentionMode === "audit_ready"
          ? baseClientComplianceCentre.retentionNote
          : "Standard retention is active. Expired records remain visible until they are manually replaced and archived.",
    };
  }, [
    baseClientComplianceCentre.retentionNote,
    clientComplianceStatus,
    clientSettings.documentPreferences.retentionMode,
    complianceAuditTrail,
    reportGeneratedAt,
  ]);

  const accountantComplianceCentre = useMemo(() => {
    const baseData = buildComplianceCentreDataFromStatuses(complianceClients, {
      helperLabel: "Portfolio compliance %",
      includeClientStatuses: true,
    });

    return {
      ...baseData,
      auditTrail: [...complianceAuditTrail, ...baseData.auditTrail].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      ),
      reportGeneratedAt,
    };
  }, [complianceAuditTrail, complianceClients, reportGeneratedAt]);

  const missingRequiredDocuments = useMemo(
    () => buildMissingDocuments(monthPack),
    [monthPack],
  );
  const expiringDocuments = useMemo(
    () => buildExpiringDocuments(documents),
    [documents],
  );
  const rejectedDocuments = useMemo(
    () => buildRejectedDocuments(documents, invoices),
    [documents, invoices],
  );
  const latestUploadedDocuments = useMemo(
    () => buildLatestUploadedDocuments(documents),
    [documents],
  );
  const latestInvoices = useMemo(() => buildLatestInvoices(invoices), [invoices]);
  const latestOverallDocuments = useMemo(
    () => buildLatestOverallDocuments(documents, invoices),
    [documents, invoices],
  );
  const previousMonthComparison = useMemo(
    () =>
      buildPreviousMonthComparison(
        clientSeed.currentMonthInvoiceCount,
        clientSeed.previousMonthInvoiceCount,
        clientSeed.currentMonthLabel,
        clientSeed.previousMonthLabel,
      ),
    [
      clientSeed.currentMonthInvoiceCount,
      clientSeed.currentMonthLabel,
      clientSeed.previousMonthInvoiceCount,
      clientSeed.previousMonthLabel,
    ],
  );
  const smartAlerts = useMemo(
    () =>
      buildSmartAlerts(
        monthPack,
        invoices,
        clientSeed.currentMonthLabel,
        clientSeed.previousMonthLabel,
      ),
    [clientSeed.currentMonthLabel, clientSeed.previousMonthLabel, invoices, monthPack],
  );
  const reconciliationIssues = useMemo(
    () =>
      buildReconciliationIssues(
        clientSeed.bankTransactions,
        invoices,
        clientSeed.currentMonthLabel,
      ),
    [clientSeed.bankTransactions, clientSeed.currentMonthLabel, invoices],
  );
  const latestActivityDate = useMemo(() => {
    const latestDocument = [...documents].sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
    )[0];

    return latestDocument?.uploadedAt ?? new Date().toISOString();
  }, [documents]);
  const summaryMetrics = useMemo(
    () =>
      createSummaryMetrics(
        monthPack,
        missingRequiredDocuments,
        expiringDocuments,
        latestActivityDate,
      ),
    [expiringDocuments, latestActivityDate, missingRequiredDocuments, monthPack],
  );
  const previousMonthDocuments = useMemo(
    () =>
      documents.filter((document) => document.monthLabel === clientSeed.previousMonthLabel),
    [clientSeed.previousMonthLabel, documents],
  );
  const liveClientRequests = useMemo(
    () => requests.filter((request) => requestBelongsToClient(request, "firm-client-1")),
    [requests],
  );
  const unifiedSearchResults = useMemo(
    () =>
      buildUnifiedSearchResults({
        clientId: "client-apex",
        clientName: clientProfile.legalName,
        documents,
        invoices,
        monthPack,
        requests: liveClientRequests,
        complianceDocuments: clientComplianceCentre.categoryGroups.flatMap(
          (group) => group.documents,
        ),
      }),
    [
      clientComplianceCentre.categoryGroups,
      clientProfile.legalName,
      documents,
      invoices,
      liveClientRequests,
      monthPack,
    ],
  );

  const currentClientWorkspace = useMemo<ClientWorkspaceView>(
    () => ({
      client:
        adminClients.find((client) => client.id === "firm-client-1") ?? {
          id: "client-apex",
          clientName: clientProfile.legalName,
          industry: "Wholesale",
          assignedAccountant:
            adminClients.find((client) => client.id === "firm-client-1")?.assignedAccountant ??
            accountantAssignments["client-apex"],
          requiredPack: "Trading monthly pack",
          completionRate: monthPack.progressPercent,
          deadlinePolicy: "6th working day",
          status: monthPack.canComplete ? "on_track" : "attention",
        },
      monthPack,
      documents,
      invoices,
      requests: liveClientRequests,
      compliance: clientComplianceStatus,
      missingDocuments: buildMissingDocuments(monthPack, clientProfile.legalName),
      expiringDocuments,
      rejectedDocuments,
      latestOverallDocuments,
      auditTrail: documents.flatMap((document) => document.auditTrail).slice(0, 10),
    }),
    [
      adminClients,
      clientProfile.legalName,
      documents,
      expiringDocuments,
      invoices,
      latestOverallDocuments,
      liveClientRequests,
      monthPack,
      rejectedDocuments,
      clientComplianceStatus,
    ],
  );

  const assignedAccountantForApex =
    adminClients.find((client) => client.id === "firm-client-1")?.assignedAccountant ??
    accountantAssignments["client-apex"];

  function uploadToSlot(
    submission: UploadSubmission,
    actor: Pick<SessionUser, "name" | "fullName">,
  ): PortalActionResult {
    const uploadedAt = new Date().toISOString();
    const targetSlot = monthPack.slots.find((slot) => slot.id === submission.slotId);

    if (!targetSlot) {
      return { ok: false, message: "The selected upload slot could not be found." };
    }

    const actorName = actor.fullName || actor.name;
    const wasRejected = targetSlot.status === "rejected";

    setMonthPack((current) =>
      recalculatePack({
        ...current,
        submissionStatus: "open",
        slots: current.slots.map((slot) =>
          slot.id === submission.slotId
            ? {
                ...slot,
                status: "uploaded",
                progress: 100,
                lastSubmission: uploadedAt,
                rejectionReason: undefined,
              }
            : slot,
        ),
      }),
    );

    setDocuments((current) => [
      {
        id: `doc-${current.length + 3001}`,
        clientId: "client-apex",
        clientName: submission.clientBusinessName.trim() || clientProfile.legalName,
        documentType: submission.documentType,
        fileName: submission.autoName,
        monthLabel: `${submission.month} ${submission.year}`,
        description: submission.description,
        status: "uploaded",
        uploadedBy: actorName,
        uploadedAt,
        sizeLabel: "New upload",
        keywordTags: [submission.documentType.toLowerCase(), submission.month.toLowerCase()],
        expiryDate: submission.expiryDate || undefined,
        comments: [],
        auditTrail: [
          {
            id: `audit-${documents.length + 4001}`,
            status: "Uploaded",
            actor: actorName,
            timestamp: uploadedAt,
            note: `Uploaded into the structured ${submission.documentType} slot.`,
          },
          {
            id: `audit-${documents.length + 4002}`,
            status: "Renamed by system",
            actor: "Workflow engine",
            timestamp: uploadedAt,
            note: `Locked to ${submission.autoName} by the naming convention.`,
          },
        ],
      },
      ...current,
    ]);

    if (submission.documentType.toLowerCase().includes("invoice")) {
      setInvoices((current) => [
        {
        id: `inv-${current.length + 4001}`,
          clientId: "client-apex",
          clientName: submission.clientBusinessName.trim() || clientProfile.legalName,
          invoiceNumber: `INV-${2042 + current.length}`,
          fileName: submission.autoName,
          monthLabel: `${submission.month} ${submission.year}`,
          description: submission.description,
          amountLabel: "R 0.00",
          uploadedAt,
          status: "uploaded",
          keywordTags: ["invoice", submission.month.toLowerCase()],
        },
        ...current,
      ]);
    }

    setActivity((current) =>
      appendActivity(
        current,
        wasRejected
          ? `${targetSlot.documentType} corrected and re-uploaded`
          : `${targetSlot.documentType} uploaded`,
        wasRejected
          ? `A corrected version was uploaded into the ${targetSlot.documentType} slot for ${targetSlot.month} ${targetSlot.year}.`
          : `A new file was placed into the controlled ${targetSlot.documentType} slot for ${targetSlot.month} ${targetSlot.year}.`,
        "success",
        actorName,
        targetSlot.documentType,
      ),
    );

    return {
      ok: true,
      message: wasRejected
        ? `${targetSlot.documentType} re-uploaded successfully. The corrected version is now back in the workflow.`
        : `${targetSlot.documentType} uploaded successfully. The file is now tied to the correct checklist slot.`,
    };
  }

  function submitMonth(actorName: string): PortalActionResult {
    const nextPack = recalculatePack(monthPack);
    if (!nextPack.canComplete) {
      return {
        ok: false,
        message:
          "You cannot submit this month because required documents are still missing or rejected.",
      };
    }

    const submittedAt = new Date().toISOString();
    setMonthPack({
      ...nextPack,
      submissionStatus: "under_accountant_review",
      submittedAt,
    });
    setActivity((current) =>
      appendActivity(
        current,
        `${nextPack.monthLabel} submitted`,
        `${actorName} submitted the month pack for accountant review.`,
        "success",
        actorName,
        nextPack.monthLabel,
      ),
    );

    return {
      ok: true,
      message: `${nextPack.monthLabel} has been submitted to your accountant and is now under accountant review.`,
    };
  }

  function finaliseInvoice(invoiceId: string): PortalActionResult {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      return { ok: false, message: "The invoice could not be found." };
    }

    setInvoices((current) =>
      current.map((item) =>
        item.id === invoiceId ? { ...item, status: "sent_to_accountant" } : item,
      ),
    );
    setActivity((current) =>
      appendActivity(
        current,
        `${invoice.invoiceNumber} sent to accountant`,
        "The finalised invoice moved into the accountant review queue automatically.",
        "success",
        clientProfile.primaryContact,
        invoice.invoiceNumber,
      ),
    );

    return {
      ok: true,
      message: "Invoice has been finalised and sent to your accountant.",
    };
  }

  function reviewRecord({
    action,
    reason,
    recordId,
    reviewer,
  }: ReviewActionPayload): PortalActionResult {
    if (action === "rejected" && !reason?.trim()) {
      return {
        ok: false,
        message: "Add a clear rejection reason before sending the document back.",
      };
    }

    const reviewedAt = new Date().toISOString();
    const targetDocument = documents.find((document) => document.id === recordId);
    const targetInvoice = invoices.find((invoice) => invoice.id === recordId);

    if (!targetDocument && !targetInvoice) {
      return { ok: false, message: "The selected record could not be found." };
    }

    if (targetDocument) {
      setDocuments((current) =>
        current.map((document) =>
          document.id === recordId
            ? {
                ...document,
                status: action,
                reviewedBy: reviewer,
                reviewedAt,
                rejectionReason: action === "rejected" ? reason?.trim() : undefined,
                auditTrail: [
                  {
                    id: `audit-${document.auditTrail.length + 5001}`,
                    status:
                      action === "accepted"
                        ? "Accepted"
                        : action === "under_review"
                          ? "Under Review"
                          : "Rejected",
                    actor: reviewer,
                    timestamp: reviewedAt,
                    note:
                      action === "rejected"
                        ? reason!.trim()
                        : action === "accepted"
                          ? "Accepted and locked into the controlled workflow."
                          : "Moved into under review while the accountant completes checks.",
                  },
                  ...document.auditTrail,
                ],
              }
            : document,
        ),
      );
      setMonthPack((current) =>
        recalculatePack({
          ...current,
          submissionStatus:
            action === "accepted" && current.submissionStatus === "under_accountant_review"
              ? current.submissionStatus
              : "open",
          slots: current.slots.map((slot) =>
            slot.documentType === targetDocument.documentType &&
            `${slot.month} ${slot.year}` === targetDocument.monthLabel
              ? {
                ...slot,
                status: action,
                progress:
                  action === "accepted" ? 100 : action === "under_review" ? 80 : 35,
                rejectionReason: action === "rejected" ? reason?.trim() : undefined,
              }
            : slot,
          ),
        }),
      );
    }

    if (targetInvoice) {
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === recordId
            ? {
                ...invoice,
                status: action,
                reviewedBy: reviewer,
                reviewedAt,
                rejectionReason: action === "rejected" ? reason?.trim() : undefined,
                auditTrail: [
                  {
                    id: `invoice-audit-${(invoice.auditTrail?.length ?? 0) + 1}`,
                    status:
                      action === "accepted"
                        ? "Accepted"
                        : action === "under_review"
                          ? "Under Review"
                          : "Rejected",
                    actor: reviewer,
                    timestamp: reviewedAt,
                    note:
                      action === "rejected"
                        ? reason!.trim()
                        : action === "accepted"
                          ? "Accepted and locked into the workflow."
                          : "Moved into under review while checks continue.",
                  },
                  ...(invoice.auditTrail ?? []),
                ],
              }
            : invoice,
        ),
      );
    }

    return {
      ok: true,
      message:
        action === "accepted"
          ? "Record accepted and moved forward in the workflow."
          : action === "under_review"
            ? "Record placed under review so the client can see it is still in motion."
            : `Record rejected with reason: ${reason?.trim()}`,
    };
  }

  function addDocumentComment(
    recordId: string,
    author: string,
    role: Role,
    message: string,
  ): PortalActionResult {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return { ok: false, message: "Write a clear note before posting to the thread." };
    }

    const targetDocument = documents.find((document) => document.id === recordId);
    if (targetDocument) {
      const nextComment: DocumentComment = {
        id: `comment-${targetDocument.comments.length + 100}`,
        author,
        role,
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
      };

      setDocuments((current) =>
        current.map((document) =>
          document.id === recordId
            ? {
                ...document,
                comments: [...document.comments, nextComment],
                auditTrail: [
                  {
                    id: `audit-${document.auditTrail.length + 6001}`,
                    status: "Comment added",
                    actor: author,
                    timestamp: nextComment.createdAt,
                    note: trimmedMessage,
                  },
                  ...document.auditTrail,
                ],
              }
            : document,
        ),
      );

      return { ok: true, message: "Comment added to the document thread." };
    }

    const targetInvoice = invoices.find((invoice) => invoice.id === recordId);
    if (!targetInvoice) {
      return { ok: false, message: "The selected document thread could not be found." };
    }

    const nextComment: DocumentComment = {
      id: `invoice-comment-${(targetInvoice.comments?.length ?? 0) + 1}`,
      author,
      role,
      message: trimmedMessage,
      createdAt: new Date().toISOString(),
    };

    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === recordId
          ? {
              ...invoice,
              comments: [...(invoice.comments ?? []), nextComment],
              auditTrail: [
                {
                  id: `invoice-audit-${(invoice.auditTrail?.length ?? 0) + 1}`,
                  status: "Comment added",
                  actor: author,
                  timestamp: nextComment.createdAt,
                  note: trimmedMessage,
                },
                ...(invoice.auditTrail ?? []),
              ],
            }
          : invoice,
      ),
    );

    return { ok: true, message: "Comment added to the invoice thread." };
  }

  function updateNotificationState(
    notificationId: string,
    state: NotificationState,
    actorName: string,
  ): PortalActionResult {
    const targetNotification = notifications.find((notification) => notification.id === notificationId);
    if (!targetNotification) {
      return { ok: false, message: "The selected notification could not be found." };
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              state,
              activity: appendNotificationActivity(
                notification.activity,
                state === "resolved"
                  ? "Notification resolved"
                  : state === "reviewed"
                    ? "Notification reviewed"
                    : "Notification snoozed",
                state === "resolved"
                  ? `${actorName} completed the required action for this notification.`
                  : state === "reviewed"
                    ? `${actorName} reviewed this notification.`
                    : `${actorName} snoozed this notification for later follow-up.`,
                state === "resolved" ? "success" : "info",
                actorName,
              ),
            }
          : notification,
      ),
    );

    return {
      ok: true,
      message:
        state === "resolved"
          ? "Notification marked as resolved."
          : state === "reviewed"
            ? "Notification marked as reviewed."
            : "Notification snoozed for later review.",
    };
  }

  function addRequestComment(
    requestId: string,
    author: string,
    role: Role,
    message: string,
  ): PortalActionResult {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return { ok: false, message: "Write a clear note before posting to the request thread." };
    }

    const commentCreatedAt = new Date().toISOString();
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status:
                request.requestedByRole === "accountant"
                  ? role === "client"
                    ? "client_replied"
                    : request.status
                  : role === "accountant"
                    ? "open"
                    : "awaiting_accountant",
              comments: [
                ...request.comments,
                {
                  id: `${requestId}-comment-${request.comments.length + 1}`,
                  author,
                  role,
                  message: trimmedMessage,
                  createdAt: commentCreatedAt,
                },
              ],
              auditTrail: [
                {
                  id: `${requestId}-audit-${request.auditTrail.length + 1}`,
                  status:
                    role === "accountant"
                      ? "Accountant replied"
                      : request.requestedByRole === "accountant"
                        ? "Client replied"
                        : "Client updated request",
                  actor: author,
                  timestamp: commentCreatedAt,
                  note: trimmedMessage,
                },
                ...request.auditTrail,
              ],
            }
          : request,
      ),
    );

    return { ok: true, message: "Comment added to the request thread." };
  }

  function createClientRequest(payload: ClientRequestPayload): PortalActionResult {
    const trimmedTitle = payload.title.trim();
    const trimmedDescription = payload.description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      return { ok: false, message: "Add both a subject and a clear request before sending it." };
    }

    const createdAt = new Date().toISOString();

    setRequests((current) => [
      {
        id: `request-${current.length + 10}`,
        clientId: payload.clientId,
        clientName: payload.clientName,
        title: trimmedTitle,
        description: trimmedDescription,
        monthLabel: payload.monthLabel,
        status: "awaiting_accountant",
        priority: payload.priority,
        requestedBy: payload.actor.fullName,
        requestedByRole: payload.actor.role,
        assignedTo: payload.assignedAccountant,
        dueDate: payload.dueDate,
        createdAt,
        comments: [
          {
            id: `request-comment-${current.length + 100}`,
            author: payload.actor.fullName,
            role: payload.actor.role,
            message: trimmedDescription,
            createdAt,
          },
        ],
        auditTrail: [
          {
            id: `request-audit-${current.length + 100}`,
            status: "Client request sent",
            actor: payload.actor.fullName,
            timestamp: createdAt,
            note: trimmedDescription,
          },
        ],
      },
      ...current,
    ]);

    if (isApexWorkspaceId(payload.clientId)) {
      setActivity((current) =>
        appendActivity(
          current,
          "Client request sent",
          `${payload.actor.fullName} asked ${payload.assignedAccountant} for ${trimmedTitle}.`,
          "info",
          payload.actor.fullName,
          trimmedTitle,
        ),
      );
    }

    return { ok: true, message: "Your request has been sent to your accountant." };
  }

  function createFollowUpRequest(payload: FollowUpRequestPayload): PortalActionResult {
    const createdAt = new Date().toISOString();

    setRequests((current) => [
      {
        id: `request-${current.length + 10}`,
        clientId: payload.clientId,
        clientName: payload.clientName,
        title: payload.title,
        description: payload.description,
        monthLabel: payload.monthLabel,
        status: "awaiting_client",
        priority: "high",
        relatedDocumentId: payload.relatedDocumentId,
        requestedBy: payload.actor.fullName,
        requestedByRole: payload.actor.role,
        assignedTo: payload.clientName,
        dueDate: payload.dueDate,
        createdAt,
        requestType: payload.requestType,
        complianceCategoryId: payload.complianceCategoryId,
        complianceCategoryName: payload.complianceCategoryName,
        complianceItemId: payload.complianceItemId,
        complianceItemName: payload.complianceItemName,
        monthlyPeriod: payload.monthlyPeriod,
        comments: [],
        auditTrail: [
          {
            id: `request-audit-${current.length + 100}`,
            status: "Follow-up sent",
            actor: payload.actor.fullName,
            timestamp: createdAt,
            note: payload.description,
          },
        ],
      },
      ...current,
    ]);

    return { ok: true, message: "Follow-up request added to the client workflow." };
  }

  function createComplianceRequest(payload: ComplianceRequestPayload): PortalActionResult {
    const record = findComplianceItem(complianceClients, payload.clientId, payload.complianceItemId);
    if (!record) {
      return { ok: false, message: "The selected compliance item could not be found." };
    }

    const details = buildComplianceRequestDetails(
      record,
      payload.requestType,
      payload.dueDate,
      payload.comments ?? "",
      payload.actor.fullName,
    );
    const createdAt = new Date().toISOString();
    const nextRequestId = `request-${requests.length + 10}`;

    setRequests((current) => [
      {
        id: nextRequestId,
        clientId: payload.clientId,
        clientName: record.clientName,
        title: details.title,
        description: details.description,
        monthLabel: record.monthlyPeriod ?? "Compliance",
        status: "awaiting_client",
        priority:
          payload.requestType === "clarification_request"
            ? "medium"
            : "high",
        requestedBy: payload.actor.fullName,
        requestedByRole: payload.actor.role,
        assignedTo: record.clientName,
        dueDate: details.dueDate,
        createdAt,
        requestType: details.requestType,
        complianceCategoryId: details.complianceCategoryId,
        complianceCategoryName: details.complianceCategoryName,
        complianceItemId: details.complianceItemId,
        complianceItemName: details.complianceItemName,
        monthlyPeriod: details.monthlyPeriod,
        comments: [],
        auditTrail: [
          {
            id: `${nextRequestId}-audit-1`,
            status: "Compliance request created",
            actor: payload.actor.fullName,
            timestamp: createdAt,
            note: details.description,
          },
        ],
      },
      ...current,
    ]);

    setComplianceClients((current) =>
      updateComplianceItemInClient(current, payload.clientId, payload.complianceItemId, (item) =>
        appendComplianceRequestAudit(
          item,
          nextRequestId,
          payload.actor.fullName,
          payload.requestType,
          COMPLIANCE_REFERENCE_DATE,
        ),
      ),
    );

    if (isApexWorkspaceId(payload.clientId)) {
      setActivity((current) =>
        appendActivity(
          current,
          `Compliance request created`,
          `${payload.actor.fullName} created a compliance request for ${record.name}.`,
          "warning",
          payload.actor.fullName,
          record.name,
        ),
      );
    }

    return { ok: true, message: "Compliance request added to the workflow." };
  }

  function uploadComplianceVersion(payload: ComplianceVersionUploadPayload): PortalActionResult {
    const record = findComplianceItem(complianceClients, payload.clientId, payload.complianceItemId);
    if (!record) {
      return { ok: false, message: "The selected compliance item could not be found." };
    }

    setComplianceClients((current) =>
      updateComplianceItemInClient(current, payload.clientId, payload.complianceItemId, (item) =>
        appendComplianceDocumentVersion(
          item,
          {
            fileName: payload.fileName,
            fileType: payload.fileType,
            uploadedBy: payload.uploadedBy,
            note: payload.note,
          },
          COMPLIANCE_REFERENCE_DATE,
        ),
      ),
    );

    if (isApexWorkspaceId(payload.clientId)) {
      setActivity((current) =>
        appendActivity(
          current,
          `${record.name} re-uploaded`,
          `${payload.uploadedBy} uploaded a new compliance version for ${record.name}.`,
          "success",
          payload.uploadedBy,
          record.name,
        ),
      );
    }

    return {
      ok: true,
      message: "New compliance version uploaded and moved into review.",
    };
  }

  function resolveRequest(requestId: string, actorName: string): PortalActionResult {
    const targetRequest = requests.find((request) => request.id === requestId);
    if (!targetRequest) {
      return { ok: false, message: "The selected request could not be found." };
    }

    const resolvedAt = new Date().toISOString();
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: "resolved",
              auditTrail: [
                {
                  id: `${requestId}-audit-${request.auditTrail.length + 1}`,
                  status: "Resolved",
                  actor: actorName,
                  timestamp: resolvedAt,
                  note: "Client marked this workflow request as resolved.",
                },
                ...request.auditTrail,
              ],
            }
          : request,
      ),
    );

    setActivity((current) =>
      appendActivity(
        current,
        `${targetRequest.title} resolved`,
        `${actorName} marked the follow-up request as resolved.`,
        "success",
        actorName,
        targetRequest.title,
      ),
    );

    return { ok: true, message: "Request marked as resolved." };
  }

  function updateBusinessProfile(profile: BusinessProfile): PortalActionResult {
    setClientProfile(profile);
    setClientSettings((current) => ({
      ...current,
      security: {
        ...current.security,
        recoveryEmail: profile.financeEmail,
      },
    }));
    return { ok: true, message: "Business profile updated for the client workspace." };
  }

  function updateClientNotificationPreferences(
    preferences: ClientNotificationPreferences,
  ): PortalActionResult {
    setClientSettings((current) => ({
      ...current,
      notificationPreferences: preferences,
    }));

    return {
      ok: true,
      message: "Notification preferences saved for this client workspace.",
    };
  }

  function updateClientDocumentPreferences(
    preferences: ClientDocumentPreferences,
  ): PortalActionResult {
    setClientSettings((current) => ({
      ...current,
      documentPreferences: preferences,
    }));

    return {
      ok: true,
      message: "Document preferences updated. Structured upload and retention rules are now current.",
    };
  }

  function updateClientSecuritySettings(
    security: ClientSecuritySettings,
  ): PortalActionResult {
    setClientSettings((current) => ({
      ...current,
      security,
    }));

    return {
      ok: true,
      message: "Security settings updated for the active client account.",
    };
  }

  function downloadComplianceReport(actorName: string): PortalActionResult {
    const generatedAt = new Date().toISOString();
    setReportGeneratedAt(generatedAt);
    setComplianceAuditTrail((current) => [
      {
        id: `compliance-audit-${current.length + 1}`,
        action: "downloaded",
        actor: actorName,
        timestamp: generatedAt,
        detail: "Downloaded the latest client compliance report.",
      },
      ...current,
    ]);

    return {
      ok: true,
      message: "Compliance report regenerated and prepared for download.",
    };
  }

  function scheduleComplianceReport(
    frequency: ScheduledReport["frequency"],
    recipients: string[],
    actorName: string,
  ): PortalActionResult {
    const nextRunAt =
      frequency === "weekly" ? "2026-05-14T06:00:00.000Z" : "2026-06-01T06:00:00.000Z";
    const scheduledAt = new Date().toISOString();

    setScheduledReports((current) => {
      const existing = current.find((report) => report.frequency === frequency);
      if (existing) {
        return current.map((report) =>
          report.frequency === frequency
            ? {
                ...report,
                recipients,
                nextRunAt,
                lastScheduledAt: scheduledAt,
              }
            : report,
        );
      }

      return [
        ...current,
        {
          id: `scheduled-report-${frequency}`,
          frequency,
          recipients,
          nextRunAt,
          lastScheduledAt: scheduledAt,
        },
      ];
    });

    setComplianceAuditTrail((current) => [
      {
        id: `compliance-audit-${current.length + 1}`,
        action: "reviewed",
        actor: actorName,
        timestamp: scheduledAt,
        detail: `Scheduled ${frequency} compliance reporting for ${recipients.join(", ")}.`,
      },
      ...current,
    ]);

    return {
      ok: true,
      message: `${frequency === "weekly" ? "Weekly" : "Monthly"} compliance reporting has been scheduled.`,
    };
  }

  function assignClientAccountant(
    clientId: string,
    accountantName: string,
  ): PortalActionResult {
    setAdminClients((current) =>
      current.map((client) =>
        client.id === clientId ? { ...client, assignedAccountant: accountantName } : client,
      ),
    );
    accountantAssignments[clientId] = accountantName;
    return { ok: true, message: "Accountant assignment updated." };
  }

  function updateClientDeadlinePolicy(
    clientId: string,
    deadlinePolicy: string,
  ): PortalActionResult {
    setAdminClients((current) =>
      current.map((client) =>
        client.id === clientId ? { ...client, deadlinePolicy } : client,
      ),
    );
    return { ok: true, message: "Deadline policy updated." };
  }

  function resetClientPortalDemoState(): PortalActionResult {
    const fresh = createInitialClientPortalState(clientSeed, baseClientComplianceCentre);

    setMonthPack(fresh.monthPack);
    setDocuments(fresh.documents);
    setInvoices(fresh.invoices);
    setNotifications(fresh.notifications);
    setActivity(fresh.activity);
    setRequests(fresh.requests);
    setClientProfile(fresh.clientProfile);
    setClientSettings(fresh.clientSettings);
    setScheduledReports(fresh.scheduledReports);
    setComplianceClients(clone(seededAccountantComplianceCentre.clientStatuses ?? []));
    setComplianceAuditTrail(fresh.complianceAuditTrail);
    setReportGeneratedAt(fresh.reportGeneratedAt);

    return {
      ok: true,
      message: "Demo workflow state has been restored, including review queue records.",
    };
  }

  function getReviewQueue() {
    const dynamicDocumentQueue = documents
      .filter((document) => ["uploaded", "under_review"].includes(document.status))
      .map<ReviewQueueItem>((document) => ({
        id: document.id,
        clientName: document.clientName,
        documentType: document.documentType,
        monthLabel: document.monthLabel,
        submittedAt: document.uploadedAt,
        status: document.status === "under_review" ? "under_review" : "uploaded",
        assignedAccountant: assignedAccountantForApex,
      }));
    const dynamicInvoiceQueue = buildInvoiceReviewQueue(
      invoices,
      assignedAccountantForApex,
    );
    const dynamicQueue = [...dynamicDocumentQueue, ...dynamicInvoiceQueue];
    const dynamicIds = new Set(dynamicQueue.map((item) => item.id));
    const seededFirmQueue = baseAccountantDashboard.reviewQueue.filter(
      (item) => !dynamicIds.has(item.id),
    );

    return [...dynamicQueue, ...seededFirmQueue]
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
      )
      .slice(0, 15);
  }

  function getReviewRecord(recordId: string) {
    const document = documents.find((item) => item.id === recordId);
    if (document) {
      return document;
    }

    const invoice = invoices.find((item) => item.id === recordId);
    if (invoice) {
      return buildReviewDocumentFromInvoice(invoice);
    }

    const fallback = baseAccountantDashboard.reviewQueue.find((item) => item.id === recordId);
    if (fallback) {
      return buildFallbackReviewRecord(fallback);
    }

    return documents[0];
  }

  function getClientWorkspace(clientId: string): ClientWorkspaceView {
    if (isApexWorkspaceId(clientId)) {
      return currentClientWorkspace;
    }

    const client =
      adminClients.find((item) => item.id === clientId) ?? currentClientWorkspace.client;
    const workspaceRequests = requests.filter((request) => requestBelongsToClient(request, clientId));

    return {
      ...buildTemplateWorkspace(client, currentClientWorkspace),
      requests: workspaceRequests,
      compliance:
        complianceClients.find((complianceClient) => complianceClient.clientId === clientId) ??
        currentClientWorkspace.compliance,
    };
  }

  const accountantDashboard = useMemo<AccountantDashboardData>(() => {
    const otherPortfolioRows = baseAccountantDashboard.portfolio.filter(
      (row) => row.clientName !== "Apex Trading Ltd",
    );
    const apexMissingDocuments = buildMissingDocuments(monthPack, clientProfile.legalName);
    const apexPortfolioRow = {
      id: "portfolio-1",
      clientId: "firm-client-1",
      clientName: clientProfile.legalName,
      monthLabel: monthPack.monthLabel,
      progressPercent: monthPack.progressPercent,
      status: (
        monthPack.canComplete
          ? "on_track"
          : monthPack.submissionStatus === "under_accountant_review"
            ? "on_track"
            : "attention"
      ) as PortfolioStatus,
      assignedAccountant: assignedAccountantForApex,
      missingCount: apexMissingDocuments.length,
      overdueCount: 0,
      deadline: "06 May 2026",
    };
    const portfolio = [apexPortfolioRow, ...otherPortfolioRows];
    const staticMissing = baseAccountantDashboard.missingDocuments.filter(
      (item) => item.clientName !== "Apex Trading Ltd",
    );
    const staticRejected = baseAccountantDashboard.rejectedDocuments.filter(
      (item) => item.clientName !== "Apex Trading Ltd",
    );
    const staticExpiring = baseAccountantDashboard.expiringDocuments.filter(
      (item) => item.owner !== "Apex Trading Ltd",
    );
    const latestCombined = buildLatestOverallDocuments(documents, invoices);
    const latestOverall = [...latestCombined, ...baseAccountantDashboard.latestOverallDocuments]
      .filter(
        (item, index, current) =>
          current.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
      )
      .slice(0, 15);
    const reviewQueue = getReviewQueue();
    const onTrackCount = portfolio.filter((row) => row.status === "on_track").length;
    const attentionCount = portfolio.filter((row) => row.status === "attention").length;
    const overdueCount = portfolio.filter((row) => row.status === "overdue").length;
    const missingClientCount = portfolio.filter((row) => row.missingCount > 0).length;
    const averageProgress = Math.round(
      portfolio.reduce((sum, row) => sum + row.progressPercent, 0) / portfolio.length,
    );
    const underReviewCount = reviewQueue.filter(
      (item) => item.status === "under_review",
    ).length;
    const newSubmissionCount = reviewQueue.length - underReviewCount;
    const combinedExceptionCount = expiringDocuments.length + rejectedDocuments.length;

    return {
      ...baseAccountantDashboard,
      summaryMetrics: [
        {
          id: "acc-metric-1",
          label: "Portfolio completion",
          value: `${averageProgress}%`,
          helper: `${onTrackCount} of ${portfolio.length} clients are currently on track.`,
          tone: "info",
          progress: averageProgress,
        },
        {
          id: "acc-metric-2",
          label: "Needs follow-up",
          value: String(attentionCount + overdueCount),
          helper: `${overdueCount} overdue and ${missingClientCount} clients still missing required documents.`,
          tone: attentionCount + overdueCount > 0 ? "danger" : "success",
        },
        {
          id: "acc-metric-3",
          label: "Review workload",
          value: String(reviewQueue.length),
          helper: `${underReviewCount} already under review and ${newSubmissionCount} newly submitted.`,
          tone: reviewQueue.length > 0 ? "warning" : "success",
        },
        {
          id: "acc-metric-4",
          label: "Compliance exceptions",
          value: String(combinedExceptionCount),
          helper: `${expiringDocuments.length} expiring items and ${rejectedDocuments.length} rejected records need action.`,
          tone: combinedExceptionCount > 0 ? "warning" : "success",
        },
      ],
      portfolio,
      reviewQueue,
      smartAlerts: [
        ...smartAlerts,
        ...baseAccountantDashboard.smartAlerts.filter(
          (item) => !item.message.includes("Apex Trading"),
        ),
      ].slice(0, 6),
      reconciliationIssues: [
        ...reconciliationIssues,
        ...baseAccountantDashboard.reconciliationIssues.filter(
          (item) => item.reference !== "EFT-8814" && item.reference !== "EFT-8815",
        ),
      ].slice(0, 6),
      missingDocuments: [...apexMissingDocuments, ...staticMissing].slice(0, 8),
      expiringDocuments: [...expiringDocuments, ...staticExpiring].slice(0, 8),
      rejectedDocuments: [...rejectedDocuments, ...staticRejected].slice(0, 8),
      latestOverallDocuments: latestOverall,
      notifications,
    };
  }, [
      adminClients,
      assignedAccountantForApex,
      baseAccountantDashboard,
      clientProfile.legalName,
    documents,
    expiringDocuments,
    invoices,
    monthPack,
    notifications,
    rejectedDocuments,
    reconciliationIssues,
    smartAlerts,
  ]);

  const value = useMemo<PortalContextValue>(
    () => ({
      clientProfile,
      clientSettings,
      scheduledReports,
      clientWorkflow: {
        seed: clientSeed,
        monthPack,
        documents,
        invoices,
        notifications,
        activity,
        requests: liveClientRequests,
        summaryMetrics,
        missingRequiredDocuments,
        expiringDocuments,
        rejectedDocuments,
        latestUploadedDocuments,
        latestInvoices,
        latestOverallDocuments,
        previousMonthComparison,
        previousMonthDocuments,
        smartAlerts,
        reconciliationIssues,
        unifiedSearchResults,
      },
      accountantDashboard,
      adminClients,
      adminPolicies,
      managedAccountants,
      userAccounts,
      clientComplianceCentre,
      accountantComplianceCentre,
      uploadToSlot,
      submitMonth,
      finaliseInvoice,
      reviewRecord,
      addDocumentComment,
      updateNotificationState,
      addRequestComment,
      createClientRequest,
      createFollowUpRequest,
      createComplianceRequest,
      uploadComplianceVersion,
      resolveRequest,
      updateBusinessProfile,
      updateClientNotificationPreferences,
      updateClientDocumentPreferences,
      updateClientSecuritySettings,
      downloadComplianceReport,
      scheduleComplianceReport,
      assignClientAccountant,
      updateClientDeadlinePolicy,
      filterSearchResults: filterUnifiedSearchResults,
      resetClientPortalDemoState,
      getClientWorkspace,
      getReviewQueue,
      getReviewRecord,
    }),
    [
      accountantComplianceCentre,
      accountantDashboard,
      activity,
      adminClients,
      adminPolicies,
      clientComplianceCentre,
      clientSettings,
      clientProfile,
      clientSeed,
      complianceClients,
      documents,
      downloadComplianceReport,
      expiringDocuments,
      invoices,
      latestInvoices,
      latestOverallDocuments,
      latestUploadedDocuments,
      liveClientRequests,
      managedAccountants,
      missingRequiredDocuments,
      monthPack,
      notifications,
      previousMonthComparison,
      previousMonthDocuments,
      reconciliationIssues,
      resetClientPortalDemoState,
      scheduleComplianceReport,
      scheduledReports,
      createClientRequest,
      createComplianceRequest,
      uploadComplianceVersion,
      resolveRequest,
      rejectedDocuments,
      requests,
      smartAlerts,
      summaryMetrics,
      unifiedSearchResults,
      updateClientDocumentPreferences,
      updateClientNotificationPreferences,
      updateClientSecuritySettings,
      updateNotificationState,
      userAccounts,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const value = useContext(PortalContext);

  if (!value) {
    throw new Error("usePortal must be used inside PortalProvider");
  }

  return value;
}