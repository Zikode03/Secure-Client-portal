// Friendly guide: this module (MonthlyPackChecklist) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { Fragment, useState } from "react";
import type { MonthlyDocumentSlot, MonthlyPack } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { SurfaceCard } from "../ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
interface MonthlyPackChecklistProps {
  pack: MonthlyPack;
  onUpload: (slot: MonthlyDocumentSlot) => void;
  onView?: (slot: MonthlyDocumentSlot) => void;
  onDownload?: (slot: MonthlyDocumentSlot) => void;
  isReadOnly?: boolean;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  showSlotCount?: boolean;
  showFooterMeta?: boolean;
}

// Component flow: gather data first, then render a focused UI state.
function RequirementBadge({ isRequired }: { isRequired: boolean }) {
// Render output: this is the visual state users interact with.
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ring-1 ring-inset ${
        isRequired
          ? "bg-rose-50 text-rose-600 ring-rose-100"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      {isRequired ? "Required" : "Optional"}
    </span>
  );
}

function statusMeta(slot: MonthlyDocumentSlot) {
  switch (slot.status) {
    case "draft":
      return {
        label: "Draft",
        classes: "text-slate-600",
        dot: "bg-slate-500",
      };
    case "uploaded":
    case "accepted":
    case "filed":
      return {
        label:
          slot.status === "accepted"
            ? "Accepted"
            : slot.status === "filed"
              ? "Filed"
              : "Uploaded",
        classes: "text-emerald-600",
        dot: "bg-emerald-500",
      };
    case "under_review":
      return {
        label: "Under review",
        classes: "text-sky-600",
        dot: "bg-sky-500",
      };
    case "rejected":
      return {
        label: "Rejected",
        classes: "text-rose-600",
        dot: "bg-rose-500",
      };
    case "pending_signature":
      return {
        label: "Pending signature",
        classes: "text-amber-600",
        dot: "bg-amber-500",
      };
    case "partial":
      return {
        label: "Partial",
        classes: "text-amber-600",
        dot: "bg-amber-500",
      };
    case "pending":
      return {
        label: "Pending",
        classes: "text-slate-500",
        dot: "bg-slate-400",
      };
    default:
      return {
        label: slot.isRequired ? "Missing" : "Not uploaded",
        classes: slot.isRequired ? "text-rose-600" : "text-slate-500",
        dot: slot.isRequired ? "bg-rose-500" : "bg-slate-400",
      };
  }
}

function actionLabel(slot: MonthlyDocumentSlot) {
  if (slot.status === "rejected") {
    return "Re-upload";
  }

  if (slot.status === "draft") {
    return "Upload more";
  }

  if (["uploaded", "accepted", "under_review", "filed"].includes(slot.status)) {
    return "View";
  }

  return "Upload";
}

function ActionIcon({ action }: { action: "view" | "upload" | "reupload" }) {
  if (action === "view") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M2.75 12s3.5-6 9.25-6 9.25 6 9.25 6-3.5 6-9.25 6-9.25-6-9.25-6Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (action === "reupload") {
    return (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M4.75 12a7.25 7.25 0 0 1 12.37-5.13M19.25 12a7.25 7.25 0 0 1-12.37 5.13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M17.12 4.88v3.74h-3.74M6.88 19.12v-3.74h3.74"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5.5 16.5v1.25A2.75 2.75 0 0 0 8.25 20.5h7.5a2.75 2.75 0 0 0 2.75-2.75V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadActionIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 4.75v10.5m0 0 4-4m-4 4-4-4M5.75 16.5v1.75A2 2 0 0 0 7.75 20.25h8.5a2 2 0 0 0 2-2V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function NoteActionIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.75 5.75h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H11l-3.75 3v-3H7.75a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.5 9.5h5M9.5 12.5h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function documentIconMeta(documentType: string) {
  if (documentType === "Bank Statement") {
    return {
      bg: "bg-emerald-50",
      stroke: "text-emerald-600",
    };
  }

  if (documentType === "Invoices") {
    return {
      bg: "bg-rose-50",
      stroke: "text-rose-500",
    };
  }

  if (documentType === "Signed Documents") {
    return {
      bg: "bg-amber-50",
      stroke: "text-amber-500",
    };
  }

  return {
    bg: "bg-sky-50",
    stroke: "text-sky-500",
  };
}

function slotActionIntent(slot: MonthlyDocumentSlot) {
  return ["uploaded", "accepted", "under_review", "filed"].includes(slot.status)
    ? "view"
    : "upload";
}

function SlotIcon({ documentType }: { documentType: string }) {
  const meta = documentIconMeta(documentType);

  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.bg}`}>
      <svg
        aria-hidden="true"
        className={`h-[18px] w-[18px] ${meta.stroke}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 18V6A2.25 2.25 0 0 1 8 3.75Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M13.75 3.75V8h4.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function MoreActionsButton({
  isOpen,
  label,
  onClick,
}: {
  isOpen: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
        isOpen
          ? "bg-slate-100 text-slate-700"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="19" cy="12" r="1.7" />
      </svg>
    </button>
  );
}

function LegendItem({
  label,
  dotClass,
}: {
  label: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[0.9rem] text-slate-500">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
  );
}

export function MonthlyPackChecklist({
  headerActionLabel,
  isReadOnly = false,
  onDownload,
  onHeaderAction,
  onUpload,
  onView,
  pack,
  showFooterMeta = true,
  showSlotCount = true,
}: MonthlyPackChecklistProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);

  function toggleMenu(slotId: string) {
    setOpenMenuId((current) => (current === slotId ? null : slotId));
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  function toggleReason(slotId: string) {
    setExpandedReasonId((current) => (current === slotId ? null : slotId));
  }

  function canDownload(slot: MonthlyDocumentSlot) {
    return Boolean(slot.acceptedFiles.length || slot.lastSubmission);
  }

  function renderActionMenu(slot: MonthlyDocumentSlot) {
    const nextAction = actionLabel(slot);
    const actionIntent = slotActionIntent(slot);
    const buttonIcon =
      actionIntent === "view" ? "view" : nextAction === "Re-upload" ? "reupload" : "upload";
    const showDownload = Boolean(onDownload && canDownload(slot));

    return (
      <div className="relative flex items-center justify-start">
        <MoreActionsButton
          isOpen={openMenuId === slot.id}
          label={`Open actions for ${slot.documentType}`}
          onClick={() => toggleMenu(slot.id)}
        />

        {openMenuId === slot.id ? (
          <div
            className="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-[196px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            {!isReadOnly ? (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  closeMenu();
                  if (actionIntent === "view" && onView) {
                    onView(slot);
                    return;
                  }
                  onUpload(slot);
                }}
                type="button"
              >
                <ActionIcon action={buttonIcon} />
                <span>{nextAction}</span>
              </button>
            ) : null}

            {onView && actionIntent !== "view" ? (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  closeMenu();
                  onView(slot);
                }}
                type="button"
              >
                <ActionIcon action="view" />
                <span>View details</span>
              </button>
            ) : null}

            {showDownload ? (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  closeMenu();
                  onDownload?.(slot);
                }}
                type="button"
              >
                <DownloadActionIcon />
                <span>Download latest</span>
              </button>
            ) : null}

            {slot.rejectionReason ? (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  closeMenu();
                  toggleReason(slot.id);
                }}
                type="button"
              >
                <NoteActionIcon />
                <span>{expandedReasonId === slot.id ? "Hide review note" : "View review note"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <SurfaceCard
      className="overflow-hidden rounded-[1.4rem] p-0"
      onClick={() => closeMenu()}
    >
      <div className="flex flex-col gap-2 px-5 pb-4 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-slate-950">Monthly Pack Checklist</h2>
          {showSlotCount ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[0.68rem] font-semibold text-brand-600">
              {pack.slots.length} slots
            </span>
          ) : null}
        </div>
        {headerActionLabel && onHeaderAction ? (
          <button
            className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
            onClick={onHeaderAction}
            type="button"
          >
            {headerActionLabel}
          </button>
        ) : (
          <div className="text-sm text-slate-500">Due {formatDateLabel(pack.dueDate)}</div>
        )}
      </div>

      <div className="lg:hidden divide-y divide-slate-100">
        {pack.slots.map((slot) => {
          const status = statusMeta(slot);
          const updatedBy =
            slot.status === "rejected"
              ? "by Accountant"
              : slot.lastSubmission
                ? "by You"
                : "-";

          return (
            <div className="space-y-4 px-5 py-4" key={slot.id}>
              <div className="flex items-start gap-3">
                <SlotIcon documentType={slot.documentType} />
                <div className="space-y-1">
                  <h3 className="text-[0.98rem] font-semibold leading-6 text-slate-950">
                    {slot.documentType}
                  </h3>
                  <p className="text-[0.9rem] text-slate-500">
                    {slot.month} {slot.year}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Requirement
                  </p>
                  <RequirementBadge isRequired={slot.isRequired} />
                </div>

                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Status
                  </p>
                  <div className={`flex items-center gap-2 text-[0.92rem] font-medium ${status.classes}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                    <span>{status.label}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Updated
                  </p>
                  <div className="text-[0.9rem] text-slate-500">
                    {slot.lastSubmission ? (
                      <>
                        <p>{formatDateLabel(slot.lastSubmission)}</p>
                        <p className="mt-1 text-slate-400">{updatedBy}</p>
                      </>
                    ) : (
                      <p className="text-slate-400">{updatedBy}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Action
                  </p>
                  {renderActionMenu(slot)}
                </div>
              </div>

              {slot.rejectionReason && expandedReasonId === slot.id ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[0.88rem] leading-6 text-slate-700">
                  <p className="font-semibold text-amber-700">Accountant note</p>
                  <p className="mt-1">{slot.rejectionReason}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-y border-slate-100 text-left text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <th className="px-5 py-3">Document</th>
              <th className="px-2 py-3">Requirement</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Updated</th>
              <th className="px-2 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {pack.slots.map((slot) => {
              const status = statusMeta(slot);
              const updatedBy =
                slot.status === "rejected"
                  ? "by Accountant"
                  : slot.lastSubmission
                    ? "by You"
                    : "-";

              return (
                <Fragment key={slot.id}>
                  <tr className="border-b border-slate-100 align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <SlotIcon documentType={slot.documentType} />
                        <div className="space-y-1">
                          <h3 className="text-[0.98rem] font-semibold leading-6 text-slate-950">
                            {slot.documentType}
                          </h3>
                          <p className="text-[0.9rem] text-slate-500">
                            {slot.month} {slot.year}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <RequirementBadge isRequired={slot.isRequired} />
                    </td>
                    <td className="px-2 py-4">
                      <div className={`flex items-center gap-2 text-[0.92rem] font-medium ${status.classes}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                        <span>{status.label}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-[0.9rem] text-slate-500">
                      {slot.lastSubmission ? (
                        <>
                        <p>{formatDateLabel(slot.lastSubmission)}</p>
                        <p className="mt-1 text-slate-400">{updatedBy}</p>
                      </>
                      ) : (
                        <p className="text-slate-400">{updatedBy}</p>
                      )}
                    </td>
                    <td className="px-2 py-4">{renderActionMenu(slot)}</td>
                  </tr>
                  {slot.rejectionReason && expandedReasonId === slot.id ? (
                    <tr className="border-b border-slate-100">
                      <td className="px-5 pb-4" colSpan={5}>
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[0.88rem] leading-6 text-slate-700">
                          <p className="font-semibold text-amber-700">Accountant note</p>
                          <p className="mt-1">{slot.rejectionReason}</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showFooterMeta ? (
        <>
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <LegendItem dotClass="bg-emerald-500" label="Ready" />
              <LegendItem dotClass="bg-slate-500" label="Draft" />
              <LegendItem dotClass="bg-rose-500" label="Missing" />
              <LegendItem dotClass="bg-rose-400" label="Rejected" />
              <LegendItem dotClass="bg-sky-500" label="Under review" />
              <LegendItem dotClass="bg-slate-400" label="Optional" />
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            Need help?{" "}
            <a className="font-medium text-brand-600 hover:text-brand-700" href="#submission-readiness">
              Read the monthly pack guide
            </a>
          </div>
        </>
      ) : null}
    </SurfaceCard>
  );
}
