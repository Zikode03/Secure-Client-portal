import { useEffect, useMemo, useState } from "react";
import { Building2, Download, FilePlus2, Paperclip, Plus, Repeat2, UploadCloud, X } from "lucide-react";
import { useAuth } from "../../app/auth";
import { MonthlyPackCustomizationProvider } from "../../components/workflow/MonthlyPackCustomizationContext";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import {
  ApiError,
  apiGetBlob,
  apiGetJson,
  apiPostForm,
  apiPostJson,
  hasApiBaseUrl,
} from "../../services/apiClient";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { ClientMonthlyPacksPage } from "./ClientMonthlyPacksPage";

interface BackendMonthlyPackRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
}

interface ClientRecord {
  id: string;
  name: string;
  entityType: string;
  industry?: string | null;
}

interface BackendDocumentRecord {
  id: string;
  clientId: string;
  monthlyPackId: string;
  documentSlotId?: string | null;
  name: string;
  category: string;
  status: string;
  fileType: string;
  sizeBytes: number;
  uploadedAtUtc: string;
}

interface PendingRecurringItem {
  id: string;
  category: string;
  label: string;
  isRequired: boolean;
  requestedAtUtc: string;
  requestedByUserId: string;
}

interface ClientMonthlyPackProfile {
  clientId: string;
  templateId?: string | null;
  templateName?: string | null;
  recurringItems: Array<{
    id: string;
    category: string;
    label: string;
    isRequired: boolean;
    source: string;
  }>;
  pendingRecurringItems: PendingRecurringItem[];
  currentPackItems: Array<{
    slotId: string;
    category: string;
    label: string;
    isRequired: boolean;
    status: string;
    source: string;
    dueDateUtc?: string | null;
  }>;
  updatedAtUtc: string;
}

const categoryOptions = [
  { label: "Bank statement", value: "bank_statement" },
  { label: "Sales / purchase invoices", value: "invoices" },
  { label: "Supplier statement", value: "supplier_statement" },
  { label: "Proof of payment", value: "proof_of_payment" },
  { label: "Payroll / PAYE", value: "payroll_document" },
  { label: "VAT / tax document", value: "tax_document" },
  { label: "Expense receipts", value: "receipt" },
  { label: "Credit notes", value: "credit_notes" },
  { label: "Contract / agreement", value: "contract" },
  { label: "Supporting spreadsheet", value: "spreadsheet" },
  { label: "Other", value: "other" },
];

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) return `${(sizeBytes / 1_000_000).toFixed(1)} MB`;
  if (sizeBytes >= 1_000) return `${Math.max(1, Math.round(sizeBytes / 1_000))} KB`;
  return `${sizeBytes} B`;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function ClientMonthlyPackWorkspacePage() {
  const { user } = useAuth();
  const clientId = user?.clientIds[0] ?? "";
  const backendMode = hasApiBaseUrl() && Boolean(clientId);
  const [pack, setPack] = useState<BackendMonthlyPackRecord | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [documents, setDocuments] = useState<BackendDocumentRecord[]>([]);
  const [profile, setProfile] = useState<ClientMonthlyPackProfile | null>(null);

  // The existing checklist owns its own backend load. Incrementing this key remounts it only
  // after a structural pack change so a newly added row appears without a browser refresh.
  const [checklistRevision, setChecklistRevision] = useState(0);

  // Supporting-document state is intentionally separate from checklist-item state. Supporting
  // files travel with the monthly pack but never change required-document completion.
  const [category, setCategory] = useState("proof_of_payment");
  const [customCategory, setCustomCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Client-created checklist items can be one-off or requested for every month. Recurring client
  // requests remain pending until Accountant/Admin approval; the current-month slot exists now.
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemLabel, setItemLabel] = useState("");
  const [itemCategory, setItemCategory] = useState("other");
  const [itemCustomCategory, setItemCustomCategory] = useState("");
  const [itemRequired, setItemRequired] = useState(false);
  const [itemRecurrence, setItemRecurrence] = useState<"this_month" | "every_month">("this_month");
  const [itemDueDate, setItemDueDate] = useState("");

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "warning" | "danger";
    title: string;
    message: string;
  } | null>(null);

  async function loadWorkspace() {
    if (!backendMode) return;

    try {
      const [packs, allDocuments, packProfile, clientRecord] = await Promise.all([
        apiGetJson<BackendMonthlyPackRecord[]>(
          `/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`,
        ),
        apiGetJson<BackendDocumentRecord[]>("/api/documents"),
        apiGetJson<ClientMonthlyPackProfile>(
          `/api/monthly-pack-profiles/${encodeURIComponent(clientId)}`,
        ),
        apiGetJson<ClientRecord>(`/api/clients/${encodeURIComponent(clientId)}`),
      ]);

      const currentPack = packs[0] ?? null;
      setPack(currentPack);
      setProfile(packProfile);
      setClient(clientRecord);
      setDocuments(
        currentPack
          ? allDocuments
              .filter(
                (document) =>
                  document.clientId === clientId &&
                  document.monthlyPackId === currentPack.id &&
                  !document.documentSlotId,
              )
              .sort(
                (left, right) =>
                  new Date(right.uploadedAtUtc).getTime() -
                  new Date(left.uploadedAtUtc).getTime(),
              )
          : [],
      );
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Monthly pack workspace unavailable",
        message:
          error instanceof ApiError
            ? error.message
            : "The monthly pack configuration and supporting documents could not be loaded.",
      });
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [backendMode, clientId]);

  const uploadLocked = useMemo(
    () =>
      !pack ||
      ["under_review", "complete", "closed"].includes(pack.status.trim().toLowerCase()),
    [pack],
  );

  function openAddItemEditor() {
    if (uploadLocked) {
      setFeedback({
        tone: "warning",
        title: "Monthly pack is locked",
        message:
          "New checklist items cannot be added while this pack is already with the accountant or complete.",
      });
      return;
    }
    setShowAddItem(true);
  }

  async function addMonthlyPackItem() {
    const resolvedCategory =
      itemCategory === "other" ? itemCustomCategory.trim() : itemCategory;
    if (!itemLabel.trim() || !resolvedCategory) {
      setFeedback({
        tone: "warning",
        title: "Item details required",
        message: "Enter a document name and choose a category before adding it to the pack.",
      });
      return;
    }

    if (uploadLocked) {
      setFeedback({
        tone: "warning",
        title: "Monthly pack is locked",
        message:
          "New checklist items cannot be added while this pack is already with the accountant or complete.",
      });
      return;
    }

    const duplicate = [...(profile?.currentPackItems ?? []), ...(profile?.recurringItems ?? [])].some(
      (item) =>
        item.label.trim().toLowerCase() === itemLabel.trim().toLowerCase() ||
        item.category.trim().toLowerCase() === resolvedCategory.toLowerCase(),
    );
    if (duplicate && !window.confirm("A similar monthly-pack item already exists. Add another separate item anyway?")) {
      return;
    }

    setBusy(true);
    try {
      const response = await apiPostJson<
        {
          slotId: string;
          monthlyPackId: string;
          recurringRequestId?: string | null;
          recurrence: string;
          source: string;
        },
        {
          category: string;
          label: string;
          isRequired: boolean;
          recurrence: string;
          dueDateUtc: string | null;
        }
      >(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}/items`, {
        category: resolvedCategory,
        label: itemLabel.trim(),
        isRequired: itemRequired,
        recurrence: itemRecurrence,
        dueDateUtc: itemDueDate
          ? new Date(`${itemDueDate}T23:59:59`).toISOString()
          : null,
      });

      const addedLabel = itemLabel.trim();
      setShowAddItem(false);
      setItemLabel("");
      setItemCategory("other");
      setItemCustomCategory("");
      setItemRequired(false);
      setItemRecurrence("this_month");
      setItemDueDate("");
      await loadWorkspace();
      setChecklistRevision((current) => current + 1);

      setFeedback({
        tone: "success",
        title: "Added to monthly pack",
        message: response.recurringRequestId
          ? `${addedLabel} is in this month's checklist. Your request to include it every month is waiting for accountant approval.`
          : `${addedLabel} was added to this month's checklist.`,
      });
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Could not add monthly-pack item",
        message:
          error instanceof ApiError
            ? error.message
            : "The new checklist item could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function uploadSupportingDocuments() {
    if (!pack || !clientId || files.length === 0) {
      setFeedback({
        tone: "warning",
        title: "Choose documents to upload",
        message: "Select one or more supporting files before uploading.",
      });
      return;
    }

    const documentType = category === "other" ? customCategory.trim() : category;
    if (!documentType) {
      setFeedback({
        tone: "warning",
        title: "Document category required",
        message: "Enter a category for the supporting documents.",
      });
      return;
    }

    if (uploadLocked) {
      setFeedback({
        tone: "warning",
        title: "Monthly pack is locked",
        message:
          "Additional documents cannot be added while this pack is with the accountant or already complete.",
      });
      return;
    }

    setBusy(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("ClientId", clientId);
        form.append("MonthlyPackId", pack.id);
        form.append("DocumentType", documentType);
        form.append("File", file, file.name);
        await apiPostForm("/api/documents/upload", form);
      }

      const uploadedCount = files.length;
      setFiles([]);
      const input = document.getElementById(
        "supporting-document-files",
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      setFeedback({
        tone: "success",
        title: "Supporting documents uploaded",
        message: `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} added to ${monthLabel(pack.year, pack.month)} without changing the required-document checklist.`,
      });
      await loadWorkspace();
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Supporting upload failed",
        message:
          error instanceof ApiError
            ? error.message
            : "The supporting documents could not be uploaded.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument(record: BackendDocumentRecord) {
    try {
      const { blob } = await apiGetBlob(
        `/api/documents/${encodeURIComponent(record.id)}/download`,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = record.name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Download failed",
        message:
          error instanceof ApiError
            ? error.message
            : "The supporting document could not be downloaded.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <MonthlyPackCustomizationProvider
        disabled={uploadLocked}
        onAddItem={openAddItemEditor}
      >
        <ClientMonthlyPacksPage key={checklistRevision} />
      </MonthlyPackCustomizationProvider>

      {backendMode && client ? (
        <section className="portal-page mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">Your business profile</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your monthly pack is tailored using the company information recorded by your accounting firm. If this information is wrong, ask your accountant to update it.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{client.entityType || "Business"}</span>
              {client.industry ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{client.industry}</span> : null}
              {profile?.templateName ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Pack: {profile.templateName}</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      {feedback ? (
        <section className="portal-page mx-auto max-w-[1280px]">
          <FeedbackBanner
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
            title={feedback.title}
            tone={feedback.tone}
          />
        </section>
      ) : null}

      {profile?.pendingRecurringItems.length ? (
        <section className="portal-page mx-auto max-w-[1280px]">
          <SurfaceCard className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Recurring request pending:</span>{" "}
              {profile.pendingRecurringItems.map((item) => item.label).join(", ")}. Your accountant
              will decide whether these should appear automatically in future monthly packs.
            </p>
          </SurfaceCard>
        </section>
      ) : null}

      {backendMode ? (
        <section className="portal-page mx-auto max-w-[1280px] pb-8">
          <SurfaceCard className="overflow-hidden rounded-2xl border border-[#dce6ef] bg-white p-0 shadow-[0_16px_38px_rgba(4,24,52,0.08)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-brand-700" />
                  <h2 className="portal-section-title text-slate-950">
                    Additional & supporting documents
                  </h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Add records that are relevant to this month even when they are not part of the
                  checklist. These files do not affect pack completion, but they travel with the
                  pack to accountant review.
                </p>
              </div>
              {pack ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {documents.length} supporting file{documents.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4 text-brand-700" />
                  <h3 className="text-sm font-semibold text-slate-950">Upload supporting files</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  You can select multiple files. Each file is stored as its own document in the
                  current monthly pack.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Category</span>
                    <select
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                      disabled={busy || uploadLocked}
                      onChange={(event) => setCategory(event.target.value)}
                      value={category}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {category === "other" ? (
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Custom category</span>
                      <input
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                        disabled={busy || uploadLocked}
                        onChange={(event) => setCustomCategory(event.target.value)}
                        placeholder="e.g. Vehicle finance agreement"
                        value={customCategory}
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Files</span>
                    <input
                      className="mt-1 block w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
                      disabled={busy || uploadLocked}
                      id="supporting-document-files"
                      multiple
                      onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                      type="file"
                    />
                  </label>

                  {files.length > 0 ? (
                    <p className="text-xs text-slate-500">
                      {files.length} file{files.length === 1 ? "" : "s"} selected.
                    </p>
                  ) : null}

                  <Button
                    className="w-full"
                    disabled={busy || uploadLocked || files.length === 0}
                    onClick={() => void uploadSupportingDocuments()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {busy ? "Uploading…" : "Upload additional documents"}
                  </Button>

                  {uploadLocked ? (
                    <p className="text-xs leading-5 text-amber-700">
                      This monthly pack is locked because it is already with the accountant or has
                      been completed.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      Supporting document register
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {pack ? monthLabel(pack.year, pack.month) : "Current monthly pack"}
                    </p>
                  </div>
                </div>

                {documents.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Document</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Uploaded</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {documents.map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-4">
                              <p className="max-w-[280px] truncate font-semibold text-slate-950">
                                {record.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(record.sizeBytes)}
                              </p>
                            </td>
                            <td className="px-4 py-4 capitalize text-slate-600">
                              {record.category.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatStatusLabel(record.status)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                              {formatDateLabel(record.uploadedAtUtc)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Button
                                onClick={() => void downloadDocument(record)}
                                size="sm"
                                variant="secondary"
                              >
                                <Download className="h-4 w-4" /> Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      No additional documents yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Use this area for useful records that are not part of the checklist.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      {showAddItem ? (
        <div
          aria-labelledby="add-monthly-pack-item-title"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-slate-950"
                  id="add-monthly-pack-item-title"
                >
                  Add to Monthly Pack
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add something relevant to this month, or request that it becomes part of every
                  future monthly pack.
                </p>
              </div>
              <button
                aria-label="Close monthly pack item editor"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                disabled={busy}
                onClick={() => setShowAddItem(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Document / item name</span>
                <input
                  autoFocus
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                  onChange={(event) => setItemLabel(event.target.value)}
                  placeholder="e.g. Fuel card statement"
                  value={itemLabel}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Category</span>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                  onChange={(event) => setItemCategory(event.target.value)}
                  value={itemCategory}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Due date (optional)</span>
                <input
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                  onChange={(event) => setItemDueDate(event.target.value)}
                  type="date"
                  value={itemDueDate}
                />
              </label>

              {itemCategory === "other" ? (
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">Custom category</span>
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                    onChange={(event) => setItemCustomCategory(event.target.value)}
                    placeholder="e.g. vehicle finance"
                    value={itemCustomCategory}
                  />
                </label>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-600">How often?</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    className={`rounded-xl border px-3 py-3 text-left text-sm ${
                      itemRecurrence === "this_month"
                        ? "border-brand-300 bg-brand-50 text-brand-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                    onClick={() => setItemRecurrence("this_month")}
                    type="button"
                  >
                    <span className="block font-semibold">Just this month</span>
                    <span className="mt-0.5 block text-xs opacity-80">
                      Only the current monthly pack
                    </span>
                  </button>
                  <button
                    className={`rounded-xl border px-3 py-3 text-left text-sm ${
                      itemRecurrence === "every_month"
                        ? "border-brand-300 bg-brand-50 text-brand-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                    onClick={() => setItemRecurrence("every_month")}
                    type="button"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Repeat2 className="h-3.5 w-3.5" /> Every month
                    </span>
                    <span className="mt-0.5 block text-xs opacity-80">
                      Accountant approval required
                    </span>
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:col-span-2">
                <input
                  checked={itemRequired}
                  className="mt-1"
                  onChange={(event) => setItemRequired(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Treat this as required
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Required items must be completed before this monthly pack can be submitted.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                disabled={busy}
                onClick={() => setShowAddItem(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void addMonthlyPackItem()}>
                <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add item"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
