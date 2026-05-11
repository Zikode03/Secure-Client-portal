import type {
  ComplianceAuditEvent,
  ComplianceCategoryGroup,
  ComplianceCategoryId,
  ComplianceDocumentRecord,
  ComplianceDocumentStatus,
  ComplianceDocumentVersion,
  CompliancePriorityItem,
  ComplianceRequestType,
  SummaryMetric,
  WorkflowRequest,
} from "../types/portal";

export const COMPLIANCE_REFERENCE_DATE = "2026-05-10T00:00:00.000Z";
export const DEFAULT_COMPLIANCE_REMINDER_SCHEDULE = [
  "30 days",
  "14 days",
  "7 days",
  "expiry day",
] as const;

const statusWeights: Record<
  Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon">,
  number
> = {
  compliant: 1,
  missing: 0,
  expiring: 0.65,
  expired: 0,
  under_review: 0.8,
  rejected: 0.2,
};

const clientFacingLabelMap: Record<string, string> = {
  "Tax Compliance Status PIN": "Tax compliance PIN",
  "Tax Compliance Status / Tax PIN": "Tax compliance PIN",
  "VAT Returns": "VAT return submissions",
  "PAYE Registration": "Payroll tax registration (PAYE)",
  EMP201: "Monthly payroll submission (EMP201)",
  EMP501: "Annual payroll reconciliation (EMP501)",
  "Income Tax Return": "Company income tax return",
  "Provisional Tax": "Provisional tax submission",
  "Bank Statements": "Business bank statements",
  "Sales Invoices": "Sales invoices",
  "Expense Invoices": "Expense invoices",
  "Proof of Payments": "Proof of payment",
  "Annual Financial Statements": "Annual financial statements",
  "Trial Balance": "Trial balance",
  Cashbook: "Cashbook",
  "UIF Registration": "UIF registration",
  "COIDA Letter of Good Standing": "COIDA good standing letter",
  "Employment Contracts": "Signed employment contracts",
  Payslips: "Employee payslips",
  "IRP5 Certificates": "IRP5 tax certificates",
  "Payroll Reports": "Payroll reports",
  "Industry Licence": "Industry licence",
  "Health Certificate": "Health certificate",
  "CIDB Registration": "CIDB registration",
  "PSIRA Certificate": "PSIRA certificate",
  "Operator Licence": "Operator licence",
  "Professional Body Registration": "Professional body registration",
  "Public Liability Insurance": "Public liability insurance",
  "Professional Indemnity Insurance": "Professional indemnity insurance",
  "Vehicle Insurance": "Vehicle insurance",
  "Asset Insurance": "Asset insurance",
  "Workers Compensation": "Workers compensation cover",
  "B-BBEE Certificate": "B-BBEE certificate",
  "CSD Registration": "CSD registration",
  "Municipal Account": "Business municipal account",
  "Bank Confirmation Letter": "Bank confirmation letter",
  "Tax Clearance / Tax PIN": "Tax clearance / tax PIN",
  "Company Profile": "Company profile",
  "POPIA Policy": "POPIA policy",
  "Privacy Notice": "Privacy notice",
  "PAIA Manual": "PAIA manual",
  "Information Officer Details": "Information officer details",
  "Consent Records": "Consent records",
  "Data Processing Register": "Data processing register",
};

function resolveReferenceDate(referenceDate?: Date | string) {
  if (referenceDate instanceof Date) {
    return referenceDate;
  }

  return new Date(referenceDate ?? COMPLIANCE_REFERENCE_DATE);
}

export function normalizeComplianceStatus(
  status: ComplianceDocumentStatus,
): Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon"> {
  if (status === "valid") {
    return "compliant";
  }

  if (status === "expiring_soon") {
    return "expiring";
  }

  return status;
}

export function getClientFacingComplianceLabel(name: string) {
  return clientFacingLabelMap[name] ?? name;
}

export function getComplianceVersions(record: ComplianceDocumentRecord) {
  return record.versions.length > 0 ? record.versions : record.versionHistory;
}

export function getCurrentComplianceVersion(record: ComplianceDocumentRecord) {
  return getComplianceVersions(record).find((version) => version.isCurrentVersion);
}

export function isComplianceItemMissing(
  record: ComplianceDocumentRecord,
  referenceDate?: Date | string,
) {
  const _referenceDate = resolveReferenceDate(referenceDate);
  void _referenceDate;
  return record.required && getComplianceVersions(record).length === 0;
}

export function isComplianceItemExpired(
  record: ComplianceDocumentRecord,
  referenceDate?: Date | string,
) {
  if (!record.expiryDate || isComplianceItemMissing(record, referenceDate)) {
    return false;
  }

  return new Date(record.expiryDate).getTime() < resolveReferenceDate(referenceDate).getTime();
}

export function isComplianceItemExpiring(
  record: ComplianceDocumentRecord,
  referenceDate?: Date | string,
) {
  if (!record.expiryDate || isComplianceItemMissing(record, referenceDate)) {
    return false;
  }

  const reference = resolveReferenceDate(referenceDate).getTime();
  const expiry = new Date(record.expiryDate).getTime();
  const daysUntilExpiry = Math.ceil((expiry - reference) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
}

export function deriveComplianceStatus(
  record: ComplianceDocumentRecord,
  referenceDate?: Date | string,
): Exclude<ComplianceDocumentStatus, "valid" | "expiring_soon"> {
  const currentVersion = getCurrentComplianceVersion(record);
  const seededStatus = normalizeComplianceStatus(record.status);

  if (isComplianceItemMissing(record, referenceDate)) {
    return "missing";
  }

  if (currentVersion?.status === "rejected" || seededStatus === "rejected") {
    return "rejected";
  }

  if (currentVersion?.status === "under_review" || seededStatus === "under_review") {
    return "under_review";
  }

  if (isComplianceItemExpired(record, referenceDate)) {
    return "expired";
  }

  if (isComplianceItemExpiring(record, referenceDate)) {
    return "expiring";
  }

  return "compliant";
}

export function getComplianceStatusWeight(status: ComplianceDocumentStatus) {
  return statusWeights[normalizeComplianceStatus(status)];
}

export function calculateComplianceScore(
  records: ComplianceDocumentRecord[],
  referenceDate?: Date | string,
) {
  const requiredRecords = records.filter((record) => record.required);
  if (requiredRecords.length === 0) {
    return 100;
  }

  const weightedTotal = requiredRecords.reduce(
    (sum, record) => sum + getComplianceStatusWeight(deriveComplianceStatus(record, referenceDate)),
    0,
  );

  return Math.round((weightedTotal / requiredRecords.length) * 100);
}

export function summariseComplianceRecords(
  records: ComplianceDocumentRecord[],
  referenceDate?: Date | string,
) {
  return records.reduce(
    (summary, record) => {
      const status = deriveComplianceStatus(record, referenceDate);

      if (record.required) {
        summary.totalRequiredItems += 1;
      }

      if (status === "compliant") {
        summary.compliantCount += 1;
      }

      if (status === "missing") {
        summary.missingCount += 1;
      }

      if (status === "expiring") {
        summary.expiringCount += 1;
      }

      if (status === "expired") {
        summary.expiredCount += 1;
      }

      if (status === "under_review") {
        summary.underReviewCount += 1;
      }

      if (status === "rejected") {
        summary.rejectedCount += 1;
      }

      return summary;
    },
    {
      totalRequiredItems: 0,
      compliantCount: 0,
      missingCount: 0,
      expiringCount: 0,
      expiredCount: 0,
      underReviewCount: 0,
      rejectedCount: 0,
    },
  );
}

export function buildComplianceRiskStatus(
  records: ComplianceDocumentRecord[],
  referenceDate?: Date | string,
) {
  const summary = summariseComplianceRecords(records, referenceDate);
  const score = calculateComplianceScore(records, referenceDate);

  if (summary.expiredCount > 0 && (summary.missingCount > 0 || score < 70)) {
    return "high_risk" as const;
  }

  if (summary.expiredCount > 0) {
    return "overdue" as const;
  }

  if (summary.missingCount > 0 || summary.expiringCount > 0 || summary.rejectedCount > 0 || score < 85) {
    return "at_risk" as const;
  }

  return "compliant" as const;
}

export function syncComplianceRecord(
  record: ComplianceDocumentRecord,
  referenceDate?: Date | string,
): ComplianceDocumentRecord {
  const versions = getComplianceVersions(record);
  const currentVersion = versions.find((version) => version.isCurrentVersion);
  const status = deriveComplianceStatus(record, referenceDate);
  const reminderDates = record.reminderSchedule.map((label, index) => ({
    id: `${record.id}-reminder-${index + 1}`,
    label,
    reminderDate:
      label === "30 days" && record.expiryDate
        ? new Date(new Date(record.expiryDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : label === "14 days" && record.expiryDate
          ? new Date(new Date(record.expiryDate).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
          : label === "7 days" && record.expiryDate
            ? new Date(new Date(record.expiryDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            : record.expiryDate ?? record.issueDate ?? COMPLIANCE_REFERENCE_DATE,
    state: "scheduled" as const,
  }));

  return {
    ...record,
    simpleLabel: record.simpleLabel || getClientFacingComplianceLabel(record.name),
    status,
    versionCount: versions.length,
    latestVersionId: currentVersion?.id,
    uploadedBy: currentVersion?.uploadedBy ?? record.uploadedBy,
    lastReviewedDate: record.lastReviewedDate,
    category: record.categoryId,
    reminderDates,
    isLocked: status === "compliant" || status === "expired" || status === "expiring",
    versions,
    versionHistory: versions,
  };
}

function urgencyScore(record: ComplianceDocumentRecord, referenceDate?: Date | string) {
  const status = deriveComplianceStatus(record, referenceDate);

  if (status === "expired") {
    return 100;
  }

  if (status === "missing") {
    return 90;
  }

  if (status === "rejected") {
    return 80;
  }

  if (status === "under_review") {
    return 60;
  }

  if (status === "expiring") {
    return 40;
  }

  return 10;
}

export function buildCompliancePriorityItems(
  records: ComplianceDocumentRecord[],
  referenceDate?: Date | string,
) {
  return [...records]
    .sort((left, right) => {
      const scoreDelta = urgencyScore(right, referenceDate) - urgencyScore(left, referenceDate);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return new Date(left.expiryDate ?? left.issueDate ?? COMPLIANCE_REFERENCE_DATE).getTime()
        - new Date(right.expiryDate ?? right.issueDate ?? COMPLIANCE_REFERENCE_DATE).getTime();
    })
    .slice(0, 3)
    .map<CompliancePriorityItem>((record, index) => {
      const status = deriveComplianceStatus(record, referenceDate);
      const requestType: ComplianceRequestType =
        status === "missing"
          ? "missing_document_request"
          : status === "rejected"
            ? "re_upload_request"
            : status === "expiring" || status === "expired"
              ? "renewal_request"
              : "clarification_request";
      const detail =
        status === "expired"
          ? `Expired ${record.expiryDate ? new Intl.DateTimeFormat("en-ZA", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(record.expiryDate)) : "recently"}`
          : status === "expiring"
            ? `Expires ${record.expiryDate ? new Intl.DateTimeFormat("en-ZA", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(record.expiryDate)) : "soon"}`
            : status === "missing"
              ? "Required upload still missing"
              : status === "rejected"
                ? "Latest upload was rejected"
                : "Awaiting accountant review";

      return {
        id: `${record.id}-priority-${index + 1}`,
        complianceItemId: record.id,
        categoryId: record.categoryId,
        label: record.name,
        detail,
        status,
        owner: record.owner,
        dueDate: record.expiryDate,
        requestType,
      };
    });
}

export function buildComplianceCategoryGroup(
  id: ComplianceCategoryId,
  name: string,
  description: string,
  records: ComplianceDocumentRecord[],
  referenceDate?: Date | string,
): ComplianceCategoryGroup {
  const documents = records.map((record) => syncComplianceRecord(record, referenceDate));
  const summary = summariseComplianceRecords(documents, referenceDate);

  return {
    id,
    name,
    title: name,
    description,
    complianceScore: calculateComplianceScore(documents, referenceDate),
    totalRequiredItems: summary.totalRequiredItems,
    compliantCount: summary.compliantCount,
    missingCount: summary.missingCount,
    expiringCount: summary.expiringCount,
    expiredCount: summary.expiredCount,
    documents,
  };
}

export function buildComplianceSummaryMetrics(
  score: number,
  expiredCount: number,
  expiringCount: number,
  missingCount: number,
  helperLabel: string,
): SummaryMetric[] {
  return [
    {
      id: "compliance-expired",
      label: "Expired",
      value: String(expiredCount),
      helper: expiredCount > 0 ? "Action required" : "No overdue items",
      tone: expiredCount > 0 ? "danger" : "success",
    },
    {
      id: "compliance-expiring",
      label: "Expiring soon",
      value: String(expiringCount),
      helper: "Next 30 days",
      tone: expiringCount > 0 ? "warning" : "success",
    },
    {
      id: "compliance-missing",
      label: "Missing required",
      value: String(missingCount),
      helper: missingCount > 0 ? "Client follow-up needed" : "Complete",
      tone: missingCount > 0 ? "danger" : "success",
    },
    {
      id: "compliance-score",
      label: helperLabel,
      value: `${score}%`,
      helper: "Structured compliance lifecycle",
      tone: score >= 85 ? "success" : score >= 70 ? "warning" : "danger",
    },
  ];
}

export function buildComplianceRequestDetails(
  record: ComplianceDocumentRecord,
  requestType: ComplianceRequestType,
  dueDate: string,
  comments: string,
  actorName: string,
) {
  const title =
    requestType === "missing_document_request"
      ? `Upload missing ${record.name}`
      : requestType === "renewal_request"
        ? `Renew ${record.name}`
        : requestType === "re_upload_request"
          ? `Re-upload ${record.name}`
          : `Clarify ${record.name}`;
  const description =
    comments.trim() ||
    (requestType === "missing_document_request"
      ? `${record.simpleLabel} is still required before the compliance checklist can be marked complete.`
      : requestType === "renewal_request"
        ? `${record.simpleLabel} is expiring or has expired and needs a renewed version.`
        : requestType === "re_upload_request"
          ? `${record.simpleLabel} needs a corrected replacement version after review feedback.`
          : `${record.simpleLabel} needs clarification before review can continue.`);

  return {
    title,
    description,
    dueDate,
    requestType,
    requestedBy: actorName,
    complianceCategoryId: record.categoryId,
    complianceCategoryName: record.categoryName,
    complianceItemId: record.id,
    complianceItemName: record.name,
    monthlyPeriod: record.monthlyPeriod,
  };
}

export function appendComplianceDocumentVersion(
  record: ComplianceDocumentRecord,
  args: {
    fileName: string;
    fileType: string;
    uploadedBy: string;
    uploadedAt?: string;
    note?: string;
  },
  referenceDate?: Date | string,
) {
  const uploadedAt = args.uploadedAt ?? new Date().toISOString();
  const existingVersions = getComplianceVersions(record).map((version) =>
    version.isCurrentVersion
      ? {
          ...version,
          isCurrentVersion: false,
          status: version.status === "accepted" ? "replaced" : version.status,
        }
      : version,
  );
  const nextVersion: ComplianceDocumentVersion = {
    id: `${record.id}-version-${existingVersions.length + 1}`,
    versionNumber: existingVersions.length + 1,
    fileName: args.fileName,
    fileType: args.fileType,
    uploadedBy: args.uploadedBy,
    uploadedAt,
    status: "under_review",
    isCurrentVersion: true,
  };
  const auditTrail: ComplianceAuditEvent[] = [
    {
      id: `${record.id}-audit-version-${existingVersions.length + 1}`,
      action: "new_version",
      actor: args.uploadedBy,
      timestamp: uploadedAt,
      detail:
        args.note?.trim() ||
        `${args.uploadedBy} uploaded a new version for ${record.name}.`,
      complianceItemId: record.id,
      categoryId: record.categoryId,
    },
    {
      id: `${record.id}-audit-upload-${existingVersions.length + 1}`,
      action: "uploaded",
      actor: args.uploadedBy,
      timestamp: uploadedAt,
      detail: `${args.fileName} uploaded and routed for accountant review.`,
      complianceItemId: record.id,
      categoryId: record.categoryId,
    },
    ...record.auditTrail,
  ];

  return syncComplianceRecord(
    {
      ...record,
      status: "under_review",
      uploadedBy: args.uploadedBy,
      notes: args.note?.trim() || record.notes,
      versions: [...existingVersions, nextVersion],
      versionHistory: [...existingVersions, nextVersion],
      auditTrail,
    },
    referenceDate,
  );
}

export function appendComplianceRequestAudit(
  record: ComplianceDocumentRecord,
  requestId: string,
  actorName: string,
  requestType: ComplianceRequestType,
  referenceDate?: Date | string,
) {
  const detail =
    requestType === "missing_document_request"
      ? `Missing document request sent for ${record.name}.`
      : requestType === "renewal_request"
        ? `Renewal request sent for ${record.name}.`
        : requestType === "re_upload_request"
          ? `Re-upload request sent for ${record.name}.`
          : `Clarification request sent for ${record.name}.`;

  return syncComplianceRecord(
    {
      ...record,
      requestIds: [requestId, ...record.requestIds],
      auditTrail: [
        {
          id: `${record.id}-request-${record.requestIds.length + 1}`,
          action: "request_sent",
          actor: actorName,
          timestamp: new Date().toISOString(),
          detail,
          complianceItemId: record.id,
          categoryId: record.categoryId,
          requestId,
        },
        ...record.auditTrail,
      ],
    },
    referenceDate,
  );
}

export function mapComplianceRequestToWorkflowRequest(
  request: WorkflowRequest,
  record?: ComplianceDocumentRecord,
) {
  if (!record) {
    return request;
  }

  return {
    ...request,
    complianceCategoryId: record.categoryId,
    complianceCategoryName: record.categoryName,
    complianceItemId: record.id,
    complianceItemName: record.name,
    monthlyPeriod: record.monthlyPeriod,
  };
}
