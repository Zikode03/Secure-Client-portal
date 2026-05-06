import type {
  BankTransaction,
  ComplianceDocumentRecord,
  DocumentRecord,
  ExpiringDocumentItem,
  InvoiceRecord,
  LatestRecordItem,
  MissingDocumentItem,
  MonthlyPack,
  PreviousMonthComparison,
  ReconciliationIssue,
  RejectedDocumentItem,
  ReviewQueueItem,
  SlotStatus,
  SmartAlertItem,
  SummaryMetric,
  Tone,
  UnifiedSearchFilters,
  UnifiedSearchResult,
} from "../types/portal";

const slotReadyStatuses = new Set<SlotStatus>(["uploaded", "under_review", "accepted", "filed"]);
const slotBlockingStatuses = new Set<SlotStatus>([
  "missing",
  "partial",
  "pending",
  "pending_signature",
  "rejected",
]);

export function isSlotReady(status: SlotStatus) {
  return slotReadyStatuses.has(status);
}

export function isBlockingRequiredStatus(status: SlotStatus) {
  return slotBlockingStatuses.has(status);
}

export function parseAmountLabel(value?: string) {
  if (!value) {
    return 0;
  }

  const normalisedValue = value.replace(/[^\d.-]/g, "");
  return Number(normalisedValue) || 0;
}

export function differenceInDays(dateValue: string, referenceDate = new Date()) {
  const target = new Date(dateValue);
  return Math.ceil(
    (target.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function sortByDateDescending<Value extends { date: string }>(items: Value[]) {
  return [...items].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function recalculatePack(pack: MonthlyPack): MonthlyPack {
  const completedCount = pack.slots.filter((slot) => isSlotReady(slot.status)).length;
  const totalCount = pack.slots.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const blockingSlots = pack.slots.filter(
    (slot) => slot.isRequired && isBlockingRequiredStatus(slot.status),
  );
  const canComplete = blockingSlots.length === 0;

  return {
    ...pack,
    completedCount,
    totalCount,
    progressPercent,
    canComplete,
    completionMessage: canComplete
      ? "Month is complete and ready to submit to your accountant."
      : "You cannot submit this month because required documents are still missing or rejected.",
  };
}

export function buildMissingDocuments(
  pack: MonthlyPack,
  clientName?: string,
): MissingDocumentItem[] {
  return pack.slots
    .filter((slot) => slot.isRequired && isBlockingRequiredStatus(slot.status))
    .map((slot) => ({
      id: slot.id,
      documentType: slot.documentType,
      monthLabel: `${slot.month} ${slot.year}`,
      description: slot.description,
      isRequired: slot.isRequired,
      status: slot.status,
      clientName,
      dueDate: slot.dueDate,
      lastSubmission: slot.lastSubmission,
      rejectionReason: slot.rejectionReason,
    }));
}

export function buildLatestDocumentItem(document: DocumentRecord): LatestRecordItem {
  return {
    id: document.id,
    name: document.fileName,
    type: document.documentType,
    date: document.uploadedAt,
    status: document.status,
    kind: "document",
    clientName: document.clientName,
  };
}

export function buildLatestInvoiceItem(invoice: InvoiceRecord): LatestRecordItem {
  return {
    id: invoice.id,
    name: invoice.fileName,
    type: "Invoice",
    date: invoice.uploadedAt,
    status: invoice.status,
    kind: "invoice",
    amountLabel: invoice.amountLabel,
    clientName: invoice.clientName,
  };
}

export function buildLatestUploadedDocuments(documents: DocumentRecord[]) {
  return sortByDateDescending(
    documents.map((document) => buildLatestDocumentItem(document)),
  ).slice(0, 10);
}

export function buildLatestInvoices(invoices: InvoiceRecord[]) {
  return sortByDateDescending(
    invoices.map((invoice) => buildLatestInvoiceItem(invoice)),
  ).slice(0, 10);
}

export function buildLatestOverallDocuments(
  documents: DocumentRecord[],
  invoices: InvoiceRecord[],
) {
  return sortByDateDescending([
    ...documents.map((document) => buildLatestDocumentItem(document)),
    ...invoices.map((invoice) => buildLatestInvoiceItem(invoice)),
  ]).slice(0, 15);
}

export function buildExpiringDocuments(
  documents: DocumentRecord[],
  referenceDate = new Date(),
): ExpiringDocumentItem[] {
  return documents
    .filter((document) => Boolean(document.expiryDate))
    .map((document) => {
      const expiryDate = document.expiryDate!;
      const daysRemaining = differenceInDays(expiryDate, referenceDate);
      const status: ExpiringDocumentItem["status"] =
        daysRemaining < 0 ? "expired" : "expiring_soon";
      const tone: Tone =
        daysRemaining < 0 ? "danger" : daysRemaining <= 10 ? "danger" : "warning";

      return {
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        expiresOn: expiryDate,
        owner: document.clientName,
        tone,
        daysRemaining,
        status,
        alertMessage:
          daysRemaining < 0
            ? `${document.documentType} has expired and needs to be replaced immediately.`
            : `Your ${document.documentType} expires in ${daysRemaining} days.`,
      };
    })
    .filter((item) => item.daysRemaining <= 30)
    .sort(
      (left, right) =>
        new Date(left.expiresOn).getTime() - new Date(right.expiresOn).getTime(),
    );
}

export function buildRejectedDocuments(
  documents: DocumentRecord[],
  invoices: InvoiceRecord[],
): RejectedDocumentItem[] {
  return [
    ...documents
      .filter((document) => document.status === "rejected")
      .map((document) => ({
        id: document.id,
        name: document.fileName,
        type: document.documentType,
        reason: document.rejectionReason ?? "Correction requested.",
        date: document.uploadedAt,
        status: "rejected" as const,
        clientName: document.clientName,
      })),
    ...invoices
      .filter((invoice) => invoice.status === "rejected")
      .map((invoice) => ({
        id: invoice.id,
        name: invoice.fileName,
        type: "Invoice",
        reason: invoice.rejectionReason ?? "Correction requested.",
        date: invoice.uploadedAt,
        status: "rejected" as const,
        clientName: invoice.clientName,
      })),
  ];
}

export function buildPreviousMonthComparison(
  currentMonthInvoiceCount: number,
  previousMonthInvoiceCount: number,
  currentMonthLabel: string,
  previousMonthLabel: string,
): PreviousMonthComparison {
  const delta = currentMonthInvoiceCount - previousMonthInvoiceCount;

  if (currentMonthInvoiceCount < previousMonthInvoiceCount * 0.5) {
    return {
      currentMonthLabel,
      previousMonthLabel,
      currentInvoiceCount: currentMonthInvoiceCount,
      previousInvoiceCount: previousMonthInvoiceCount,
      delta,
      tone: "danger",
      message: `You uploaded ${previousMonthInvoiceCount} invoices last month, but only ${currentMonthInvoiceCount} this month.`,
    };
  }

  if (currentMonthInvoiceCount > previousMonthInvoiceCount * 1.2) {
    return {
      currentMonthLabel,
      previousMonthLabel,
      currentInvoiceCount: currentMonthInvoiceCount,
      previousInvoiceCount: previousMonthInvoiceCount,
      delta,
      tone: "warning",
      message: `Invoice volume is unusually high this month: ${currentMonthInvoiceCount} versus ${previousMonthInvoiceCount} last month.`,
    };
  }

  return {
    currentMonthLabel,
    previousMonthLabel,
    currentInvoiceCount: currentMonthInvoiceCount,
    previousInvoiceCount: previousMonthInvoiceCount,
    delta,
    tone: "success",
    message: "Invoice volume is tracking close to the previous month.",
  };
}

export function buildSmartAlerts(
  monthPack: MonthlyPack,
  invoices: InvoiceRecord[],
  currentMonthLabel: string,
  previousMonthLabel: string,
): SmartAlertItem[] {
  const currentMonthInvoices = invoices.filter(
    (invoice) => invoice.monthLabel === currentMonthLabel,
  );
  const previousMonthInvoices = invoices.filter(
    (invoice) => invoice.monthLabel === previousMonthLabel,
  );
  const alerts: SmartAlertItem[] = [];
  const bankStatementSlot = monthPack.slots.find(
    (slot) => slot.documentType === "Bank Statement",
  );

  if (currentMonthInvoices.length === 0) {
    alerts.push({
      id: "smart-no-invoices",
      title: "No invoices uploaded this month",
      message:
        "No invoices have been uploaded for the current month, which is unusual compared with the recent workflow pattern.",
      tone: "warning",
      category: "anomaly",
    });
  }

  if (bankStatementSlot?.status === "missing" && currentMonthInvoices.length > 0) {
    alerts.push({
      id: "smart-bank-statement-gap",
      title: "Bank statement missing but invoices submitted",
      message:
        "Invoice activity is already in the workflow, but the required bank statement is still missing from the month pack.",
      tone: "danger",
      category: "completeness",
    });
  }

  const currentInvoiceNumbers = currentMonthInvoices
    .map((invoice) => Number(invoice.invoiceNumber.replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left);

  const missingNumbers = new Set<number>();
  for (let index = 0; index < currentInvoiceNumbers.length - 1; index += 1) {
    const currentValue = currentInvoiceNumbers[index];
    const nextValue = currentInvoiceNumbers[index + 1];

    if (currentValue - nextValue > 1) {
      for (let value = currentValue - 1; value > nextValue; value -= 1) {
        missingNumbers.add(value);
      }
    }
  }

  if (missingNumbers.size > 0) {
    const missingLabel = [...missingNumbers]
      .sort((left, right) => right - left)
      .slice(0, 3)
      .map((value) => `INV-${value}`)
      .join(", ");

    alerts.push({
      id: "smart-invoice-gap",
      title: "Invoice numbers skipped",
      message: `Invoice sequence gaps were detected this month. Review ${missingLabel} before closing the period.`,
      tone: "warning",
      category: "sequence",
    });
  }

  const currentRevenue = currentMonthInvoices.reduce(
    (sum, invoice) => sum + parseAmountLabel(invoice.amountLabel),
    0,
  );
  const previousRevenue = previousMonthInvoices.reduce(
    (sum, invoice) => sum + parseAmountLabel(invoice.amountLabel),
    0,
  );

  if (previousRevenue > 0 && currentRevenue < previousRevenue * 0.6) {
    const percentageDrop = Math.round(
      ((previousRevenue - currentRevenue) / previousRevenue) * 100,
    );

    alerts.push({
      id: "smart-revenue-drop",
      title: "Client revenue dropped 40% from last month",
      message: `Recorded invoice value is down ${percentageDrop}% compared with ${previousMonthLabel}, which may indicate missing billing or a genuine trading slowdown.`,
      tone: "warning",
      category: "revenue",
    });
  }

  return alerts;
}

export function buildReconciliationIssues(
  bankTransactions: BankTransaction[],
  invoices: InvoiceRecord[],
  currentMonthLabel: string,
): ReconciliationIssue[] {
  const currentMonthInvoices = invoices.filter(
    (invoice) => invoice.monthLabel === currentMonthLabel,
  );

  return bankTransactions
    .filter((transaction) => transaction.monthLabel === currentMonthLabel)
    .reduce<ReconciliationIssue[]>((issues, transaction) => {
      const matchedInvoice = currentMonthInvoices.find(
        (invoice) => parseAmountLabel(invoice.amountLabel) === transaction.amountValue,
      );

      if (!matchedInvoice) {
        issues.push({
          id: transaction.id,
          transactionDate: transaction.date,
          reference: transaction.reference,
          counterparty: transaction.counterparty,
          amountLabel: transaction.amountLabel,
          message: `${transaction.amountLabel.replace(/\s+/g, "")} received but no matching invoice found.`,
          suggestedAction:
            "Check whether a cash sale invoice is missing or whether the transaction belongs to another reporting period.",
          tone: "danger",
        });
        return issues;
      }

      if (matchedInvoice.status === "draft" || matchedInvoice.status === "uploaded") {
        issues.push({
          id: transaction.id,
          transactionDate: transaction.date,
          reference: transaction.reference,
          counterparty: transaction.counterparty,
          amountLabel: transaction.amountLabel,
          message: `Receipt amount matches ${matchedInvoice.invoiceNumber}, but the invoice is not workflow-complete yet.`,
          suggestedAction:
            "Move the invoice through finalisation and review so the transaction can be cleared cleanly.",
          tone: "warning",
          matchedInvoiceNumber: matchedInvoice.invoiceNumber,
        });
      }

      return issues;
    }, []);
}

export function createSummaryMetrics(
  pack: MonthlyPack,
  missingRequiredDocuments: MissingDocumentItem[],
  expiringDocuments: ExpiringDocumentItem[],
  latestActivityDate: string,
): SummaryMetric[] {
  const rejectedCount = pack.slots.filter((slot) => slot.status === "rejected").length;
  const missingCount = pack.slots.filter((slot) => slot.status === "missing").length;
  const reviewCount = pack.slots.filter((slot) => slot.status === "under_review").length;
  const submissionLabel =
    pack.submissionStatus === "under_accountant_review"
      ? "In review"
      : pack.canComplete
        ? "Ready"
        : "Open";

  return [
    {
      id: "metric-1",
      label: "Pack completion",
      value: `${pack.progressPercent}%`,
      helper: `${pack.completedCount} of ${pack.totalCount} checklist slots are workflow-ready.`,
      tone: pack.progressPercent >= 85 ? "success" : pack.progressPercent >= 60 ? "info" : "warning",
      progress: pack.progressPercent,
    },
    {
      id: "metric-2",
      label: "Blocking items",
      value: String(missingRequiredDocuments.length),
      helper:
        missingRequiredDocuments.length > 0
          ? `${missingCount} missing and ${rejectedCount} rejected required items still block submission.`
          : "No required items are blocking submission right now.",
      tone: missingRequiredDocuments.length > 0 ? "danger" : "success",
    },
    {
      id: "metric-3",
      label: "Submission state",
      value: submissionLabel,
      helper:
        pack.submissionStatus === "under_accountant_review"
          ? `${reviewCount} checklist items are currently with the accountant for review.`
          : pack.canComplete
            ? "All required documents are present and the month can move forward."
            : "The month is still open because required evidence is incomplete.",
      tone:
        pack.submissionStatus === "under_accountant_review"
          ? "info"
          : pack.canComplete
            ? "success"
            : "warning",
    },
    {
      id: "metric-4",
      label: "Compliance attention",
      value: String(expiringDocuments.length),
      helper:
        expiringDocuments.length > 0
          ? expiringDocuments[0].alertMessage
          : `No compliance expiries need action. Last upload was ${new Intl.DateTimeFormat("en-ZA", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(latestActivityDate))}.`,
      tone: expiringDocuments.length > 0 ? expiringDocuments[0].tone : "success",
    },
  ];
}

export function buildInvoiceReviewQueue(
  invoices: InvoiceRecord[],
  assignedAccountant: string,
): ReviewQueueItem[] {
  return invoices
    .filter((invoice) =>
      ["uploaded", "finalised", "sent_to_accountant", "under_review"].includes(invoice.status),
    )
    .map((invoice) => ({
      id: invoice.id,
      clientName: invoice.clientName,
      documentType: "Invoice",
      monthLabel: invoice.monthLabel,
      submittedAt: invoice.uploadedAt,
      status:
        invoice.status === "sent_to_accountant" || invoice.status === "finalised"
          ? "uploaded"
          : invoice.status === "under_review"
            ? "under_review"
            : "uploaded",
      assignedAccountant,
    }));
}

export function buildReviewDocumentFromInvoice(invoice: InvoiceRecord): DocumentRecord {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    documentType: "Invoice",
    fileName: invoice.fileName,
    monthLabel: invoice.monthLabel,
    description: invoice.description,
    status:
      invoice.status === "accepted"
        ? "accepted"
        : invoice.status === "rejected"
          ? "rejected"
          : invoice.status === "under_review"
            ? "under_review"
            : "uploaded",
    uploadedBy: invoice.clientName,
    uploadedAt: invoice.uploadedAt,
    sizeLabel: invoice.amountLabel,
    keywordTags: invoice.keywordTags,
    supplierName: invoice.supplierName,
    amountLabel: invoice.amountLabel,
    extractedText: invoice.extractedText,
    rejectionReason: invoice.rejectionReason,
    comments: [],
    auditTrail: [
      {
        id: `${invoice.id}-audit-1`,
        status: "Uploaded",
        actor: invoice.clientName,
        timestamp: invoice.uploadedAt,
        note: "Invoice entered the structured workflow.",
      },
      {
        id: `${invoice.id}-audit-2`,
        status: "Lifecycle",
        actor: "Workflow engine",
        timestamp: invoice.uploadedAt,
        note: `Invoice is currently ${invoice.status.replace(/_/g, " ")}.`,
      },
    ],
  };
}

function normaliseSearchValue(value: string) {
  return value.toLowerCase().trim();
}

function maybeExpiryStatus(expiryDate?: string, referenceDate = new Date()) {
  if (!expiryDate) {
    return undefined;
  }

  return differenceInDays(expiryDate, referenceDate) < 0 ? "expired" : "expiring_soon";
}

export function buildUnifiedSearchResults(args: {
  clientId: string;
  clientName: string;
  documents: DocumentRecord[];
  invoices: InvoiceRecord[];
  monthPack: MonthlyPack;
  requests?: {
    id: string;
    title: string;
    description: string;
    monthLabel: string;
    status: string;
    createdAt: string;
    comments: { id: string }[];
  }[];
  complianceDocuments?: ComplianceDocumentRecord[];
}): UnifiedSearchResult[] {
  const {
    clientId,
    clientName,
    complianceDocuments = [],
    documents,
    invoices,
    monthPack,
    requests = [],
  } = args;

  const documentResults = documents.map<UnifiedSearchResult>((document) => ({
    id: document.id,
    resultType:
      document.documentType === "Bank Statement"
        ? "bank_statement"
        : document.documentType === "Signed Documents"
          ? "signed_document"
          : document.documentType === "Compliance Record"
            ? "compliance_document"
          : document.expiryDate
            ? "compliance_document"
            : "document",
    title: document.fileName,
    clientId: document.clientId,
    clientName: document.clientName,
    monthLabel: document.monthLabel,
    typeLabel: document.documentType,
    status: document.status,
    date: document.uploadedAt,
    amountLabel: document.amountLabel,
    supplierName: document.supplierName,
    uploadedBy: document.uploadedBy,
    reviewedBy: document.reviewedBy,
    expiryDate: document.expiryDate,
    expiryStatus: maybeExpiryStatus(document.expiryDate),
    commentCount: document.comments.length,
    keywordText: [
      document.fileName,
      document.documentType,
      document.description,
      document.monthLabel,
      document.supplierName ?? "",
      document.amountLabel ?? "",
      document.extractedText ?? "",
      document.keywordTags.join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const invoiceResults = invoices.map<UnifiedSearchResult>((invoice) => ({
    id: invoice.id,
    resultType: "invoice",
    title: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    monthLabel: invoice.monthLabel,
    typeLabel: "Invoice",
    status:
      invoice.status === "finalised" ? "finalised" : invoice.status,
    date: invoice.uploadedAt,
    amountLabel: invoice.amountLabel,
    supplierName: invoice.supplierName,
    uploadedBy: invoice.clientName,
    commentCount: 0,
    keywordText: [
      invoice.invoiceNumber,
      invoice.fileName,
      invoice.description,
      invoice.monthLabel,
      invoice.amountLabel,
      invoice.supplierName ?? "",
      invoice.extractedText ?? "",
      invoice.keywordTags.join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const packResults = monthPack.slots.map<UnifiedSearchResult>((slot) => ({
    id: slot.id,
    resultType: "monthly_pack_item",
    title: slot.documentType,
    clientId,
    clientName,
    monthLabel: `${slot.month} ${slot.year}`,
    typeLabel: "Monthly Pack Item",
    status: slot.status,
    date: slot.lastSubmission ?? monthPack.dueDate,
    isRequired: slot.isRequired,
    uploadedBy: slot.assignedOwner ?? "Client",
    commentCount: 0,
    keywordText: [
      slot.documentType,
      slot.description,
      slot.month,
      String(slot.year),
      slot.status,
      slot.isRequired ? "required" : "optional",
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const complianceResults = complianceDocuments.map<UnifiedSearchResult>((document) => ({
    id: document.id,
    resultType: "compliance_document",
    title: document.name,
    clientId,
    clientName,
    monthLabel: "Compliance",
    typeLabel: document.name,
    status: document.status,
    date: document.issueDate,
    expiryDate: document.expiryDate,
    expiryStatus: document.status,
    uploadedBy: document.versionHistory[0]?.uploadedBy,
    commentCount: 0,
    keywordText: [
      document.name,
      document.category,
      document.owner,
      document.status,
      document.storageLabel,
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const requestResults = requests.map<UnifiedSearchResult>((request) => ({
    id: request.id,
    resultType: "request",
    title: request.title,
    clientId,
    clientName,
    monthLabel: request.monthLabel,
    typeLabel: "Follow-up Request",
    status: request.status === "resolved" ? "accepted" : "under_review",
    date: request.createdAt,
    commentCount: request.comments.length,
    keywordText: `${request.title} ${request.description} ${request.monthLabel}`.toLowerCase(),
  }));

  return [
    ...documentResults,
    ...invoiceResults,
    ...packResults,
    ...complianceResults,
    ...requestResults,
  ];
}

export function filterUnifiedSearchResults(
  results: UnifiedSearchResult[],
  filters: UnifiedSearchFilters,
) {
  const queryTokens = normaliseSearchValue(filters.query)
    .split(/\s+/)
    .filter(Boolean);
  const normalisedUploadedBy = normaliseSearchValue(filters.uploadedBy);
  const normalisedReviewedBy = normaliseSearchValue(filters.reviewedBy);
  const normalisedDocumentType = normaliseSearchValue(filters.documentType);
  const normalisedStatus = normaliseSearchValue(filters.status);
  const normalisedExpiryStatus = normaliseSearchValue(filters.expiryStatus);

  return results.filter((result) => {
    const resultYear = result.date ? String(new Date(result.date).getFullYear()) : "";
    const matchesQuery =
      queryTokens.length === 0 ||
      queryTokens.every((token) => result.keywordText.includes(token));
    const matchesClient = !filters.clientId || result.clientId === filters.clientId;
    const matchesMonth =
      !filters.month ||
      filters.month === "all" ||
      result.monthLabel.toLowerCase().includes(filters.month.toLowerCase());
    const matchesYear = !filters.year || resultYear === filters.year;
    const matchesDocumentType =
      !normalisedDocumentType ||
      result.typeLabel.toLowerCase().includes(normalisedDocumentType);
    const matchesStatus =
      !normalisedStatus || result.status.toLowerCase().includes(normalisedStatus);
    const matchesExpiry =
      !normalisedExpiryStatus || result.expiryStatus === normalisedExpiryStatus;
    const matchesRequired =
      !filters.requiredFlag ||
      filters.requiredFlag === "all" ||
      (filters.requiredFlag === "required" && result.isRequired === true) ||
      (filters.requiredFlag === "optional" && result.isRequired === false);
    const matchesUploadedBy =
      !normalisedUploadedBy ||
      (result.uploadedBy ?? "").toLowerCase().includes(normalisedUploadedBy);
    const matchesReviewedBy =
      !normalisedReviewedBy ||
      (result.reviewedBy ?? "").toLowerCase().includes(normalisedReviewedBy);

    return (
      matchesQuery &&
      matchesClient &&
      matchesMonth &&
      matchesYear &&
      matchesDocumentType &&
      matchesStatus &&
      matchesExpiry &&
      matchesRequired &&
      matchesUploadedBy &&
      matchesReviewedBy
    );
  });
}
