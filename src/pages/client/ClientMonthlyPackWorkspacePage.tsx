import { useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, Paperclip, UploadCloud } from "lucide-react";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import {
  ApiError,
  apiGetBlob,
  apiGetJson,
  apiPostForm,
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

const categoryOptions = [
  { label: "Invoice", value: "invoices" },
  { label: "Bank statement", value: "bank_statement" },
  { label: "Proof of payment", value: "proof_of_payment" },
  { label: "Supplier statement", value: "supplier_statement" },
  { label: "Receipt / expense", value: "receipt" },
  { label: "Contract / agreement", value: "contract" },
  { label: "Tax document", value: "tax_document" },
  { label: "Payroll document", value: "payroll_document" },
  { label: "Spreadsheet", value: "spreadsheet" },
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
  const [documents, setDocuments] = useState<BackendDocumentRecord[]>([]);
  const [category, setCategory] = useState("proof_of_payment");
  const [customCategory, setCustomCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "danger"; title: string; message: string } | null>(null);

  async function loadSupportingDocuments() {
    if (!backendMode) return;

    try {
      const [packs, allDocuments] = await Promise.all([
        apiGetJson<BackendMonthlyPackRecord[]>(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`),
        apiGetJson<BackendDocumentRecord[]>("/api/documents"),
      ]);
      const currentPack = packs[0] ?? null;
      setPack(currentPack);
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
                  new Date(right.uploadedAtUtc).getTime() - new Date(left.uploadedAtUtc).getTime(),
              )
          : [],
      );
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Supporting documents unavailable",
        message:
          error instanceof ApiError
            ? error.message
            : "The additional documents for this monthly pack could not be loaded.",
      });
    }
  }

  useEffect(() => {
    void loadSupportingDocuments();
  }, [backendMode, clientId]);

  const uploadLocked = useMemo(
    () => !pack || ["under_review", "complete", "closed"].includes(pack.status.trim().toLowerCase()),
    [pack],
  );

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
        message: "Additional documents cannot be added while this pack is with the accountant or already complete.",
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

      setFiles([]);
      const input = document.getElementById("supporting-document-files") as HTMLInputElement | null;
      if (input) input.value = "";
      setFeedback({
        tone: "success",
        title: "Supporting documents uploaded",
        message: `${files.length} file${files.length === 1 ? "" : "s"} added to ${monthLabel(pack.year, pack.month)} without changing the required-document checklist.`,
      });
      await loadSupportingDocuments();
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Supporting upload failed",
        message: error instanceof ApiError ? error.message : "The supporting documents could not be uploaded.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument(document: BackendDocumentRecord) {
    try {
      const { blob } = await apiGetBlob(`/api/documents/${encodeURIComponent(document.id)}/download`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = document.name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Download failed",
        message: error instanceof ApiError ? error.message : "The supporting document could not be downloaded.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <ClientMonthlyPacksPage />

      {backendMode ? (
        <section className="portal-page mx-auto max-w-[1280px] pb-8">
          <SurfaceCard className="overflow-hidden rounded-2xl border border-[#dce6ef] bg-white p-0 shadow-[0_16px_38px_rgba(4,24,52,0.08)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-brand-700" />
                  <h2 className="portal-section-title text-slate-950">Additional & supporting documents</h2>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Add records that are relevant to this month even when they are not part of the required checklist. These files do not affect pack completion, but they travel with the pack to accountant review.
                </p>
              </div>
              {pack ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {documents.length} supporting file{documents.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {feedback ? (
              <div className="px-5 pt-5">
                <FeedbackBanner
                  message={feedback.message}
                  onDismiss={() => setFeedback(null)}
                  title={feedback.title}
                  tone={feedback.tone}
                />
              </div>
            ) : null}

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4 text-brand-700" />
                  <h3 className="text-sm font-semibold text-slate-950">Upload supporting files</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  You can select multiple files. Each file is stored as its own document in the current monthly pack.
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
                        <option key={option.value} value={option.value}>{option.label}</option>
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
                    <p className="text-xs text-slate-500">{files.length} file{files.length === 1 ? "" : "s"} selected.</p>
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
                      This monthly pack is locked because it is already with the accountant or has been completed.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Supporting document register</h3>
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
                        {documents.map((document) => (
                          <tr key={document.id}>
                            <td className="px-4 py-4">
                              <p className="max-w-[280px] truncate font-semibold text-slate-950">{document.name}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatFileSize(document.sizeBytes)}</p>
                            </td>
                            <td className="px-4 py-4 capitalize text-slate-600">{document.category.replace(/_/g, " ")}</td>
                            <td className="px-4 py-4 text-slate-600">{formatStatusLabel(document.status)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDateLabel(document.uploadedAtUtc)}</td>
                            <td className="px-4 py-4 text-right">
                              <Button onClick={() => void downloadDocument(document)} size="sm" variant="secondary">
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
                    <p className="text-sm font-semibold text-slate-900">No additional documents yet</p>
                    <p className="mt-1 text-sm text-slate-500">Use this area for useful records that are not part of the required checklist.</p>
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}
    </div>
  );
}
