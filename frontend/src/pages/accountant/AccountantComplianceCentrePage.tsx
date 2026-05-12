import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import type { ComplianceClientStatus } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { getScopedComplianceStatuses } from "../../utils/permissions";

type RiskFilter = "all" | "compliant" | "at_risk" | "overdue" | "high_risk";

function statusChipClasses(status: ComplianceClientStatus["riskStatus"]) {
  switch (status) {
    case "high_risk":
    case "overdue":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "at_risk":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
}

function progressClasses(score: number) {
  if (score >= 85) {
    return "from-emerald-500 to-teal-400";
  }

  if (score >= 70) {
    return "from-amber-500 to-orange-400";
  }

  return "from-rose-500 to-orange-400";
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function fileSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "client"
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
      <path
        d="M8 4v4m8-4v4M4 10.25h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 6.5h14.5l-5.7 6v4.45l-3.1.8V12.5l-5.7-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.25v9.5m0 0 3.5-3.5m-3.5 3.5-3.5-3.5M5.75 18.25h12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m10 7 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg aria-hidden="true" className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function SummaryIcon({
  colorClassName,
  path,
}: {
  colorClassName: string;
  path: ReactNode;
}) {
  return (
    <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", colorClassName)}>
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        {path}
      </svg>
    </div>
  );
}

export function AccountantComplianceCentrePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = usePortal();
  const isAdmin = user?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [openClientMenuId, setOpenClientMenuId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const clientStatuses = useMemo(
    () =>
      getScopedComplianceStatuses(
        user,
        portal.accountantComplianceCentre.clientStatuses ?? [],
        portal.adminClients,
      ),
    [portal.accountantComplianceCentre.clientStatuses, portal.adminClients, user],
  );
  const scopedSummary = useMemo(() => {
    const totalRequiredItems = clientStatuses.reduce(
      (sum, client) => sum + client.totalRequiredItems,
      0,
    );
    const compliantItems = clientStatuses.reduce((sum, client) => sum + client.compliantCount, 0);

    return {
      expiredCount: clientStatuses.reduce((sum, client) => sum + client.expiredCount, 0),
      expiringCount: clientStatuses.reduce((sum, client) => sum + client.expiringCount, 0),
      missingRequiredCount: clientStatuses.reduce(
        (sum, client) => sum + client.missingRequiredCount,
        0,
      ),
      compliantClientCount: clientStatuses.filter((client) => client.riskStatus === "compliant")
        .length,
      portfolioCompliancePercentage:
        totalRequiredItems > 0 ? Math.round((compliantItems / totalRequiredItems) * 100) : 0,
    };
  }, [clientStatuses]);
  const [selectedClientId, setSelectedClientId] = useState(clientStatuses[0]?.clientId ?? "");

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return clientStatuses.filter((client) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        client.clientName.toLowerCase().includes(normalizedQuery) ||
        client.assignedAccountant.toLowerCase().includes(normalizedQuery);
      const matchesRisk = riskFilter === "all" || client.riskStatus === riskFilter;

      return matchesQuery && matchesRisk;
    });
  }, [clientStatuses, riskFilter, searchQuery]);

  const selectedClient =
    filteredClients.find((client) => client.clientId === selectedClientId) ??
    filteredClients[0] ??
    null;

  function openClientWorkspace(client: ComplianceClientStatus) {
    setOpenClientMenuId("");
    navigate(`/firm/clients/${client.clientId}?tab=compliance`);
  }

  function openComplianceHistory(client: ComplianceClientStatus) {
    setOpenClientMenuId("");
    navigate(`/firm/clients/${client.clientId}?tab=compliance&view=audit`);
  }

  function openDocumentCentre(client: ComplianceClientStatus) {
    setOpenClientMenuId("");
    navigate(`/firm/documents?client=${client.clientId}`);
  }

  function downloadPortfolioReport() {
    downloadCsv(isAdmin ? "firm-compliance-report.csv" : "my-compliance-report.csv", [
      ["Snapshot date", formatDateLabel(portal.accountantComplianceCentre.snapshotDate)],
      ["Expired", String(scopedSummary.expiredCount)],
      ["Expiring soon", String(scopedSummary.expiringCount)],
      ["Missing required", String(scopedSummary.missingRequiredCount)],
      ["Portfolio compliance", `${scopedSummary.portfolioCompliancePercentage}%`],
    ]);
  }

  function downloadClientReport(client: ComplianceClientStatus) {
    downloadCsv(`${fileSlug(client.clientName)}-compliance-report.csv`, [
      ["Client", client.clientName],
      ["Assigned accountant", client.assignedAccountant],
      ["Compliance score", `${client.score}%`],
      ["Expired", String(client.expiredCount)],
      ["Expiring", String(client.expiringCount)],
      ["Missing", String(client.missingCount)],
      ["Last reviewed", formatDateLabel(client.lastReviewed)],
      ["Next best action", client.nextBestAction],
    ]);
    setOpenClientMenuId("");
  }

  function handleRequestDocuments(client: ComplianceClientStatus) {
    if (!user || !selectedClient || client.topPriorities.length === 0) {
      setFeedbackMessage("No open compliance priority is available for request generation.");
      return;
    }

    const firstPriority = client.topPriorities[0];
    const result = portal.createComplianceRequest({
      clientId: client.clientId,
      complianceItemId: firstPriority.complianceItemId,
      requestType: firstPriority.requestType,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      actor: user,
      comments: `Please action ${firstPriority.label} so the compliance record can move forward.`,
    });

    setFeedbackMessage(result.message);
  }

  function openAssignments() {
    navigate("/firm/admin/assignments");
  }

  function openTemplates() {
    navigate("/firm/admin/templates");
  }

  function openDeadlineRules() {
    navigate("/firm/admin/deadline-rules");
  }

  const summaryCards = [
    {
      id: "expired",
      label: "Expired",
      value: String(scopedSummary.expiredCount),
      helper: "Action required",
      icon: (
        <SummaryIcon
          colorClassName="bg-rose-50 text-rose-500"
          path={
            <>
              <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 7.5v5.5m0 3h.01"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </>
          }
        />
      ),
      helperClassName: "text-rose-600",
    },
    {
      id: "expiring",
      label: "Expiring soon",
      value: String(scopedSummary.expiringCount),
      helper: "Next 30 days",
      icon: (
        <SummaryIcon
          colorClassName="bg-amber-50 text-amber-500"
          path={
            <>
              <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 7.5v4.8l3.2 2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </>
          }
        />
      ),
      helperClassName: "text-amber-600",
    },
    {
      id: "missing",
      label: "Missing required",
      value: String(scopedSummary.missingRequiredCount),
      helper: "Client follow-up needed",
      icon: (
        <SummaryIcon
          colorClassName="bg-indigo-50 text-indigo-500"
          path={
            <>
              <path
                d="M8 4.25h6.2L18.5 8.6V18a1.75 1.75 0 0 1-1.75 1.75H8A2.25 2.25 0 0 1 5.75 17.5V6.5A2.25 2.25 0 0 1 8 4.25Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M14 4.25V8.5h4.25M9 12h6M9 15.5h4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </>
          }
        />
      ),
      helperClassName: "text-brand-700",
    },
    {
      id: "portfolio",
      label: "Portfolio compliance",
      value: `${scopedSummary.portfolioCompliancePercentage}%`,
      helper: `${scopedSummary.compliantClientCount} of ${clientStatuses.length} clients compliant`,
      icon: (
        <SummaryIcon
          colorClassName="bg-emerald-50 text-emerald-500"
          path={
            <>
              <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m8.5 12.2 2.4 2.4 4.6-5.1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </>
          }
        />
      ),
      helperClassName: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
            {isAdmin ? "Firm workspace" : "Accountant workspace"}
          </p>
          <div>
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-slate-950">
              {isAdmin ? "Firm Compliance Centre" : "My Compliance Workspace"}
            </h1>
            <p className="mt-3 text-[1.02rem] text-slate-500">
              {isAdmin
                ? "See the full firm compliance picture and control the rules that shape it."
                : "Which assigned client needs compliance attention right now?"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-[0.95rem] font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <CalendarIcon />
            <span>{formatDateLabel(portal.accountantComplianceCentre.snapshotDate)}</span>
          </div>
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[0.95rem] font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
            type="button"
          >
            <FilterIcon />
            <span>Filters</span>
          </button>
          {isAdmin ? (
            <>
              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[0.95rem] font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
                onClick={openTemplates}
                type="button"
              >
                <span>Manage templates</span>
              </button>
              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[0.95rem] font-medium text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
                onClick={openDeadlineRules}
                type="button"
              >
                <span>Configure rules</span>
              </button>
            </>
          ) : null}
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#5546ff,#4338ca)] px-5 text-[0.95rem] font-semibold text-white shadow-[0_12px_28px_rgba(67,56,202,0.24)] transition hover:opacity-95"
            onClick={downloadPortfolioReport}
            type="button"
          >
            <DownloadIcon />
            <span>{isAdmin ? "Export firm report" : "Download report"}</span>
          </button>
        </div>
      </section>

      {feedbackMessage ? (
        <div className="rounded-[1.35rem] border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {feedbackMessage}
        </div>
      ) : null}

      <SurfaceCard className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-0 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
        <div className="grid divide-y divide-slate-100 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {summaryCards.map((card) => (
            <div className="flex items-center gap-5 px-7 py-7" key={card.id}>
              {card.icon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
                {card.id === "portfolio" ? (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{
                          width: `${scopedSummary.portfolioCompliancePercentage}%`,
                        }}
                      />
                    </div>
                    <p className={cn("mt-2 text-sm font-medium", card.helperClassName)}>
                      {card.helper}
                    </p>
                  </>
                ) : (
                  <p className={cn("mt-2 text-sm font-medium", card.helperClassName)}>{card.helper}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <SurfaceCard className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white p-0 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-[1.35rem] font-semibold text-slate-950">Active clients</h2>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row">
              <div className="relative lg:flex-[1.15]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search clients..."
                  type="search"
                  value={searchQuery}
                />
              </div>
              <select
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100 lg:w-[180px]"
                onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                value={riskFilter}
              >
                <option value="all">All risk levels</option>
                <option value="overdue">Overdue</option>
                <option value="high_risk">High risk</option>
                <option value="at_risk">At risk</option>
                <option value="compliant">Compliant</option>
              </select>
            </div>
          </div>

          {filteredClients.length > 0 ? (
            <>
              <div className="hidden border-b border-slate-100 px-5 py-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:grid lg:grid-cols-[1.6fr_0.92fr_0.56fr_0.84fr_0.56fr_0.9fr_0.94fr_0.9fr] lg:gap-4">
                <div>Client</div>
                <div>Compliance</div>
                <div>Expired</div>
                <div>Expiring (30 Days)</div>
                <div>Missing</div>
                <div>Risk Status</div>
                <div>Last Reviewed</div>
                <div>Actions</div>
              </div>

              <div className="space-y-2 px-3 py-3">
                {filteredClients.map((client) => {
                  const selected = client.clientId === selectedClient?.clientId;

                  return (
                    <div
                      className={cn(
                        "rounded-[1.15rem] border px-4 py-4 transition",
                        selected
                          ? "border-rose-200 bg-rose-50/35 shadow-[0_10px_22px_rgba(244,63,94,0.05)]"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50/60",
                      )}
                      key={client.clientId}
                      onClick={() => {
                        setSelectedClientId(client.clientId);
                        setOpenClientMenuId("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedClientId(client.clientId);
                          setOpenClientMenuId("");
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.92fr_0.56fr_0.84fr_0.56fr_0.9fr_0.94fr_0.9fr] lg:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-semibold text-indigo-600">
                            {initialsFor(client.clientName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.96rem] font-semibold text-slate-950">
                              {client.clientName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{client.assignedAccountant}</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                            <span>{client.score}%</span>
                            <span className="text-slate-400">{client.totalRequiredItems} items</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className={cn("h-2 rounded-full bg-gradient-to-r", progressClasses(client.score))}
                              style={{ width: `${client.score}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-rose-500 lg:text-center">
                          {client.expiredCount}
                        </p>

                        <p className="text-sm font-semibold text-amber-500 lg:text-center">
                          {client.expiringCount}
                        </p>

                        <p className="text-sm font-semibold text-indigo-500 lg:text-center">
                          {client.missingCount}
                        </p>

                        <div className="lg:flex lg:justify-center">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                              statusChipClasses(client.riskStatus),
                            )}
                          >
                            {formatStatusLabel(client.riskStatus)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-700">{formatDateLabel(client.lastReviewed)}</p>

                        <div className="relative flex items-center justify-start gap-2 lg:justify-end">
                          <Button
                            className="h-9 rounded-xl px-4 text-[0.86rem]"
                            onClick={(event) => {
                              event.stopPropagation();
                              openClientWorkspace(client);
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            Open
                          </Button>

                          <button
                            aria-label="Open client actions"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenClientMenuId((current) =>
                                current === client.clientId ? "" : client.clientId,
                              );
                            }}
                            type="button"
                          >
                            <MoreHorizontalIcon />
                          </button>

                          {openClientMenuId === client.clientId ? (
                            <div className="absolute right-0 top-[calc(100%+0.45rem)] z-20 min-w-[260px] rounded-[1rem] border border-slate-200 bg-white p-2 shadow-[0_20px_42px_rgba(15,23,42,0.14)]">
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openComplianceHistory(client);
                                }}
                                type="button"
                              >
                                View compliance history
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDocumentCentre(client);
                                }}
                                type="button"
                              >
                                Open document centre
                              </button>
                              <button
                                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (isAdmin) {
                                    openAssignments();
                                  } else {
                                    downloadClientReport(client);
                                  }
                                }}
                                type="button"
                              >
                                {isAdmin ? "Assign accountant" : "Export client compliance report"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing 1 to {filteredClients.length} of {clientStatuses.length} clients
                </p>
                <button
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-700 transition hover:text-brand-800"
                  onClick={() => navigate("/firm/clients")}
                  type="button"
                >
                  <span>View all clients</span>
                  <ChevronRightIcon />
                </button>
              </div>
            </>
          ) : (
            <div className="px-5 py-10">
              <EmptyState
                description={
                  !isAdmin && clientStatuses.length === 0
                    ? "No clients have been assigned to you yet."
                    : "Try another client name or clear the risk filter to bring the portfolio back into view."
                }
                title="No clients match these filters"
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="rounded-[1.75rem] border border-slate-200/90 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          {selectedClient ? (
            <div className="space-y-5">
              <div className="space-y-4">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Selected Client
                </p>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fb923c,#f43f5e)] text-lg font-semibold text-white">
                    {initialsFor(selectedClient.clientName)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[1.45rem] font-semibold text-slate-950">
                        {selectedClient.clientName}
                      </h2>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold ring-1 ring-inset",
                          statusChipClasses(selectedClient.riskStatus),
                        )}
                      >
                        {formatStatusLabel(selectedClient.riskStatus)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Assigned to {selectedClient.assignedAccountant}
                    </p>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[0.72rem] font-medium text-slate-600">
                      {selectedClient.ownerLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Compliance score
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold text-slate-950">
                    {selectedClient.score}%
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                      className={cn("h-2 rounded-full bg-gradient-to-r", progressClasses(selectedClient.score))}
                      style={{ width: `${selectedClient.score}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Expired
                    </p>
                    <p className="mt-2 text-[1.6rem] font-semibold text-rose-500">
                      {selectedClient.expiredCount}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Expiring
                    </p>
                    <p className="mt-2 text-[1.6rem] font-semibold text-amber-500">
                      {selectedClient.expiringCount}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Missing
                    </p>
                    <p className="mt-2 text-[1.6rem] font-semibold text-indigo-500">
                      {selectedClient.missingCount}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Top priorities
                </p>
                <div className="mt-3 space-y-2.5">
                  {selectedClient.topPriorities.slice(0, 3).map((priority) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3"
                      key={priority.id}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{priority.label}</p>
                        <p className="text-xs text-slate-500">{priority.detail}</p>
                      </div>
                      <ChevronRightIcon />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Actions
                </p>
                <button
                  className="flex w-full items-center justify-between rounded-[1rem] border border-brand-200 bg-white px-4 py-3 text-left text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                  onClick={() => openClientWorkspace(selectedClient)}
                  type="button"
                >
                  <span>Open client workspace</span>
                  <ChevronRightIcon />
                </button>
                {isAdmin ? (
                  <>
                    <button
                      className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      onClick={openAssignments}
                      type="button"
                    >
                      <span>Assign accountant</span>
                      <ChevronRightIcon />
                    </button>
                    <button
                      className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      onClick={openDeadlineRules}
                      type="button"
                    >
                      <span>Configure rules</span>
                      <ChevronRightIcon />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      onClick={() => handleRequestDocuments(selectedClient)}
                      type="button"
                    >
                      <span>Request documents</span>
                      <ChevronRightIcon />
                    </button>
                    <button
                      className="flex w-full items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      onClick={() => downloadClientReport(selectedClient)}
                      type="button"
                    >
                      <span>Download client compliance report</span>
                      <ChevronRightIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              description="Select a client row to view top priorities and actions."
              title="No client selected"
            />
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
