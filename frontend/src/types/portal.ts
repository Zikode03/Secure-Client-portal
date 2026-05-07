export type Role = "client" | "accountant" | "admin";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export type SlotStatus =
  | "missing"
  | "uploaded"
  | "partial"
  | "pending"
  | "pending_signature"
  | "under_review"
  | "accepted"
  | "rejected"
  | "filed";

export type LifecycleStatus =
  | "uploaded"
  | "under_review"
  | "accepted"
  | "rejected"
  | "filed";

export type InvoiceStatus =
  | "draft"
  | "uploaded"
  | "finalised"
  | "sent_to_accountant"
  | "under_review"
  | "accepted"
  | "rejected";

export type DeadlineStatus = "on_track" | "due" | "late";

export type PortfolioStatus = "on_track" | "attention" | "overdue";

export type WorkflowStatus =
  | DeadlineStatus
  | LifecycleStatus
  | PortfolioStatus
  | SlotStatus
  | InvoiceStatus
  | "valid"
  | "expired"
  | "expiring_soon";

export type NotificationKind =
  | "missing_documents"
  | "rejected_documents"
  | "deadline_reminder"
  | "expiring_documents";

export interface SessionUser {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: Role;
  title: string;
  company: string;
  initials: string;
  clientIds: string[];
}

export interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  progress?: number;
}

export interface MonthlyDocumentSlot {
  id: string;
  documentType: string;
  description: string;
  status: SlotStatus;
  month: string;
  year: number;
  acceptedFiles: string[];
  progress: number;
  autoName: string;
  isRequired: boolean;
  assignedOwner?: string;
  dueDate?: string;
  supportsExpiryDate?: boolean;
  lastSubmission?: string;
  rejectionReason?: string;
}

export type MonthlyPackSubmissionStatus =
  | "open"
  | "submitted"
  | "under_accountant_review"
  | "complete";

export interface MonthlyPack {
  monthLabel: string;
  dueDate: string;
  deadlineStatus: DeadlineStatus;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  canComplete: boolean;
  completionMessage: string;
  submissionStatus?: MonthlyPackSubmissionStatus;
  submittedAt?: string;
  slots: MonthlyDocumentSlot[];
}

export interface DocumentComment {
  id: string;
  author: string;
  role: Role;
  message: string;
  createdAt: string;
}

export interface AuditTrailEntry {
  id: string;
  status: string;
  actor: string;
  timestamp: string;
  note: string;
}

export interface DocumentRecord {
  id: string;
  clientId: string;
  clientName: string;
  documentType: string;
  fileName: string;
  monthLabel: string;
  description: string;
  status: LifecycleStatus;
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  sizeLabel: string;
  keywordTags: string[];
  supplierName?: string;
  amountLabel?: string;
  extractedText?: string;
  expiryDate?: string;
  rejectionReason?: string;
  comments: DocumentComment[];
  auditTrail: AuditTrailEntry[];
}

export interface InvoiceRecord {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  fileName: string;
  monthLabel: string;
  description: string;
  amountLabel: string;
  uploadedAt: string;
  status: InvoiceStatus;
  keywordTags: string[];
  supplierName?: string;
  extractedText?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: DocumentComment[];
  auditTrail?: AuditTrailEntry[];
}

export type NotificationState = "unread" | "reviewed" | "resolved" | "snoozed";

export interface NotificationActivityEntry {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: Tone;
  actor?: string;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  dueDate?: string;
  tone: Tone;
  actionLabel: string;
  actionHref: string;
  linkedRecordLabel?: string;
  linkedWorkspace?: "monthly_packs" | "documents" | "requests" | "compliance";
  impactLabel?: string;
  blockingLabel?: string;
  nextStep?: string;
  state?: NotificationState;
  activity?: NotificationActivityEntry[];
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: Tone;
  actor?: string;
  relatedLabel?: string;
}

export interface LatestRecordItem {
  id: string;
  name: string;
  type: string;
  date: string;
  status: WorkflowStatus;
  kind: "document" | "invoice";
  amountLabel?: string;
  clientName?: string;
}

export interface ExpiringDocumentItem {
  id: string;
  fileName: string;
  documentType: string;
  expiresOn: string;
  owner: string;
  tone: Tone;
  daysRemaining: number;
  status: "expiring_soon" | "expired";
  alertMessage: string;
}

export interface MissingDocumentItem {
  id: string;
  documentType: string;
  monthLabel: string;
  description: string;
  isRequired: boolean;
  status: SlotStatus;
  clientName?: string;
  dueDate?: string;
  lastSubmission?: string;
  rejectionReason?: string;
}

export interface RejectedDocumentItem {
  id: string;
  name: string;
  type: string;
  reason: string;
  date: string;
  clientName?: string;
  status: "rejected";
}

export interface PreviousMonthComparison {
  currentMonthLabel: string;
  previousMonthLabel: string;
  currentInvoiceCount: number;
  previousInvoiceCount: number;
  delta: number;
  message: string;
  tone: Tone;
}

export interface SearchFilters {
  query: string;
  amount: string;
  supplier: string;
  date: string;
  month: string;
  keyword: string;
}

export type SearchResultType =
  | "invoice"
  | "bank_statement"
  | "compliance_document"
  | "signed_document"
  | "monthly_pack_item"
  | "document"
  | "request";

export interface UnifiedSearchFilters {
  query: string;
  clientId: string;
  month: string;
  year: string;
  documentType: string;
  status: string;
  expiryStatus: string;
  requiredFlag: string;
  uploadedBy: string;
  reviewedBy: string;
}

export interface UnifiedSearchResult {
  id: string;
  resultType: SearchResultType;
  title: string;
  clientId: string;
  clientName: string;
  monthLabel: string;
  typeLabel: string;
  status: WorkflowStatus;
  date: string;
  amountLabel?: string;
  supplierName?: string;
  uploadedBy?: string;
  reviewedBy?: string;
  expiryDate?: string;
  expiryStatus?: ComplianceDocumentStatus;
  isRequired?: boolean;
  commentCount: number;
  keywordText: string;
}

export interface SmartAlertItem {
  id: string;
  title: string;
  message: string;
  tone: Tone;
  category:
    | "anomaly"
    | "completeness"
    | "sequence"
    | "revenue"
    | "reconciliation";
}

export interface BankTransaction {
  id: string;
  monthLabel: string;
  date: string;
  reference: string;
  description: string;
  counterparty: string;
  amountLabel: string;
  amountValue: number;
  direction: "inflow" | "outflow";
}

export interface ReconciliationIssue {
  id: string;
  transactionDate: string;
  reference: string;
  counterparty: string;
  amountLabel: string;
  message: string;
  suggestedAction: string;
  tone: Tone;
  matchedInvoiceNumber?: string;
}

export interface UploadSubmission {
  slotId: string;
  fileName: string;
  autoName: string;
  documentType: string;
  clientBusinessName: string;
  month: string;
  year: number;
  description: string;
  expiryDate?: string;
}

export interface ClientWorkflowSeed {
  monthPack: MonthlyPack;
  documents: DocumentRecord[];
  invoices: InvoiceRecord[];
  bankTransactions: BankTransaction[];
  notifications: NotificationItem[];
  activity: ActivityItem[];
  currentMonthInvoiceCount: number;
  previousMonthInvoiceCount: number;
  currentMonthLabel: string;
  previousMonthLabel: string;
}

export interface ClientDocumentCenterData {
  latestDocuments: DocumentRecord[];
  previousMonthDocuments: DocumentRecord[];
  expiringDocuments: DocumentRecord[];
  rejectedDocuments: DocumentRecord[];
}

export type RequestStatus =
  | "open"
  | "awaiting_client"
  | "client_replied"
  | "resolved"
  | "closed";

export type RequestPriority = "low" | "medium" | "high";

export interface WorkflowRequest {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  monthLabel: string;
  status: RequestStatus;
  priority: RequestPriority;
  relatedDocumentId?: string;
  requestedBy: string;
  requestedByRole: Role;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  comments: DocumentComment[];
  auditTrail: AuditTrailEntry[];
}

export interface BusinessProfile {
  clientId: string;
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  taxNumber: string;
  vatNumber: string;
  primaryContact: string;
  financeEmail: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string;
}

export interface ClientNotificationPreferences {
  deadlineAlerts: boolean;
  rejectionAlerts: boolean;
  complianceAlerts: boolean;
  weeklySummary: boolean;
  browserAlerts: boolean;
}

export interface ClientSecuritySession {
  id: string;
  label: string;
  lastActiveAt: string;
  location: string;
  isCurrent: boolean;
}

export interface ClientSecuritySettings {
  mfaEnabled: boolean;
  passwordLastChangedAt: string;
  recoveryEmail: string;
  activeSessions: ClientSecuritySession[];
}

export interface ClientDocumentPreferences {
  structuredUploadsOnly: boolean;
  autoNamingLocked: boolean;
  retentionMode: "audit_ready" | "standard";
  preferredExport: "pdf" | "csv";
  acceptedFormats: string[];
}

export interface ClientSettingsState {
  notificationPreferences: ClientNotificationPreferences;
  security: ClientSecuritySettings;
  documentPreferences: ClientDocumentPreferences;
}

export interface ScheduledReport {
  id: string;
  frequency: "weekly" | "monthly";
  nextRunAt: string;
  recipients: string[];
  lastScheduledAt: string;
}

export interface PortfolioRow {
  id: string;
  clientId: string;
  clientName: string;
  monthLabel: string;
  progressPercent: number;
  status: PortfolioStatus;
  assignedAccountant: string;
  missingCount: number;
  overdueCount: number;
  deadline: string;
}

export interface ReviewQueueItem {
  id: string;
  clientName: string;
  documentType: string;
  monthLabel: string;
  submittedAt: string;
  status: LifecycleStatus;
  assignedAccountant: string;
}

export interface DeadlineItem {
  id: string;
  label: string;
  dueDate: string;
  owner: string;
  tone: Tone;
}

export interface AccountantDashboardData {
  summaryMetrics: SummaryMetric[];
  portfolio: PortfolioRow[];
  reviewQueue: ReviewQueueItem[];
  deadlines: DeadlineItem[];
  notifications: NotificationItem[];
  smartAlerts: SmartAlertItem[];
  reconciliationIssues: ReconciliationIssue[];
  missingDocuments: MissingDocumentItem[];
  expiringDocuments: ExpiringDocumentItem[];
  rejectedDocuments: RejectedDocumentItem[];
  latestOverallDocuments: LatestRecordItem[];
}

export interface ReviewWorkspaceData {
  queue: ReviewQueueItem[];
  selectedDocument: DocumentRecord;
}

export interface FirmClientAccount {
  id: string;
  clientName: string;
  industry: string;
  assignedAccountant: string;
  requiredPack: string;
  completionRate: number;
  deadlinePolicy: string;
  status: PortfolioStatus;
}

export interface DocumentPolicy {
  id: string;
  name: string;
  description: string;
  requiredByDay: string;
  gracePeriod: string;
  owner: string;
}

export interface AdminDashboardData {
  summaryMetrics: SummaryMetric[];
  clients: FirmClientAccount[];
  policies: DocumentPolicy[];
  notifications: NotificationItem[];
}

export interface ManagedAccountant {
  id: string;
  name: string;
  email: string;
  title: string;
  assignedClientCount: number;
  openReviews: number;
  status: "active" | "busy" | "capacity_available";
}

export interface UserAccountRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  company?: string;
}

export type ComplianceCategory =
  | "sars_related"
  | "company_statutory"
  | "monthly_accounting";

export type ComplianceDocumentStatus = "valid" | "expiring_soon" | "expired";

export interface ComplianceReminder {
  id: string;
  label: "30 days" | "14 days" | "7 days" | "expired";
  reminderDate: string;
  state: "scheduled" | "sent" | "triggered";
}

export interface ComplianceDocumentVersion {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "accepted" | "replaced" | "rejected";
}

export interface ComplianceDocumentRecord {
  id: string;
  name: string;
  category: ComplianceCategory;
  issueDate: string;
  expiryDate: string;
  status: ComplianceDocumentStatus;
  owner: "client" | "accountant";
  reminderDates: ComplianceReminder[];
  isLocked: boolean;
  versionHistory: ComplianceDocumentVersion[];
  storageLabel: string;
}

export interface ComplianceAuditEvent {
  id: string;
  action: "uploaded" | "reviewed" | "approved" | "rejected" | "downloaded" | "new_version";
  actor: string;
  timestamp: string;
  detail: string;
}

export interface ComplianceCategoryGroup {
  id: ComplianceCategory;
  title: string;
  description: string;
  documents: ComplianceDocumentRecord[];
}

export interface ComplianceClientStatus {
  id: string;
  clientName: string;
  score: number;
  expiredCount: number;
  expiringSoonCount: number;
  missingRequiredCount: number;
  reportReadyAt: string;
}

export interface ComplianceCentreData {
  summaryMetrics: SummaryMetric[];
  overallScore: number;
  expiredDocuments: ComplianceDocumentRecord[];
  expiringDocuments: ComplianceDocumentRecord[];
  missingRequiredDocuments: MissingDocumentItem[];
  categoryGroups: ComplianceCategoryGroup[];
  auditTrail: ComplianceAuditEvent[];
  secureRules: string[];
  reportGeneratedAt: string;
  retentionNote: string;
  clientStatuses?: ComplianceClientStatus[];
}
