import { useEffect, useState } from "react";
import { ClipboardPlus, Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { AccountantClientWorkspacePage } from "./AccountantClientWorkspacePage";

interface MonthlyPackRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
}

interface DocumentSlotRecord {
  id: string;
  monthlyPackId: string;
  clientId: string;
  category: string;
  label: string;
  isRequired: boolean;
  status: string;
  dueDateUtc?: string | null;
}

const categoryOptions = [
  { label: "Bank statement", value: "bank_statement" },
  { label: "Invoices", value: "invoices" },
  { label: "Proof of payment", value: "proof_of_payment" },
  { label: "Supplier statement", value: "supplier_statement" },
  { label: "Receipts / expenses", value: "receipt" },
  { label: "Contract / agreement", value: "contract" },
  { label: "Tax document", value: "tax_document" },
  { label: "Payroll document", value: "payroll_document" },
  { label: "Spreadsheet / report", value: "spreadsheet" },
  { label: "Other", value: "other" },
];

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function AccountantClientPackWorkspacePage() {
  const { clientId = "" } = useParams();
  const backendMode = hasApiBaseUrl() && Boolean(clientId);
  const [pack, setPack] = useState<MonthlyPackRecord | null>(null);
  const [slots, setSlots] = useState<DocumentSlotRecord[]>([]);
  const [category, setCategory] = useState("other");
  const [label, setLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "danger"; title: string; message: string } | null>(null);

  async function loadPackRequirements() {
    if (!backendMode) return;
    try {
      const packs = await apiGetJson<MonthlyPackRecord[]>(
        `/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`,
      );
      const currentPack = packs[0] ?? null;
      setPack(currentPack);
      setSlots(
        currentPack
          ? await apiGetJson<DocumentSlotRecord[]>(`/api/document-slots/${encodeURIComponent(currentPack.id)}`)
          : [],
      );
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Pack requirements unavailable",
        message: error instanceof ApiError ? error.message : "The client's current pack requirements could not be loaded.",
      });
    }
  }

  useEffect(() => {
    void loadPackRequirements();
  }, [backendMode, clientId]);

  async function addRequirement() {
    if (!pack) {
      setFeedback({ tone: "warning", title: "No current monthly pack", message: "Create the client's monthly pack before adding a one-off requirement." });
      return;
    }

    const resolvedCategory = category === "other" ? customCategory.trim() : category;
    if (!resolvedCategory || !label.trim()) {
      setFeedback({ tone: "warning", title: "Requirement details needed", message: "Enter a document name and category." });
      return;
    }

    if (["complete", "closed"].includes(pack.status.toLowerCase())) {
      setFeedback({ tone: "warning", title: "Pack is complete", message: "A completed or closed pack cannot receive new requirements." });
      return;
    }

    setBusy(true);
    try {
      await apiPostJson<DocumentSlotRecord, {
        monthlyPackId: string;
        category: string;
        label: string;
        isRequired: boolean;
        dueDateUtc: string | null;
      }>("/api/document-slots", {
        monthlyPackId: pack.id,
        category: resolvedCategory,
        label: label.trim(),
        isRequired,
        dueDateUtc: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      });

      setLabel("");
      setCustomCategory("");
      setDueDate("");
      setCategory("other");
      setIsRequired(true);
      setFeedback({
        tone: "success",
        title: "Pack requirement added",
        message: `${label.trim()} is now part of ${monthLabel(pack.year, pack.month)} for this client only.`,
      });
      await loadPackRequirements();
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Requirement could not be added",
        message: error instanceof ApiError ? error.message : "The document requirement could not be added to this pack.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <AccountantClientWorkspacePage />

      {backendMode ? (
        <section className="portal-page mx-auto max-w-[1280px] pb-8">
          <SurfaceCard className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-0">
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex items-center gap-2">
                <ClipboardPlus className="h-4 w-4 text-brand-700" />
                <h2 className="portal-section-title text-slate-950">Client-specific pack requirements</h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Add a document needed for this client and period without changing the firm's default monthly-pack template. Required items become part of the client's checklist; optional items remain available without blocking submission.
              </p>
            </div>

            {feedback ? (
              <div className="px-5 pt-5">
                <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
              </div>
            ) : null}

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Add requirement</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use this when review of the client's circumstances shows that the standard template is not enough.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Document name</span>
                    <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Vehicle finance agreement" value={label} />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Category</span>
                    <select className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setCategory(event.target.value)} value={category}>
                      {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>

                  {category === "other" ? (
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Custom category</span>
                      <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setCustomCategory(event.target.value)} placeholder="e.g. finance agreement" value={customCategory} />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Due date</span>
                    <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <input checked={isRequired} className="mt-1" onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">Required for this pack</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">If enabled, the client must provide this before the month can be submitted.</span>
                    </span>
                  </label>

                  <Button className="w-full" disabled={busy || !pack} onClick={() => void addRequirement()}>
                    <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add to client pack"}
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Current pack checklist</h3>
                    <p className="mt-1 text-xs text-slate-500">{pack ? monthLabel(pack.year, pack.month) : "No current pack"} · {slots.length} requirement{slots.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                {slots.length > 0 ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr><th className="px-4 py-3">Requirement</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {slots.map((slot) => (
                          <tr key={slot.id}>
                            <td className="px-4 py-4"><p className="font-semibold text-slate-950">{slot.label}</p><p className="mt-1 text-xs capitalize text-slate-500">{slot.category.replace(/_/g, " ")}</p></td>
                            <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${slot.isRequired ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{slot.isRequired ? "Required" : "Optional"}</span></td>
                            <td className="px-4 py-4 text-slate-600">{formatStatusLabel(slot.status)}</td>
                            <td className="px-4 py-4 text-slate-500">{slot.dueDateUtc ? formatDateLabel(slot.dueDateUtc) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">No requirements have been configured for the current monthly pack.</div>
                )}
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}
    </div>
  );
}
