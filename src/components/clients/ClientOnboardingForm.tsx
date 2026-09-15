import { useEffect, useRef, useState } from "react";
import { apiGetJson, apiPostJson } from "../../services/apiClient";
import { Button } from "../ui/Button";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { SelectField } from "../ui/SelectField";
import { TextField } from "../ui/TextField";

interface Person { id: string; fullName: string; email: string }
interface Options { accountants: Person[]; clientUsers: Person[] }
export interface ClientOnboardingResult {
  clientId: string; clientName: string; userId: string; accountantUserId: string;
  userCreated: boolean; invitationDelivery: string; message: string;
}

export function ClientOnboardingForm({ onCancel, onCreated }: {
  onCancel: () => void; onCreated: (result: ClientOnboardingResult) => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState("invite");
  const [draft, setDraft] = useState({
    name: "", entityType: "Pty Ltd", industry: "", registrationNumber: "",
    contactName: "", contactEmail: "", accountantUserId: "", existingClientUserId: "",
  });
  useEffect(() => {
    let active = true;
    setError("");
    apiGetJson<Options>("/api/clients/onboarding/options")
      .then(value => { if (active) setOptions(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load onboarding options."); });
    return () => { active = false; };
  }, [attempt]);
  function update(key: keyof typeof draft, value: string) { setDraft(current => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !options) return;
    inFlight.current = true; setSaving(true); setError("");
    try {
      const result = await apiPostJson<ClientOnboardingResult, object>("/api/clients/onboarding", {
        ...draft, requestId: requestId.current,
        existingClientUserId: access === "existing" ? draft.existingClientUserId : null,
        registrationNumber: draft.registrationNumber.trim() || null,
      });
      onCreated(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Client creation failed. Your details have been kept for retry."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <section aria-labelledby="client-onboarding-title" className="border-y border-slate-200 py-6 dark:border-slate-700">
    <div className="mb-5"><h2 id="client-onboarding-title" className="text-xl font-semibold">Add client</h2>
      <p className="mt-1 text-sm text-slate-500">Create the business, connect its portal user and assign an accountant in one step.</p></div>
    {error && <FeedbackBanner tone="danger" title="Client setup needs attention" message={error} />}
    {!options ? <div className="py-4">{error
      ? <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Retry loading options</Button>
      : <p role="status">Loading accountants and client users…</p>}</div> : null}
    <form aria-label="Add client" onSubmit={event => void submit(event)}>
      <fieldset disabled={saving || !options} className="space-y-5">
        <legend className="sr-only">Business and client access</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField autoFocus required maxLength={200} label="Business name" placeholder="Registered business name" value={draft.name} onChange={e => update("name", e.target.value)} />
          <TextField required maxLength={100} label="Entity type" placeholder="Pty Ltd, sole proprietor, trust…" value={draft.entityType} onChange={e => update("entityType", e.target.value)} />
          <TextField required maxLength={100} label="Industry" placeholder="e.g. Construction" value={draft.industry} onChange={e => update("industry", e.target.value)} />
          <TextField maxLength={100} label="Registration number (optional)" value={draft.registrationNumber} onChange={e => update("registrationNumber", e.target.value)} />
        </div>
        <div className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2 dark:border-slate-700">
          <SelectField label="Portal access" value={access} options={[{ value: "invite", label: "Invite a new client user" }, { value: "existing", label: "Link an existing client user" }]} onChange={e => setAccess(e.target.value)} />
          <SelectField required label="Primary accountant" value={draft.accountantUserId} options={[{ value: "", label: "Choose an accountant" }, ...(options?.accountants ?? []).map(p => ({ value: p.id, label: p.fullName + " · " + p.email }))]} onChange={e => update("accountantUserId", e.target.value)} />
          {access === "existing" && <div className="md:col-span-2"><SelectField required label="Existing client user" value={draft.existingClientUserId}
            options={[{ value: "", label: "Choose a client user" }, ...(options?.clientUsers ?? []).map(p => ({ value: p.id, label: p.fullName + " · " + p.email }))]}
            onChange={e => {
              const person = options?.clientUsers.find(p => p.id === e.target.value);
              setDraft(current => ({ ...current, existingClientUserId: e.target.value, contactName: person?.fullName ?? current.contactName, contactEmail: person?.email ?? current.contactEmail }));
            }} /><p className="mt-2 text-xs text-slate-500">Their existing business links are retained. They will need to sign in again.</p></div>}
          <TextField required maxLength={200} label="Contact full name" autoComplete="name" value={draft.contactName} onChange={e => update("contactName", e.target.value)} />
          <TextField required maxLength={320} label="Contact email" type="email" autoComplete="email" value={draft.contactEmail} onChange={e => update("contactEmail", e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-slate-500">{access === "invite" ? "A one-time setup invitation will be emailed. No password is displayed here." : "No new login or password will be created."} Compliance registrations are confirmed separately after saving.</p>
          <div className="flex gap-2"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={!options?.accountants.length || (access === "existing" && !options?.clientUsers.length)}>{saving ? "Creating…" : "Create client"}</Button></div>
        </div>
      </fieldset>
      {options?.accountants.length === 0 && <p role="alert" className="mt-3 text-sm text-amber-700">Create or enable an accountant under Users before adding a client.</p>}
    </form>
  </section>;
}

