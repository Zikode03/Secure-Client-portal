import type {
  ComplianceAuditEvent,
  ComplianceCentreData,
  ComplianceClientStatus,
  ComplianceDocumentRecord,
  ComplianceDocumentStatus,
  ComplianceReminder,
  SummaryMetric,
} from "../types/portal";

function reminder(
  id: string,
  label: ComplianceReminder["label"],
  reminderDate: string,
  state: ComplianceReminder["state"],
): ComplianceReminder {
  return { id, label, reminderDate, state };
}

function versions(fileName: string, uploadedBy: string, uploadedAt: string) {
  return [
    {
      id: `${fileName}-v1`,
      fileName,
      uploadedBy,
      uploadedAt,
      status: "accepted" as const,
    },
  ];
}

function statusMetric(
  id: string,
  label: string,
  value: string,
  helper: string,
  tone: SummaryMetric["tone"],
): SummaryMetric {
  return { id, label, value, helper, tone };
}

const clientComplianceDocuments: ComplianceDocumentRecord[] = [
  {
    id: "comp-1",
    name: "Tax Compliance Status / Tax PIN",
    category: "sars_related",
    issueDate: "2026-01-14T00:00:00.000Z",
    expiryDate: "2026-05-14T00:00:00.000Z",
    status: "expiring_soon",
    owner: "client",
    reminderDates: [
      reminder("r-1", "30 days", "2026-04-14T00:00:00.000Z", "sent"),
      reminder("r-2", "14 days", "2026-04-30T00:00:00.000Z", "sent"),
      reminder("r-3", "7 days", "2026-05-07T00:00:00.000Z", "scheduled"),
      reminder("r-4", "expired", "2026-05-14T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_TaxPIN_2026.pdf",
      "Sarah Jacobs",
      "2026-01-14T09:00:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-2",
    name: "VAT Registration",
    category: "sars_related",
    issueDate: "2025-11-05T00:00:00.000Z",
    expiryDate: "2026-12-31T00:00:00.000Z",
    status: "valid",
    owner: "accountant",
    reminderDates: [
      reminder("r-5", "30 days", "2026-12-01T00:00:00.000Z", "scheduled"),
      reminder("r-6", "14 days", "2026-12-17T00:00:00.000Z", "scheduled"),
      reminder("r-7", "7 days", "2026-12-24T00:00:00.000Z", "scheduled"),
      reminder("r-8", "expired", "2026-12-31T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_VATRegistration_2025.pdf",
      "Daniel Mokoena",
      "2025-11-05T11:10:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-3",
    name: "PAYE / UIF / SDL Documents",
    category: "sars_related",
    issueDate: "2026-02-01T00:00:00.000Z",
    expiryDate: "2026-08-31T00:00:00.000Z",
    status: "valid",
    owner: "accountant",
    reminderDates: [
      reminder("r-9", "30 days", "2026-08-01T00:00:00.000Z", "scheduled"),
      reminder("r-10", "14 days", "2026-08-17T00:00:00.000Z", "scheduled"),
      reminder("r-11", "7 days", "2026-08-24T00:00:00.000Z", "scheduled"),
      reminder("r-12", "expired", "2026-08-31T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_PAYE_UIF_SDL_2026.pdf",
      "Daniel Mokoena",
      "2026-02-01T13:20:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-4",
    name: "B-BBEE Certificate",
    category: "company_statutory",
    issueDate: "2025-05-01T00:00:00.000Z",
    expiryDate: "2026-04-30T00:00:00.000Z",
    status: "expired",
    owner: "client",
    reminderDates: [
      reminder("r-13", "30 days", "2026-03-31T00:00:00.000Z", "sent"),
      reminder("r-14", "14 days", "2026-04-16T00:00:00.000Z", "sent"),
      reminder("r-15", "7 days", "2026-04-23T00:00:00.000Z", "sent"),
      reminder("r-16", "expired", "2026-04-30T00:00:00.000Z", "triggered"),
    ],
    isLocked: true,
    versionHistory: [
      {
        id: "bbbee-v1",
        fileName: "ApexTrading_BBBEE_2025.pdf",
        uploadedBy: "Sarah Jacobs",
        uploadedAt: "2025-05-01T10:00:00.000Z",
        status: "accepted",
      },
    ],
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-5",
    name: "Proof of Address",
    category: "company_statutory",
    issueDate: "2026-02-20T00:00:00.000Z",
    expiryDate: "2026-05-20T00:00:00.000Z",
    status: "expiring_soon",
    owner: "client",
    reminderDates: [
      reminder("r-17", "30 days", "2026-04-20T00:00:00.000Z", "sent"),
      reminder("r-18", "14 days", "2026-05-06T00:00:00.000Z", "scheduled"),
      reminder("r-19", "7 days", "2026-05-13T00:00:00.000Z", "scheduled"),
      reminder("r-20", "expired", "2026-05-20T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_ProofOfAddress_2026.pdf",
      "Sarah Jacobs",
      "2026-02-20T08:45:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-6",
    name: "Company Registration Documents",
    category: "company_statutory",
    issueDate: "2024-10-01T00:00:00.000Z",
    expiryDate: "2027-10-01T00:00:00.000Z",
    status: "valid",
    owner: "accountant",
    reminderDates: [
      reminder("r-21", "30 days", "2027-09-01T00:00:00.000Z", "scheduled"),
      reminder("r-22", "14 days", "2027-09-17T00:00:00.000Z", "scheduled"),
      reminder("r-23", "7 days", "2027-09-24T00:00:00.000Z", "scheduled"),
      reminder("r-24", "expired", "2027-10-01T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_CIPC_RegistrationPack_2024.pdf",
      "Daniel Mokoena",
      "2024-10-01T12:10:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-7",
    name: "Director ID Copies",
    category: "company_statutory",
    issueDate: "2026-03-01T00:00:00.000Z",
    expiryDate: "2026-06-01T00:00:00.000Z",
    status: "expiring_soon",
    owner: "client",
    reminderDates: [
      reminder("r-25", "30 days", "2026-05-02T00:00:00.000Z", "sent"),
      reminder("r-26", "14 days", "2026-05-18T00:00:00.000Z", "scheduled"),
      reminder("r-27", "7 days", "2026-05-25T00:00:00.000Z", "scheduled"),
      reminder("r-28", "expired", "2026-06-01T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_DirectorIDs_2026.pdf",
      "Sarah Jacobs",
      "2026-03-01T14:30:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-8",
    name: "CSD Supplier Registration",
    category: "company_statutory",
    issueDate: "2026-01-11T00:00:00.000Z",
    expiryDate: "2026-05-11T00:00:00.000Z",
    status: "expiring_soon",
    owner: "accountant",
    reminderDates: [
      reminder("r-29", "30 days", "2026-04-11T00:00:00.000Z", "sent"),
      reminder("r-30", "14 days", "2026-04-27T00:00:00.000Z", "sent"),
      reminder("r-31", "7 days", "2026-05-04T00:00:00.000Z", "triggered"),
      reminder("r-32", "expired", "2026-05-11T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_CSD_Registration_2026.pdf",
      "Daniel Mokoena",
      "2026-01-11T10:00:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-9",
    name: "COIDA Letter of Good Standing",
    category: "company_statutory",
    issueDate: "2026-02-06T00:00:00.000Z",
    expiryDate: "2026-05-06T00:00:00.000Z",
    status: "expiring_soon",
    owner: "client",
    reminderDates: [
      reminder("r-33", "30 days", "2026-04-06T00:00:00.000Z", "sent"),
      reminder("r-34", "14 days", "2026-04-22T00:00:00.000Z", "sent"),
      reminder("r-35", "7 days", "2026-04-29T00:00:00.000Z", "sent"),
      reminder("r-36", "expired", "2026-05-06T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_COIDA_GoodStanding_2026.pdf",
      "Sarah Jacobs",
      "2026-02-06T09:20:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-10",
    name: "Lease Agreements",
    category: "company_statutory",
    issueDate: "2025-12-01T00:00:00.000Z",
    expiryDate: "2026-12-01T00:00:00.000Z",
    status: "valid",
    owner: "client",
    reminderDates: [
      reminder("r-37", "30 days", "2026-11-01T00:00:00.000Z", "scheduled"),
      reminder("r-38", "14 days", "2026-11-17T00:00:00.000Z", "scheduled"),
      reminder("r-39", "7 days", "2026-11-24T00:00:00.000Z", "scheduled"),
      reminder("r-40", "expired", "2026-12-01T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_Lease_2025.pdf",
      "Sarah Jacobs",
      "2025-12-01T15:00:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-11",
    name: "Service Contracts",
    category: "company_statutory",
    issueDate: "2026-01-18T00:00:00.000Z",
    expiryDate: "2026-09-01T00:00:00.000Z",
    status: "valid",
    owner: "accountant",
    reminderDates: [
      reminder("r-41", "30 days", "2026-08-02T00:00:00.000Z", "scheduled"),
      reminder("r-42", "14 days", "2026-08-18T00:00:00.000Z", "scheduled"),
      reminder("r-43", "7 days", "2026-08-25T00:00:00.000Z", "scheduled"),
      reminder("r-44", "expired", "2026-09-01T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_ServiceContracts_2026.pdf",
      "Daniel Mokoena",
      "2026-01-18T09:55:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-12",
    name: "Insurance Documents",
    category: "company_statutory",
    issueDate: "2026-02-01T00:00:00.000Z",
    expiryDate: "2026-10-01T00:00:00.000Z",
    status: "valid",
    owner: "client",
    reminderDates: [
      reminder("r-45", "30 days", "2026-09-01T00:00:00.000Z", "scheduled"),
      reminder("r-46", "14 days", "2026-09-17T00:00:00.000Z", "scheduled"),
      reminder("r-47", "7 days", "2026-09-24T00:00:00.000Z", "scheduled"),
      reminder("r-48", "expired", "2026-10-01T00:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_Insurance_2026.pdf",
      "Sarah Jacobs",
      "2026-02-01T12:00:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-13",
    name: "Bank Statement Pack",
    category: "monthly_accounting",
    issueDate: "2026-05-01T00:00:00.000Z",
    expiryDate: "2026-05-06T17:00:00.000Z",
    status: "expired",
    owner: "client",
    reminderDates: [
      reminder("r-49", "30 days", "2026-04-06T00:00:00.000Z", "sent"),
      reminder("r-50", "14 days", "2026-04-22T00:00:00.000Z", "sent"),
      reminder("r-51", "7 days", "2026-04-29T00:00:00.000Z", "sent"),
      reminder("r-52", "expired", "2026-05-06T17:00:00.000Z", "triggered"),
    ],
    isLocked: false,
    versionHistory: [],
    storageLabel: "Encrypted vault / waiting for first accepted version",
  },
  {
    id: "comp-14",
    name: "Sales Invoice Pack",
    category: "monthly_accounting",
    issueDate: "2026-05-01T00:00:00.000Z",
    expiryDate: "2026-05-06T17:00:00.000Z",
    status: "valid",
    owner: "client",
    reminderDates: [
      reminder("r-53", "30 days", "2026-04-06T00:00:00.000Z", "sent"),
      reminder("r-54", "14 days", "2026-04-22T00:00:00.000Z", "sent"),
      reminder("r-55", "7 days", "2026-04-29T00:00:00.000Z", "sent"),
      reminder("r-56", "expired", "2026-05-06T17:00:00.000Z", "scheduled"),
    ],
    isLocked: true,
    versionHistory: versions(
      "ApexTrading_SalesInvoices_April_2026.pdf",
      "Sarah Jacobs",
      "2026-05-01T08:40:00.000Z",
    ),
    storageLabel: "Encrypted vault / accepted file locked",
  },
  {
    id: "comp-15",
    name: "Expense Invoice Pack",
    category: "monthly_accounting",
    issueDate: "2026-04-29T00:00:00.000Z",
    expiryDate: "2026-05-06T17:00:00.000Z",
    status: "expiring_soon",
    owner: "client",
    reminderDates: [
      reminder("r-57", "30 days", "2026-04-06T00:00:00.000Z", "sent"),
      reminder("r-58", "14 days", "2026-04-22T00:00:00.000Z", "sent"),
      reminder("r-59", "7 days", "2026-04-29T00:00:00.000Z", "sent"),
      reminder("r-60", "expired", "2026-05-06T17:00:00.000Z", "scheduled"),
    ],
    isLocked: false,
    versionHistory: [
      {
        id: "expense-v1",
        fileName: "ApexTrading_ExpenseInvoices_April_2026.pdf",
        uploadedBy: "Sarah Jacobs",
        uploadedAt: "2026-04-29T15:25:00.000Z",
        status: "rejected",
      },
    ],
    storageLabel: "Encrypted vault / new version required",
  },
];

const clientComplianceAudit: ComplianceAuditEvent[] = [
  {
    id: "audit-1",
    action: "uploaded",
    actor: "Sarah Jacobs",
    timestamp: "2026-05-01T08:40:00.000Z",
    detail: "Uploaded April sales invoice pack into the secure vault.",
  },
  {
    id: "audit-2",
    action: "reviewed",
    actor: "Daniel Mokoena",
    timestamp: "2026-05-02T11:15:00.000Z",
    detail: "Reviewed April sales invoice pack and kept it under review.",
  },
  {
    id: "audit-3",
    action: "approved",
    actor: "Daniel Mokoena",
    timestamp: "2026-04-16T09:45:00.000Z",
    detail: "Accepted Tax Compliance Status / Tax PIN and locked the accepted version.",
  },
  {
    id: "audit-4",
    action: "downloaded",
    actor: "Sarah Jacobs",
    timestamp: "2026-05-03T14:10:00.000Z",
    detail: "Downloaded the latest compliance report.",
  },
  {
    id: "audit-5",
    action: "new_version",
    actor: "Sarah Jacobs",
    timestamp: "2026-05-04T07:50:00.000Z",
    detail: "Prepared a replacement version for the rejected expense invoice pack.",
  },
];

const secureRules = [
  "Expired documents are never deleted automatically; they stay visible as Expired.",
  "Accepted documents are locked and can only be replaced as a new version.",
  "Version history is preserved for every re-upload and review cycle.",
  "Every upload, review, approval, rejection, and download stays in the audit trail.",
  "Files are stored in an encrypted vault with role-based access control.",
  "MFA can be introduced later, but the workflow is already designed to support it.",
];

const missingRequiredDocuments = [
  {
    id: "missing-bank",
    documentType: "Bank Statement",
    monthLabel: "April 2026",
    description: "Required monthly statement is still missing and blocks compliance completion.",
    isRequired: true,
    status: "missing" as const,
  },
  {
    id: "missing-asset",
    documentType: "Asset Register Update",
    monthLabel: "April 2026",
    description: "Required asset register update is still missing for the month close.",
    isRequired: true,
    status: "missing" as const,
  },
];

function splitDocumentsByStatus(status: ComplianceDocumentStatus) {
  return clientComplianceDocuments.filter((document) => document.status === status);
}

function buildCategoryGroups() {
  return [
    {
      id: "sars_related" as const,
      title: "SARS-related documents",
      description: "Track SARS-facing compliance records before thinking about direct SARS integration.",
      documents: clientComplianceDocuments.filter((document) => document.category === "sars_related"),
    },
    {
      id: "company_statutory" as const,
      title: "Company statutory documents",
      description: "Keep statutory certificates, IDs, contracts, and registration records under controlled expiry tracking.",
      documents: clientComplianceDocuments.filter((document) => document.category === "company_statutory"),
    },
    {
      id: "monthly_accounting" as const,
      title: "Monthly accounting documents",
      description: "Surface month-close compliance and checklist risk without connecting straight to SARS yet.",
      documents: clientComplianceDocuments.filter((document) => document.category === "monthly_accounting"),
    },
  ];
}

const clientComplianceCentreData: ComplianceCentreData = {
  summaryMetrics: [
    statusMetric(
      "comp-metric-1",
      "Overall compliance score",
      "82%",
      "Current weighted score based on valid, expiring, expired, and missing required records.",
      "info",
    ),
    statusMetric(
      "comp-metric-2",
      "Expired documents",
      "2",
      "Expired documents remain visible and require a new version upload.",
      "danger",
    ),
    statusMetric(
      "comp-metric-3",
      "Expiring in 30 days",
      "5",
      "Reminder windows are scheduled for 30, 14, 7 days, and expiry day.",
      "warning",
    ),
    statusMetric(
      "comp-metric-4",
      "Missing required documents",
      "2",
      "Required checklist items are still blocking the current month close.",
      "danger",
    ),
  ],
  overallScore: 82,
  expiredDocuments: splitDocumentsByStatus("expired"),
  expiringDocuments: splitDocumentsByStatus("expiring_soon"),
  missingRequiredDocuments,
  categoryGroups: buildCategoryGroups(),
  auditTrail: clientComplianceAudit,
  secureRules,
  reportGeneratedAt: "2026-05-04T08:15:00.000Z",
  retentionNote:
    "Supporting records are generally retained for five years after return submission, and may need to be kept longer in some cases.",
};

const accountantClientStatuses: ComplianceClientStatus[] = [
  {
    id: "client-status-1",
    clientName: "Apex Trading Ltd",
    score: 82,
    expiredCount: 2,
    expiringSoonCount: 5,
    missingRequiredCount: 2,
    reportReadyAt: "2026-05-04T08:15:00.000Z",
  },
  {
    id: "client-status-2",
    clientName: "Blue Peak Logistics",
    score: 71,
    expiredCount: 1,
    expiringSoonCount: 4,
    missingRequiredCount: 3,
    reportReadyAt: "2026-05-04T07:50:00.000Z",
  },
  {
    id: "client-status-3",
    clientName: "Cloud Nine Retail",
    score: 91,
    expiredCount: 0,
    expiringSoonCount: 2,
    missingRequiredCount: 0,
    reportReadyAt: "2026-05-04T07:30:00.000Z",
  },
];

const accountantComplianceCentreData: ComplianceCentreData = {
  ...clientComplianceCentreData,
  summaryMetrics: [
    statusMetric(
      "acc-comp-metric-1",
      "Overall compliance score",
      "78%",
      "Average score across tracked client compliance files.",
      "info",
    ),
    statusMetric(
      "acc-comp-metric-2",
      "Expired documents",
      "7",
      "Expired items remain visible and must be replaced with new versions.",
      "danger",
    ),
    statusMetric(
      "acc-comp-metric-3",
      "Expiring in 30 days",
      "14",
      "These items already have reminder dates on the calendar.",
      "warning",
    ),
    statusMetric(
      "acc-comp-metric-4",
      "Missing required documents",
      "9",
      "Required monthly and statutory items still need client action.",
      "danger",
    ),
  ],
  overallScore: 78,
  clientStatuses: accountantClientStatuses,
};

export function getClientComplianceCentreData() {
  return structuredClone(clientComplianceCentreData);
}

export function getAccountantComplianceCentreData() {
  return structuredClone(accountantComplianceCentreData);
}
