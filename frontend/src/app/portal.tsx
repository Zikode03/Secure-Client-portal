import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
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
import type {
  AccountantDashboardData,
  AuditTrailEntry,
  BusinessProfile,
  ClientWorkflowSeed,
  ComplianceCentreData,
  DocumentComment,
  DocumentPolicy,
  DocumentRecord,
  FirmClientAccount,
  InvoiceRecord,
  ManagedAccountant,
  MonthlyPack,
  NotificationItem,
  PortfolioStatus,
  ReviewQueueItem,
  Role,
  SessionUser,
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
  "firm-client-4": "Sipho Maseko",
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
    title: "Re-upload expense invoices with readable VAT details",
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
          "Please upload the corrected stationery and fuel invoices into the same April expense slot.",
        createdAt: "2026-04-30T09:15:00.000Z",
      },
    ],
    auditTrail: [
      {
        id: "request-audit-1",
        status: "Follow-up sent",
        actor: "Daniel Mokoena",
        timestamp: "2026-04-30T09:15:00.000Z",
        note: "Requested corrected supplier evidence for the rejected April expense batch.",
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
}

interface PortalContextValue {
  clientProfile: BusinessProfile;
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
  addRequestComment: (
    requestId: string,
    author: string,
    role: Role,
    message: string,
  ) => PortalActionResult;
  createFollowUpRequest: (payload: FollowUpRequestPayload) => PortalActionResult;
  updateBusinessProfile: (profile: BusinessProfile) => PortalActionResult;
  assignClientAccountant: (clientId: string, accountantName: string) => PortalActionResult;
  updateClientDeadlinePolicy: (clientId: string, deadlinePolicy: string) => PortalActionResult;
  filterSearchResults: (
    results: UnifiedSearchResult[],
    filters: UnifiedSearchFilters,
  ) => UnifiedSearchResult[];
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
) {
  return [
    {
      id: `activity-${current.length + 10}`,
      title,
      detail,
      timestamp: new Date().toISOString(),
      tone,
    },
    ...current,
  ].slice(0, 12);
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
  const clientComplianceCentre = useMemo(
    () => portalService.getClientComplianceCentre(),
    [],
  );
  const accountantComplianceCentre = useMemo(
    () => portalService.getAccountantComplianceCentre(),
    [],
  );
  const [monthPack, setMonthPack] = useState(() =>
    recalculatePack({
      ...clone(clientSeed.monthPack),
      submissionStatus: "open" as const,
      slots: clone(clientSeed.monthPack.slots).map((slot) => ({
        ...slot,
        assignedOwner: slot.assignedOwner ?? "Client",
        dueDate: slot.dueDate ?? clientSeed.monthPack.dueDate,
      })),
    }),
  );
  const [documents, setDocuments] = useState(() => clone(clientSeed.documents));
  const [invoices, setInvoices] = useState(() => clone(clientSeed.invoices));
  const [notifications] = useState(() => clone(clientSeed.notifications));
  const [activity, setActivity] = useState(() => clone(clientSeed.activity));
  const [requests, setRequests] = useState(() => clone(initialRequests));
  const [clientProfile, setClientProfile] = useState(() => clone(initialProfile));
  const [adminClients, setAdminClients] = useState(() => clone(baseAdminClients));
  const [adminPolicies] = useState(() => clone(baseAdminPolicies));
  const [managedAccountants] = useState(() => clone(initialAccountants));
  const [userAccounts] = useState(() => clone(initialUsers));

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
  const unifiedSearchResults = useMemo(
    () =>
      buildUnifiedSearchResults({
        clientId: "client-apex",
        clientName: clientProfile.legalName,
        documents,
        invoices,
        monthPack,
        requests,
        complianceDocuments: clientComplianceCentre.categoryGroups.flatMap(
          (group) => group.documents,
        ),
      }),
    [clientComplianceCentre.categoryGroups, clientProfile.legalName, documents, invoices, monthPack, requests],
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
      requests,
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
      monthPack,
      rejectedDocuments,
      requests,
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
        `${targetSlot.documentType} uploaded`,
        `A new file was placed into the controlled ${targetSlot.documentType} slot for ${targetSlot.month} ${targetSlot.year}.`,
        "success",
      ),
    );

    return {
      ok: true,
      message: `Upload prepared for ${submission.autoName}. The file is now tied to the ${targetSlot.documentType} checklist slot.`,
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
                rejectionReason: action === "rejected" ? reason?.trim() : undefined,
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
    if (!targetDocument) {
      return { ok: false, message: "The selected document thread could not be found." };
    }

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
            }
          : document,
      ),
    );

    return { ok: true, message: "Comment added to the document thread." };
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

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: role === "client" ? "client_replied" : request.status,
              comments: [
                ...request.comments,
                {
                  id: `${requestId}-comment-${request.comments.length + 1}`,
                  author,
                  role,
                  message: trimmedMessage,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : request,
      ),
    );

    return { ok: true, message: "Comment added to the request thread." };
  }

  function createFollowUpRequest(payload: FollowUpRequestPayload): PortalActionResult {
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
        createdAt: new Date().toISOString(),
        comments: [],
        auditTrail: [
          {
            id: `request-audit-${current.length + 100}`,
            status: "Follow-up sent",
            actor: payload.actor.fullName,
            timestamp: new Date().toISOString(),
            note: payload.description,
          },
        ],
      },
      ...current,
    ]);

    return { ok: true, message: "Follow-up request added to the client workflow." };
  }

  function updateBusinessProfile(profile: BusinessProfile): PortalActionResult {
    setClientProfile(profile);
    return { ok: true, message: "Business profile updated for the client workspace." };
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

  function getReviewQueue() {
    const staticQueue = baseAccountantDashboard.reviewQueue.filter(
      (item) => item.clientName !== "Apex Trading Ltd",
    );
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

    return [...dynamicDocumentQueue, ...dynamicInvoiceQueue, ...staticQueue].slice(0, 15);
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
      const seedDocument = portalService.getDocumentById("doc-1001");
      return {
        ...seedDocument,
        id: fallback.id,
        clientName: fallback.clientName,
        documentType: fallback.documentType,
        monthLabel: fallback.monthLabel,
      };
    }

    return documents[0];
  }

  function getClientWorkspace(clientId: string): ClientWorkspaceView {
    if (clientId === "client-apex" || clientId === "firm-client-1") {
      return currentClientWorkspace;
    }

    const client =
      adminClients.find((item) => item.id === clientId) ?? currentClientWorkspace.client;
    return buildTemplateWorkspace(client, currentClientWorkspace);
  }

  const accountantDashboard = useMemo<AccountantDashboardData>(() => {
    const otherPortfolioRows = baseAccountantDashboard.portfolio.filter(
      (row) => row.clientName !== "Apex Trading Ltd",
    );
    const apexMissingDocuments = buildMissingDocuments(monthPack, clientProfile.legalName);
    const apexPortfolioRow = {
      id: "portfolio-1",
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

    return {
      ...baseAccountantDashboard,
      summaryMetrics: [
        {
          id: "acc-metric-1",
          label: "Total clients",
          value: String(portfolio.length),
          helper: "Active clients with structured monthly workflows.",
          tone: "info",
        },
        {
          id: "acc-metric-2",
          label: "Clients missing documents",
          value: String(portfolio.filter((row) => row.missingCount > 0).length),
          helper: "Required slots are still open across these clients.",
          tone: "danger",
        },
        {
          id: "acc-metric-3",
          label: "Overdue submissions",
          value: String(portfolio.filter((row) => row.status === "overdue").length),
          helper: "Deadline has passed and follow-up is required today.",
          tone: "warning",
        },
        {
          id: "acc-metric-4",
          label: "Pending review",
          value: String(reviewQueue.length),
          helper: "Documents and invoices waiting for accountant action.",
          tone: "success",
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
    rejectedDocuments,
    reconciliationIssues,
    smartAlerts,
  ]);

  const value = useMemo<PortalContextValue>(
    () => ({
      clientProfile,
      clientWorkflow: {
        seed: clientSeed,
        monthPack,
        documents,
        invoices,
        notifications,
        activity,
        requests,
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
      addRequestComment,
      createFollowUpRequest,
      updateBusinessProfile,
      assignClientAccountant,
      updateClientDeadlinePolicy,
      filterSearchResults: filterUnifiedSearchResults,
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
      clientProfile,
      clientSeed,
      documents,
      expiringDocuments,
      invoices,
      latestInvoices,
      latestOverallDocuments,
      latestUploadedDocuments,
      managedAccountants,
      missingRequiredDocuments,
      monthPack,
      notifications,
      previousMonthComparison,
      previousMonthDocuments,
      reconciliationIssues,
      rejectedDocuments,
      requests,
      smartAlerts,
      summaryMetrics,
      unifiedSearchResults,
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
