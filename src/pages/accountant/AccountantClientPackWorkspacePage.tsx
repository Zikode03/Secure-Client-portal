import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardPlus, Plus, Repeat2, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, apiPostJson, apiPutJson, hasApiBaseUrl } from "../../services/apiClient";
import { formatDateLabel, formatStatusLabel } from "../../utils/formatters";
import { AccountantClientWorkspacePage } from "./AccountantClientWorkspacePage";

interface MonthlyPackRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  status: string;
}

interface ClientPackProfile {
  clientId: string;
  templateId?: string | null;
  templateName?: string | null;
  availableTemplates: Array<{ id: string; name: string; description: string }>;
  recurringItems: Array<{
    id: string;
    category: string;
    label: string;
    isRequired: boolean;
    source: "firm_default" | "client_specific" | string;
  }>;
  pendingRecurringItems: Array<{
    id: string;
    category: string;
    label: string;
    isRequired: boolean;
    requestedAtUtc: string;
    requestedByUserId: string;
  }>;
  currentPackItems: Array<{
    slotId: string;
    category: string;
    label: string;
    isRequired: boolean;
    status: string;
    source: "firm_default" | "client_specific" | "client_added" | string;
    dueDateUtc?: string | null;
  }>;
  updatedAtUtc: string;
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

function sourceLabel(source: string) {
  switch (source) {
    case "firm_default": return "Firm default";
    case "client_specific": return "Client-specific";
    case "client_added": return "Added by client";
    default: return source.replace(/_/g, " ");
  }
}

function sourceClasses(source: string) {
  switch (source) {
    case "firm_default": return "bg-slate-100 text-slate-600";
    case "client_specific": return "bg-brand-50 text-brand-700";
    case "client_added": return "bg-amber-50 text-amber-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function AccountantClientPackWorkspacePage() {
  const { clientId = "" } = useParams();
  const backendMode = hasApiBaseUrl() && Boolean(clientId);
  const [pack, setPack] = useState<MonthlyPackRecord | null>(null);
  const [profile, setProfile] = useState<ClientPackProfile | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Requirement editor state. Accountants/Admin can choose one month or recurring immediately.
  const [category, setCategory] = useState("other");
  const [label, setLabel] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [recurrence, setRecurrence] = useState<"this_month" | "every_month">("this_month");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "danger"; title: string; message: string } | null>(null);

  async function loadPackProfile() {
    if (!backendMode) return;
    try {
      const [packs, packProfile] = await Promise.all([
        apiGetJson<MonthlyPackRecord[]>(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`),
        apiGetJson<ClientPackProfile>(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}`),
      ]);
      setPack(packs[0] ?? null);
      setProfile(packProfile);
      setSelectedTemplateId(packProfile.templateId ?? "");
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Pack profile unavailable",
        message: error instanceof ApiError ? error.message : "The client's monthly-pack profile could not be loaded.",
      });
    }
  }

  useEffect(() => {
    void loadPackProfile();
  }, [backendMode, clientId]);

  const clientSpecificRecurringItems = useMemo(
    () => profile?.recurringItems.filter((item) => item.source === "client_specific") ?? [],
    [profile],
  );

  async function saveTemplate() {
    if (!profile) return;
    setBusy(true);
    try {
      // Only client-specific recurring items are sent back. Firm-default items are derived from the
      // selected template and must never be copied into the client's custom list.
      await apiPutJson<ClientPackProfile, {
        templateId: string | null;
        recurringItems: Array<{ category: string; label: string; isRequired: boolean }>;
      }>(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}`, {
        templateId: selectedTemplateId || null,
        recurringItems: clientSpecificRecurringItems.map((item) => ({
          category: item.category,
          label: item.label,
          isRequired: item.isRequired,
        })),
      });
      await loadPackProfile();
      setFeedback({
        tone: "success",
        title: "Client monthly-pack profile saved",
        message: "The selected firm template will be used as the baseline for future monthly packs for this client.",
      });
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Template could not be saved",
        message: error instanceof ApiError ? error.message : "The client's monthly-pack template could not be changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function addRequirement() {
    if (!pack) {
      setFeedback({ tone: "warning", title: "No current monthly pack", message: "Create the client's monthly pack before adding a requirement." });
      return;
    }

    const resolvedCategory = category === "other" ? customCategory.trim() : category;
    if (!resolvedCategory || !label.trim()) {
      setFeedback({ tone: "warning", title: "Requirement details needed", message: "Enter a document name and category." });
      return;
    }

    if (["under_review", "complete", "closed"].includes(pack.status.toLowerCase())) {
      setFeedback({ tone: "warning", title: "Pack is locked", message: "A pack already in review, completed or closed cannot receive new requirements." });
      return;
    }

    setBusy(true);
    try {
      const addedLabel = label.trim();
      await apiPostJson(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}/items`, {
        category: resolvedCategory,
        label: addedLabel,
        isRequired,
        recurrence,
        dueDateUtc: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      });

      setLabel("");
      setCustomCategory("");
      setDueDate("");
      setCategory("other");
      setIsRequired(true);
      setRecurrence("this_month");
      await loadPackProfile();
      setFeedback({
        tone: "success",
        title: "Pack requirement added",
        message: recurrence === "every_month"
          ? `${addedLabel} is in the current pack and has been approved for future monthly packs.`
          : `${addedLabel} is now part of ${monthLabel(pack.year, pack.month)} for this client only.`,
      });
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

  async function resolveRecurring(requestId: string, approve: boolean) {
    setBusy(true);
    try {
      await apiPostJson(
        `/api/monthly-pack-profiles/${encodeURIComponent(clientId)}/recurring/${encodeURIComponent(requestId)}/${approve ? "approve" : "decline"}`,
        {},
      );
      await loadPackProfile();
      setFeedback({
        tone: "success",
        title: approve ? "Recurring item approved" : "Kept as this-month only",
        message: approve
          ? "The item will now be added automatically to future monthly packs for this client."
          : "The current-month item remains, but it will not automatically appear in future packs.",
      });
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Recurring request could not be updated",
        message: error instanceof ApiError ? error.message : "The recurring monthly-pack request could not be updated.",
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
                <h2 className="portal-section-title text-slate-950">Client monthly-pack profile</h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Each client can use a different firm template plus client-specific recurring requirements. One-off client additions stay in the current month unless recurring use is approved here.
              </p>
            </div>

            {feedback ? (
              <div className="px-5 pt-5">
                <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
              </div>
            ) : null}

            <div className="space-y-5 p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Firm template for this client</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This is the baseline used when a new monthly pack is created. Client-specific recurring items are added on top of it.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <select
                      className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                      value={selectedTemplateId}
                    >
                      <option value="">Firm default template</option>
                      {profile?.availableTemplates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <Button disabled={busy || !profile} onClick={() => void saveTemplate()}>Save</Button>
                  </div>
                  {profile?.templateName ? (
                    <p className="mt-2 text-xs text-slate-500">Currently using: <span className="font-semibold text-slate-700">{profile.templateName}</span></p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Recurring profile</h3>
                  <p className="mt-1 text-xs text-slate-500">What this client is expected to provide in a normal month.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile?.recurringItems.length ? profile.recurringItems.map((item) => (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceClasses(item.source)}`} key={`${item.source}-${item.id}`}>
                        {item.label} · {sourceLabel(item.source)}
                      </span>
                    )) : <span className="text-sm text-slate-500">No recurring requirements configured yet.</span>}
                  </div>
                </div>
              </div>

              {profile?.pendingRecurringItems.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <Repeat2 className="h-4 w-4 text-amber-700" />
                    <h3 className="text-sm font-semibold text-amber-950">Client requests for future monthly packs</h3>
                  </div>
                  <div className="mt-3 space-y-2">
                    {profile.pendingRecurringItems.map((request) => (
                      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" key={request.id}>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{request.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Requested {formatDateLabel(request.requestedAtUtc)} · {request.isRequired ? "Required" : "Optional"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button disabled={busy} onClick={() => void resolveRecurring(request.id, false)} size="sm" variant="secondary">
                            <X className="h-4 w-4" /> This month only
                          </Button>
                          <Button disabled={busy} onClick={() => void resolveRecurring(request.id, true)} size="sm">
                            <Check className="h-4 w-4" /> Approve recurring
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Add requirement</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Add something for this month only, or make it a recurring client-specific requirement immediately.
                  </p>

                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Document name</span>
                      <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Vehicle finance statement" value={label} />
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
                        <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setCustomCategory(event.target.value)} placeholder="e.g. vehicle finance" value={customCategory} />
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600">Due date</span>
                      <input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
                    </label>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button className={`rounded-xl border p-3 text-left ${recurrence === "this_month" ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`} onClick={() => setRecurrence("this_month")} type="button">
                        <span className="block text-sm font-semibold text-slate-800">This month only</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Does not change future packs</span>
                      </button>
                      <button className={`rounded-xl border p-3 text-left ${recurrence === "every_month" ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`} onClick={() => setRecurrence("every_month")} type="button">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Repeat2 className="h-3.5 w-3.5" /> Every month</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Adds to this client's recurring profile</span>
                      </button>
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <input checked={isRequired} className="mt-1" onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">Required</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">Required items must be provided before the month can be submitted.</span>
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
                      <p className="mt-1 text-xs text-slate-500">
                        {pack ? monthLabel(pack.year, pack.month) : "No current pack"} · {profile?.currentPackItems.length ?? 0} requirement{profile?.currentPackItems.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {profile?.currentPackItems.length ? (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Requirement</th>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {profile.currentPackItems.map((item) => (
                            <tr key={item.slotId}>
                              <td className="px-4 py-4"><p className="font-semibold text-slate-950">{item.label}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.category.replace(/_/g, " ")}</p></td>
                              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceClasses(item.source)}`}>{sourceLabel(item.source)}</span></td>
                              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isRequired ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{item.isRequired ? "Required" : "Optional"}</span></td>
                              <td className="px-4 py-4 text-slate-600">{formatStatusLabel(item.status)}</td>
                              <td className="px-4 py-4 text-slate-500">{item.dueDateUtc ? formatDateLabel(item.dueDateUtc) : "—"}</td>
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
            </div>
          </SurfaceCard>
        </section>
      ) : null}
    </div>
  );
}
