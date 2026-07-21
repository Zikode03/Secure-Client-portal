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
import { hasApiBaseUrl } from "../services/apiClient";
import { buildComplianceCentreDataFromStatuses } from "../services/complianceData";
import { portalService } from "../services/portalData";
import { portalServiceApi } from "../services/portalApi";
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
import { formatDateLabel } from "../utils/formatters";
import type {
  AdminDashboardData,
  AccountantDashboardData,
  ActivityItem,
  AuditTrailEntry,
  BusinessProfile,
  ClientDocumentPreferences,
  ClientNotificationPreferences,
  ClientSecuritySettings,
  ClientSettingsState,
  ClientWorkflowSeed,
  ComplianceTemplate,
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
  MonthlyPackRules,
  MonthlyPack,
  NotificationActivityEntry,
  NotificationItem,
  NotificationState,
  PortfolioStatus,
  ReviewQueueItem,
  Role,
  ScheduledReport,
  SessionUser,
  RolePermissionMatrix,
  Tone,
  UnifiedSearchFilters,
  UnifiedSearchResult,
  UploadSubmission,
  UserAccountRecord,
  DocumentRequirementRule,
  WorkflowRequest,
} from "../types/portal";

const clone = <Value,>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildMockPreviewDataUrl(lines: string[], accent: string, surface: string) {
  const safeLines = lines.map((line) => escapeXml(line));
  const textNodes = safeLines
    .map(
      (line, index) =>
        `<text x="64" y="${150 + index * 42}" font-family="Segoe UI, Arial, sans-serif" font-size="${
          index === 0 ? 28 : index <= 2 ? 20 : 17
        }" fill="#10213f"${index === 0 ? ' font-weight="700"' : ""}>${line}</text>`,
    )
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1600" viewBox="0 0 1240 1600">
      <rect width="1240" height="1600" fill="#eef3f8"/>
      <rect x="32" y="32" width="1176" height="1536" rx="28" fill="${surface}" stroke="#d8e2ef"/>
      <rect x="32" y="32" width="1176" height="24" rx="28" fill="${accent}"/>
      <text x="64" y="98" font-family="Segoe UI, Arial, sans-serif" font-size="18" letter-spacing="5" fill="#66758f">SECURE CLIENT PORTAL</text>
      ${textNodes}
      <rect x="64" y="360" width="1112" height="2" fill="#d8e2ef"/>
      <rect x="64" y="408" width="1112" height="64" rx="14" fill="#f8fbff" stroke="#d8e2ef"/>
      <rect x="64" y="486" width="1112" height="64" rx="14" fill="#ffffff" stroke="#e3ebf5"/>
      <rect x="64" y="564" width="1112" height="64" rx="14" fill="#ffffff" stroke="#e3ebf5"/>
      <rect x="64" y="642" width="1112" height="64" rx="14" fill="#ffffff" stroke="#e3ebf5"/>
      <text x="88" y="448" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#314664">Reference</text>
      <text x="88" y="526" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#314664">Description</text>
      <text x="88" y="604" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#314664">Prepared for review workflow</text>
      <text x="88" y="682" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#314664">Mock supporting file seeded for UI validation</text>
      <rect x="64" y="1456" width="1112" height="56" rx="16" fill="#f7faff" stroke="#d8e2ef"/>
      <text x="88" y="1492" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#53617f">Mock document preview generated from seeded workspace data.</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMockDocumentPreview(document: Pick<DocumentRecord, "clientName" | "documentType" | "monthLabel" | "fileName" | "amountLabel" | "uploadedBy">) {
  const shared = [
    document.documentType,
    document.clientName,
    document.monthLabel,
  ];

  if (document.documentType === "Bank Statement") {
    return buildMockPreviewDataUrl(
      [
        "Business Bank Statement",
        `Account holder: ${document.clientName}`,
        `Statement period: ${document.monthLabel}`,
        "Account number: 2104 88 41",
        "Opening balance: R 184,220.14",
        "Closing balance: R 167,905.88",
      ],
      "#315b9c",
      "#ffffff",
    );
  }

  if (document.documentType === "Invoices") {
    return buildMockPreviewDataUrl(
      [
        "Tax Invoice Bundle",
        `Client: ${document.clientName}`,
        `Period: ${document.monthLabel}`,
        `Bundle file: ${document.fileName}`,
        `Total value: ${document.amountLabel ?? "R 52,400.00"}`,
        "Prepared for accountant review and VAT tie-out",
      ],
      "#0f7f56",
      "#ffffff",
    );
  }

  if (document.documentType === "Signed Documents") {
    return buildMockPreviewDataUrl(
      [
        "Signed Approval Pack",
        `Client: ${document.clientName}`,
        `Period: ${document.monthLabel}`,
        "Includes filing authorisation and sign-off memo",
        `Submitted by: ${document.uploadedBy}`,
        "Authorised signatory recorded",
      ],
      "#7a5af8",
      "#ffffff",
    );
  }

  if (document.documentType === "Compliance Record") {
    return buildMockPreviewDataUrl(
      [
        "Compliance Support Record",
        `Client: ${document.clientName}`,
        `Review period: ${document.monthLabel}`,
        "Supporting compliance evidence attached",
        "Tax / CIPC / address checks consolidated",
        "Prepared for annual audit trail",
      ],
      "#c47f00",
      "#fffdf7",
    );
  }

  return buildMockPreviewDataUrl(
    [
      document.documentType,
      `Client: ${document.clientName}`,
      `Period: ${document.monthLabel}`,
      `File: ${document.fileName}`,
      "Structured document uploaded to workspace",
      "Prepared for accountant review",
    ],
    "#315b9c",
    "#ffffff",
  );
}

function attachMockPreviewToDocument(document: DocumentRecord): DocumentRecord {
  if (document.fileDataUrl) {
    return document;
  }

  return {
    ...document,
    fileDataUrl: buildMockDocumentPreview(document),
    fileMimeType: "image/svg+xml",
  };
}

function attachMockPreviewToInvoice(invoice: InvoiceRecord): InvoiceRecord {
  if (invoice.fileDataUrl) {
    return invoice;
  }

  return {
    ...invoice,
    fileDataUrl: buildMockDocumentPreview({
      clientName: invoice.clientName,
      documentType: "Invoices",
      monthLabel: invoice.monthLabel,
      fileName: invoice.fileName,
      amountLabel: invoice.amountLabel,
      uploadedBy: invoice.clientName,
    }),
    fileMimeType: "image/svg+xml",
  };
}

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
    title: "Submit April invoice evidence bundle",
    description:
      "Please upload the full April supplier and customer invoice evidence so review can begin.",
    monthLabel: "April 2026",
    status: "open",
    isStarred: false,
    priority: "high",
    relatedDocumentId: "doc-1002",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-05T17:00:00.000Z",
    createdAt: "2026-04-30T09:15:00.000Z",
    comments: [
      {
        id: "request-1-comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message:
          "Please upload the full April supplier and customer invoice evidence bundle so I can complete the review.",
        createdAt: "2026-04-30T09:15:00.000Z",
      },
      {
        id: "request-1-comment-2",
        author: "Sarah Jacobs",
        role: "client",
        message:
          "I have most of it ready. Do you also need the supporting customer credit notes in the same upload?",
        createdAt: "2026-04-30T10:02:00.000Z",
      },
      {
        id: "request-1-comment-3",
        author: "Daniel Mokoena",
        role: "accountant",
        message:
          "Yes, please include the supporting credit notes as part of the same evidence bundle so I can tie everything out in one pass.",
        createdAt: "2026-04-30T10:18:00.000Z",
      },
      {
        id: "request-1-comment-4",
        author: "Sarah Jacobs",
        role: "client",
        message:
          "Understood. I will upload the full bundle this afternoon and let you know once it is in the portal.",
        createdAt: "2026-04-30T10:31:00.000Z",
      },
    ],
    auditTrail: [
      {
        id: "request-audit-1",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-04-30T09:15:00.000Z",
        note: "Initial invoice evidence request opened for the April month pack.",
      },
    ],
  },
  {
    id: "request-2",
    clientId: "client-apex",
    clientName: "Apex Trading Ltd",
    title: "Monthly pack action: upload April bank statement",
    description:
      "Go to Monthly Packs and upload the April bank statement in the Bank Statement slot.",
    monthLabel: "April 2026",
    status: "open",
    isStarred: false,
    priority: "high",
    requestedBy: "Daniel Mokoena",
    requestedByRole: "accountant",
    assignedTo: "Sarah Jacobs",
    dueDate: "2026-05-06T17:00:00.000Z",
    createdAt: "2026-05-03T09:15:00.000Z",
    comments: [
      {
        id: "request-2-comment-1",
        author: "Daniel Mokoena",
        role: "accountant",
        message:
          "The April bank statement is still missing from the Monthly Packs workspace. Please upload it in the Bank Statement slot.",
        createdAt: "2026-05-03T09:15:00.000Z",
      },
      {
        id: "request-2-comment-2",
        author: "Sarah Jacobs",
        role: "client",
        message:
          "I can see the slot. The statement I downloaded from the bank is password protected. Is that okay or should I remove the password first?",
        createdAt: "2026-05-03T09:42:00.000Z",
      },
      {
        id: "request-2-comment-3",
        author: "Daniel Mokoena",
        role: "accountant",
        message:
          "Please remove the password before uploading, otherwise the review tools will not be able to extract the transactions cleanly.",
        createdAt: "2026-05-03T09:55:00.000Z",
      },
      {
        id: "request-2-comment-4",
        author: "Sarah Jacobs",
        role: "client",
        message:
          "Thanks, I will export an unlocked copy and upload it into Monthly Packs before lunch.",
        createdAt: "2026-05-03T10:08:00.000Z",
      },
    ],
    auditTrail: [
      {
        id: "request-audit-2",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-05-03T09:15:00.000Z",
        note: "Bank Statement slot is still pending for April. Upload it in Monthly Packs.",
      },
    ],
  },
];

function mergeSeededRequestComments(requests: WorkflowRequest[]) {
  return requests.map((request) => {
    const seededRequest = initialRequests.find((item) => item.id === request.id);
    if (!seededRequest) {
      return request;
    }

    if ((request.comments?.length ?? 0) > 0) {
      return request;
    }

    return {
      ...request,
      comments: clone(seededRequest.comments ?? []),
    };
  });
}

const initialAccountants: ManagedAccountant[] = [
  {
    id: "user-accountant-1",
    name: "Daniel Mokoena",
    email: "accountant@example.com",
    title: "Senior Accountant",
    assignedClientCount: 8,
    openReviews: 5,
    status: "busy",
  },
  {
    id: "user-accountant-2",
    name: "Lerato Nkosi",
    email: "lerato@finwelladvisory.co.za",
    title: "Accounting Manager",
    assignedClientCount: 7,
    openReviews: 3,
    status: "active",
  },
  {
    id: "user-accountant-3",
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

const initialDocumentRequirementRules: DocumentRequirementRule[] = [
  { id: "bank_statement", name: "Bank statement", required: true, acceptedFormats: ["PDF"] },
  { id: "sales_invoices", name: "Sales invoices", required: true, acceptedFormats: ["PDF", "ZIP"] },
  { id: "expense_invoices", name: "Expense invoices", required: true, acceptedFormats: ["PDF", "ZIP"] },
  { id: "vat_documents", name: "VAT documents", required: true, acceptedFormats: ["PDF", "XLSX"] },
  { id: "payroll_documents", name: "Payroll documents", required: true, acceptedFormats: ["PDF", "XLSX"] },
  { id: "signed_documents", name: "Signed documents", required: true, acceptedFormats: ["PDF"] },
];

const initialMonthlyPackRules: MonthlyPackRules = {
  submissionDeadlineDay: 5,
  requiredDocumentIds: initialDocumentRequirementRules.filter((rule) => rule.required).map((rule) => rule.id),
  optionalDocumentIds: [],
  blockingDocumentIds: ["bank_statement", "sales_invoices", "expense_invoices", "vat_documents", "payroll_documents", "signed_documents"],
  reminderDaysBeforeDue: [10, 3, 1],
};

const initialComplianceTemplates: ComplianceTemplate[] = [
  { id: "tax_compliance", category: "Tax Compliance", description: "SARS registrations, returns, and tax standing records.", active: true },
  { id: "cipc_compliance", category: "CIPC Compliance", description: "Company registration, annual return, and governance records.", active: true },
  { id: "payroll_compliance", category: "Payroll Compliance", description: "EMP201/EMP501, payslips, and payroll reconciliation evidence.", active: true },
  { id: "popia_compliance", category: "POPIA Compliance", description: "POPIA policy, privacy notice, and data processing register.", active: true },
  { id: "tender_compliance", category: "Tender Compliance", description: "B-BBEE, CSD, bank letter, and supplier onboarding records.", active: true },
];

const initialRolePermissionMatrix: RolePermissionMatrix[] = [
  { role: "admin", permissions: ["view:assigned_clients", "view:all_clients", "view:assigned_documents", "view:all_documents", "view:assigned_review_queue", "view:firm_review_queue", "view:assigned_compliance", "view:firm_compliance", "manage:users", "manage:roles", "manage:assignments", "manage:templates", "manage:deadline_rules", "manage:system_settings", "export:firm_reports", "export:client_reports", "request:documents", "review:documents", "comment:documents", "comment:requests"] },
  { role: "accountant", permissions: ["view:assigned_clients", "view:assigned_documents", "view:assigned_review_queue", "view:assigned_compliance", "export:client_reports", "request:documents", "review:documents", "comment:documents", "comment:requests"] },
  { role: "client", permissions: ["export:client_reports", "comment:documents", "comment:requests"] },
];

function mergeUserAccounts(
  currentUsers: UserAccountRecord[],
  backendUsers: UserAccountRecord[],
) {
  const mergedByEmail = new Map<string, UserAccountRecord>();

  currentUsers.forEach((user) => {
    mergedByEmail.set(user.email.toLowerCase(), user);
  });

  backendUsers.forEach((user) => {
    mergedByEmail.set(user.email.toLowerCase(), user);
  });

  return Array.from(mergedByEmail.values());
}

function findAccountantById(accountantId: string) {
  return initialAccountants.find((accountant) => accountant.id === accountantId);
}

function findAccountantByName(accountantName: string) {
  return initialAccountants.find((accountant) => accountant.name === accountantName);
}

const CLIENT_PORTAL_STORAGE_KEY = "accounting-document-control-client-portal-v3";

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
      requests: parsed.requests ? mergeSeededRequestComments(clone(parsed.requests)) : fallback.requests,
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
  createdRequestId?: string;
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
  priority?: WorkflowRequest["priority"];
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
  adminDashboard: AdminDashboardData;
  adminPolicies: DocumentPolicy[];
  managedAccountants: ManagedAccountant[];
  userAccounts: UserAccountRecord[];
  documentRequirementRules: DocumentRequirementRule[];
  monthlyPackRules: MonthlyPackRules;
  complianceTemplates: ComplianceTemplate[];
  rolePermissionMatrix: RolePermissionMatrix[];
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
  toggleRequestStar: (requestId: string) => PortalActionResult;
  resolveRequest: (requestId: string, actorName: string) => PortalActionResult;
  updateRequestControls: (
    requestId: string,
    updates: Pick<WorkflowRequest, "assignedTo" | "dueDate" | "priority">,
    actorName: string,
    options?: { addAuditNote?: boolean; auditNote?: string },
  ) => PortalActionResult;
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
  assignClientAccountant: (
    clientId: string,
    accountantName: string,
    accountantUserId?: string,
    handover?: {
      reason: string;
      message: string;
      effectiveDate: string;
      assignedBy: string;
    },
  ) => PortalActionResult;
  assignClientAccountantBackup: (
    clientId: string,
    backupAccountantName: string,
    backupAccountantUserId?: string,
  ) => PortalActionResult;
  createUserAccount: (payload: {
    name: string;
    email: string;
    role: Role;
    company?: string;
  }) => Promise<PortalActionResult>;
  disableUserAccount: (userId: string) => PortalActionResult;
  activateUserAccount: (userId: string) => PortalActionResult;
  resetUserAccess: (userId: string) => Promise<PortalActionResult>;
  assignUserRole: (userId: string, role: Role) => PortalActionResult;
  addClientBusiness: (payload: {
    clientName: string;
    industry: string;
    requiredPack: string;
    deadlinePolicy: string;
    assignedAccountantUserId?: string;
    backupAccountantUserId?: string;
  }) => PortalActionResult;
  updateClientBusiness: (
    clientId: string,
    updates: Partial<Pick<FirmClientAccount, "clientName" | "industry" | "requiredPack" | "deadlinePolicy">>,
  ) => PortalActionResult;
  setClientActiveState: (clientId: string, isActive: boolean) => PortalActionResult;
  updateDocumentRequirements: (rules: DocumentRequirementRule[]) => PortalActionResult;
  updateMonthlyPackRules: (rules: MonthlyPackRules) => PortalActionResult;
  updateComplianceTemplates: (templates: ComplianceTemplate[]) => PortalActionResult;
  updateRolePermissionMatrix: (matrix: RolePermissionMatrix[]) => PortalActionResult;
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

function buildCurrentMonthWorkspaceDocument(
  client: FirmClientAccount,
  source: ClientWorkspaceView,
  documentType: string,
  monthLabel: string,
  index: number,
  overrides: Partial<DocumentRecord> = {},
): DocumentRecord {
  const clientToken = client.clientName.replace(/[^A-Za-z0-9]/g, "");
  const uploadedBy = `${client.clientName} Finance Team`;
  const monthToken = monthLabel.replace(/\s+/g, "_");
  const baseDocument = source.documents[0]
    ? clone(source.documents[0])
    : ({
        id: "",
        clientId: client.id,
        clientName: client.clientName,
        documentType,
        fileName: "",
        monthLabel,
        description: "",
        status: "uploaded",
        uploadedBy,
        uploadedAt: "2026-05-03T10:15:00.000Z",
        sizeLabel: "1.4 MB",
        keywordTags: [],
        comments: [],
        auditTrail: [],
      } satisfies DocumentRecord);

  return {
    ...baseDocument,
    id: `${client.id}-seeded-current-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
    documentType,
    fileName: `${clientToken}_${documentType.replace(/[^A-Za-z0-9]+/g, "")}_${monthToken}.pdf`,
    monthLabel,
    description: `${documentType} uploaded for ${monthLabel}.`,
    status: "uploaded",
    uploadedBy,
    uploadedAt: "2026-05-03T10:15:00.000Z",
    reviewedBy: undefined,
    reviewedAt: undefined,
    sizeLabel: "1.4 MB",
    keywordTags: [documentType.toLowerCase(), "mock", "workspace"],
    supplierName: undefined,
    amountLabel: undefined,
    extractedText: `${client.clientName} ${documentType} for ${monthLabel}.`,
    expiryDate: undefined,
    rejectionReason: undefined,
    comments: [],
    auditTrail: [
      {
        id: `${client.id}-seeded-current-${index + 1}-audit-1`,
        status: "Uploaded",
        actor: uploadedBy,
        timestamp: "2026-05-03T10:15:00.000Z",
        note: `Seeded current-month ${documentType.toLowerCase()} for workspace preview.`,
      },
    ],
    ...overrides,
  };
}

function buildTemplateWorkspace(client: FirmClientAccount, source: ClientWorkspaceView): ClientWorkspaceView {
  const rename = (value: string) =>
    value
      .replace(/Apex Trading Ltd/g, client.clientName)
      .replace(/ApexTrading/g, client.clientName.replace(/[^A-Za-z0-9]/g, ""));

  const documents = source.documents.map((document, index) =>
    attachMockPreviewToDocument({
      ...clone(document),
    id: `${client.id}-doc-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
    fileName: rename(document.fileName),
    description: rename(document.description),
    uploadedBy:
      document.uploadedBy === "Sarah Jacobs"
        ? `${client.clientName} Finance Team`
        : document.uploadedBy,
    extractedText: document.extractedText ? rename(document.extractedText) : document.extractedText,
    comments: clone(document.comments).map((comment, commentIndex) => ({
      ...comment,
      id: `${client.id}-doc-${index + 1}-comment-${commentIndex + 1}`,
      author: comment.author === "Sarah Jacobs" ? `${client.clientName} Finance Team` : comment.author,
      message: rename(comment.message),
    })),
    auditTrail: clone(document.auditTrail).map((entry, auditIndex) => ({
      ...entry,
      id: `${client.id}-doc-${index + 1}-audit-${auditIndex + 1}`,
      actor: entry.actor === "Sarah Jacobs" ? `${client.clientName} Finance Team` : entry.actor,
      note: rename(entry.note),
    })),
  }),
    );
  const invoices = source.invoices.map((invoice, index) =>
    attachMockPreviewToInvoice({
      ...clone(invoice),
    id: `${client.id}-inv-${index + 1}`,
    clientId: client.id,
    clientName: client.clientName,
    fileName: rename(invoice.fileName),
    description: rename(invoice.description),
    extractedText: invoice.extractedText ? rename(invoice.extractedText) : invoice.extractedText,
  }),
    );
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

  const seededDocuments = [...documents];
  const ensureCurrentMonthDocument = (
    documentType: string,
    overrides: Partial<DocumentRecord> = {},
  ) => {
    const exists = seededDocuments.some(
      (document) =>
        document.documentType === documentType &&
        document.monthLabel === monthPack.monthLabel,
    );
    if (exists) {
      return;
    }

    seededDocuments.push(
      attachMockPreviewToDocument(
        buildCurrentMonthWorkspaceDocument(
          client,
          source,
          documentType,
          monthPack.monthLabel,
          seededDocuments.length,
          overrides,
        ),
      ),
    );
  };

  ensureCurrentMonthDocument("Bank Statement", {
    status: client.completionRate >= 65 ? "accepted" : "uploaded",
    description: `Operating account bank statement for ${monthPack.monthLabel}.`,
    sizeLabel: "2.2 MB",
    keywordTags: ["bank statement", "monthly pack", "mock"],
    reviewedBy: client.completionRate >= 65 ? client.assignedAccountant : undefined,
    reviewedAt: client.completionRate >= 65 ? "2026-05-04T09:20:00.000Z" : undefined,
  });
  ensureCurrentMonthDocument("Signed Documents", {
    status: client.completionRate >= 75 ? "accepted" : "under_review",
    description: `Signed approvals and filing authorisations for ${monthPack.monthLabel}.`,
    sizeLabel: "1.1 MB",
    keywordTags: ["signed documents", "authorisation", "mock"],
    reviewedBy: client.assignedAccountant,
    reviewedAt: "2026-05-03T14:10:00.000Z",
  });
  ensureCurrentMonthDocument("Compliance Record", {
    status: client.completionRate >= 85 ? "accepted" : "under_review",
    description: `Compliance support pack for ${monthPack.monthLabel}.`,
    sizeLabel: "960 KB",
    keywordTags: ["compliance", "record", "mock"],
    reviewedBy: client.assignedAccountant,
    reviewedAt: "2026-05-05T08:30:00.000Z",
    expiryDate: "2026-08-31T00:00:00.000Z",
  });

  return {
    client,
    monthPack,
    documents: seededDocuments,
    invoices,
    requests,
    compliance: source.compliance,
    missingDocuments: buildMissingDocuments(monthPack, client.clientName),
    expiringDocuments: buildExpiringDocuments(seededDocuments),
    rejectedDocuments: buildRejectedDocuments(seededDocuments, invoices),
    latestOverallDocuments: buildLatestOverallDocuments(seededDocuments, invoices),
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
  const [clientSeed, setClientSeed] = useState(() => portalService.getClientWorkflowSeed());
  const [baseAccountantDashboard, setBaseAccountantDashboard] = useState(() =>
    portalService.getAccountantDashboard(),
  );
  const [baseAdminClients, setBaseAdminClients] = useState(() => portalService.getAdminClients());
  const [baseAdminPolicies, setBaseAdminPolicies] = useState(() => portalService.getAdminPolicies());
  const [baseClientComplianceCentre, setBaseClientComplianceCentre] = useState(() =>
    portalService.getClientComplianceCentre(),
  );
  const [seededAccountantComplianceCentre, setSeededAccountantComplianceCentre] = useState(() =>
    portalService.getAccountantComplianceCentre(),
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
  const adminPolicies = useMemo(() => clone(baseAdminPolicies), [baseAdminPolicies]);
  const [managedAccountants, setManagedAccountants] = useState(() => clone(initialAccountants));
  const [userAccounts, setUserAccounts] = useState(() =>
    hasApiBaseUrl() ? [] : clone(initialUsers),
  );
  const [documentRequirementRules, setDocumentRequirementRules] = useState(
    () => clone(initialDocumentRequirementRules),
  );
  const [monthlyPackRules, setMonthlyPackRules] = useState(() => clone(initialMonthlyPackRules));
  const [complianceTemplates, setComplianceTemplates] = useState(
    () => clone(initialComplianceTemplates),
  );
  const [rolePermissionMatrix, setRolePermissionMatrix] = useState(
    () => clone(initialRolePermissionMatrix),
  );

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    let isActive = true;

    const hydrateFromApi = async () => {
      const [
        nextClientSeed,
        nextAccountantDashboard,
        nextAdminClients,
        nextAdminUsers,
        nextAdminPolicies,
        nextClientCompliance,
        nextAccountantCompliance,
      ] = await Promise.all([
        portalServiceApi.getClientWorkflowSeed(),
        portalServiceApi.getAccountantDashboard(),
        portalServiceApi.getAdminClients(),
        portalServiceApi.getAdminUsers(),
        portalServiceApi.getAdminPolicies(),
        portalServiceApi.getClientComplianceCentre(),
        portalServiceApi.getAccountantComplianceCentre(),
      ]);

      if (!isActive) return;

      setClientSeed(nextClientSeed);
      setBaseAccountantDashboard(nextAccountantDashboard);
      setBaseAdminClients(nextAdminClients);
      setBaseAdminPolicies(nextAdminPolicies);
      setBaseClientComplianceCentre(nextClientCompliance);
      setSeededAccountantComplianceCentre(nextAccountantCompliance);
      if (nextAdminUsers.length > 0) {
        setUserAccounts((current) => mergeUserAccounts(current, clone(nextAdminUsers)));
        setManagedAccountants((current) => {
          const currentByEmail = new Map(
            current.map((accountant) => [accountant.email.toLowerCase(), accountant]),
          );
          const mergedAccountants = nextAdminUsers
            .filter((user) => user.role === "accountant")
            .map((user) => {
              const existing = currentByEmail.get(user.email.toLowerCase());
              return existing
                ? { ...existing, id: user.id, name: user.name, email: user.email }
                : {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    title: "Accountant",
                    assignedClientCount: 0,
                    openReviews: 0,
                    status: "capacity_available" as const,
                  };
            });

          const mergedEmails = new Set(
            mergedAccountants.map((accountant) => accountant.email.toLowerCase()),
          );
          const preserved = current.filter(
            (accountant) => !mergedEmails.has(accountant.email.toLowerCase()),
          );
          return [...mergedAccountants, ...preserved];
        });
      }
      setAdminClients(clone(nextAdminClients));
      setComplianceClients(clone(nextAccountantCompliance.clientStatuses ?? []));
    };

    void hydrateFromApi();

    return () => {
      isActive = false;
    };
  }, []);

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
        // Keep document workspace data clean: only live document/invoice records.
        requests: [],
        complianceDocuments: [],
      }),
    [
      clientProfile.legalName,
      documents,
      invoices,
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
            "Daniel Mokoena",
          requiredPack: "Trading monthly pack",
          completionRate: monthPack.progressPercent,
          deadlinePolicy: "6th working day",
          status: monthPack.canComplete ? "on_track" : "attention",
        },
      monthPack,
      documents: documents.map((document) => attachMockPreviewToDocument(document)),
      invoices: invoices.map((invoice) => attachMockPreviewToInvoice(invoice)),
      requests: liveClientRequests,
      compliance: clientComplianceStatus,
      missingDocuments: buildMissingDocuments(monthPack, clientProfile.legalName),
      expiringDocuments: buildExpiringDocuments(documents.map((document) => attachMockPreviewToDocument(document))),
      rejectedDocuments: buildRejectedDocuments(
        documents.map((document) => attachMockPreviewToDocument(document)),
        invoices.map((invoice) => attachMockPreviewToInvoice(invoice)),
      ),
      latestOverallDocuments: buildLatestOverallDocuments(
        documents.map((document) => attachMockPreviewToDocument(document)),
        invoices.map((invoice) => attachMockPreviewToInvoice(invoice)),
      ),
      auditTrail: documents.flatMap((document) => document.auditTrail).slice(0, 10),
    }),
    [
      adminClients,
      clientProfile.legalName,
      documents,
      invoices,
      liveClientRequests,
      monthPack,
      clientComplianceStatus,
    ],
  );

function isStrictUploadName(value: string) {
  return /^[A-Za-z0-9]+_[A-Za-z0-9]+_[A-Za-z]+_\d{4}\.(pdf|png|jpe?g|docx|xlsx)$/i.test(
    value.trim(),
  );
}

function isSlotDocumentTypeMatch(slotType: string, submittedType: string) {
  return slotType.trim().toLowerCase() === submittedType.trim().toLowerCase();
}

function isLikelyWrongSlotFile(fileName: string, slotType: string) {
  const name = fileName.toLowerCase();
  const slot = slotType.toLowerCase();

  if (slot.includes("bank statement")) {
    return name.includes("invoice") || name.includes("inv-");
  }

  if (slot.includes("invoice")) {
    return name.includes("statement") || name.includes("bank");
  }

  return false;
}

function normaliseAcceptedFileToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fileExtension(value: string) {
  return value.split(".").pop()?.toLowerCase() ?? "";
}

function isAcceptedFileForSlot(
  fileName: string,
  fileMimeType: string | undefined,
  acceptedFiles: string[],
) {
  if (acceptedFiles.length === 0) {
    return true;
  }

  const ext = fileExtension(fileName);
  const mime = (fileMimeType ?? "").toLowerCase();
  const accepted = acceptedFiles.map((item) => normaliseAcceptedFileToken(item));

  return accepted.some((token) => {
    if (token === "pdf") {
      return ext === "pdf" || mime === "application/pdf";
    }
    if (token === "png") {
      return ext === "png" || mime === "image/png";
    }
    if (token === "jpg" || token === "jpeg") {
      return ext === "jpg" || ext === "jpeg" || mime === "image/jpeg";
    }
    if (token === "docx") {
      return (
        ext === "docx" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }
    if (token === "xlsx") {
      return (
        ext === "xlsx" ||
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
    if (token === "csv") {
      return ext === "csv" || mime === "text/csv";
    }
    if (token === "zip") {
      return ext === "zip" || mime === "application/zip" || mime === "application/x-zip-compressed";
    }
    return token === ext;
  });
}

function violatesSlotIntent(fileName: string, slotType: string) {
  const name = fileName.toLowerCase();
  const slot = slotType.toLowerCase();

  if (slot.includes("bank statement")) {
    const hasBankSignal = /(bank|statement|stmt)/i.test(name);
    return !hasBankSignal;
  }

  if (slot.includes("invoice")) {
    const hasInvoiceSignal = /(invoice|inv|bill|receipt)/i.test(name);
    return !hasInvoiceSignal;
  }

  return false;
}

function normaliseFileToken(value: string) {
  return value.trim().toLowerCase();
}

const assignedAccountantForApex =
    adminClients.find((client) => client.id === "firm-client-1")?.assignedAccountant ??
    "Daniel Mokoena";

  function resolveAssignedAccountantByClientName(
    clientName: string,
    fallbackAccountant: string,
  ) {
    return (
      adminClients.find((client) => client.clientName === clientName)?.assignedAccountant ??
      fallbackAccountant
    );
  }

  function uploadToSlot(
    submission: UploadSubmission,
    actor: Pick<SessionUser, "name" | "fullName">,
  ): PortalActionResult {
    const uploadedAt = new Date().toISOString();
    const targetSlot = monthPack.slots.find((slot) => slot.id === submission.slotId);

    if (!targetSlot) {
      return { ok: false, message: "The selected upload slot could not be found." };
    }

    if (!isStrictUploadName(submission.autoName)) {
      return {
        ok: false,
        message:
          "Upload blocked: file naming must follow Client_DocumentType_Month_Year.ext before submission.",
      };
    }

    if (!isSlotDocumentTypeMatch(targetSlot.documentType, submission.documentType)) {
      return {
        ok: false,
        message: `Upload blocked: this is the ${targetSlot.documentType} slot, but the selected document type is ${submission.documentType}.`,
      };
    }

    if (isLikelyWrongSlotFile(submission.fileName, targetSlot.documentType)) {
      return {
        ok: false,
        message: `Upload blocked: the file name looks like it belongs to a different slot. Upload ${targetSlot.documentType} here.`,
      };
    }

    if (
      !isAcceptedFileForSlot(
        submission.fileName,
        submission.fileMimeType,
        targetSlot.acceptedFiles,
      )
    ) {
      return {
        ok: false,
        message: `Upload blocked: ${targetSlot.documentType} accepts only ${targetSlot.acceptedFiles.join(", ")} files.`,
      };
    }

    if (violatesSlotIntent(submission.fileName, targetSlot.documentType)) {
      return {
        ok: false,
        message: `Upload blocked: file naming does not match the ${targetSlot.documentType} slot intent. Rename the file with a clear ${targetSlot.documentType.toLowerCase()} reference and try again.`,
      };
    }

    const targetMonthLabel = `${submission.month} ${submission.year}`;
    const submittedAutoName = normaliseFileToken(submission.autoName);
    const submittedOriginalName = normaliseFileToken(submission.fileName);
    const duplicateDocument = documents.some((document) => {
      if (
        document.documentType !== submission.documentType ||
        document.monthLabel !== targetMonthLabel
      ) {
        return false;
      }

      const existingName = normaliseFileToken(document.fileName);
      return existingName === submittedAutoName || existingName === submittedOriginalName;
    });
    const duplicateInvoice = submission.documentType.toLowerCase().includes("invoice")
      ? invoices.some((invoice) => {
          if (invoice.monthLabel !== targetMonthLabel) {
            return false;
          }

          const existingName = normaliseFileToken(invoice.fileName);
          return existingName === submittedAutoName || existingName === submittedOriginalName;
        })
      : false;

    if (duplicateDocument || duplicateInvoice) {
      return {
        ok: false,
        message:
          "Upload blocked: this file was already uploaded for this slot and month. Remove duplicates and upload only new documents.",
      };
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
                // Keep client uploads in draft until the monthly pack is formally submitted.
                status: "draft",
                progress: 70,
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
        // Draft uploads are visible to the client, but not yet queued for accountant review.
        status: "draft",
        uploadedBy: actorName,
        uploadedAt,
        sizeLabel: "New upload",
        keywordTags: [submission.documentType.toLowerCase(), submission.month.toLowerCase()],
        expiryDate: submission.expiryDate || undefined,
        comments: [],
        fileDataUrl: submission.fileDataUrl,
        fileMimeType: submission.fileMimeType,
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
          status: "draft",
          keywordTags: ["invoice", submission.month.toLowerCase()],
          fileDataUrl: submission.fileDataUrl,
          fileMimeType: submission.fileMimeType,
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
        ? `${targetSlot.documentType} re-uploaded successfully and saved as a draft for this month.`
        : `${targetSlot.documentType} uploaded successfully and saved as a draft for this month.`,
    };
  }

  function submitMonth(actorName: string): PortalActionResult {
    const nextPack = recalculatePack(monthPack);
    const blockingStatuses = new Set(["missing", "partial", "pending", "pending_signature", "rejected"]);
    const blockingRequiredSlots = nextPack.slots.filter(
      (slot) => slot.isRequired && blockingStatuses.has(slot.status),
    );

    if (blockingRequiredSlots.length > 0 || !nextPack.canComplete) {
      const slotSummary = blockingRequiredSlots
        .slice(0, 5)
        .map(
          (slot) =>
            `${slot.documentType} (${slot.month} ${slot.year} - ${slot.status.replace(/_/g, " ")})`,
        )
        .join(", ");
      const extraCount =
        blockingRequiredSlots.length > 5 ? ` and ${blockingRequiredSlots.length - 5} more` : "";

      return {
        ok: false,
        message:
          blockingRequiredSlots.length > 0
            ? `Submission blocked: ${blockingRequiredSlots.length} required document slot${blockingRequiredSlots.length === 1 ? " is" : "s are"} incomplete. Resolve: ${slotSummary}${extraCount}.`
            : "Submission blocked: required document checks are incomplete.",
      };
    }

    const submittedAt = new Date().toISOString();
    // Submit the month: draft slot content is now sent to the accountant queue.
    setMonthPack(
      recalculatePack({
        ...nextPack,
        submissionStatus: "under_accountant_review",
        submittedAt,
        slots: nextPack.slots.map((slot) =>
          slot.status === "draft"
            ? {
                ...slot,
                status: "uploaded",
                progress: Math.max(slot.progress, 100),
              }
            : slot,
        ),
      }),
    );
    setDocuments((current) =>
      current.map((document) =>
        document.monthLabel === nextPack.monthLabel && document.status === "draft"
          ? {
              ...document,
              status: "uploaded",
              auditTrail: [
                {
                  id: `audit-${document.auditTrail.length + 6001}`,
                  status: "Submitted",
                  actor: actorName,
                  timestamp: submittedAt,
                  note: `${document.documentType} moved from draft to submitted as part of monthly pack submission.`,
                },
                ...document.auditTrail,
              ],
            }
          : document,
      ),
    );
    setInvoices((current) =>
      current.map((invoice) =>
        invoice.monthLabel === nextPack.monthLabel && invoice.status === "draft"
          ? {
              ...invoice,
              status: "uploaded",
              auditTrail: [
                {
                  id: `invoice-audit-${(invoice.auditTrail?.length ?? 0) + 1}`,
                  status: "Submitted",
                  actor: actorName,
                  timestamp: submittedAt,
                  note: "Invoice moved from draft to submitted as part of monthly pack submission.",
                },
                ...(invoice.auditTrail ?? []),
              ],
            }
          : invoice,
      ),
    );
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

  function parseCurrencyAmount(amountLabel: string) {
    const numericValue = Number.parseFloat(amountLabel.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numericValue) ? numericValue : Number.NaN;
  }

  function isStrictInvoiceFileName(fileName: string) {
    return /^[A-Za-z0-9][A-Za-z0-9-]*_[A-Za-z0-9][A-Za-z0-9-]*_[A-Za-z]{3,9}_\d{4}\.(pdf|png|jpg|jpeg|docx|xlsx)$/i.test(
      fileName.trim(),
    );
  }

  function isInvoiceAlreadySubmitted(status: InvoiceRecord["status"]) {
    return (
      status === "sent_to_accountant" ||
      status === "under_review" ||
      status === "accepted"
    );
  }

  function finaliseInvoice(invoiceId: string): PortalActionResult {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      return { ok: false, message: "The invoice could not be found." };
    }

    if (isInvoiceAlreadySubmitted(invoice.status)) {
      return {
        ok: false,
        message:
          "This invoice is already submitted and cannot be sent again. Open the existing submitted record instead.",
      };
    }

    if (!["draft", "uploaded", "finalised", "rejected"].includes(invoice.status)) {
      return {
        ok: false,
        message: "This invoice is not in a sendable state yet. Complete the draft checks first.",
      };
    }

    const amount = parseCurrencyAmount(invoice.amountLabel);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: "Invoice send blocked: add a valid amount greater than zero before finalising.",
      };
    }

    if (!/^INV-\d{3,}$/i.test(invoice.invoiceNumber.trim())) {
      return {
        ok: false,
        message: "Invoice send blocked: invoice number must follow INV-XXXX format.",
      };
    }

    if (!isStrictInvoiceFileName(invoice.fileName)) {
      return {
        ok: false,
        message:
          "Invoice send blocked: rename file to Client_DocumentType_Month_Year.ext before finalising.",
      };
    }

    if (!invoice.description.trim() || invoice.description.trim().length < 12) {
      return {
        ok: false,
        message: "Invoice send blocked: add a clear invoice description before finalising.",
      };
    }

    if (!/^[A-Za-z]+\s+\d{4}$/.test(invoice.monthLabel.trim())) {
      return {
        ok: false,
        message: "Invoice send blocked: invoice period is invalid. Use format like April 2026.",
      };
    }

    const submittedAt = new Date().toISOString();

    setInvoices((current) =>
      current.map((item) =>
        item.id === invoiceId
          ? {
              ...item,
              status: "sent_to_accountant",
              rejectionReason: undefined,
              reviewedBy: undefined,
              reviewedAt: undefined,
              auditTrail: [
                ...(item.auditTrail ?? []),
                {
                  id: `invoice-audit-${(item.auditTrail?.length ?? 0) + 1}`,
                  status: "Submitted",
                  actor: clientProfile.primaryContact,
                  timestamp: submittedAt,
                  note:
                    "Invoice passed final checks and was submitted to the accountant review queue.",
                },
              ],
            }
          : item,
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
      message:
        "Invoice passed validation, was finalised, and is now submitted to your accountant.",
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
        isStarred: false,
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
    const createdRequestId = `request-${requests.length + 10}`;

    setRequests((current) => [
      {
        id: createdRequestId,
        clientId: payload.clientId,
        clientName: payload.clientName,
        title: payload.title,
        description: payload.description,
        monthLabel: payload.monthLabel,
        status: "awaiting_client",
        isStarred: false,
        priority: payload.priority ?? "high",
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

    return {
      ok: true,
      message: "Follow-up request added to the client workflow.",
      createdRequestId,
    };
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
        isStarred: false,
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

  function toggleRequestStar(requestId: string): PortalActionResult {
    const targetRequest = requests.find((request) => request.id === requestId);
    if (!targetRequest) {
      return { ok: false, message: "The selected request could not be found." };
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              isStarred: !request.isStarred,
            }
          : request,
      ),
    );

    return {
      ok: true,
      message: targetRequest.isStarred ? "Request unstarred." : "Request starred.",
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

  function updateRequestControls(
    requestId: string,
    updates: Pick<WorkflowRequest, "assignedTo" | "dueDate" | "priority">,
    actorName: string,
    options?: { addAuditNote?: boolean; auditNote?: string },
  ): PortalActionResult {
    const targetRequest = requests.find((request) => request.id === requestId);
    if (!targetRequest) {
      return { ok: false, message: "The selected request could not be found." };
    }

    const nextAssignedTo = updates.assignedTo.trim();
    if (!nextAssignedTo) {
      return { ok: false, message: "Assigned to is required." };
    }

    const updatedAt = new Date().toISOString();
    setRequests((current) =>
      current.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        const shouldAddAudit = options?.addAuditNote === true;
        const generatedAuditNote =
          options?.auditNote?.trim() ||
          `Controls updated by ${actorName}: assigned to ${nextAssignedTo}, due ${formatDateLabel(
            updates.dueDate,
          )}, priority ${updates.priority}.`;

        return {
          ...request,
          assignedTo: nextAssignedTo,
          dueDate: updates.dueDate,
          priority: updates.priority,
          auditTrail: shouldAddAudit
            ? [
                {
                  id: `${requestId}-audit-${request.auditTrail.length + 1}`,
                  status: "Assignment controls updated",
                  actor: actorName,
                  timestamp: updatedAt,
                  note: generatedAuditNote,
                },
                ...request.auditTrail,
              ]
            : request.auditTrail,
        };
      }),
    );

    return { ok: true, message: "Request assignment updated." };
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
    accountantUserId?: string,
    handover?: {
      reason: string;
      message: string;
      effectiveDate: string;
      assignedBy: string;
    },
  ): PortalActionResult {
    const isUnassign = accountantUserId === undefined && accountantName.trim() === "";
    const resolvedAccountant =
      isUnassign
        ? undefined
        : (accountantUserId ? findAccountantById(accountantUserId) : undefined) ??
          findAccountantByName(accountantName);
    const nextAssignedName = isUnassign
      ? "Unassigned"
      : (resolvedAccountant?.name ?? accountantName);
    const nextAssignedUserId = isUnassign ? undefined : (resolvedAccountant?.id ?? accountantUserId);

    const assignedAt = new Date().toISOString();
    setAdminClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              assignedAccountant: nextAssignedName,
              assignedAccountantUserId: nextAssignedUserId,
              lastAssignmentReason: handover?.reason,
              lastAssignmentMessage: handover?.message,
              lastAssignmentEffectiveDate: handover?.effectiveDate,
              lastAssignmentBy: handover?.assignedBy,
              lastAssignmentAt: assignedAt,
            }
          : client,
      ),
    );

    setComplianceClients((current) =>
      current.map((client) =>
        client.clientId === clientId
          ? { ...client, assignedAccountant: nextAssignedName }
          : client,
      ),
    );

    if (handover?.reason && handover.message && nextAssignedName) {
      setNotifications((current) => [
        {
          id: `assignment-note-${Date.now()}`,
          kind: "deadline_reminder",
          title: `New client assignment: ${clientId}`,
          message: `${nextAssignedName} assigned to client ${clientId}. Reason: ${handover.reason}.`,
          createdAt: assignedAt,
          dueDate: handover.effectiveDate,
          tone: "info",
          actionLabel: "Open client workspace",
          actionHref: `/firm/clients/${clientId}`,
          linkedRecordLabel: clientId,
          linkedWorkspace: "requests",
          impactLabel: "Ownership updated",
          blockingLabel: "Assignment handover",
          nextStep: handover.message,
          state: "unread",
          activity: [
            {
              id: `assignment-note-activity-${Date.now()}`,
              title: "Assignment handover",
              detail: `${handover.assignedBy} assigned ${nextAssignedName}. ${handover.message}`,
              timestamp: assignedAt,
              tone: "info",
              actor: handover.assignedBy,
            },
          ],
        },
        ...current,
      ]);

      setActivity((current) =>
        appendActivity(
          current,
          "Client reassigned",
          `${handover.assignedBy} assigned ${nextAssignedName} to ${clientId}. Reason: ${handover.reason}.`,
          "info",
          handover.assignedBy,
          clientId,
        ),
      );
    }

    void portalServiceApi.updateClientAssignment(clientId, nextAssignedName, nextAssignedUserId);

    return { ok: true, message: "Accountant assignment updated." };
  }

  function assignClientAccountantBackup(
    clientId: string,
    backupAccountantName: string,
    backupAccountantUserId?: string,
  ): PortalActionResult {
    const resolvedBackup =
      (backupAccountantUserId ? findAccountantById(backupAccountantUserId) : undefined) ??
      findAccountantByName(backupAccountantName);
    const nextBackupName = resolvedBackup?.name ?? backupAccountantName;
    const nextBackupUserId = resolvedBackup?.id ?? backupAccountantUserId;

    setAdminClients((current) =>
      current.map((client) =>
        client.id === clientId
          ? {
              ...client,
              backupAccountant: nextBackupName,
              backupAccountantUserId: nextBackupUserId,
            }
          : client,
      ),
    );

    return { ok: true, message: "Backup accountant assignment updated." };
  }

  async function createUserAccount(payload: {
    name: string;
    email: string;
    role: Role;
    company?: string;
  }): Promise<PortalActionResult> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!payload.name.trim() || !normalizedEmail.includes("@")) {
      return { ok: false, message: "Provide a valid name and email for the new user." };
    }

    if (userAccounts.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, message: "A user with that email already exists." };
    }

    const apiResult = await portalServiceApi.createUserAccount({
      fullName: payload.name.trim(),
      email: normalizedEmail,
      role: payload.role,
      company: payload.company,
    });
    if (!apiResult.ok || !apiResult.user) {
      return {
        ok: false,
        message:
          apiResult.message ??
          "Could not create the user account. Check the backend response and email configuration.",
      };
    }

    const nextUser: UserAccountRecord = apiResult.user;
    setUserAccounts((current) => mergeUserAccounts([nextUser, ...current], [nextUser]));

    if (payload.role === "accountant") {
      setManagedAccountants((current) => [
        {
          id: nextUser.id,
          name: nextUser.name,
          email: nextUser.email,
          title: "Accountant",
          assignedClientCount: 0,
          openReviews: 0,
          status: "capacity_available",
        },
        ...current,
      ]);
    }

    const refreshedUsers = await portalServiceApi.getAdminUsers();
    if (refreshedUsers.length > 0) {
      setUserAccounts((current) => mergeUserAccounts(current, clone(refreshedUsers)));
    }

    return {
      ok: true,
      message:
        apiResult.delivery === "smtp"
          ? "User account created. Setup instructions were emailed to the new user."
          : apiResult.delivery === "failed"
            ? `User account created, but the invite email could not be sent. ${apiResult.deliveryError ?? "Use the invite link from the backend response or check SMTP settings."}`
          : "User account created, but email delivery is not active. Use the generated invite link from the backend response.",
    };
  }

  function disableUserAccount(userId: string): PortalActionResult {
    const exists = userAccounts.some((user) => user.id === userId);
    if (!exists) {
      return { ok: false, message: "User account not found." };
    }

    setUserAccounts((current) =>
      current.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        return { ...user, status: "suspended" };
      }),
    );
    void portalServiceApi.setUserStatus(userId, "suspended");

    return { ok: true, message: "User access has been disabled." };
  }

  function activateUserAccount(userId: string): PortalActionResult {
    const exists = userAccounts.some((user) => user.id === userId);
    if (!exists) {
      return { ok: false, message: "User account not found." };
    }

    setUserAccounts((current) =>
      current.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        return { ...user, status: "active" };
      }),
    );
    void portalServiceApi.setUserStatus(userId, "active");

    return { ok: true, message: "User access has been activated." };
  }

  async function resetUserAccess(userId: string): Promise<PortalActionResult> {
    const target = userAccounts.find((user) => user.id === userId);
    if (!target) {
      return { ok: false, message: "User account not found." };
    }

    setActivity((current) =>
      appendActivity(
        current,
        "Access reset issued",
        `Admin requested access reset for ${target.name}.`,
        "info",
        "Admin",
        target.email,
      ),
    );
    const apiResult = await portalServiceApi.resetUserAccess(userId, "admin_reset");
    if (!apiResult.ok) {
      return {
        ok: false,
        message:
          apiResult.message ??
          "Could not resend access instructions. Check the backend response or email configuration.",
      };
    }

    if (apiResult.delivery === "smtp") {
      return {
        ok: true,
        message:
          target.status === "invited"
            ? "Invite email sent successfully."
            : "Reset email sent successfully.",
      };
    }

    if (apiResult.delivery === "failed") {
      return {
        ok: false,
        message: `The email could not be sent. ${apiResult.deliveryError ?? "Check SMTP settings or backend logs."}`,
      };
    }

    return {
      ok: true,
      message:
        "Email delivery is not active. Use the generated setup link from the backend response or enable SMTP.",
    };
  }

  function assignUserRole(userId: string, role: Role): PortalActionResult {
    const target = userAccounts.find((user) => user.id === userId);
    if (!target) {
      return { ok: false, message: "User account not found." };
    }

    setUserAccounts((current) =>
      current.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
    void portalServiceApi.setUserRole(userId, role);

    if (role === "accountant") {
      setManagedAccountants((current) => {
        if (current.some((accountant) => accountant.id === userId)) {
          return current;
        }
        return [
          ...current,
          {
            id: userId,
            name: target.name,
            email: target.email,
            title: "Accountant",
            assignedClientCount: 0,
            openReviews: 0,
            status: "capacity_available",
          },
        ];
      });
    } else {
      setManagedAccountants((current) =>
        current.filter((accountant) => accountant.id !== userId),
      );
      setAdminClients((current) =>
        current.map((client) => {
          const clearsPrimary = client.assignedAccountantUserId === userId;
          const clearsBackup = client.backupAccountantUserId === userId;
          if (!clearsPrimary && !clearsBackup) {
            return client;
          }

          return {
            ...client,
            assignedAccountant: clearsPrimary ? "Unassigned" : client.assignedAccountant,
            assignedAccountantUserId: clearsPrimary ? undefined : client.assignedAccountantUserId,
            backupAccountant: clearsBackup ? undefined : client.backupAccountant,
            backupAccountantUserId: clearsBackup ? undefined : client.backupAccountantUserId,
          };
        }),
      );
    }

    return { ok: true, message: "User role updated." };
  }

  function addClientBusiness(payload: {
    clientName: string;
    industry: string;
    requiredPack: string;
    deadlinePolicy: string;
    assignedAccountantUserId?: string;
    backupAccountantUserId?: string;
  }): PortalActionResult {
    if (!payload.clientName.trim() || !payload.industry.trim()) {
      return { ok: false, message: "Client name and industry are required." };
    }

    const primary = payload.assignedAccountantUserId
      ? findAccountantById(payload.assignedAccountantUserId)
      : undefined;
    const backup = payload.backupAccountantUserId
      ? findAccountantById(payload.backupAccountantUserId)
      : undefined;
    const nextClient: FirmClientAccount = {
      id: `firm-client-local-${Date.now()}`,
      clientName: payload.clientName.trim(),
      industry: payload.industry.trim(),
      assignedAccountant: primary?.name ?? "Unassigned",
      assignedAccountantUserId: primary?.id,
      backupAccountant: backup?.name,
      backupAccountantUserId: backup?.id,
      requiredPack: payload.requiredPack.trim() || "Standard monthly pack",
      completionRate: 0,
      deadlinePolicy: payload.deadlinePolicy.trim() || "6th working day",
      status: "attention",
      isActive: true,
    };

    setAdminClients((current) => [nextClient, ...current]);
    void portalServiceApi.createClientBusiness({
      id: nextClient.id,
      name: nextClient.clientName,
      entityType: nextClient.industry,
      status: "active",
      complianceHealth: nextClient.completionRate,
      assignedAccountantId: nextClient.assignedAccountantUserId ?? "",
      primaryContact: "Primary contact",
      email: "client@example.com",
    });
    return { ok: true, message: "Client business added." };
  }

  function updateClientBusiness(
    clientId: string,
    updates: Partial<Pick<FirmClientAccount, "clientName" | "industry" | "requiredPack" | "deadlinePolicy">>,
  ): PortalActionResult {
    let found = false;
    setAdminClients((current) =>
      current.map((client) => {
        if (client.id !== clientId) return client;
        found = true;
        return { ...client, ...updates };
      }),
    );
    const client = adminClients.find((item) => item.id === clientId);
    if (client) {
      void portalServiceApi.updateClientBusiness(clientId, {
        id: clientId,
        name: updates.clientName ?? client.clientName,
        entityType: updates.industry ?? client.industry,
        status: client.status === "overdue" ? "at_risk" : "active",
        complianceHealth: client.completionRate,
        assignedAccountantId: client.assignedAccountantUserId ?? "",
        primaryContact: "Primary contact",
        email: "client@example.com",
      });
    }

    return found
      ? { ok: true, message: "Client details updated." }
      : { ok: false, message: "Client not found." };
  }

  function setClientActiveState(clientId: string, isActive: boolean): PortalActionResult {
    let found = false;
    setAdminClients((current) =>
      current.map((client) => {
        if (client.id !== clientId) return client;
        found = true;
        return { ...client, isActive, status: isActive ? client.status : "overdue" };
      }),
    );
    const client = adminClients.find((item) => item.id === clientId);
    if (client) {
      void portalServiceApi.updateClientBusiness(clientId, {
        id: clientId,
        name: client.clientName,
        entityType: client.industry,
        status: isActive ? "active" : "archived",
        complianceHealth: client.completionRate,
        assignedAccountantId: client.assignedAccountantUserId ?? "",
        primaryContact: "Primary contact",
        email: "client@example.com",
      });
    }
    return found
      ? { ok: true, message: `Client ${isActive ? "activated" : "deactivated"}.` }
      : { ok: false, message: "Client not found." };
  }

  function updateDocumentRequirements(rules: DocumentRequirementRule[]): PortalActionResult {
    setDocumentRequirementRules(clone(rules));
    void portalServiceApi.putAdminSetting("document-requirements", rules);
    return { ok: true, message: "Document requirements updated." };
  }

  function updateMonthlyPackRules(rules: MonthlyPackRules): PortalActionResult {
    setMonthlyPackRules(clone(rules));
    void portalServiceApi.putAdminSetting("monthly-pack-rules", rules);
    return { ok: true, message: "Monthly pack rules updated." };
  }

  function updateComplianceTemplates(templates: ComplianceTemplate[]): PortalActionResult {
    setComplianceTemplates(clone(templates));
    void portalServiceApi.putAdminSetting("compliance-templates", templates);
    return { ok: true, message: "Compliance templates updated." };
  }

  function updateRolePermissionMatrix(matrix: RolePermissionMatrix[]): PortalActionResult {
    setRolePermissionMatrix(clone(matrix));
    void portalServiceApi.putAdminSetting("role-permission-matrix", matrix);
    return { ok: true, message: "Role permissions updated." };
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
    const seededFirmQueue = baseAccountantDashboard.reviewQueue
      .filter((item) => !dynamicIds.has(item.id))
      .map((item) => ({
        ...item,
        assignedAccountant: resolveAssignedAccountantByClientName(
          item.clientName,
          item.assignedAccountant,
        ),
      }));

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
    const otherPortfolioRows = baseAccountantDashboard.portfolio
      .filter((row) => row.clientName !== "Apex Trading Ltd")
      .map((row) => ({
        ...row,
        assignedAccountant: resolveAssignedAccountantByClientName(
          row.clientName,
          row.assignedAccountant,
        ),
      }));
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

  const adminDashboard = useMemo<AdminDashboardData>(() => {
    const activeClients = adminClients.filter((client) => client.isActive ?? true);
    const assignedAccountants = managedAccountants.filter(
      (accountant) => accountant.assignedClientCount > 0,
    );
    const atRiskClients = adminClients.filter(
      (client) => client.status !== "on_track" || client.completionRate < 80,
    );
    const trackedExpiries =
      accountantComplianceCentre.expiredCount + accountantComplianceCentre.expiringCount;
    const reviewQueueCount = accountantDashboard.reviewQueue.length;
    const unassignedClients = adminClients.filter(
      (client) => !client.assignedAccountantUserId,
    ).length;

    return {
      summaryMetrics: [
        {
          id: "admin-metric-active-clients",
          label: "Active clients",
          value: String(activeClients.length),
          helper: "Clients with live access and structured monthly workflows.",
          tone: "info",
        },
        {
          id: "admin-metric-assigned-accountants",
          label: "Assigned accountants",
          value: String(assignedAccountants.length),
          helper: `${managedAccountants.length - assignedAccountants.length} workers still have spare capacity.`,
          tone: assignedAccountants.length > 0 ? "success" : "warning",
        },
        {
          id: "admin-metric-at-risk",
          label: "At-risk clients",
          value: String(atRiskClients.length),
          helper: `${reviewQueueCount} review items and ${unassignedClients} unassigned clients need governance attention.`,
          tone: atRiskClients.length > 0 || unassignedClients > 0 ? "danger" : "success",
        },
        {
          id: "admin-metric-expiries",
          label: "Tracked expiries",
          value: String(trackedExpiries),
          helper: `${accountantComplianceCentre.expiredCount} expired and ${accountantComplianceCentre.expiringCount} expiring soon.`,
          tone: trackedExpiries > 0 ? "warning" : "success",
        },
      ],
      clients: adminClients,
      policies: adminPolicies,
      notifications,
    };
  }, [
    accountantComplianceCentre.expiredCount,
    accountantComplianceCentre.expiringCount,
    accountantDashboard.reviewQueue.length,
    adminClients,
    adminPolicies,
    managedAccountants,
    notifications,
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
      adminDashboard,
      adminPolicies,
      managedAccountants,
      userAccounts,
      documentRequirementRules,
      monthlyPackRules,
      complianceTemplates,
      rolePermissionMatrix,
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
      toggleRequestStar,
      resolveRequest,
      updateRequestControls,
      createUserAccount,
      disableUserAccount,
      activateUserAccount,
      resetUserAccess,
      assignUserRole,
      addClientBusiness,
      updateClientBusiness,
      setClientActiveState,
      updateBusinessProfile,
      updateClientNotificationPreferences,
      updateClientDocumentPreferences,
      updateClientSecuritySettings,
      downloadComplianceReport,
      scheduleComplianceReport,
      assignClientAccountant,
      assignClientAccountantBackup,
      updateDocumentRequirements,
      updateMonthlyPackRules,
      updateComplianceTemplates,
      updateRolePermissionMatrix,
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
      adminDashboard,
      adminClients,
      adminPolicies,
      clientComplianceCentre,
      clientSettings,
      clientProfile,
      clientSeed,
      complianceTemplates,
      complianceClients,
      documentRequirementRules,
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
      monthlyPackRules,
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
      createUserAccount,
      disableUserAccount,
      activateUserAccount,
      resetUserAccess,
      assignUserRole,
      addClientBusiness,
      updateClientBusiness,
      setClientActiveState,
      updateDocumentRequirements,
      updateMonthlyPackRules,
      updateComplianceTemplates,
      updateRolePermissionMatrix,
      uploadComplianceVersion,
      resolveRequest,
      updateRequestControls,
      rolePermissionMatrix,
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

