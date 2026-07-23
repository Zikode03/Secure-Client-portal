// Friendly guide: this module (AccountantComplianceCentrePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import { portalServiceApi } from "../../services/portalApi";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedComplianceStatuses, hasPermission } from "../../utils/permissions";
import type { Tone } from "../../types/portal";

// Shared shape notes: these types keep UI and data contracts aligned.
type RiskFilter = "all" | "low" | "medium" | "high";
type StatusFilter = "all" | "compliant" | "pending" | "non_compliant";
type ComplianceBoardStatus = "Compliant" | "Expiring Soon" | "Overdue";

type SupplierComplianceState = "compliant" | "pending" | "non_compliant";

interface SupplierRow {
  id: string;
  name: string;
  category: string;
  contractExpiry: string;
  complianceState: SupplierComplianceState;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
}

interface BackendMonthlyPackRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface BackendDocumentSlotRecord {
  id: string;
  monthlyPackId: string;
  clientId: string;
  category: string;
  label: string;
  isRequired: boolean;
  status: string;
  canCurrentlyBeSubmitted: boolean;
  currentDocumentId?: string | null;
  dueDateUtc?: string | null;
  submittedAtUtc?: string | null;
  reviewStatus?: string | null;
  rejectionReason?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

const categories = [
  "Tax Compliance",
  "CIPC",
  "Payroll",
  "VAT",
  "Audit",
  "Corporate",
];

// Component flow: gather data first, then render a focused UI state.
function dueStatusLabel(dateIso: string) {
  const diffDays = Math.ceil(
    (new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return "Overdue";
  }

  if (diffDays <= 14) {
    return "Expiring Soon";
  }

  return "Compliant";
}

function dueStatusClasses(label: string) {
  if (label === "Overdue") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (label === "Expiring Soon") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function initialsForName(value: string | undefined) {
  return (value ?? "Assigned Owner")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapRiskLevel(score: number) {
  if (score >= 70) {
    return "low" as const;
  }

  if (score >= 45) {
    return "medium" as const;
  }

  return "high" as const;
}

function mapComplianceState(score: number): SupplierComplianceState {
  if (score >= 75) {
    return "compliant";
  }

  if (score >= 45) {
    return "pending";
  }

  return "non_compliant";
}

function mapBackendSlotStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "not_started") return "missing";
  if (normalized === "draft") return "draft";
  if (normalized === "partial") return "partial";
  if (normalized === "pending") return "pending";
  if (normalized === "pending_signature") return "pending_signature";
  if (normalized === "submitted" || normalized === "uploaded") return "uploaded";
  if (normalized === "under_review") return "under_review";
  if (normalized === "accepted") return "accepted";
  if (normalized === "reupload_required" || normalized === "rejected") return "rejected";
  return "filed";
}

function buildPackDueDate(pack: BackendMonthlyPackRecord, slots: BackendDocumentSlotRecord[]) {
  const dueDates = slots
    .map((slot) => slot.dueDateUtc)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));

  if (dueDates.length > 0) {
    return dueDates[0];
  }

  const safeDay = Math.min(28, new Date(pack.year, pack.month, 0).getDate());
  return new Date(Date.UTC(pack.year, pack.month - 1, safeDay)).toISOString();
}

export function AccountantComplianceCentrePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const currentDateLabel = useMemo(() => formatDateLabel(new Date().toISOString()), []);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dueAttentionOnly, setDueAttentionOnly] = useState(false);
  const [openClientActionsId, setOpenClientActionsId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeView, setActiveView] = useState<"list" | "board">("list");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ComplianceBoardStatus>>(
    {},
  );
  const [boardAuditTrail, setBoardAuditTrail] = useState<
    Array<{ id: string; itemName: string; from: ComplianceBoardStatus; to: ComplianceBoardStatus; actor: string; timestamp: string }>
  >([]);
  const [feedbackNotice, setFeedbackNotice] = useState<
    { tone: Tone; title: string; message: string } | null
  >(null);
  const [liveSupplierRows, setLiveSupplierRows] = useState<SupplierRow[] | null>(null);
  const pageSize = 5;
  const canRequestDocuments = hasPermission(user, "request:documents");
  const canExportReports =
    hasPermission(user, "export:client_reports") || hasPermission(user, "export:firm_reports");
  const canReviewDocuments = hasPermission(user, "review:documents");
  const complianceItemsRef = useRef<HTMLDivElement | null>(null);

  const clientStatuses = useMemo(
    () =>
      getScopedComplianceStatuses(
        user,
        portal.accountantComplianceCentre.clientStatuses ?? [],
        portal.adminClients,
      ),
    [portal.accountantComplianceCentre.clientStatuses, portal.adminClients, user],
  );

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isActive = true;

    async function loadLiveComplianceRows() {
      try {
        const [clients, packs] = await Promise.all([
          portalServiceApi.getAdminClients(),
          apiGetJson<BackendMonthlyPackRecord[]>("/api/monthly-packs"),
        ]);

        const slotResponses = await Promise.all(
          packs.map(async (pack) => ({
            monthlyPackId: pack.id,
            slots: await apiGetJson<BackendDocumentSlotRecord[]>(`/api/document-slots/${encodeURIComponent(pack.id)}`),
          })),
        );

        if (!isActive) {
          return;
        }

        const scopedClients = getScopedClients(user, clients);
        const slotsByPackId = new Map(slotResponses.map((entry) => [entry.monthlyPackId, entry.slots]));
        const latestPackByClientId = new Map();

        packs.forEach((pack) => {
          const current = latestPackByClientId.get(pack.clientId);
          const currentKey = current ? current.year * 100 + current.month : 0;
          const nextKey = pack.year * 100 + pack.month;
          if (!current || nextKey > currentKey) {
            latestPackByClientId.set(pack.clientId, pack);
          }
        });

        const rows = scopedClients.map((client: (typeof scopedClients)[number], index: number) => {
          const latestPack = latestPackByClientId.get(client.id);
          const slots = latestPack ? slotsByPackId.get(latestPack.id) ?? [] : [];
          const dueDate = latestPack ? buildPackDueDate(latestPack, slots) : new Date().toISOString();
          const requiredBlockingSlots = slots.filter((slot) => {
            if (!slot.isRequired) return false;
            const mappedStatus = mapBackendSlotStatus(slot.status);
            return mappedStatus === "missing" || mappedStatus === "draft" || mappedStatus === "partial" || mappedStatus === "pending" || mappedStatus === "pending_signature" || mappedStatus === "rejected";
          });
          const completedSlots = slots.filter((slot) => {
            const mappedStatus = mapBackendSlotStatus(slot.status);
            return mappedStatus === "accepted" || mappedStatus === "under_review" || mappedStatus === "uploaded" || mappedStatus === "filed";
          }).length;
          const completionScore = slots.length > 0 ? Math.round((completedSlots / slots.length) * 100) : client.completionRate;
          const headlineSlot = requiredBlockingSlots[0] ?? slots[0];
          const hasOverdue = requiredBlockingSlots.some((slot) => new Date(slot.dueDateUtc ?? dueDate).getTime() < Date.now());

          return {
            id: client.id,
            name: client.clientName,
            category: headlineSlot?.label || headlineSlot?.category || categories[index % categories.length],
            contractExpiry: headlineSlot?.dueDateUtc || dueDate,
            complianceState: mapComplianceState(completionScore),
            riskLevel: hasOverdue ? "high" : mapRiskLevel(completionScore),
            riskScore: Math.max(1, 100 - completionScore),
          };
        });

        setLiveSupplierRows(rows);
      } catch (error) {
        if (!isActive) return;
        setFeedbackNotice({
          tone: "warning",
          title: "Live compliance workspace unavailable",
          message: error instanceof ApiError ? error.message : "The live compliance workspace could not be loaded, so the seeded view is still shown.",
        });
      }
    }

    void loadLiveComplianceRows();

    return () => {
      isActive = false;
    };
  }, [backendMode, user]);

  const supplierRows = useMemo<SupplierRow[]>(() => {
    if (backendMode && liveSupplierRows) {
      return liveSupplierRows;
    }

    return clientStatuses.map((item, index) => {
      const riskLevel = mapRiskLevel(item.score);
      const complianceState = mapComplianceState(item.score);
      const fallbackExpiry = new Date(item.lastReviewed);
      fallbackExpiry.setDate(fallbackExpiry.getDate() + 21);

      return {
        id: item.clientId,
        name: item.clientName,
        category: categories[index % categories.length],
        contractExpiry: item.topPriorities[0]?.dueDate ?? fallbackExpiry.toISOString(),
        complianceState,
        riskLevel,
        riskScore: Math.max(1, 100 - item.score),
      };
    });
  }, [backendMode, clientStatuses, liveSupplierRows]);

  const selectedClient = useMemo(() => {
    if (supplierRows.length === 0) {
      return undefined;
    }

    if (selectedClientId.length === 0) {
      return supplierRows[0];
    }

    return supplierRows.find((row) => row.id === selectedClientId) ?? supplierRows[0];
  }, [selectedClientId, supplierRows]);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return supplierRows.filter((row) => {
      const queryMatch =
        query.length === 0 ||
        row.name.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query);
      const riskMatch = riskFilter === "all" || row.riskLevel === riskFilter;
      const statusMatch = statusFilter === "all" || row.complianceState === statusFilter;
      const categoryMatch = categoryFilter === "all" || row.category === categoryFilter;
      const dueAttentionMatch =
        !dueAttentionOnly || dueStatusLabel(row.contractExpiry) !== "Compliant";

      return queryMatch && riskMatch && statusMatch && categoryMatch && dueAttentionMatch;
    });
  }, [categoryFilter, dueAttentionOnly, riskFilter, searchQuery, statusFilter, supplierRows]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const pagedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [currentPage, filteredSuppliers]);

  const startIndex = filteredSuppliers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredSuppliers.length);

  function statusForRow(row: SupplierRow): ComplianceBoardStatus {
    return statusOverrides[row.id] ?? (dueStatusLabel(row.contractExpiry) as ComplianceBoardStatus);
  }

  function canTransitionStatus(
    from: ComplianceBoardStatus,
    to: ComplianceBoardStatus,
  ) {
    if (from === to) {
      return false;
    }

    if (!canReviewDocuments) {
      return false;
    }

    if (from === "Compliant" && to === "Expiring Soon") {
      return true;
    }

    if (from === "Expiring Soon" && (to === "Compliant" || to === "Overdue")) {
      return true;
    }

    return false;
  }

  function moveBoardItem(row: SupplierRow, to: ComplianceBoardStatus) {
    const from = statusForRow(row);
    if (!canTransitionStatus(from, to)) {
      return;
    }

    setStatusOverrides((current) => ({ ...current, [row.id]: to }));
    setBoardAuditTrail((current) => [
      {
        id: `${row.id}-${Date.now()}`,
        itemName: row.category,
        from,
        to,
        actor: user?.fullName ?? "Unknown user",
        timestamp: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  const compliantCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Compliant").length;
  const expiringSoonCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Expiring Soon").length;
  const expiredCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Overdue").length;
  const totalStatusCount = Math.max(1, compliantCount + expiringSoonCount + expiredCount);
  const compliantPercent = Math.round((compliantCount / totalStatusCount) * 100);
  const expiringPercent = Math.round((expiringSoonCount / totalStatusCount) * 100);
  const expiredPercent = Math.max(0, 100 - compliantPercent - expiringPercent);
  const upcomingExpirations = useMemo(() => {
    return [...supplierRows]
      .sort(
        (a, b) =>
          new Date(a.contractExpiry).getTime() - new Date(b.contractExpiry).getTime(),
      )
      .slice(0, 3);
  }, [supplierRows]);

  function showNotice(tone: Tone, title: string, message: string) {
    setFeedbackNotice({ tone, title, message });
  }

  function focusComplianceItems() {
    setActiveView("list");
    setSearchQuery("");
    setRiskFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDueAttentionOnly(false);
    setCurrentPage(1);
    setTimeout(() => {
      complianceItemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function focusExpiringAndOverdueItems() {
    setActiveView("list");
    setSearchQuery("");
    setRiskFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDueAttentionOnly(true);
    setCurrentPage(1);
    setTimeout(() => {
      complianceItemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openSelectedClientWorkspace(clientId: string) {
    setSelectedClientId(clientId);
    navigate(`/firm/clients/${clientId}`);
  }

  function createComplianceFollowUp(client: SupplierRow | undefined) {
    if (!client || !user || !canRequestDocuments) {
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const result = portal.createClientRequest({
      clientId: client.id,
      clientName: client.name,
      monthLabel: formatDateLabel(new Date().toISOString()),
      title: `Compliance follow-up: ${client.category}`,
      description: `Please upload/refresh the required ${client.category} compliance records before the due date.`,
      dueDate: dueDate.toISOString(),
      priority: "high",
      actor: user,
      assignedAccountant: user.fullName,
    });

    showNotice(result.ok ? "success" : "danger", result.ok ? "Request created" : "Request failed", result.message);
  }

  function downloadComplianceCsv() {
    const headers = [
      "Item Name",
      "Client",
      "Category",
      "Expiry Date",
      "Status",
      "Risk Level",
      "Owner",
    ];

    const rows = filteredSuppliers.map((row) => [
      row.category,
      row.name,
      row.category,
      formatDateLabel(row.contractExpiry),
      dueStatusLabel(row.contractExpiry),
      row.riskLevel,
      user?.fullName ?? "Nayan Dhali",
    ]);

    const csv = [headers, ...rows]
      .map((line) =>
        line
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "compliance-items.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-6">
      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <div className="space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[2.15rem] font-medium text-[#061848]">
              Compliance Workspace
            </h1>
            <p className="mt-2 text-[1rem] font-medium text-[#53617f]">
              Monitor client compliance, expiries and regulatory obligations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-medium text-[#061848] shadow-[0_10px_28px_rgba(4,24,52,0.04)] transition hover:bg-[#f7fbff]"
              onClick={() => navigate("/firm/compliance/calendar")}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 text-brand-700" fill="none" viewBox="0 0 24 24">
                <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6.5" />
                <path d="M8 4.5v4m8-4v4M4 10.5h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <span>{currentDateLabel}</span>
            </button>
            <Button
              className="h-12 rounded-xl bg-[#061848] px-5 text-white hover:bg-[#0b255f]"
              onClick={() => createComplianceFollowUp(selectedClient)}
            >
              <span className="text-lg leading-none">+</span>
              <span>Add Compliance Item</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {[
            {
              label: "Total Items",
              value: totalStatusCount,
              helper: "12% from last month",
              tone: "brand",
              ring: "border-t-brand-600",
              icon: "text-brand-600 bg-brand-50",
            },
            {
              label: "Expiring Soon",
              value: expiringSoonCount,
              helper: "0% from last month",
              tone: "amber",
              ring: "border-t-amber-500",
              icon: "text-amber-600 bg-amber-50",
            },
            {
              label: "Expired",
              value: expiredCount,
              helper: "20% from last month",
              tone: "rose",
              ring: "border-t-rose-500",
              icon: "text-rose-600 bg-rose-50",
            },
            {
              label: "Compliant",
              value: compliantCount,
              helper: "8% from last month",
              tone: "emerald",
              ring: "border-t-emerald-500",
              icon: "text-emerald-600 bg-emerald-50",
            },
          ].map((metric) => (
            <div
              className={`rounded-2xl border border-[#dce6ef] ${metric.ring} border-t-[4px] bg-white px-6 py-5 shadow-[0_18px_38px_rgba(4,24,52,0.06)]`}
              key={metric.label}
            >
              <div className="flex items-center gap-5">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${metric.icon}`}>
                  {metric.tone === "brand" ? (
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24">
                      <path d="M7.5 4.5h6l3 3v12h-9a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
                      <path d="M13.5 4.5v3h3M9 12h6M9 15.5h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    </svg>
                  ) : metric.tone === "amber" ? (
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 7.5v5l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  ) : metric.tone === "rose" ? (
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24">
                      <path d="M12 8v5m0 3h.01M5 20h14L12 4 5 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" viewBox="0 0 24 24">
                      <path d="M12 3.75 18.25 6v5.25c0 4.1-2.55 7.25-6.25 9-3.7-1.75-6.25-4.9-6.25-9V6L12 3.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
                      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[0.86rem] font-medium text-[#061848]">{metric.label}</p>
                  <p className="mt-1 text-[2rem] font-medium leading-none text-[#061848]">{metric.value}</p>
                  <p className={`mt-2 text-[0.78rem] font-medium ${metric.tone === "rose" ? "text-rose-600" : metric.tone === "amber" ? "text-amber-600" : "text-emerald-600"}`}>
                    {metric.tone === "amber" ? "- " : "↑ "}{metric.helper}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <SurfaceCard className="rounded-2xl border border-[#dce6ef] bg-white p-5 shadow-[0_18px_38px_rgba(4,24,52,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-[#061848]">Compliance Status Overview</h2>
              <SelectField
                className="w-[150px]"
                label=""
                onChange={(event) => {
                  setSelectedClientId(event.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { label: "All Clients", value: "" },
                  ...supplierRows.map((row) => ({ label: row.name, value: row.id })),
                ]}
                value={selectedClientId}
              />
            </div>
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
              <div
                className="relative mx-auto h-44 w-44 rounded-full"
                style={{
                  background: `conic-gradient(#dc3545 0% ${expiredPercent}%, #f59e0b ${expiredPercent}% ${expiredPercent + expiringPercent}%, #10b981 ${expiredPercent + expiringPercent}% 100%)`,
                }}
              >
                <div className="absolute inset-7 grid place-items-center rounded-full bg-white text-center">
                  <p className="text-3xl font-medium text-[#061848]">{totalStatusCount}</p>
                  <p className="text-xs font-medium text-[#53617f]">Total Items</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#dce6ef]">
                {[
                  { label: "Expired", value: expiredCount, percent: expiredPercent, color: "bg-rose-500" },
                  { label: "Expiring Soon", value: expiringSoonCount, percent: expiringPercent, color: "bg-amber-500" },
                  { label: "Compliant", value: compliantCount, percent: compliantPercent, color: "bg-emerald-500" },
                ].map((row) => (
                  <div className="flex items-center justify-between border-b border-[#edf2f7] px-5 py-4 last:border-b-0" key={row.label}>
                    <span className="inline-flex items-center gap-3 text-sm font-medium text-[#061848]">
                      <span className={`h-3 w-3 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-[#53617f]">{row.value} ({row.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[#edf2f7] pt-4 text-sm">
              <p className="font-medium text-[#53617f]">Keep your compliance up to date to avoid penalties and disruptions.</p>
              <button className="inline-flex items-center gap-2 font-medium text-brand-700" onClick={focusComplianceItems} type="button">
                <span>View full report</span>
                <span>→</span>
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard className="rounded-2xl border border-[#dce6ef] bg-white p-5 shadow-[0_18px_38px_rgba(4,24,52,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-[#061848]">Upcoming Expiry</h2>
              <button className="text-sm font-medium text-brand-700" onClick={focusExpiringAndOverdueItems} type="button">
                View all
              </button>
            </div>
            <div className="space-y-3">
              {upcomingExpirations.map((item) => {
                const days = Math.ceil((new Date(item.contractExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const dueStatus = dueStatusLabel(item.contractExpiry);
                return (
                  <div className="flex items-center gap-4 rounded-xl border border-[#dce6ef] px-4 py-3" key={item.id}>
                    <div className={dueStatus === "Overdue" ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-lg font-medium text-rose-600" : "inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg font-medium text-amber-600"}>
                      !
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#061848]">{item.category}</p>
                      <p className="truncate text-xs font-medium text-[#53617f]">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={dueStatus === "Overdue" ? "text-lg font-medium text-rose-600" : "text-lg font-medium text-orange-500"}>
                        {Math.abs(days)} days
                      </p>
                      <p className="text-[0.68rem] font-medium text-[#53617f]">Expires on {formatDateLabel(item.contractExpiry)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>
        </div>
      </div>

      <div className="space-y-5" ref={complianceItemsRef}>
        <SurfaceCard className="overflow-hidden rounded-2xl border border-[#dce6ef] bg-white p-0 shadow-[0_18px_42px_rgba(4,24,52,0.06)]">
          {dueAttentionOnly ? (
            <div className="mx-6 mt-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>Showing expiring and overdue items only.</span>
              <button
                className="font-medium text-amber-800 underline"
                onClick={focusComplianceItems}
                type="button"
              >
                Clear filter
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 px-6 py-6">
            <div className="inline-flex overflow-hidden rounded-xl border border-[#d8e2ee] bg-[#f7fbff] p-1">
              <button
                className={
                  activeView === "list"
                    ? "rounded-lg bg-[#061848] px-4 py-3 text-sm font-medium text-white shadow-sm"
                    : "rounded-lg px-4 py-3 text-sm font-medium text-[#53617f]"
                }
                onClick={() => setActiveView("list")}
                type="button"
              >
                List
              </button>
              <button
                className={
                  activeView === "board"
                    ? "rounded-lg bg-[#061848] px-4 py-3 text-sm font-medium text-white shadow-sm"
                    : "rounded-lg px-4 py-3 text-sm font-medium text-[#53617f]"
                }
                onClick={() => setActiveView("board")}
                type="button"
              >
                Board
              </button>
            </div>
            <TextField
              className="min-w-[260px] flex-1"
              label=""
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search compliance items..."
              value={searchQuery}
            />
            <SelectField
              className="w-[170px]"
              label=""
              onChange={(event) => {
                setRiskFilter(event.target.value as RiskFilter);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Risk", value: "all" },
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
              ]}
              value={riskFilter}
            />
            <SelectField
              className="w-[180px]"
              label=""
              onChange={(event) => {
                setSelectedClientId(event.target.value);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Clients", value: "" },
                ...supplierRows.map((row) => ({ label: row.name, value: row.id })),
              ]}
              value={selectedClientId}
            />
            <SelectField
              className="w-[190px]"
              label=""
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Categories", value: "all" },
                ...[...new Set(supplierRows.map((item) => item.category))].map((category) => ({
                  label: category,
                  value: category,
                })),
              ]}
              value={categoryFilter}
            />
            <SelectField
              className="w-[170px]"
              label=""
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Status", value: "all" },
                { label: "Compliant", value: "compliant" },
                { label: "Pending", value: "pending" },
                { label: "Non-Compliant", value: "non_compliant" },
              ]}
              value={statusFilter}
            />
            <button
              className={
                dueAttentionOnly
                  ? "inline-flex h-12 items-center rounded-xl bg-[#061848] px-4 text-sm font-medium text-white shadow-sm"
                  : "inline-flex h-12 items-center rounded-xl border border-[#d8e2ee] bg-white px-4 text-sm font-medium text-[#53617f] transition hover:bg-[#f7fbff]"
              }
              onClick={() => {
                setDueAttentionOnly((current) => !current);
                setCurrentPage(1);
              }}
              type="button"
            >
              Attention only
            </button>
            <Button
              className="h-12 rounded-xl border-[#d8e2ee] px-4 text-[#061848]"
              onClick={() => {
                setSearchQuery("");
                setSelectedClientId("");
                setRiskFilter("all");
                setStatusFilter("all");
                setCategoryFilter("all");
                setDueAttentionOnly(false);
                setCurrentPage(1);
              }}
              variant="secondary"
            >
              Clear
            </Button>
            <Button
              className="h-12 rounded-xl border-[#d8e2ee] px-5 text-[#061848]"
              disabled={!canExportReports}
              onClick={downloadComplianceCsv}
              variant="secondary"
            >
              Export
            </Button>
          </div>

          {activeView === "list" ? (
          <div className="overflow-x-auto px-6">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[#dce6ef] text-[0.76rem] font-medium text-[#53617f]">
                  <th className="px-2 py-4 font-medium">Item Name</th>
                  <th className="px-2 py-4 font-medium">Client</th>
                  <th className="px-2 py-4 font-medium">Category</th>
                  <th className="px-2 py-4 font-medium">Expiry Date</th>
                  <th className="px-2 py-4 font-medium">Status</th>
                  <th className="px-2 py-4 font-medium">Owner</th>
                  <th className="px-2 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppliers.map((row) => {
                  const dueStatus = dueStatusLabel(row.contractExpiry);
                  return (
                    <tr className="border-b border-[#edf2f7]" key={row.id}>
                      <td className="px-2 py-5 text-sm font-medium text-[#061848]">
                        <span className="mr-3 inline-block h-3 w-3 rounded-full bg-rose-500 align-middle" />
                        {row.category}
                      </td>
                      <td className="px-2 py-5 text-sm text-[#061848]">
                        <button
                          className="text-left text-sm font-medium text-[#061848] hover:text-brand-700"
                          onClick={() => setSelectedClientId(row.id)}
                          type="button"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-2 py-5 text-sm font-medium text-[#53617f]">{row.category}</td>
                      <td className="px-2 py-5 text-sm font-medium text-[#061848]">{formatDateLabel(row.contractExpiry)}</td>
                      <td className="px-2 py-5">
                        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${dueStatusClasses(dueStatus)}`}>
                          <span className={dueStatus === "Overdue" ? "h-1.5 w-1.5 rounded-full bg-rose-500" : dueStatus === "Expiring Soon" ? "h-1.5 w-1.5 rounded-full bg-amber-500" : "h-1.5 w-1.5 rounded-full bg-emerald-500"} />
                          {dueStatus}
                        </span>
                      </td>
                      <td className="px-2 py-5 text-sm text-[#061848]">
                        <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700">
                          {initialsForName(user?.fullName)}
                        </span>
                        <span className="font-medium">{user?.fullName ?? "Assigned accountant"}</span>
                      </td>
                      <td className="relative px-2 py-5">
                        <div className="flex items-center gap-2">
                          <Button
                            className="h-10 rounded-xl border-[#d8e2ee] px-6 font-medium text-[#061848]"
                            onClick={() => openSelectedClientWorkspace(row.id)}
                            variant="secondary"
                          >
                            View
                          </Button>
                          <button
                            aria-label="Open client actions"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8e2ee] bg-white text-sm font-medium text-[#061848] transition hover:bg-[#f7fbff]"
                            onClick={() =>
                              setOpenClientActionsId((current) => (current === row.id ? "" : row.id))
                            }
                            type="button"
                          >
                            ...
                          </button>
                        </div>
                        {openClientActionsId === row.id ? (
                          <div className="absolute right-2 top-[calc(100%+0.45rem)] z-10 min-w-[220px] rounded-xl border border-[#d8e2ee] bg-white p-2 shadow-[0_20px_42px_rgba(15,23,42,0.14)]">
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => {
                                setSelectedClientId(row.id);
                                setOpenClientActionsId("");
                                showNotice("info", "Compliance history opened", `Loaded compliance history context for ${row.name}.`);
                              }}
                              type="button"
                            >
                              View compliance history
                            </button>
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => {
                                setOpenClientActionsId("");
                                navigate(`/firm/clients/${row.id}`);
                              }}
                              type="button"
                            >
                              Open document centre
                            </button>
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => {
                                setOpenClientActionsId("");
                                setSelectedClientId(row.id);
                                downloadComplianceCsv();
                              }}
                              type="button"
                            >
                              Export client compliance report
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {pagedSuppliers.length === 0 ? (
                  <tr>
                    <td className="px-2 py-8 text-center text-sm text-[#53617f]" colSpan={7}>
                      No compliance items match your current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="grid gap-3 px-6 lg:grid-cols-3">
              {(["Compliant", "Expiring Soon", "Overdue"] as ComplianceBoardStatus[]).map(
                (statusColumn) => (
                  <div
                    className="rounded-xl border border-[#d8e2ee] bg-[#f7fbff] p-3"
                    key={statusColumn}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const rowId = event.dataTransfer.getData("text/plain");
                      const row = filteredSuppliers.find((item) => item.id === rowId);
                      if (row) {
                        moveBoardItem(row, statusColumn);
                      }
                    }}
                  >
                    <h3 className="mb-3 text-sm font-medium text-[#061848]">{statusColumn}</h3>
                    <div className="space-y-2">
                      {filteredSuppliers
                        .filter((row) => statusForRow(row) === statusColumn)
                        .map((row) => (
                          <div
                            className="rounded-lg border border-[#d8e2ee] bg-white px-3 py-2"
                            draggable={canReviewDocuments}
                            key={row.id}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
                          >
                            <p className="text-sm font-medium text-[#061848]">{row.category}</p>
                            <p className="text-xs text-[#53617f]">{row.name}</p>
                            <p className="mt-1 text-xs text-[#73809a]">
                              Due {formatDateLabel(row.contractExpiry)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-[#53617f]">
            <p className="font-medium">
              Showing {startIndex} to {endIndex} of {filteredSuppliers.length} items
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="h-12 rounded-xl bg-[linear-gradient(135deg,#0aa66a_0%,#061848_100%)] px-6 text-white"
                disabled={!canRequestDocuments}
                onClick={() => createComplianceFollowUp(selectedClient)}
              >
                Request documents
              </Button>
              <Button
                className="h-12 rounded-xl border-[#d8e2ee] px-6 text-[#061848]"
                disabled={!canExportReports}
                onClick={downloadComplianceCsv}
                variant="secondary"
              >
                Download client compliance report
              </Button>
              <div className="ml-2 flex items-center gap-1">
                <button
                  className="rounded-md border border-[#d8e2ee] px-2 py-1 text-[#53617f] disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Prev
                </button>
                <span className="px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="rounded-md border border-[#d8e2ee] px-2 py-1 text-[#53617f] disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {activeView === "board" ? (
            <div className="mx-6 mb-6 rounded-xl border border-[#d8e2ee] bg-[#f7fbff] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                Board Activity
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {boardAuditTrail.slice(0, 5).map((entry) => (
                  <p key={entry.id}>
                    {entry.actor} moved {entry.itemName} from {entry.from} to {entry.to} on{" "}
                    {formatDateLabel(entry.timestamp)}
                  </p>
                ))}
                {boardAuditTrail.length === 0 ? <p>No status transitions recorded yet.</p> : null}
              </div>
            </div>
          ) : null}

        </SurfaceCard>

        {selectedClient ? (
          <SurfaceCard className="overflow-hidden rounded-2xl border border-[#dce6ef] bg-white p-0 shadow-[0_18px_42px_rgba(4,24,52,0.06)]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#061848_0%,#082a62_100%)] px-7 py-7 text-white">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-20 [background:repeating-radial-gradient(circle_at_center,transparent_0,transparent_10px,#5bb4ff_11px,#5bb4ff_12px)]" />
              <p className="relative text-xs font-medium uppercase tracking-[0.22em] text-white/70">
                Selected Client
              </p>
              <div className="relative mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-2xl font-medium text-white">{selectedClient.name}</p>
                  <p className="text-sm font-medium text-white/80">
                    Assigned to {user?.fullName ?? "Nayan Dhali"}
                  </p>
                </div>
                <Button
                  className="h-12 rounded-xl border border-white/25 bg-white/10 px-5 text-white hover:bg-white/15"
                  disabled={!canRequestDocuments}
                  onClick={() => createComplianceFollowUp(selectedClient)}
                >
                  Request client documents
                </Button>
              </div>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#d8e2ee] bg-white p-5">
                  <p className="text-xs font-medium text-[#53617f]">Top risks</p>
                  <p className="mt-2 text-base font-medium text-[#061848]">
                    {selectedClient.riskLevel.toUpperCase()} risk exposure
                  </p>
                  <p className="mt-6 text-xs font-medium text-[#53617f]">Risk score <span className="ml-4 rounded-full bg-emerald-50 px-5 py-2 text-emerald-700">{selectedClient.riskLevel}</span></p>
                </div>
                <div className="rounded-xl border border-[#d8e2ee] bg-white p-5">
                  <p className="text-xs font-medium text-[#53617f]">Next action</p>
                  <p className="mt-2 text-base font-medium text-[#061848]">
                    Review {selectedClient.category} pack
                  </p>
                  <p className="mt-6 text-xs font-medium text-[#53617f]">Action required <span className="ml-4 rounded-full bg-violet-50 px-5 py-2 text-violet-700">Review</span></p>
                </div>
                <div className="rounded-xl border border-[#d8e2ee] bg-white p-5">
                  <p className="text-xs font-medium text-[#53617f]">Due date</p>
                  <p className="mt-2 text-base font-medium text-[#061848]">
                    {formatDateLabel(selectedClient.contractExpiry)}
                  </p>
                  <p className="mt-6 text-xs font-medium text-rose-600">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    {dueStatusLabel(selectedClient.contractExpiry)}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-5">
                  <p className="text-xs font-medium text-[#53617f]">Compliance progress</p>
                  <div className="mt-4 grid place-items-center">
                    <div
                      className="grid h-28 w-28 place-items-center rounded-full"
                      style={{ background: `conic-gradient(#10b981 0% ${Math.max(0, 100 - selectedClient.riskScore)}%, #e7edf4 ${Math.max(0, 100 - selectedClient.riskScore)}% 100%)` }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                        <span className="text-xl font-medium text-[#061848]">{Math.max(0, 100 - selectedClient.riskScore)}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs font-medium text-[#53617f]">{Math.round((Math.max(0, 100 - selectedClient.riskScore) / 100) * 10)} of 10 items completed</p>
                </div>
            </div>
          </SurfaceCard>
        ) : null}
      </div>
    </div>
  );
}
