import type {
  ComplianceAuditEvent,
  ComplianceCategoryId,
  ComplianceCentreData,
  ComplianceClientStatus,
  ComplianceDocumentOwner,
  ComplianceDocumentStatus,
  ComplianceDocumentVersion,
} from "../types/portal";
import {
  buildComplianceCategoryGroup,
  buildCompliancePriorityItems,
  buildComplianceRiskStatus,
  buildComplianceSummaryMetrics,
  calculateComplianceScore,
  COMPLIANCE_REFERENCE_DATE,
  DEFAULT_COMPLIANCE_REMINDER_SCHEDULE,
  getClientFacingComplianceLabel,
  summariseComplianceRecords,
  syncComplianceRecord,
} from "../utils/compliance";

interface ComplianceItemDefinition {
  name: string;
  description: string;
  owner?: ComplianceDocumentOwner;
  monthlyPeriod?: string;
}

interface ComplianceCategoryDefinition {
  id: ComplianceCategoryId;
  name: string;
  description: string;
  items: ComplianceItemDefinition[];
}

interface ClientComplianceSeed {
  id: string;
  clientName: string;
  assignedAccountant: string;
  ownerLabel: string;
  reportReadyOffsetDays: number;
  lastReviewedOffsetDays: number;
  overrides: Record<
    string,
    {
      status: Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon">;
      owner?: ComplianceDocumentOwner;
      issueOffsetDays?: number;
      expiryOffsetDays?: number;
      monthlyPeriod?: string;
      reviewedBy?: string;
      notes: string;
    }
  >;
}

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const secureRules = [
  "Compliance is tracked by category, required item, version history, review status, and expiry workflow.",
  "Expired and rejected versions remain visible until a valid replacement is reviewed and accepted.",
  "Reminders are scheduled for 30 days, 14 days, 7 days, and the expiry day for tracked items.",
  "Missing, expired, expiring, and rejected items can all generate linked workflow requests.",
  "Every upload, review, rejection, renewal, and request stays visible in the audit trail.",
];

const categoryDefinitions: ComplianceCategoryDefinition[] = [
  {
    id: "company_registration_compliance",
    name: "Company Registration Compliance",
    description: "Founding company documents, governance records, and statutory company filings.",
    items: [
      {
        name: "CIPC Registration Certificate",
        description: "Founding company registration certificate issued by CIPC.",
      },
      {
        name: "CIPC Annual Return",
        description: "Most recent CIPC annual return filing confirmation.",
      },
      {
        name: "Beneficial Ownership Declaration",
        description: "Signed beneficial ownership declaration for current controllers.",
      },
      {
        name: "Director Information",
        description: "Current director details and identity confirmations.",
      },
      {
        name: "Shareholder Register",
        description: "Updated shareholder register showing current ownership.",
      },
      {
        name: "Memorandum of Incorporation",
        description: "Latest approved memorandum of incorporation.",
      },
    ],
  },
  {
    id: "tax_compliance",
    name: "Tax Compliance",
    description: "SARS-facing tax registrations, submissions, and filing support.",
    items: [
      {
        name: "Tax Compliance Status PIN",
        description: "Active SARS tax compliance status PIN for tenders and supplier onboarding.",
      },
      {
        name: "VAT Registration Certificate",
        description: "VAT registration certificate issued by SARS.",
      },
      {
        name: "VAT Returns",
        description: "Latest VAT return submission set for the active period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "PAYE Registration",
        description: "PAYE registration confirmation issued by SARS.",
      },
      {
        name: "EMP201",
        description: "Monthly payroll submission (EMP201) for the current period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "EMP501",
        description: "Annual payroll reconciliation (EMP501).",
      },
      {
        name: "Income Tax Return",
        description: "Company income tax return for the latest assessed period.",
      },
      {
        name: "Provisional Tax",
        description: "Latest provisional tax submission support.",
      },
    ],
  },
  {
    id: "financial_records_compliance",
    name: "Financial Records Compliance",
    description: "Core accounting records required for financial control and audit readiness.",
    items: [
      {
        name: "Bank Statements",
        description: "Business bank statements for the current reporting period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "Sales Invoices",
        description: "Sales invoice bundle for the active reporting period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "Expense Invoices",
        description: "Expense invoice support for the active reporting period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "Proof of Payments",
        description: "Proof of payment pack for the active reporting period.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "Annual Financial Statements",
        description: "Latest signed annual financial statements.",
      },
      {
        name: "Trial Balance",
        description: "Current trial balance signed off for the reporting cycle.",
        owner: "accountant",
      },
      {
        name: "Cashbook",
        description: "Cashbook for the current reporting period.",
        monthlyPeriod: "April 2026",
      },
    ],
  },
  {
    id: "employment_payroll_compliance",
    name: "Employment & Payroll Compliance",
    description: "Employment, payroll, and labour-related records that support compliant payroll operations.",
    items: [
      {
        name: "UIF Registration",
        description: "UIF registration confirmation.",
      },
      {
        name: "COIDA Letter of Good Standing",
        description: "Current COIDA good standing letter.",
      },
      {
        name: "Employment Contracts",
        description: "Signed employment contracts for active payroll staff.",
      },
      {
        name: "Payslips",
        description: "Payslip bundle for the active month.",
        monthlyPeriod: "April 2026",
      },
      {
        name: "IRP5 Certificates",
        description: "Latest IRP5 certificate set.",
      },
      {
        name: "Payroll Reports",
        description: "Payroll register and control report for the current month.",
        monthlyPeriod: "April 2026",
        owner: "accountant",
      },
    ],
  },
  {
    id: "regulatory_industry_compliance",
    name: "Regulatory / Industry Compliance",
    description: "Industry-specific registrations, licences, and professional standing records.",
    items: [
      {
        name: "Industry Licence",
        description: "Current industry operating licence.",
      },
      {
        name: "Health Certificate",
        description: "Relevant health or safety certificate.",
      },
      {
        name: "CIDB Registration",
        description: "Construction Industry Development Board registration, where applicable.",
      },
      {
        name: "PSIRA Certificate",
        description: "PSIRA certificate, where required by the business model.",
      },
      {
        name: "Operator Licence",
        description: "Operating licence for regulated transport or similar activity.",
      },
      {
        name: "Professional Body Registration",
        description: "Professional body membership or standing certificate.",
      },
    ],
  },
  {
    id: "insurance_compliance",
    name: "Insurance Compliance",
    description: "Insurance cover certificates that prove operational and contractual protection.",
    items: [
      {
        name: "Public Liability Insurance",
        description: "Public liability insurance certificate.",
      },
      {
        name: "Professional Indemnity Insurance",
        description: "Professional indemnity insurance certificate.",
      },
      {
        name: "Vehicle Insurance",
        description: "Fleet or vehicle insurance evidence.",
      },
      {
        name: "Asset Insurance",
        description: "Asset insurance schedule.",
      },
      {
        name: "Workers Compensation",
        description: "Workers compensation cover evidence.",
      },
    ],
  },
  {
    id: "tender_supplier_compliance",
    name: "Tender / Supplier Compliance",
    description: "Supplier onboarding and tender pack records frequently requested by customers and public entities.",
    items: [
      {
        name: "B-BBEE Certificate",
        description: "Current B-BBEE certificate or sworn affidavit.",
      },
      {
        name: "CSD Registration",
        description: "Central Supplier Database registration evidence.",
      },
      {
        name: "Municipal Account",
        description: "Latest municipal account used for address verification.",
      },
      {
        name: "Bank Confirmation Letter",
        description: "Current bank confirmation letter from the business bank.",
      },
      {
        name: "Tax Clearance / Tax PIN",
        description: "Tax clearance or tax PIN evidence for supplier onboarding.",
      },
      {
        name: "Company Profile",
        description: "Current company profile used in supplier packs and tender responses.",
      },
    ],
  },
  {
    id: "popia_data_protection_compliance",
    name: "POPIA / Data Protection Compliance",
    description: "Data protection policies, registers, and responsible information officer records.",
    items: [
      {
        name: "POPIA Policy",
        description: "Current POPIA policy approved by management.",
        owner: "admin",
      },
      {
        name: "Privacy Notice",
        description: "Privacy notice issued to customers and staff.",
        owner: "admin",
      },
      {
        name: "PAIA Manual",
        description: "Current PAIA manual.",
        owner: "admin",
      },
      {
        name: "Information Officer Details",
        description: "Registered information officer details.",
        owner: "admin",
      },
      {
        name: "Consent Records",
        description: "Consent records supporting key data processing activities.",
        owner: "admin",
      },
      {
        name: "Data Processing Register",
        description: "Data processing activity register.",
        owner: "admin",
      },
    ],
  },
];

const clientSeeds: ClientComplianceSeed[] = [
  {
    id: "firm-client-1",
    clientName: "Apex Trading Ltd",
    assignedAccountant: "Daniel Mokoena",
    ownerLabel: "Client-owned",
    reportReadyOffsetDays: -1,
    lastReviewedOffsetDays: -6,
    overrides: {
      "CIPC Annual Return": {
        status: "expired",
        expiryOffsetDays: -10,
        notes: "Annual return lapsed after the April filing window.",
      },
      "Beneficial Ownership Declaration": {
        status: "missing",
        notes: "Signed beneficial ownership declaration is still outstanding from the directors.",
      },
      "Director Information": {
        status: "under_review",
        notes: "Updated director information was uploaded and is awaiting accountant verification.",
      },
      "Tax Compliance Status PIN": {
        status: "expiring",
        expiryOffsetDays: 4,
        notes: "Tender submission requires a renewed PIN before next week.",
      },
      "VAT Returns": {
        status: "under_review",
        monthlyPeriod: "April 2026",
        notes: "April VAT return has been uploaded and is waiting for review sign-off.",
      },
      EMP201: {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "Monthly payroll submission (EMP201) is still missing for April 2026.",
      },
      "COIDA Letter of Good Standing": {
        status: "expiring",
        expiryOffsetDays: 12,
        notes: "Renewal letter is needed before payroll close.",
      },
      "B-BBEE Certificate": {
        status: "expired",
        expiryOffsetDays: -10,
        notes: "Expired B-BBEE certificate is blocking supplier pack readiness.",
      },
      "Bank Confirmation Letter": {
        status: "under_review",
        notes: "Updated bank confirmation letter has been uploaded and is awaiting review.",
      },
      "Public Liability Insurance": {
        status: "expiring",
        expiryOffsetDays: 18,
        notes: "Insurance cover expires within the current tender cycle.",
      },
    },
  },
  {
    id: "firm-client-2",
    clientName: "Blue Peak Logistics",
    assignedAccountant: "Lerato Nkosi",
    ownerLabel: "Client-owned",
    reportReadyOffsetDays: -2,
    lastReviewedOffsetDays: -6,
    overrides: {
      "CIPC Annual Return": {
        status: "expiring",
        expiryOffsetDays: 15,
        notes: "Return falls due within the next two weeks.",
      },
      "Beneficial Ownership Declaration": {
        status: "missing",
        notes: "Latest beneficial ownership update has not been uploaded.",
      },
      "Tax Compliance Status PIN": {
        status: "expired",
        expiryOffsetDays: -3,
        notes: "The tax PIN expired and must be renewed immediately.",
      },
      "VAT Returns": {
        status: "rejected",
        monthlyPeriod: "April 2026",
        notes: "VAT return working papers were rejected because source support was incomplete.",
      },
      EMP201: {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "April payroll submission is missing.",
      },
      "Bank Statements": {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "Current operating account statement was not uploaded.",
      },
      "Expense Invoices": {
        status: "rejected",
        monthlyPeriod: "April 2026",
        notes: "Expense invoice support needs clearer scans and matching proof of payment.",
      },
      "COIDA Letter of Good Standing": {
        status: "expired",
        expiryOffsetDays: -7,
        notes: "Good standing lapsed and must be renewed before payroll processing.",
      },
      "Employment Contracts": {
        status: "missing",
        notes: "Signed contracts for two new hires are missing.",
      },
      "Operator Licence": {
        status: "expiring",
        expiryOffsetDays: 9,
        notes: "Transport operator licence expires before month end.",
      },
      "Vehicle Insurance": {
        status: "missing",
        notes: "Fleet insurance schedule has not been uploaded.",
      },
      "CSD Registration": {
        status: "missing",
        notes: "Supplier database registration confirmation is outstanding.",
      },
      "Bank Confirmation Letter": {
        status: "rejected",
        notes: "Bank letter is older than the tender requirement allows.",
      },
      "POPIA Policy": {
        status: "under_review",
        notes: "Policy refresh was uploaded and is awaiting partner review.",
      },
      "Consent Records": {
        status: "missing",
        notes: "Consent evidence for logistics tracking communications is incomplete.",
      },
    },
  },
  {
    id: "firm-client-3",
    clientName: "Cloud Nine Retail",
    assignedAccountant: "Daniel Mokoena",
    ownerLabel: "Client-owned",
    reportReadyOffsetDays: -2,
    lastReviewedOffsetDays: -6,
    overrides: {
      "Tax Compliance Status PIN": {
        status: "expiring",
        expiryOffsetDays: 20,
        notes: "Renewal should happen this month to keep supplier onboarding smooth.",
      },
      "Bank Confirmation Letter": {
        status: "under_review",
        notes: "Current bank letter was uploaded this week and is waiting for review.",
      },
      "POPIA Policy": {
        status: "under_review",
        notes: "Board-approved POPIA policy is under final compliance review.",
      },
      "Public Liability Insurance": {
        status: "expiring",
        expiryOffsetDays: 23,
        notes: "Insurance renewal window opens this month.",
      },
    },
  },
  {
    id: "firm-client-4",
    clientName: "Coastal Auto Group",
    assignedAccountant: "Daniel Mokoena",
    ownerLabel: "Client-owned",
    reportReadyOffsetDays: -10,
    lastReviewedOffsetDays: -11,
    overrides: {
      "CIPC Annual Return": {
        status: "expired",
        expiryOffsetDays: -21,
        notes: "Annual return is overdue and exposed in the statutory queue.",
      },
      "Beneficial Ownership Declaration": {
        status: "missing",
        notes: "Ownership declaration is missing from the CIPC file.",
      },
      "Director Information": {
        status: "missing",
        notes: "Director identity and contact records need to be refreshed.",
      },
      "Shareholder Register": {
        status: "under_review",
        notes: "Shareholder register was uploaded but still needs verification.",
      },
      "Tax Compliance Status PIN": {
        status: "expired",
        expiryOffsetDays: -4,
        notes: "Tax PIN is no longer valid for supplier work.",
      },
      "VAT Returns": {
        status: "rejected",
        monthlyPeriod: "April 2026",
        notes: "VAT return failed review because the April working papers were incomplete.",
      },
      EMP201: {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "Payroll submission was not uploaded before the cut-off.",
      },
      "Bank Statements": {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "April bank statements are missing from the financial controls set.",
      },
      "Sales Invoices": {
        status: "rejected",
        monthlyPeriod: "April 2026",
        notes: "Invoice bundle needs corrected numbering and source support.",
      },
      "Proof of Payments": {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "Payment confirmations are incomplete for the April close.",
      },
      "COIDA Letter of Good Standing": {
        status: "expired",
        expiryOffsetDays: -2,
        notes: "COIDA status lapsed and blocks payroll readiness.",
      },
      "Employment Contracts": {
        status: "missing",
        notes: "Two workshop staff contracts are still unsigned in the portal.",
      },
      "Industry Licence": {
        status: "expiring",
        expiryOffsetDays: 6,
        notes: "Motor trade licence renewal is inside the escalation window.",
      },
      "Professional Body Registration": {
        status: "missing",
        notes: "Required professional registration evidence is outstanding.",
      },
      "Vehicle Insurance": {
        status: "expiring",
        expiryOffsetDays: 11,
        notes: "Fleet insurance expires during the current review cycle.",
      },
      "B-BBEE Certificate": {
        status: "expired",
        expiryOffsetDays: -16,
        notes: "Supplier compliance pack shows an expired B-BBEE certificate.",
      },
      "CSD Registration": {
        status: "missing",
        notes: "Supplier database record is missing.",
      },
      "POPIA Policy": {
        status: "under_review",
        notes: "POPIA policy refresh is under review after governance comments.",
      },
    },
  },
  {
    id: "firm-client-5",
    clientName: "Summit Consulting",
    assignedAccountant: "Lerato Nkosi",
    ownerLabel: "Client-owned",
    reportReadyOffsetDays: -10,
    lastReviewedOffsetDays: -12,
    overrides: {
      "CIPC Annual Return": {
        status: "expiring",
        expiryOffsetDays: 19,
        notes: "Return renewal is due later this month.",
      },
      "Tax Compliance Status PIN": {
        status: "expiring",
        expiryOffsetDays: 10,
        notes: "PIN should be renewed before the next client onboarding pack.",
      },
      "VAT Returns": {
        status: "under_review",
        monthlyPeriod: "April 2026",
        notes: "April VAT return is pending accountant review.",
      },
      EMP201: {
        status: "missing",
        monthlyPeriod: "April 2026",
        notes: "April payroll submission is still missing.",
      },
      "Bank Statements": {
        status: "under_review",
        monthlyPeriod: "April 2026",
        notes: "Bank statements were uploaded and are awaiting review feedback.",
      },
      "Expense Invoices": {
        status: "rejected",
        monthlyPeriod: "April 2026",
        notes: "Expense support was rejected and needs a cleaner re-upload.",
      },
      "COIDA Letter of Good Standing": {
        status: "expiring",
        expiryOffsetDays: 14,
        notes: "Good standing letter expires within the next two weeks.",
      },
      "Employment Contracts": {
        status: "missing",
        notes: "Contract pack is incomplete for two consultants.",
      },
      "Professional Indemnity Insurance": {
        status: "expiring",
        expiryOffsetDays: 8,
        notes: "Professional indemnity renewal needs follow-up.",
      },
      "B-BBEE Certificate": {
        status: "under_review",
        notes: "Renewed B-BBEE affidavit is waiting for controlled review.",
      },
      "POPIA Policy": {
        status: "under_review",
        notes: "POPIA policy revision is under review with management comments.",
      },
    },
  },
];

function buildDate(offsetDays: number) {
  const reference = new Date(COMPLIANCE_REFERENCE_DATE);
  reference.setUTCDate(reference.getUTCDate() + offsetDays);
  return reference.toISOString();
}

function toLabel(offsetDays: number) {
  return dateFormatter.format(new Date(buildDate(offsetDays)));
}

function buildVersions(
  recordId: string,
  clientName: string,
  itemName: string,
  status: Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon">,
  uploadedBy: string,
) {
  const fileStem = `${clientName.replace(/[^A-Za-z0-9]+/g, "")}_${itemName.replace(/[^A-Za-z0-9]+/g, "")}`;
  const acceptedVersion: ComplianceDocumentVersion = {
    id: `${recordId}-version-1`,
    versionNumber: 1,
    fileName: `${fileStem}_v1.pdf`,
    fileType: "pdf",
    uploadedBy,
    uploadedAt: buildDate(-40),
    status: "accepted",
    isCurrentVersion: status !== "rejected",
  };

  if (status === "missing") {
    return [] as ComplianceDocumentVersion[];
  }

  if (status === "rejected") {
    return [
      {
        ...acceptedVersion,
        isCurrentVersion: false,
        status: "replaced" as const,
      },
      {
        id: `${recordId}-version-2`,
        versionNumber: 2,
        fileName: `${fileStem}_v2.pdf`,
        fileType: "pdf",
        uploadedBy,
        uploadedAt: buildDate(-6),
        status: "rejected" as const,
        rejectionReason: "File needs clearer support and corrected metadata before approval.",
        isCurrentVersion: true,
      },
    ];
  }

  if (status === "under_review") {
    return [
      {
        ...acceptedVersion,
        uploadedAt: buildDate(-3),
        status: "under_review" as const,
        isCurrentVersion: true,
      },
    ];
  }

  return [acceptedVersion];
}

function buildAuditTrail(
  recordId: string,
  clientName: string,
  assignedAccountant: string,
  status: Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon">,
  itemName: string,
  notes: string,
) {
  const events: ComplianceAuditEvent[] = [];

  if (status !== "missing") {
    events.push({
      id: `${recordId}-audit-uploaded`,
      action: "uploaded",
      actor: clientName,
      timestamp: buildDate(-12),
      detail: `${itemName} was uploaded into the compliance vault.`,
      complianceItemId: recordId,
    });
  }

  if (status === "under_review") {
    events.unshift({
      id: `${recordId}-audit-review`,
      action: "reviewed",
      actor: assignedAccountant,
      timestamp: buildDate(-2),
      detail: `${itemName} is under review. ${notes}`,
      complianceItemId: recordId,
    });
  }

  if (status === "rejected") {
    events.unshift({
      id: `${recordId}-audit-rejected`,
      action: "rejected",
      actor: assignedAccountant,
      timestamp: buildDate(-5),
      detail: `${itemName} was rejected. ${notes}`,
      complianceItemId: recordId,
    });
  }

  if (status === "expired") {
    events.unshift({
      id: `${recordId}-audit-expired`,
      action: "expired",
      actor: "Workflow engine",
      timestamp: buildDate(-1),
      detail: `${itemName} passed its expiry date and now needs renewal.`,
      complianceItemId: recordId,
    });
  }

  return events;
}

function buildDocumentRecord(
  client: ClientComplianceSeed,
  category: ComplianceCategoryDefinition,
  item: ComplianceItemDefinition,
  index: number,
) {
  const override = client.overrides[item.name];
  const status = override?.status ?? "compliant";
  const owner = override?.owner ?? item.owner ?? "client";
  const uploadedBy = owner === "accountant"
    ? client.assignedAccountant
    : owner === "admin"
      ? "Priya Naidoo"
      : client.clientName;
  const versions = buildVersions(
    `${client.id}-${category.id}-${index + 1}`,
    client.clientName,
    item.name,
    status,
    uploadedBy,
  );
  const issueOffsetDays = override?.issueOffsetDays ?? -90;
  const expiryOffsetDays =
    override?.expiryOffsetDays ??
    (status === "expiring"
      ? 20
      : status === "expired"
        ? -7
        : status === "rejected"
          ? 28
          : status === "under_review"
            ? 32
            : 180);
  const notes =
    override?.notes ??
    `${item.name} is in the controlled compliance register for ${client.clientName}.`;
  const record = syncComplianceRecord(
    {
      id: `${client.id}-${category.id}-${index + 1}`,
      categoryId: category.id,
      categoryName: category.name,
      name: item.name,
      simpleLabel: getClientFacingComplianceLabel(item.name),
      description: item.description,
      clientId: client.id,
      clientName: client.clientName,
      owner,
      required: true,
      status,
      issueDate: buildDate(issueOffsetDays),
      expiryDate: buildDate(expiryOffsetDays),
      lastReviewedDate:
        status === "under_review" || status === "missing"
          ? undefined
          : buildDate(client.lastReviewedOffsetDays),
      reviewedBy:
        status === "under_review" || status === "missing"
          ? undefined
          : override?.reviewedBy ?? client.assignedAccountant,
      uploadedBy: versions[versions.length - 1]?.uploadedBy,
      versionCount: versions.length,
      latestVersionId: versions.find((version) => version.isCurrentVersion)?.id,
      reminderSchedule: [...DEFAULT_COMPLIANCE_REMINDER_SCHEDULE],
      notes,
      auditTrail: buildAuditTrail(
        `${client.id}-${category.id}-${index + 1}`,
        client.clientName,
        client.assignedAccountant,
        status,
        item.name,
        notes,
      ),
      versions,
      monthlyPeriod: override?.monthlyPeriod ?? item.monthlyPeriod,
      requestIds: [],
      category: category.id,
      reminderDates: [],
      isLocked: false,
      versionHistory: versions,
      storageLabel:
        status === "missing"
          ? "Encrypted vault / upload still required"
          : status === "rejected"
            ? "Encrypted vault / new version required"
            : status === "under_review"
              ? "Encrypted vault / pending review"
              : "Encrypted vault / accepted version locked",
    },
    COMPLIANCE_REFERENCE_DATE,
  );

  return record;
}

function buildClientComplianceStatus(client: ClientComplianceSeed): ComplianceClientStatus {
  const categories = categoryDefinitions.map((category) =>
    buildComplianceCategoryGroup(
      category.id,
      category.name,
      category.description,
      category.items.map((item, index) => buildDocumentRecord(client, category, item, index)),
      COMPLIANCE_REFERENCE_DATE,
    ),
  );
  const documents = categories.flatMap((category) => category.documents);
  const summary = summariseComplianceRecords(documents, COMPLIANCE_REFERENCE_DATE);
  const score = calculateComplianceScore(documents, COMPLIANCE_REFERENCE_DATE);
  const riskStatus = buildComplianceRiskStatus(documents, COMPLIANCE_REFERENCE_DATE);
  const topPriorities = buildCompliancePriorityItems(documents, COMPLIANCE_REFERENCE_DATE);
  const auditTrail = [...documents.flatMap((document) => document.auditTrail)].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
  const readinessSummary =
    summary.expiredCount > 0 || summary.missingCount > 0
      ? `${summary.expiredCount} expired and ${summary.missingCount} missing required items need attention.`
      : summary.expiringCount > 0
        ? `${summary.expiringCount} items are inside their renewal window.`
        : "All required compliance items are currently in a healthy state.";
  const nextBestAction =
    topPriorities[0]?.status === "expired"
      ? `Request renewal for ${topPriorities[0].label}.`
      : topPriorities[0]?.status === "missing"
        ? `Request upload for ${topPriorities[0].label}.`
        : topPriorities[0]?.status === "rejected"
          ? `Request a corrected re-upload for ${topPriorities[0].label}.`
          : topPriorities[0]
            ? `Review ${topPriorities[0].label} next.`
            : "No immediate action required.";

  return {
    id: `${client.id}-status`,
    clientId: client.id,
    clientName: client.clientName,
    assignedAccountant: client.assignedAccountant,
    riskStatus,
    ownerLabel: client.ownerLabel,
    score,
    compliantCount: summary.compliantCount,
    totalRequiredItems: summary.totalRequiredItems,
    expiredCount: summary.expiredCount,
    expiringCount: summary.expiringCount,
    expiringSoonCount: summary.expiringCount,
    missingCount: summary.missingCount,
    missingRequiredCount: summary.missingCount,
    lastReviewed: buildDate(client.lastReviewedOffsetDays),
    reportReadyAt: buildDate(client.reportReadyOffsetDays),
    readinessSummary,
    nextBestAction,
    topPriorities,
    categories,
    documents,
    auditTrail,
  };
}

const complianceClientStatuses = clientSeeds.map((seed) => buildClientComplianceStatus(seed));

function aggregateCategoryGroups(clientStatuses: ComplianceClientStatus[]) {
  return categoryDefinitions.map((category) =>
    buildComplianceCategoryGroup(
      category.id,
      category.name,
      category.description,
      clientStatuses.flatMap((client) =>
        client.documents.filter((document) => document.categoryId === category.id),
      ),
      COMPLIANCE_REFERENCE_DATE,
    ),
  );
}

function buildComplianceCentreData(
  clientStatuses: ComplianceClientStatus[],
  options: {
    helperLabel: string;
    includeClientStatuses: boolean;
  },
): ComplianceCentreData {
  const documents = clientStatuses.flatMap((client) => client.documents);
  const summary = summariseComplianceRecords(documents, COMPLIANCE_REFERENCE_DATE);
  const expiredDocuments = documents.filter((document) => document.status === "expired");
  const expiringDocuments = documents.filter((document) => document.status === "expiring");
  const missingRequiredDocuments = documents.filter((document) => document.status === "missing");
  const score =
    clientStatuses.length === 0
      ? 0
      : clientStatuses.length === 1
        ? clientStatuses[0].score
        : Math.round(
            clientStatuses.reduce((sum, client) => sum + client.score, 0) / clientStatuses.length,
          );
  const auditTrail = [...documents.flatMap((document) => document.auditTrail)].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  return {
    snapshotDate: COMPLIANCE_REFERENCE_DATE,
    summaryMetrics: buildComplianceSummaryMetrics(
      score,
      summary.expiredCount,
      summary.expiringCount,
      summary.missingCount,
      options.helperLabel,
    ),
    overallScore: score,
    portfolioCompliancePercentage: score,
    expiredCount: summary.expiredCount,
    expiringCount: summary.expiringCount,
    missingRequiredCount: summary.missingCount,
    expiredDocuments,
    expiringDocuments,
    missingRequiredDocuments,
    categoryGroups:
      clientStatuses.length === 1
        ? clientStatuses[0].categories
        : aggregateCategoryGroups(clientStatuses),
    auditTrail,
    secureRules,
    reportGeneratedAt: buildDate(-1),
    retentionNote:
      "Expired, rejected, and replaced versions remain visible until a valid replacement has been accepted and linked into the controlled compliance record.",
    clientStatuses: options.includeClientStatuses ? clientStatuses : undefined,
  };
}

const clientComplianceCentreData = buildComplianceCentreData(
  complianceClientStatuses.filter((client) => client.clientId === "firm-client-1"),
  {
    helperLabel: "Compliance score",
    includeClientStatuses: false,
  },
);

const accountantComplianceCentreData = buildComplianceCentreData(complianceClientStatuses, {
  helperLabel: "Portfolio compliance %",
  includeClientStatuses: true,
});

export function getClientComplianceCentreData() {
  return structuredClone(clientComplianceCentreData);
}

export function getAccountantComplianceCentreData() {
  return structuredClone(accountantComplianceCentreData);
}

export function getComplianceClientStatusData() {
  return structuredClone(complianceClientStatuses);
}

export function getComplianceClientStatus(clientId: string) {
  return structuredClone(
    complianceClientStatuses.find((client) => client.clientId === clientId) ??
      complianceClientStatuses[0],
  );
}

export function getComplianceSnapshotLabel() {
  return toLabel(0);
}

export function buildComplianceCentreDataFromStatuses(
  clientStatuses: ComplianceClientStatus[],
  options: {
    helperLabel: string;
    includeClientStatuses: boolean;
  },
) {
  return structuredClone(buildComplianceCentreData(clientStatuses, options));
}
