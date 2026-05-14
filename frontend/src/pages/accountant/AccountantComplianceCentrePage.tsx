// Friendly guide: this module (AccountantComplianceCentrePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedComplianceStatuses, hasPermission } from "../../utils/permissions";

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
  const { user } = useAuth();
  const portal = usePortal();
  const isAdmin = user?.role === "admin";
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
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
  const pageSize = 5;
  const canRequestDocuments = hasPermission(user, "request:documents");
  const canExportReports =
    hasPermission(user, "export:client_reports") || hasPermission(user, "export:firm_reports");
  const canReviewDocuments = hasPermission(user, "review:documents");

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

      return queryMatch && riskMatch && statusMatch && categoryMatch;
    });
  }, [categoryFilter, riskFilter, searchQuery, statusFilter, supplierRows]);

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

  const upcomingExpirations = useMemo(() => {
    return [...supplierRows]
      .sort(
        (a, b) =>
          new Date(a.contractExpiry).getTime() - new Date(b.contractExpiry).getTime(),
      )
      .slice(0, 3);
  }, [supplierRows]);

  const compliantCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Compliant").length;
  const expiringSoonCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Expiring Soon").length;
  const expiredCount = supplierRows.filter((row) => dueStatusLabel(row.contractExpiry) === "Overdue").length;
  const totalStatusCount = Math.max(1, compliantCount + expiringSoonCount + expiredCount);
  const compliantPercent = Math.round((compliantCount / totalStatusCount) * 100);
  const expiringPercent = Math.round((expiringSoonCount / totalStatusCount) * 100);
  const expiredPercent = Math.max(0, 100 - compliantPercent - expiringPercent);

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
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h1 className="text-3xl font-semibold text-slate-950">
          {isAdmin ? "Firm Compliance Centre" : "My Compliance Workspace"}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-slate-600">Client compliance tracking and action workspace</p>
          {isAdmin ? <Button>Open system settings</Button> : <Button>Add Supplier</Button>}
        </div>
      </div>

      <SurfaceCard className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Total Items</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{totalStatusCount}</p>
            <p className="mt-1 text-xs text-emerald-600">12% from last month</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Expiring Soon</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{expiringSoonCount}</p>
            <p className="mt-1 text-xs text-rose-600">in next 30 days</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Expired</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{expiredCount}</p>
            <p className="mt-1 text-xs text-rose-600">requires attention</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Compliant</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{compliantCount}</p>
            <p className="mt-1 text-xs text-emerald-600">8% from last month</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TextField
            className="w-[280px]"
            label=""
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search client"
            value={searchQuery}
          />
          <SelectField
            className="w-[150px]"
            label=""
            onChange={(event) => {
              setRiskFilter(event.target.value as RiskFilter);
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
          <SelectField
            className="w-[170px]"
            label=""
            onChange={(event) => {
              setCategoryFilter(event.target.value);
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
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Compliance Status Overview</h2>
              <SelectField
                className="w-[120px]"
                label=""
                onChange={() => undefined}
                options={[{ label: "All Clients", value: "all" }]}
                value="all"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
              <div
                className="relative mx-auto h-32 w-32 rounded-full"
                style={{
                  background: `conic-gradient(#59b36b 0% ${compliantPercent}%, #d8a13a ${compliantPercent}% ${compliantPercent + expiringPercent}%, #d15a5a ${compliantPercent + expiringPercent}% 100%)`,
                }}
              >
                <div className="absolute inset-4 grid place-items-center rounded-full bg-white">
                  <p className="text-2xl font-semibold text-slate-900">{compliantCount + expiringSoonCount + expiredCount}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Compliant</span>
                  <span className="text-slate-500">{compliantCount} ({compliantPercent}%)</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Expiring Soon</span>
                  <span className="text-slate-500">{expiringSoonCount} ({expiringPercent}%)</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Expired</span>
                  <span className="text-slate-500">{expiredCount} ({expiredPercent}%)</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <p>Keep your compliance up to date to avoid penalties and disruptions.</p>
              <button className="font-semibold text-brand-700" type="button">View full report</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">Upcoming Expiry</h2>
              <button className="text-xs font-semibold text-brand-700" type="button">View all</button>
            </div>
            <div className="space-y-2">
              {upcomingExpirations.map((item) => {
                const days = Math.ceil((new Date(item.contractExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2" key={item.id}>
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                      !
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.category}</p>
                      <p className="truncate text-xs text-slate-500">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600">{Math.abs(days)} days</p>
                      <p className="text-[11px] text-slate-400">Expires on {formatDateLabel(item.contractExpiry)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Compliance Items</h2>
          <p className="mb-3 text-sm font-medium text-slate-500">Active clients</p>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                className={
                  activeView === "list"
                    ? "rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                    : "rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
                }
                onClick={() => setActiveView("list")}
                type="button"
              >
                List
              </button>
              <button
                className={
                  activeView === "board"
                    ? "rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                    : "rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
                }
                onClick={() => setActiveView("board")}
                type="button"
              >
                Board
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <TextField
              className="w-[220px]"
              label=""
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search compliance items..."
              value={searchQuery}
            />
            <SelectField
              className="w-[130px]"
              label=""
              onChange={() => undefined}
              options={[{ label: "All Clients", value: "all" }]}
              value="all"
            />
            <SelectField
              className="w-[140px]"
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
              className="w-[120px]"
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
            <Button
              disabled={!canExportReports}
              onClick={downloadComplianceCsv}
              size="sm"
              variant="secondary"
            >
              Export
            </Button>
            </div>
          </div>

          {activeView === "list" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-2 py-2 font-medium">Item Name</th>
                  <th className="px-2 py-2 font-medium">Client</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Expiry Date</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Owner</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppliers.map((row) => {
                  const dueStatus = dueStatusLabel(row.contractExpiry);
                  return (
                    <tr className="border-b border-slate-100" key={row.id}>
                      <td className="px-2 py-2 text-sm font-medium text-slate-900">{row.category}</td>
                      <td className="px-2 py-2 text-sm text-slate-700">
                        <button
                          className="text-left text-sm font-medium text-slate-900 hover:text-brand-700"
                          onClick={() => setSelectedClientId(row.id)}
                          type="button"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-sm text-slate-700">{row.category}</td>
                      <td className="px-2 py-2 text-sm text-slate-700">{formatDateLabel(row.contractExpiry)}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${dueStatusClasses(dueStatus)}`}>
                          {dueStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-sm text-slate-700">{user?.fullName ?? "Nayan Dhali"}</td>
                      <td className="relative px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary">View</Button>
                          <button
                            aria-label="Open client actions"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            onClick={() =>
                              setOpenClientActionsId((current) => (current === row.id ? "" : row.id))
                            }
                            type="button"
                          >
                            ...
                          </button>
                        </div>
                        {openClientActionsId === row.id ? (
                          <div className="absolute right-2 top-[calc(100%+0.45rem)] z-10 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_42px_rgba(15,23,42,0.14)]">
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => setOpenClientActionsId("")}
                              type="button"
                            >
                              View compliance history
                            </button>
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => setOpenClientActionsId("")}
                              type="button"
                            >
                              Open document centre
                            </button>
                            <button
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() => setOpenClientActionsId("")}
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
                    <td className="px-2 py-6 text-center text-sm text-slate-500" colSpan={7}>
                      No compliance items match your current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {(["Compliant", "Expiring Soon", "Overdue"] as ComplianceBoardStatus[]).map(
                (statusColumn) => (
                  <div
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
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
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">{statusColumn}</h3>
                    <div className="space-y-2">
                      {filteredSuppliers
                        .filter((row) => statusForRow(row) === statusColumn)
                        .map((row) => (
                          <div
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                            draggable={isAdmin || canReviewDocuments}
                            key={row.id}
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
                          >
                            <p className="text-sm font-semibold text-slate-900">{row.category}</p>
                            <p className="text-xs text-slate-500">{row.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
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
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <p>
              Showing {startIndex} to {endIndex} of {filteredSuppliers.length} items
            </p>
            <div className="flex items-center gap-2">
              {isAdmin ? <Button size="sm">Assign accountant</Button> : null}
              {!isAdmin ? (
                <Button disabled={!canRequestDocuments} size="sm">
                  Request documents
                </Button>
              ) : null}
              {!isAdmin ? (
                <Button disabled={!canExportReports} size="sm" variant="secondary">
                  Download client compliance report
                </Button>
              ) : null}
              <div className="ml-2 flex items-center gap-1">
                <button
                  className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-50"
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
                  className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 disabled:opacity-50"
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
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
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

          {selectedClient ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Selected Client
              </p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">{selectedClient.name}</p>
                  <p className="text-sm text-slate-600">
                    Assigned to {user?.fullName ?? "Nayan Dhali"}
                  </p>
                </div>
                {!isAdmin ? (
                  <Button
                    disabled={!canRequestDocuments}
                    onClick={() => setOpenClientActionsId("")}
                    size="sm"
                  >
                    Request client documents
                  </Button>
                ) : (
                  <Button size="sm">Assign accountant</Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Top risks</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedClient.riskLevel.toUpperCase()} risk exposure
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Next action</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Review {selectedClient.category} pack
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">Due date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateLabel(selectedClient.contractExpiry)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}