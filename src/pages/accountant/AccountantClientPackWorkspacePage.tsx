import { useEffect, useMemo, useState } from "react";
import { Building2, Check, ClipboardPlus, Pencil, Plus, Repeat2, Trash2, X } from "lucide-react";
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

interface ClientRecord {
  id: string;
  name: string;
  entityType: string;
  industry?: string | null;
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

// Template recommendations deliberately use broad business keywords. The suggestion is advisory:
// Accountant/Admin still reviews and saves the template, so a guessed industry never changes compliance silently.
function templateKeywords(client: ClientRecord | null) {
  const text = `${client?.industry ?? ""} ${client?.entityType ?? ""}`.toLowerCase();
  if (/transport|logistic|fleet|courier|freight|taxi/.test(text)) return ["transport", "logistic", "fleet"];
  if (/retail|shop|store|wholesale|ecommerce|e-commerce/.test(text)) return ["retail", "trading", "sales"];
  if (/construction|building|engineering|contractor/.test(text)) return ["construction", "contractor", "project"];
  if (/manufactur|factory|production/.test(text)) return ["manufactur", "production", "inventory"];
  if (/hospitality|hotel|restaurant|catering/.test(text)) return ["hospitality", "restaurant", "hotel"];
  if (/property|real estate|rental/.test(text)) return ["property", "rental", "real estate"];
  if (/health|medical|clinic|pharma/.test(text)) return ["health", "medical", "clinic"];
  if (/agric|farm/.test(text)) return ["agriculture", "farm"];
  if (/consult|professional|legal|account|technology|software|service/.test(text)) return ["professional", "service", "consult"];
  return ["standard", "general", "business"];
}

export function AccountantClientPackWorkspacePage() {
  const { clientId = "" } = useParams();
  const backendMode = hasApiBaseUrl() && Boolean(clientId);
  const [pack, setPack] = useState<MonthlyPackRecord | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [profile, setProfile] = useState<ClientPackProfile | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Requirement editor state. Accountant/Admin can choose one month or future recurring behavior.
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
      const [packs, packProfile, clientRecord] = await Promise.all([
        apiGetJson<MonthlyPackRecord[]>(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`),
        apiGetJson<ClientPackProfile>(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}`),
        apiGetJson<ClientRecord>(`/api/clients/${encodeURIComponent(clientId)}`),
      ]);
      setPack(packs[0] ?? null);
      setProfile(packProfile);
      setClient(clientRecord);
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

  const recommendedTemplate = useMemo(() => {
    if (!profile || !client) return null;
    const keywords = templateKeywords(client);
    return profile.availableTemplates.find((template) => {
      const haystack = `${template.name} ${template.description}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    }) ?? null;
  }, [client, profile]);

  async function persistProfile(
    recurringItems: Array<{ category: string; label: string; isRequired: boolean }>,
    successTitle: string,
    successMessage: string,
    templateId = selectedTemplateId || null,
  ) {
    setBusy(true);
    try {
      await apiPutJson<ClientPackProfile, {
        templateId: string | null;
        recurringItems: Array<{ category: string; label: string; isRequired: boolean }>;
      }>(`/api/monthly-pack-profiles/${encodeURIComponent(clientId)}`, {
        templateId,
        recurringItems,
      });
      await loadPackProfile();
      setFeedback({ tone: "success", title: successTitle, message: successMessage });
    } catch (error) {
      setFeedback({
        tone: "danger",
        title: "Monthly-pack profile could not be saved",
        message: error instanceof ApiError ? error.message : "The client's future monthly-pack profile could not be updated.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate(templateId = selectedTemplateId) {
    await persistProfile(
      clientSpecificRecurringItems.map((item) => ({ category: item.category, label: item.label, isRequired: item.isRequired })),
      "Client monthly-pack profile saved",
      "The selected firm template will be used as the baseline for future monthly packs. Historical packs are unchanged.",
      templateId || null,
    );
  }

  async function editRecurring(itemId: string) {
    const item = clientSpecificRecurringItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const nextLabel = window.prompt("Recurring requirement name", item.label)?.trim();
    if (!nextLabel) return;
    const nextRequired = window.confirm("Should this recurring requirement be REQUIRED in future monthly packs?\n\nOK = Required\nCancel = Optional");
    const nextItems = clientSpecificRecurringItems.map((candidate) => ({
      category: candidate.category,
      label: candidate.id === itemId ? nextLabel : candidate.label,
      isRequired: candidate.id === itemId ? nextRequired : candidate.isRequired,
    }));
    await persistProfile(nextItems, "Recurring requirement updated", `${nextLabel} was updated for future monthly packs. Existing months were not changed.`);
  }

  async function removeRecurring(itemId: string) {
    const item = clientSpecificRecurringItems.find((candidate) => candidate.id === itemId);
    if (!item || !window.confirm(`Remove '${item.label}' from future monthly packs? Existing monthly packs will stay unchanged.`)) return;
    const nextItems = clientSpecificRecurringItems
      .filter((candidate) => candidate.id !== itemId)
      .map((candidate) => ({ category: candidate.category, label: candidate.label, isRequired: candidate.isRequired }));
    await persistProfile(nextItems, "Recurring requirement removed", `${item.label} will no longer be added to future monthly packs.`);
  }

  async function addRequirement() {
    const resolvedCategory = category === "other" ? customCategory.trim() : category;
    if (!resolvedCategory || !label.trim()) {
      setFeedback({ tone: "warning", title: "Requirement details needed", message: "Enter a document name and category." });
      return;
    }

    const duplicate = [...(profile?.currentPackItems ?? []), ...(profile?.recurringItems ?? [])].some(
      (item) => item.label.trim().toLowerCase() === label.trim().toLowerCase() || item.category.trim().toLowerCase() === resolvedCategory.toLowerCase(),
    );
    if (duplicate && !window.confirm("A similar monthly-pack requirement already exists. Add another separate requirement anyway?")) return;

    const packLocked = !pack || ["under_review", "complete", "closed"].includes(pack.status.toLowerCase());

    // When the current month is locked, Accountant/Admin can still configure the future profile.
    // We update the recurring profile directly instead of trying to mutate the historical/current pack.
    if (packLocked) {
      if (recurrence !== "every_month") {
        setFeedback({
          tone: "warning",
          title: "Current monthly pack is locked",
          message: "This-month-only requirements cannot be added now. Choose Every month to add the requirement from the next monthly pack onward.",
        });
        return;
      }

      const futureItems = [
        ...clientSpecificRecurringItems.map((item) => ({ category: item.category, label: item.label, isRequired: item.isRequired })),
        { category: resolvedCategory, label: label.trim(), isRequired },
      ];
      const addedLabel = label.trim();
      await persistProfile(
        futureItems,
        "Future requirement added",
        `${addedLabel} will start from the next monthly pack. The locked current month was not changed.`,
      );
      setLabel("");
      setCustomCategory("");
      setDueDate("");
      setCategory("other");
      setIsRequired(true);
      setRecurrence("this_month");
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
                Build the monthly pack around the client's actual business. Firm defaults provide a safe baseline; client-specific recurring requirements tailor future months without rewriting historical packs.
              </p>
            </div>

            {feedback ? (
              <div className="px-5 pt-5">
                <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} />
              </div>
            ) : null}

            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-brand-100 bg-brand-50/35 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100"><Building2 className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">{client?.name ?? "Client business profile"}</h3>
                      {client?.entityType ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{client.entityType}</span> : null}
                      {client?.industry ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">{client.industry}</span> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Company type and industry help choose a stronger starting checklist. The recommendation remains advisory and must be confirmed by Accountant/Admin.
                    </p>
                    {recommendedTemplate ? (
                      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-brand-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Recommended template</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{recommendedTemplate.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{recommendedTemplate.description}</p>
                        </div>
                        <Button disabled={busy} onClick={() => { setSelectedTemplateId(recommendedTemplate.id); void saveTemplate(recommendedTemplate.id); }} size="sm">Use recommendation</Button>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">No exact industry-matched template was found. Use the firm default or choose the closest template below.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Firm template for this client</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">This is the baseline used when a new monthly pack is created. Client-specific recurring items are added on top of it.</p>
                  <div className="mt-4 flex gap-2">
                    <select className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setSelectedTemplateId(event.target.value)} value={selectedTemplateId}>
                      <option value="">Firm default template</option>
                      {profile?.availableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                    <Button disabled={busy || !profile} onClick={() => void saveTemplate()}>Save</Button>
                  </div>
                  {profile?.templateName ? <p className="mt-2 text-xs text-slate-500">Currently using: <span className="font-semibold text-slate-700">{profile.templateName}</span></p> : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Recurring profile</h3>
                  <p className="mt-1 text-xs text-slate-500">Firm defaults are read-only here. Client-specific requirements can be edited or removed for future packs.</p>
                  <div className="mt-3 space-y-2">
                    {profile?.recurringItems.length ? profile.recurringItems.map((item) => (
                      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" key={`${item.source}-${item.id}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${sourceClasses(item.source)}`}>{sourceLabel(item.source)}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600">{item.isRequired ? "Required" : "Optional"}</span>
                          </div>
                        </div>
                        {item.source === "client_specific" ? (
                          <div className="flex gap-2">
                            <Button disabled={busy} onClick={() => void editRecurring(item.id)} size="sm" variant="secondary"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                            <Button disabled={busy} onClick={() => void removeRecurring(item.id)} size="sm" variant="danger"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                          </div>
                        ) : null}
                      </div>
                    )) : <span className="text-sm text-slate-500">No recurring requirements configured yet.</span>}
                  </div>
                </div>
              </div>

              {profile?.pendingRecurringItems.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-amber-700" /><h3 className="text-sm font-semibold text-amber-950">Client requests for future monthly packs</h3></div>
                  <div className="mt-3 space-y-2">
                    {profile.pendingRecurringItems.map((request) => (
                      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between" key={request.id}>
                        <div><p className="text-sm font-semibold text-slate-900">{request.label}</p><p className="mt-0.5 text-xs text-slate-500">Requested {formatDateLabel(request.requestedAtUtc)} · {request.isRequired ? "Required" : "Optional"}</p></div>
                        <div className="flex gap-2">
                          <Button disabled={busy} onClick={() => void resolveRecurring(request.id, false)} size="sm" variant="secondary"><X className="h-4 w-4" /> This month only</Button>
                          <Button disabled={busy} onClick={() => void resolveRecurring(request.id, true)} size="sm"><Check className="h-4 w-4" /> Approve recurring</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">Add requirement</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Add something for this month only, or make it recurring. If the current month is locked, recurring items can still start from the next month.</p>

                  <div className="mt-4 space-y-3">
                    <label className="block"><span className="text-xs font-semibold text-slate-600">Document name</span><input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Vehicle finance statement" value={label} /></label>
                    <label className="block"><span className="text-xs font-semibold text-slate-600">Category</span><select className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setCategory(event.target.value)} value={category}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    {category === "other" ? <label className="block"><span className="text-xs font-semibold text-slate-600">Custom category</span><input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setCustomCategory(event.target.value)} placeholder="e.g. vehicle finance" value={customCategory} /></label> : null}
                    <label className="block"><span className="text-xs font-semibold text-slate-600">Due date for this month</span><input className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} /></label>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button className={`rounded-xl border p-3 text-left ${recurrence === "this_month" ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`} onClick={() => setRecurrence("this_month")} type="button"><span className="block text-sm font-semibold text-slate-800">This month only</span><span className="mt-0.5 block text-xs text-slate-500">Does not change future packs</span></button>
                      <button className={`rounded-xl border p-3 text-left ${recurrence === "every_month" ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white"}`} onClick={() => setRecurrence("every_month")} type="button"><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Repeat2 className="h-3.5 w-3.5" /> Every month</span><span className="mt-0.5 block text-xs text-slate-500">Future profile; works even when current month is locked</span></button>
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"><input checked={isRequired} className="mt-1" onChange={(event) => setIsRequired(event.target.checked)} type="checkbox" /><span><span className="block text-sm font-semibold text-slate-800">Required</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Required items must be provided before an applicable month can be submitted.</span></span></label>
                    <Button className="w-full" disabled={busy} onClick={() => void addRequirement()}><Plus className="h-4 w-4" /> {busy ? "Saving…" : "Add requirement"}</Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-950">Current pack checklist</h3><p className="mt-1 text-xs text-slate-500">{pack ? monthLabel(pack.year, pack.month) : "No current pack"} · {profile?.currentPackItems.length ?? 0} requirement{profile?.currentPackItems.length === 1 ? "" : "s"}</p></div></div>

                  {profile?.currentPackItems.length ? (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Requirement</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th></tr></thead>
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
                  ) : <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">No requirements have been configured for the current monthly pack.</div>}
                </div>
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}
    </div>
  );
}
