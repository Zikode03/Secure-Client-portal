// Friendly guide: this module (AccountantComplianceCentrePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedComplianceStatuses, hasPermission } from "../../utils/permissions";
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

const categories = [
  "Tax Compliance",
  "CIPC",
  "Payroll",
  "VAT",
  "Audit",
  "Corporate",
];

// Component flow: gather data first, then render a focused UI state.
function SearchIcon() {
// Render output: this is the visual state users interact with.
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function ResultFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label ?? options[0]?.label ?? "All";
  const hasActiveValue = value.length > 0 && value !== "all";

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="text-[0.78rem] font-medium text-slate-500">{label}</span>
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`flex h-12 w-full items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 text-left text-sm font-semibold shadow-sm transition ${
            isOpen || hasActiveValue
              ? "text-[#00856f] ring-1 ring-[#0a2f66]/10"
              : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]"
          }`}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDownIcon />
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 top-14 z-50 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)]"
            role="menu"
          >
            {options.map((option) => (
              <button
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition ${
                  value === option.value
                    ? "bg-[#eaf7f0] text-[#087d69]"
                    : "text-[#35466d] hover:bg-slate-50 hover:text-[#091333]"
                }`}
                key={option.value || option.label}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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

export function AccountantComplianceCentrePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const isAdmin = user?.role === "admin";
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

  const supplierRows = useMemo<SupplierRow[]>(() => {
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
  }, [clientStatuses]);

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

  function statusForRow(row: SupplierRow): ComplianceBoardStatus {
    return statusOverrides[row.id] ?? (dueStatusLabel(row.contractExpiry) as ComplianceBoardStatus);
  }

  function canTransitionStatus(
    from: ComplianceBoardStatus,
    to: ComplianceBoardStatus,
    isAdminUser: boolean,
  ) {
    if (from === to) {
      return false;
    }

    if (isAdminUser) {
      return true;
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
    if (!canTransitionStatus(from, to, isAdmin)) {
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

      <div className="flex flex-col gap-7">
        <div className="-order-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-[2.05rem] font-semibold tracking-tight text-slate-950">
              Compliance Workspace
            </h1>
            <p className="max-w-3xl text-[0.96rem] leading-7 text-slate-500">
              Monitor client compliance, expiries and regulatory obligations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-11 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-[#091333] shadow-sm transition hover:bg-slate-50"
              onClick={() => navigate("/firm/compliance/calendar")}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 text-brand-700" fill="none" viewBox="0 0 24 24">
                <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6.5" />
                <path d="M8 4.5v4m8-4v4M4 10.5h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <span>07 May 2026</span>
            </button>
            <Button
              className="h-11 rounded-full bg-[#061848] px-5 text-white hover:bg-[#0b255f]"
              onClick={() => createComplianceFollowUp(selectedClient)}
            >
              <span className="text-lg leading-none">+</span>
              <span>Add Compliance Item</span>
            </Button>
          </div>
        </div>

        <SurfaceCard className="-order-2 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_22px_52px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 lg:grid-cols-1 lg:items-center">
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  className="h-14 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search clients or compliance items..."
                  value={searchQuery}
                />
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2 xl:grid-cols-4">
              <ResultFilterSelect
                label="Client"
                onChange={(value) => {
                  setSelectedClientId(value);
                  setCurrentPage(1);
                }}
                options={[
                  { label: "All Clients", value: "" },
                  ...supplierRows.map((row) => ({ label: row.name, value: row.id })),
                ]}
                value={selectedClientId}
              />
              <ResultFilterSelect
                label="Risk"
                onChange={(value) => {
                  setRiskFilter(value as RiskFilter);
                  setCurrentPage(1);
                }}
                options={[
                  { label: "Risk filter", value: "all" },
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" },
                ]}
                value={riskFilter}
              />
              <ResultFilterSelect
                label="Category"
                onChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { label: "Category filter", value: "all" },
                  ...[...new Set(supplierRows.map((item) => item.category))].map((category) => ({
                    label: category,
                    value: category,
                  })),
                ]}
                value={categoryFilter}
              />
              <ResultFilterSelect
                label="Status"
                onChange={(value) => {
                  setStatusFilter(value as StatusFilter);
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
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <Button
                className="h-11 min-w-[78px] !rounded-[999px] border border-slate-200 bg-white px-5 text-sm font-semibold text-[#35466d] shadow-[0_8px_18px_rgba(15,23,42,0.14)] transition hover:bg-slate-50 hover:text-[#091333]"
                onClick={() => {
                  setSearchQuery("");
                  setRiskFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSelectedClientId("");
                  setDueAttentionOnly(false);
                  setCurrentPage(1);
                }}
                variant="secondary"
              >
                Clear filters
              </Button>
              <Button
                className="h-11 min-w-[118px] !rounded-[999px] !bg-[#062f66] !bg-none px-6 text-sm font-semibold !text-white shadow-[0_10px_22px_rgba(6,47,102,0.26)] hover:!bg-[#05285a]"
                disabled={!canExportReports}
                onClick={downloadComplianceCsv}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </SurfaceCard>

        <div>
          <SurfaceCard className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(4,24,52,0.05)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#091333]">Compliance Status Overview</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
              <div
                className="relative mx-auto h-44 w-44 rounded-full"
                style={{
                  background: `conic-gradient(#061848 0% ${expiredPercent}%, #6f8dbf ${expiredPercent}% ${expiredPercent + expiringPercent}%, #00856f ${expiredPercent + expiringPercent}% 100%)`,
                }}
              >
                <div className="absolute inset-7 grid place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
                  <p className="text-3xl font-bold text-[#061848]">{totalStatusCount}</p>
                  <p className="text-xs font-semibold text-[#53617f]">Total Items</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                {[
                  { label: "Expired", value: expiredCount, percent: expiredPercent, color: "bg-[#061848]" },
                  { label: "Expiring Soon", value: expiringSoonCount, percent: expiringPercent, color: "bg-[#6f8dbf]" },
                  { label: "Compliant", value: compliantCount, percent: compliantPercent, color: "bg-[#00856f]" },
                ].map((row) => (
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0" key={row.label}>
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-[#091333]">
                      <span className={`h-3 w-3 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold text-[#53617f]">{row.value} ({row.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <p className="font-medium text-[#53617f]">Keep your compliance up to date to avoid penalties and disruptions.</p>
              <button className="inline-flex items-center gap-2 font-bold text-brand-700" onClick={focusComplianceItems} type="button">
                <span>View full report</span>
                <span>→</span>
              </button>
            </div>
          </SurfaceCard>

        </div>
      </div>

      <div className="space-y-5" ref={complianceItemsRef}>
        <SurfaceCard className="overflow-visible rounded-lg border border-slate-200 bg-white p-0 shadow-none">
          {dueAttentionOnly ? (
            <div className="mx-6 mt-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>Showing expiring and overdue items only.</span>
              <button
                className="font-semibold text-amber-800 underline"
                onClick={focusComplianceItems}
                type="button"
              >
                Clear filter
              </button>
            </div>
          ) : null}
          <div className="flex px-6 py-6">
            <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                className={
                  activeView === "list"
                    ? "rounded-full bg-[#061848] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-full px-4 py-2.5 text-sm font-semibold text-[#53617f]"
                }
                onClick={() => setActiveView("list")}
                type="button"
              >
                List
              </button>
              <button
                className={
                  activeView === "board"
                    ? "rounded-full bg-[#061848] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-full px-4 py-2.5 text-sm font-semibold text-[#53617f]"
                }
                onClick={() => setActiveView("board")}
                type="button"
              >
                Board
              </button>
            </div>
          </div>

          {activeView === "list" ? (
            <>
              <div className="hidden grid-cols-[minmax(150px,1.1fr)_minmax(130px,0.95fr)_minmax(105px,0.75fr)_minmax(112px,0.75fr)_minmax(120px,0.85fr)_minmax(140px,1fr)_72px] gap-4 border-b border-slate-100 px-5 py-4 text-[0.82rem] font-bold text-[#091333] lg:grid">
                <span>Item Name</span>
                <span>Client</span>
                <span>Category</span>
                <span>Expiry Date</span>
                <span>Status</span>
                <span>Owner</span>
                <span className="text-center">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {pagedSuppliers.map((row) => {
                  const dueStatus = dueStatusLabel(row.contractExpiry);
                  return (
                    <div
                      className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(150px,1.1fr)_minmax(130px,0.95fr)_minmax(105px,0.75fr)_minmax(112px,0.75fr)_minmax(120px,0.85fr)_minmax(140px,1fr)_72px] lg:items-center lg:gap-4"
                      key={row.id}
                    >
                      <div className="min-w-0 text-sm font-bold text-[#091333]">
                        <span className="mr-3 inline-block h-2.5 w-2.5 rounded-full bg-rose-500 align-middle" />
                        <span className="truncate">{row.category}</span>
                      </div>
                      <div className="min-w-0 text-sm text-[#091333]">
                        <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Client
                        </span>
                        <button
                          className="min-w-0 truncate text-left text-sm font-semibold text-[#091333] hover:text-brand-700"
                          onClick={() => setSelectedClientId(row.id)}
                          type="button"
                        >
                          {row.name}
                        </button>
                      </div>
                      <div className="text-sm font-medium text-[#53617f]">
                        <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Category
                        </span>
                        {row.category}
                      </div>
                      <div className="text-sm font-semibold text-[#091333]">
                        <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Expiry Date
                        </span>
                        {formatDateLabel(row.contractExpiry)}
                      </div>
                      <div>
                        <span className="mr-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 lg:hidden">
                          Status
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${dueStatusClasses(dueStatus)}`}>
                          <span className={dueStatus === "Overdue" ? "h-1.5 w-1.5 rounded-full bg-rose-500" : dueStatus === "Expiring Soon" ? "h-1.5 w-1.5 rounded-full bg-amber-500" : "h-1.5 w-1.5 rounded-full bg-emerald-500"} />
                          {dueStatus}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center gap-3 text-sm text-[#091333]">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {initialsForName(user?.fullName)}
                        </span>
                        <span className="min-w-0 truncate font-medium">{user?.fullName ?? "Assigned accountant"}</span>
                      </div>
                      <div className="relative flex min-w-0 items-center justify-start lg:justify-center">
                        <button
                          aria-label={`More actions for ${row.name}`}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                            openClientActionsId === row.id
                              ? "bg-[#0a2f66]/10 text-[#00856f]"
                              : "text-[#091333] hover:bg-slate-100"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenClientActionsId((current) => (current === row.id ? "" : row.id));
                          }}
                          type="button"
                        >
                          <MoreVerticalIcon />
                        </button>
                        {openClientActionsId === row.id ? (
                          <div className="absolute right-auto top-[calc(100%+0.35rem)] z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_18px_36px_rgba(4,24,52,0.14)] lg:right-0" role="menu">
                            <button
                              className="flex w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenClientActionsId("");
                                openSelectedClientWorkspace(row.id);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              View
                            </button>
                            <button
                              className="flex w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setSelectedClientId(row.id);
                                setOpenClientActionsId("");
                                showNotice("info", "Compliance history opened", `Loaded compliance history context for ${row.name}.`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              View compliance history
                            </button>
                            <button
                              className="flex w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenClientActionsId("");
                                navigate(`/firm/clients/${row.id}`);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              Open document centre
                            </button>
                            <button
                              className="flex w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-[#35466d] transition hover:bg-slate-50 hover:text-[#091333]"
                              onClick={() => {
                                setOpenClientActionsId("");
                                setSelectedClientId(row.id);
                                downloadComplianceCsv();
                              }}
                              role="menuitem"
                              type="button"
                            >
                              Export client compliance report
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {pagedSuppliers.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#53617f]">
                    No compliance items match your current filters.
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="grid gap-3 px-6 lg:grid-cols-3">
              {(["Compliant", "Expiring Soon", "Overdue"] as ComplianceBoardStatus[]).map(
                (statusColumn) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
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
                    <h3 className="mb-3 text-sm font-bold text-[#091333]">{statusColumn}</h3>
                    <div className="space-y-2">
                      {filteredSuppliers
                        .filter((row) => statusForRow(row) === statusColumn)
                        .map((row) => (
                          <div
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                            draggable={isAdmin || canReviewDocuments}
                            key={row.id}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
                          >
                            <p className="text-sm font-bold text-[#091333]">{row.category}</p>
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
          <div className="flex min-h-[92px] items-center justify-between border-t border-slate-100 bg-white px-6 py-[18px] text-xs font-medium text-[#53617f]">
            <span className="font-semibold text-[#091333]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-7">
              <button
                className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] transition hover:text-[#53617f] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                Prev
              </button>
              <button
                className="inline-flex h-8 items-center justify-center rounded-md px-1 font-semibold text-[#9aa8ba] transition hover:text-[#53617f] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          {activeView === "board" ? (
            <div className="mx-6 mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
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
          <SurfaceCard className="-order-1 ml-auto w-full max-w-[1180px] overflow-hidden rounded-[1.75rem] border border-[#dce5ef] bg-white p-0 shadow-[0_18px_44px_rgba(4,24,52,0.06)]">
            <div className="border-b border-[#dce5ef] px-7 py-6 text-[#091333]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#42557f]">
                Selected Client
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-[#061848]">{selectedClient.name}</p>
                  <p className="mt-2 text-sm font-medium text-[#53617f]">
                    Assigned to {user?.fullName ?? "Nayan Dhali"}
                  </p>
                </div>
                {!isAdmin ? (
                  <Button
                    className="h-12 rounded-xl !bg-[#062765] !bg-none px-6 text-sm !text-white shadow-[0_14px_28px_rgba(6,39,101,0.22)] hover:!bg-[#061848]"
                    disabled={!canRequestDocuments}
                    onClick={() => createComplianceFollowUp(selectedClient)}
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24"><path d="M7 3.5h6.5L18 8v12.5H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/><path d="M13 3.5V8h5M8.5 12h6M8.5 15.5h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg>
                    Request client documents
                  </Button>
                ) : (
                  <Button className="h-12 rounded-xl !bg-[#062765] !bg-none px-6 text-sm !text-white shadow-[0_14px_28px_rgba(6,39,101,0.22)] hover:!bg-[#061848]" onClick={() => navigate("/firm/admin/assignments")}>
                    Assign accountant
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="flex min-h-[225px] flex-col rounded-2xl border border-[#dce5ef] bg-white p-5 shadow-[0_8px_20px_rgba(4,24,52,0.025)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24"><path d="M12 2.75 19 5.5v5.75c0 4.4-2.7 7.75-7 10-4.3-2.25-7-5.6-7-10V5.5l7-2.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/><path d="M12 7v8m0 0-2-2m2 2 2-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg></span>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#42557f]">Top risks</p>
                  </div>
                  <div className="my-4 h-px bg-[#dce5ef]" />
                  <p className="text-base font-bold leading-snug text-[#061848]">
                    {selectedClient.riskLevel.toUpperCase()} risk exposure
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#dce5ef] pt-4 text-sm font-medium text-[#53617f]">
                    <span>Risk score</span>
                    <span className="rounded-full bg-[#eef4fa] px-4 py-2 text-[#061848]">{selectedClient.riskLevel}</span>
                  </div>
                </div>
                <div className="flex min-h-[225px] flex-col rounded-2xl border border-[#dce5ef] bg-white p-5 shadow-[0_8px_20px_rgba(4,24,52,0.025)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24"><rect height="17" rx="2" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="4.5"/><path d="M9 3v3h6V3M8.5 10h7M8.5 14h4M8.5 18h5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7"/></svg></span>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#42557f]">Next action</p>
                  </div>
                  <div className="my-4 h-px bg-[#dce5ef]" />
                  <p className="text-base font-bold leading-snug text-[#061848]">
                    Review {selectedClient.category} pack
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#dce5ef] pt-4 text-sm font-medium text-[#53617f]">
                    <span>Action required</span>
                    <span className="rounded-full bg-[#eaf7f0] px-4 py-2 font-semibold text-[#087d69]">Review</span>
                  </div>
                </div>
                <div className="flex min-h-[225px] flex-col rounded-2xl border border-[#dce5ef] bg-white p-5 shadow-[0_8px_20px_rgba(4,24,52,0.025)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24"><rect height="15" rx="2" stroke="currentColor" strokeWidth="1.7" width="17" x="3.5" y="5.5"/><path d="M7.5 3.5v4m9-4v4m-13 3h17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7"/></svg></span>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#42557f]">Due date</p>
                  </div>
                  <div className="my-4 h-px bg-[#dce5ef]" />
                  <p className="text-base font-bold text-[#061848]">
                    {formatDateLabel(selectedClient.contractExpiry)}
                  </p>
                  <div className="mt-auto border-t border-[#dce5ef] pt-4"><p className="inline-flex items-center gap-3 rounded-full bg-[#eef4fa] px-4 py-2 text-sm font-semibold text-[#1760bd]"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1760bd]" />{dueStatusLabel(selectedClient.contractExpiry)}</p></div>
                </div>
                <div className="flex min-h-[225px] flex-col rounded-2xl border border-[#dce5ef] bg-white p-5 shadow-[0_8px_20px_rgba(4,24,52,0.025)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24"><path d="M11 3a9 9 0 1 0 9 9h-9V3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/><path d="M14 3.6A7.5 7.5 0 0 1 20.4 10H14V3.6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7"/></svg></span>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#42557f]">Compliance progress</p>
                  </div>
                  <div className="my-3 h-px bg-[#dce5ef]" />
                  <div className="grid flex-1 place-items-center">
                    <div
                      className="grid h-28 w-28 place-items-center rounded-full"
                      style={{ background: `conic-gradient(#00856f 0% ${Math.max(0, 100 - selectedClient.riskScore)}%, #e7edf4 ${Math.max(0, 100 - selectedClient.riskScore)}% 100%)` }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
                        <span className="text-xl font-bold text-[#061848]">{Math.max(0, 100 - selectedClient.riskScore)}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs font-semibold text-[#53617f]">{Math.round((Math.max(0, 100 - selectedClient.riskScore) / 100) * 10)} of 10 items completed</p>
                </div>
            </div>
          </SurfaceCard>
        ) : null}
      </div>
    </div>
  );
}
