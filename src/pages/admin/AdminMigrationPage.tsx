import { bundleArchiveFiles } from "../../services/archiveBundle";
import { suggestArchivePath } from "../../services/archiveImport";
import "./adminDirectories.css";
import { useEffect, useRef, useState } from "react";
import "./importOptions.css";
import { useAuth } from "../../app/auth";
import { apiGetJson } from "../../services/apiClient";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Files,
  History,
  LockKeyhole,
  UploadCloud,
} from "lucide-react";
import * as migration from "../../services/migrationApi";
import type {
  ClientInput,
  ClientRow,
  DocumentInput,
  DocumentRow,
  MigrationDetail,
  MigrationSummary,
} from "../../services/migrationApi";

type ClientOption = { id: string; name: string };
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const fields: Record<keyof ClientInput, string> = {
  name: "Client name",
  entityType: "Entity type",
  industry: "Industry",
  contactName: "Contact name",
  contactEmail: "Contact email",
  registrationNumber: "Registration number",
  accountantEmail: "Accountant email",
};
const categories = [
  "general",
  "bank_statement",
  "invoices",
  "receipts",
  "signed_documents",
  "compliance_record",
  "payroll_summary",
  "tax_working_papers",
  "proof_of_payment",
  "credit_notes",
  "debit_notes",
];
const categoryLabels: Record<string, string> = {
  general: "Other documents",
  bank_statement: "Bank statements",
  invoices: "Invoices",
  receipts: "Receipts",
  signed_documents: "Signed documents",
  compliance_record: "Compliance records",
  payroll_summary: "Payroll summaries",
  tax_working_papers: "Tax working papers",
  proof_of_payment: "Proof of payment",
  credit_notes: "Credit notes",
  debit_notes: "Debit notes",
};
function Messages({
  errors,
  warnings,
}: {
  errors?: string[] | null;
  warnings?: string[] | null;
}) {
  return (
    <div aria-live="polite" className="space-y-1 text-sm">
      {errors?.map((e, i) => (
        <p className="text-red-700" key={`e${i}`}>
          {migration.migrationValidationMessage(e)}
        </p>
      ))}
      {warnings?.map((e, i) => (
        <p className="text-amber-800" key={`w${i}`}>
          {migration.migrationValidationMessage(e)}
        </p>
      ))}
    </div>
  );
}
function ClientEditor({
  row,
  disabled,
  onSave,
  onDirty,
}: {
  row: ClientRow;
  disabled: boolean;
  onDirty: () => void;
  onSave: (v: ClientInput, skip: boolean, useExistingClient: boolean) => void;
}) {
  const [values, setValues] = useState<ClientInput>(row.values!);
  const [skip, setSkip] = useState(row.skip ?? false);
  const [useExistingClient, setUseExistingClient] = useState(row.useExistingClient ?? false);
  const saved = JSON.stringify([row.values, row.skip, row.useExistingClient]);
  useEffect(() => {
    setValues(row.values!);
    setSkip(row.skip ?? false);
    setUseExistingClient(row.useExistingClient ?? false);
  }, [saved]);
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">
        Client details · row {row.sourceRow}:{" "}
        {row.values?.name || "Unnamed client"}
      </h3>
      {row.importedId ? (
        <p className="text-sm text-green-800">
          {row.useExistingClient ? "Existing client linked. Its profile and login access are unchanged." : "Client profile imported. Account access can be invited separately."}
        </p>
      ) : null}
      {row.existingClientId && !row.importedId ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">This client already exists</p>
        <p className="mt-1 text-slate-600">Use its existing profile and assign the accountant below. Company details and login access will stay unchanged.</p>
        <label className="mt-3 flex items-center gap-2 font-medium"><input type="checkbox" checked={useExistingClient} disabled={disabled} onChange={event => {setUseExistingClient(event.target.checked);if(event.target.checked)setSkip(false);onDirty();}} />Use existing client</label>
      </div> : null}
      <fieldset
        disabled={disabled}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {migration.clientColumns.map((k) => (
          <label className="space-y-1 text-sm" key={k}>
            {fields[k]}
            <input
              className={inputClass}
              value={values[k] ?? ""}
              disabled={useExistingClient && k !== "accountantEmail"}
              onChange={(e) => {
                setValues({ ...values, [k]: e.target.value });
                onDirty();
              }}
            />
          </label>
        ))}
      </fieldset>
      <Messages errors={row.errors} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={skip}
          disabled={disabled}
          onChange={(e) => {
            setSkip(e.target.checked);
            onDirty();
          }}
        />
        Leave this client out of the import
      </label>
      {!disabled ? (
        <Button variant="secondary" onClick={() => onSave(values, skip, useExistingClient)}>
          Save client details
        </Button>
      ) : null}
    </article>
  );
}
function DocumentEditor({
  row,
  clients,
  disabled,
  onSave,
  onDownload,
  onDirty,
}: {
  row: DocumentRow;
  clients: ClientOption[];
  disabled: boolean;
  onDirty: () => void;
  onSave: (v: DocumentInput) => void;
  onDownload: () => void;
}) {
  const [values, setValues] = useState<DocumentInput>(row.values!);
  const period =
    values.year && values.month
      ? `${values.year}-${String(values.month).padStart(2, "0")}`
      : "";
  const saved = JSON.stringify(row.values);
  useEffect(() => setValues(row.values!), [saved]);
  const change = (patch: Partial<DocumentInput>) => {
    setValues({
      ...values,
      ...patch,
      ownershipConfirmed: false,
      historicalStatusConfirmed: false,
      duplicateAcknowledged: false,
    });
    onDirty();
  };
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-semibold">{row.fileName}</h3>{values.sourcePath ? <p className="break-all text-xs text-slate-500">{values.sourcePath}</p> : null}<p className="text-xs text-slate-500">{values.previouslyFiled ? "Historically filed — confirmed during import" : "Needs accountant review"}</p></div>
        <Button size="sm" variant="secondary" onClick={onDownload}>
          Download for review
        </Button>
      </div>
      {row.importedId ? (
        <p className="text-sm text-green-800">
          {values.previouslyFiled ? "Historically filed — confirmed during import." : "Imported for accountant review. Filing remains separate."}
        </p>
      ) : null}
      <fieldset disabled={disabled} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Client
            <select
              className={inputClass}
              value={values.clientId ?? ""}
              onChange={(e) => change({ clientId: e.target.value || null })}
            >
              <option value="">Choose a client</option>
              {clients.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">Record section<select className={inputClass} value={values.recordScope??"monthly"} onChange={event=>change({recordScope:event.target.value,year:null,month:null})}><option value="monthly">Monthly financial records</option><option value="annual">Annual financial records</option><option value="permanent">Permanent company records</option><option value="uncertain">Period needs checking</option></select></label>
          {(values.recordScope??"monthly")==="monthly" ? <label className="space-y-1 text-sm">
            Month covered
            <input
              type="month"
              className={inputClass}
              value={period}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                change({
                  year: y ? Number(y) : null,
                  month: m ? Number(m) : null,
                });
              }}
            />
          </label> : values.recordScope==="annual" ? <label className="space-y-1 text-sm">Financial year ending in<input className={inputClass} type="number" min={1900} value={values.year??""} onChange={event=>change({year:event.target.value?Number(event.target.value):null,month:null})} /></label> : null}
          <label className="space-y-1 text-sm">
            Document name
            <input
              className={inputClass}
              value={values.displayName ?? ""}
              onChange={(e) => change({ displayName: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            Document type
            <select
              className={inputClass}
              value={values.category ?? "general"}
              onChange={(e) => change({ category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c] ?? c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.previouslyFiled??false} onChange={e=>change({previouslyFiled:e.target.checked,historicalStatusConfirmed:false})} />Previously reviewed and filed</label>
        {values.previouslyFiled ? <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <label className="block text-sm">Previous reviewer<input className={inputClass} value={values.previousReviewer??""} maxLength={200} onChange={e=>change({previousReviewer:e.target.value})} /></label>
          <label className="block text-sm">Historical notes / details unavailable<textarea className={inputClass} value={values.historicalNotes??""} maxLength={2000} onChange={e=>change({historicalNotes:e.target.value})} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={values.historicalStatusConfirmed??false} onChange={e=>{setValues({...values,historicalStatusConfirmed:e.target.checked});onDirty();}} />I confirm prior review and filing.</label>
        </div> : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.ownershipConfirmed ?? false}
            onChange={(e) => {
              setValues({ ...values, ownershipConfirmed: e.target.checked });
              onDirty();
            }}
          />
          I checked the file and confirm its client and month.
        </label>
        {(row.warnings?.length ?? 0) > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.duplicateAcknowledged ?? false}
              onChange={(e) => {
                setValues({
                  ...values,
                  duplicateAcknowledged: e.target.checked,
                });
                onDirty();
              }}
            />
            I reviewed the duplicate warning and still want to import this file.
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.skip ?? false}
            onChange={(e) => {
              setValues({ ...values, skip: e.target.checked });
              onDirty();
            }}
          />
          Leave this document out of the import
        </label>
      </fieldset>
      <Messages errors={row.errors} warnings={row.warnings} />
      {!disabled ? (
        <Button variant="secondary" onClick={() => onSave(values)}>
          Save document details
        </Button>
      ) : null}
    </article>
  );
}
export function AdminMigrationPage() {
  const { user } = useAuth();
  const importParams=new URLSearchParams(window.location.search);
  const isAdmin = user?.role === "admin";
  const canImport = isAdmin || user?.role === "accountant";
  const [history, setHistory] = useState<MigrationSummary[]>([]);
  const [batch, setBatch] = useState<MigrationDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [name, setName] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const [kind, setKind] = useState<"clients" | "documents" | null>(importParams.get("clientId")?"documents":null);
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const editorPanel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeEditor)
      editorPanel.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
      });
  }, [activeEditor]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const feedbackPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error && !notice) return;
    feedbackPanel.current?.focus({ preventScroll: true });
    feedbackPanel.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [error, notice]);
  const [confirmed, setConfirmed] = useState(false);
  const [uploadClient, setUploadClient] = useState(importParams.get("clientId")??"");
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
  const [recordScope,setRecordScope]=useState("monthly");
  const [previouslyFiled, setPreviouslyFiled] = useState(false);
  const [historicalConfirmed, setHistoricalConfirmed] = useState(false);
  const [previousReviewer, setPreviousReviewer] = useState("");
  const [previousReviewDate, setPreviousReviewDate] = useState("");
  const [historicalNotes, setHistoricalNotes] = useState("");
  const [bulkOwnership, setBulkOwnership] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const markDirty = (id: string) => {
    setDirty((d) => new Set(d).add(id));
    setConfirmed(false);
  };
  const clearDirty = (id: string) =>
    setDirty((d) => {
      const next = new Set(d);
      next.delete(id);
      return next;
    });
  const [loaded, setLoaded] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  useEffect(() => {
    if (!canImport) return;
    let active = true;
    Promise.all([
      migration.listMigrations(),
      apiGetJson("/api/clients"),
    ])
      .then(([h, c]) => {
        if (active) {
          setHistory(h);
          setClients(c);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load previous imports.",
          );
      });
    return () => {
      active = false;
    };
  }, [user?.role, user?.id]);
  if (!canImport)
    return <p>Only administrators and accountants can import documents.</p>;
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(migration.migrationErrorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const update = (b: MigrationDetail) => {
    setBatch(b);
    setConfirmed(false);
    setHistory((h) => [b.summary!, ...h.filter((x) => x.id !== b.summary?.id)]);
  };
  const refresh = async () => {
    if (batch?.summary?.id)
      update(await migration.getMigration(batch.summary.id));
    else {
      setHistory(await migration.listMigrations());
      setClients(await apiGetJson("/api/clients"));
      setLoaded(true);
    }
  };
  const start = (type: "clients" | "documents") => {
    if (type === "clients" && !isAdmin) return;
    setSelectedFileName("");
    setKind(type);
    setBatch(null);
    setName("");
    setStep("upload");
    setActiveEditor(null);
    setPage(0);
    setConfirmed(false);
    setUploadErrors([]);
    setError("");
    setNotice("");
    setUploadClient("");
    setUploadMonth("");
    setUploadCategory("general");
    requestId.current = crypto.randomUUID();
  };
  const ensureImport = async () => {
    if (batch) return batch;
    const created = await migration.createMigration(
      requestId.current,
      name.trim() ||
        `${kind === "clients" ? "Client list" : "Client documents"} - ${new Date().toLocaleDateString()}`,
    );
    update(created);
    requestId.current = crypto.randomUUID();
    return created;
  };
  const uploadSpreadsheet = (file: File) =>
    run(async () => {
      if (!/\.(csv|xlsx)$/i.test(file.name) || file.size > 2 * 1024 * 1024)
        throw new Error("Choose an Excel (.xlsx) or CSV file up to 2 MB.");
      const current = await ensureImport();
      const staged = await migration.stageSpreadsheet(
          current.summary!.id!,
          current.summary?.version ?? 0,
          file,
        );
      update(staged);
      const count = staged.clients?.length ?? 0;
      if (!count) throw new Error("No client rows were found. Check the spreadsheet and use the client template.");
      setNotice(`${file.name}: ${count} client ${count === 1 ? "row" : "rows"} ready to check. No clients have been added yet. Review the details, then confirm the import.`);
      setStep("review");
      setPage(0);
      setActiveEditor(null);
    });
  const uploadDocuments = (files: File[]) =>
    run(async () => {
      if ((batch?.documents?.length ?? 0) + files.length > 2000)
        throw new Error("Choose up to 2,000 documents for each import.");
      if (files.some((file) => file.size > (file.name.toLowerCase().endsWith(".zip") ? 250 : 20) * 1024 * 1024))
        throw new Error("Each document must be up to 20 MB; ZIP archives can be up to 250 MB.");
      if(files.reduce((sum,file)=>sum+file.size,0)>500*1024*1024)throw new Error("Select up to 500 MB of documents at a time. Split larger archives by year.");
      const uploads=files.length>1&&!files.some(file=>file.name.toLowerCase().endsWith(".zip"))
        ? await bundleArchiveFiles(files,setUploadProgress) : files;
      let current = await ensureImport();
      const failures: string[] = [];
      for (const [fileIndex, file] of uploads.entries()) {
        setUploadProgress(`Staging ${fileIndex + 1} of ${uploads.length}: ${file.name}`);
        try {
          const fileId = crypto.randomUUID();
          const importId = current.summary!.id!;
          current = await migration.stageDocument(
            importId,
            fileId,
            current.summary?.version ?? 0,
            file,
          );
          update(current);
          if (uploadClient || uploadMonth || uploadCategory !== "general" || file.webkitRelativePath) {
            const suggested=suggestArchivePath(file.webkitRelativePath || file.name);
            const [year, month] = uploadMonth.split("-");
            const row = current.documents?.find((d) => d.id === fileId);
            if (row?.values) {
              current = await migration.editDocument(
                importId,
                fileId,
                current.summary?.version ?? 0,
                {
                  ...row.values,
                  clientId: uploadClient || null,
                  year: year ? Number(year) : suggested.year,
                  month: month ? Number(month) : suggested.month,
                  category: uploadCategory === "general" ? suggested.category : uploadCategory,
                  sourcePath: suggested.sourcePath,
                  ownershipConfirmed: false,
                  duplicateAcknowledged: false,
                },
              );
              update(current);
            }
          }
        } catch (e) {
          failures.push(
            `${file.name}: ${e instanceof Error ? e.message : "Upload failed"}`,
          );
          break;
        }
      }
      setUploadProgress("");
      setUploadErrors(failures);
      if (failures.length)
        setError(
          "Upload stopped. Refresh this import before selecting the remaining files. Documents already uploaded are saved.",
        );
      else
        setNotice(
          "Documents uploaded privately. Continue to check who they belong to and which month they cover.",
        );
    });
  const editable = batch?.summary?.status === "draft";
  const id = batch?.summary?.id;
  const version = batch?.summary?.version ?? 0;
  const blocked =
    !!batch &&
    ((batch.clients ?? []).some(
      (r) => !r.skip && (r.errors?.length ?? 0) > 0,
    ) ||
      (batch.documents ?? []).some(
        (r) =>
          !r.values?.skip &&
          ((r.errors?.length ?? 0) > 0 ||
            ((r.warnings?.length ?? 0) > 0 &&
              !r.values?.duplicateAcknowledged)),
      ));
  const rows = [
    ...(batch?.clients ?? []).map((row) => ({
      id: row.id!,
      title: row.values?.name || "Unnamed client",
      detail: row.values?.contactEmail || "No contact email",
      skip: row.skip ?? false,
      issues: row.errors?.length ?? 0,
      imported: !!row.importedId,
    })),
    ...(batch?.documents ?? []).map((row) => ({
      id: row.id!,
      title: row.fileName || "Document",
      detail: `${clients.find((c) => c.id === row.values?.clientId)?.name || "Choose a client"} · ${row.values?.recordScope==="permanent"?"Permanent records":row.values?.recordScope==="annual"?`FY${row.values.year??" needs checking"}`:row.values?.recordScope==="uncertain"?"Period needs checking":row.values?.year && row.values?.month ? `${row.values.year}-${String(row.values.month).padStart(2, "0")}` : "Choose a month"}`,
      skip: row.values?.skip ?? false,
      issues:
        (row.errors?.length ?? 0) +
        (!row.values?.duplicateAcknowledged ? (row.warnings?.length ?? 0) : 0),
      imported: !!row.importedId,
    })),
  ];
  const included = rows.filter((r) => !r.skip).length;
  const attention = rows.filter((r) => !r.skip && r.issues > 0).length;
  const selectedClient = batch?.clients?.find((r) => r.id === activeEditor);
  const selectedDocument = batch?.documents?.find((r) => r.id === activeEditor);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const completed = batch?.summary?.status === "approved";
  const goHome = () => {
    setBatch(null);
    setKind(null);
    setActiveEditor(null);
    setError("");
    setNotice("");
    setUploadErrors([]);
  };
  const openHistory = async (importId: string) => {
    const result = await migration.getMigration(importId);
    update(result);
    setKind((result.documents?.length ?? 0) > 0 ? "documents" : "clients");
    setStep(
      (result.clients?.length ?? 0) + (result.documents?.length ?? 0) > 0
        ? "review"
        : "upload",
    );
    setActiveEditor(null);
    setPage(0);
    setUploadErrors([]);
  };
  const downloadTemplate = () =>
    migration.saveDownload(
      new Blob([migration.clientColumns.join(",") + "\r\n"], {
        type: "text/csv;charset=utf-8",
      }),
      "client-import-template.csv",
    );
  return (
    <div className="admin-directory admin-imports">
      <PageHeader
        title={isAdmin ? "Import Clients & Documents" : "Import client documents"}
        description={isAdmin ? "Add your existing client list and paperwork to Secure Client." : "Add historical records to your assigned clients. Confirm the client and period before importing."}
        actions={
          <Button
            disabled={busy || dirty.size > 0}
            variant="secondary"
            onClick={() => void run(refresh)}
          >
            Refresh {batch ? "import" : "history"}
          </Button>
        }
      />
      <div ref={feedbackPanel} tabIndex={-1} className="scroll-mt-5 outline-none">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      ) : null}
      </div>
      {!kind ? (
        <>
          <section aria-label="Choose what to import" className="admin-import-start">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Start an import
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bring in existing records, then validate and approve them before they enter client files.
              </p>
            </div>
            <div className="import-option-grid">
              {isAdmin ? <button disabled={busy || !loaded} onClick={() => start("clients")} className="import-option-card">
                <span className="import-option-card__icon"><FileSpreadsheet size={21} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className="import-option-card__content">
                  <span className="import-option-card__title">Import a client list</span>
                  <span className="import-option-card__description">Excel / CSV · Preview and validate client details before adding them.</span>
                </span>
                <ArrowRight size={17} className="import-option-card__arrow" aria-hidden="true" />
              </button> : null}
              <button disabled={busy || !loaded} onClick={() => start("documents")} className="import-option-card">
                <span className="import-option-card__icon"><Files size={21} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className="import-option-card__content">
                  <span className="import-option-card__title">Import client documents</span>
                  <span className="import-option-card__description">Document batches · Confirm each client and reporting period before approval.</span>
                </span>
                <ArrowRight size={17} className="import-option-card__arrow" aria-hidden="true" />
              </button>
            </div>
            <p className="flex items-start gap-2 text-sm text-slate-500">
              <LockKeyhole
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Your files stay private while you check them. Nothing is added to
              a client's records until you confirm.
            </p>
          </section>
        </>
      ) : (
        <section aria-label="Import review" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={busy || dirty.size > 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 disabled:opacity-50"
              onClick={goHome}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              All imports
            </button>
            <span className="text-sm text-slate-500">
              {batch?.summary?.name ||
                (kind === "clients"
                  ? "New client list"
                  : "New document import")}
            </span>
          </div>
          {!completed ? (
            <ol
              aria-label="Import steps"
              className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
            >
              {(["upload", "review", "confirm"] as const).map(
                (value, index) => {
                  const current = ["upload", "review", "confirm"].indexOf(step);
                  return (
                    <li
                      key={value}
                      aria-current={step === value ? "step" : undefined}
                      className={`flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm ${step === value ? "text-emerald-800" : "text-slate-500"}`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${index <= current ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        {index < current ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {["Upload", "Check details", "Confirm"][index]}
                    </li>
                  );
                },
              )}
            </ol>
          ) : null}
          {dirty.size > 0 ? (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              Save your changes before moving on.{" "}
              <button
                disabled={busy}
                className="font-medium underline"
                onClick={() =>
                  void run(async () => {
                    await refresh();
                    setDirty(new Set());
                    setActiveEditor(null);
                    setEditorEpoch((n) => n + 1);
                  })
                }
              >
                Discard changes and refresh
              </button>
            </div>
          ) : null}
          {completed ? (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8">
              <CheckCircle2
                size={36}
                className="text-emerald-600"
                aria-hidden="true"
              />
              <h2 className="text-xl font-semibold">Import complete</h2>
              <p className="text-sm leading-6 text-slate-600">
                {batch?.summary?.importedClients ?? 0} new clients and{" "}
                {batch?.summary?.importedDocuments ?? 0} documents added. Imported documents are available in the client’s Documents page under their historical periods.
                Documents still need the accountant's normal review and
                filing.
              </p>
              {(batch?.summary?.linkedClients ?? 0) > 0 ? <p className="text-sm text-emerald-800">{batch?.summary?.linkedClients} existing client profiles linked and assigned. No duplicate profiles were created.</p> : null}
              <p className="text-sm text-slate-500">
                Client login invitations are sent separately from Users &
                Access.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => start("documents")}>
                  Import documents
                </Button>
                <Button variant="secondary" onClick={goHome}>
                  Back to all imports
                </Button>
              </div>
            </div>
          ) : null}
          {!completed && step === "upload" ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-7">
                <h2 className="text-xl font-semibold">
                  {kind === "clients"
                    ? "Upload your client list"
                    : "Upload client documents"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {kind === "clients"
                    ? "Use our spreadsheet template so we can recognise your client details. You'll check the list before any clients are added."
                    : "Choose a ZIP archive or folder containing historical records. Check suggested periods and types before adding anything."}
                </p>
              </div>
              <fieldset
                disabled={busy || dirty.size > 0}
                className="space-y-6 p-5 sm:p-7"
              >
                {batch && rows.length === 0 ? (
                  <div className="flex gap-2" aria-label="Import type">
                    <Button
                      variant={kind === "clients" ? "primary" : "secondary"}
                      onClick={() => setKind("clients")}
                    >
                      Client list
                    </Button>
                    <Button
                      variant={kind === "documents" ? "primary" : "secondary"}
                      onClick={() => setKind("documents")}
                    >
                      Documents
                    </Button>
                  </div>
                ) : null}
                {kind === "clients" ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Start with the client template
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Fill in the business, contact and assigned accountant
                        details.
                      </p>
                    </div>
                    <Button variant="secondary" onClick={downloadTemplate}>
                      Download client template
                    </Button>
                  </div>
                ) : (
                  <>
                    {clients.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                        Add your clients first, then return here to import their
                        documents.{" "}
                        <button
                          type="button"
                          className="font-medium underline"
                          onClick={() => start("clients")}
                        >
                          Import a client list
                        </button>
                      </p>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 text-sm font-medium">
                        Client
                        <select
                          className={inputClass}
                          value={uploadClient}
                          onChange={(e) => setUploadClient(e.target.value)}
                        >
                          <option value="">Choose during review</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        Month covered
                        <input
                          type="month"
                          className={inputClass}
                          value={uploadMonth}
                          onChange={(e) => setUploadMonth(e.target.value)}
                        />
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        Document type
                        <select
                          className={inputClass}
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {categoryLabels[c] ?? c}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-sm text-slate-500">
                      Different clients or months? Leave these blank and choose
                      for each document during review.
                    </p>
                  </>
                )}
                <label className="group relative flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                  <UploadCloud
                    size={30}
                    className="mb-3 text-emerald-700"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {busy
                      ? `Reading ${selectedFileName || "your files"}...`
                      : kind === "clients"
                        ? (batch?.clients?.length ?? 0) > 0
                          ? "Client list uploaded"
                          : "Choose your spreadsheet"
                        : "Choose documents from your computer"}
                  </span>
                  <span className="mt-2 text-xs text-slate-500">
                    {kind === "clients"
                      ? "Excel (.xlsx) or CSV · up to 500 clients · 2 MB maximum"
                      : "Select files or a ZIP · up to 2,000 documents · 20 MB per file · ZIP up to 250 MB"}
                  </span>
                  <input
                    aria-label={
                      kind === "clients"
                        ? "Upload client spreadsheet"
                        : "Upload client documents"
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    type="file"
                    accept={
                      kind === "clients"
                        ? ".csv,.xlsx"
                        : ".zip,.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt"
                    }
                    multiple={kind === "documents"}
                    disabled={
                      busy ||
                      (kind === "clients" && (batch?.clients?.length ?? 0) > 0)
                    }
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length) {
                        setSelectedFileName(files.map(file => file.name).join(", "));
                        void (kind === "clients"
                          ? uploadSpreadsheet(files[0])
                          : uploadDocuments(files));
                      }
                    }}
                  />
                </label>
                {kind === "documents" ? <label className="inline-flex cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">
                  Choose a folder
                  <input className="sr-only" type="file" multiple ref={element => {element?.setAttribute("webkitdirectory", "");}} disabled={busy} onChange={event => {const files=Array.from(event.target.files??[]);event.target.value="";if(files.length)void uploadDocuments(files);}} />
                </label> : null}
                {uploadProgress ? <p role="status" className="text-sm text-slate-600">{uploadProgress}. Keep this page open.</p> : null}
                {selectedFileName ? <p className="text-sm text-slate-600">Selected file: <strong className="font-medium">{selectedFileName}</strong>{error ? ". Not imported. Correct the file and choose it again." : ""}</p> : null}
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-slate-600">
                    Give this import a name (optional)
                  </summary>
                  <label className="mt-3 block max-w-lg space-y-1 text-sm">
                    Import name
                    <input
                      className={inputClass}
                      maxLength={200}
                      value={batch?.summary?.name ?? name}
                      disabled={!!batch}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="For example, last year's client records"
                    />
                  </label>
                </details>
                <Messages errors={uploadErrors} />
                {rows.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-medium text-emerald-900">
                      {rows.length}{" "}
                      {kind === "clients" ? "clients" : "documents"} uploaded
                      and ready to check
                    </p>
                    <Button
                      onClick={() => {
                        setStep("review");
                        setPage(0);
                      }}
                    >
                      Check details <ArrowRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </fieldset>
            </div>
          ) : null}
          {((step === "review" && !completed) || completed) && batch && id ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {completed ? "Imported records" : "Check your details"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {completed
                      ? "Your import has been saved in the history below."
                      : attention > 0
                        ? `${attention} ${attention === 1 ? "item needs" : "items need"} your attention. Open the details to correct or leave an item out.`
                        : "Your details are ready. You can check each item before finishing."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    migration.saveDownload(
                      new Blob([migration.failedRowsCsv(batch)], {
                        type: "text/csv;charset=utf-8",
                      }),
                      "import-check-report.csv",
                    )
                  }
                >
                  Download check report
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  [rows.length, "Uploaded"],
                  [attention, "Need attention"],
                  [rows.filter((r) => r.skip).length, "Left out"],
                ].map(([count, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xl font-semibold text-slate-900">
                      {count}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              {(batch.archiveWarnings?.length ?? 0) > 0 ? <div role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Files left out of staging</p><ul>{batch.archiveWarnings?.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div> : null}
              {(batch.documents?.length ?? 0) > 0 && editable ? <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold">Set details for this archive</h3>
                <p className="text-sm text-slate-500">Applies to all included files. Leave month and type unchanged to keep suggestions. Correct uncertain files below; nothing is imported until final confirmation.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-1 text-sm">Client<select className={inputClass} value={uploadClient} onChange={e=>setUploadClient(e.target.value)}><option value="">Choose client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label className="space-y-1 text-sm">Record section<select className={inputClass} value={recordScope} onChange={event=>{setRecordScope(event.target.value);setUploadMonth("");}}><option value="monthly">Monthly financial records</option><option value="annual">Annual financial records</option><option value="permanent">Permanent company records</option><option value="uncertain">Period needs checking</option></select></label>
                  {recordScope==="monthly"||recordScope==="annual"?<label className="space-y-1 text-sm">{recordScope==="annual"?"Financial year ending in":"Override month (optional)"}<input className={inputClass} type={recordScope==="annual"?"number":"month"} value={uploadMonth} onChange={e=>setUploadMonth(e.target.value)} /></label>:null}
                  <label className="space-y-1 text-sm">Override type<select className={inputClass} value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)}><option value="general">Keep suggested types</option>{categories.filter(c=>c!=="general").map(c=><option key={c} value={c}>{categoryLabels[c]??c}</option>)}</select></label>
                </div>
                <label className="block space-y-1 text-sm">Historical status<select className={inputClass} value={previouslyFiled?"filed":"review"} onChange={e=>{setPreviouslyFiled(e.target.value==="filed");setHistoricalConfirmed(false);}}><option value="review">Needs accountant review</option><option value="filed">Previously reviewed and filed</option></select></label>
                {previouslyFiled ? <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm">Recorded as historically filed, confirmed during import. This is separate from a review performed inside Secure Client.</p>
                  <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Previous reviewer (if known)<input className={inputClass} value={previousReviewer} maxLength={200} onChange={e=>setPreviousReviewer(e.target.value)} /></label><label className="text-sm">Previous review date (if known)<input className={inputClass} type="date" value={previousReviewDate} onChange={e=>setPreviousReviewDate(e.target.value)} /></label></div>
                  <label className="block text-sm">Historical notes / details unavailable<textarea className={inputClass} value={historicalNotes} maxLength={2000} onChange={e=>setHistoricalNotes(e.target.value)} /></label>
                  <label className="flex gap-2 text-sm"><input type="checkbox" checked={historicalConfirmed} onChange={e=>setHistoricalConfirmed(e.target.checked)} />I confirm these included records were reviewed and filed before import.</label>
                </div> : null}
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={bulkOwnership} onChange={e=>setBulkOwnership(e.target.checked)} />I checked the client, record sections, types and applicable periods for all included files.</label>
                <Button disabled={busy||!uploadClient||!bulkOwnership||(previouslyFiled&&!historicalConfirmed)} onClick={()=>void run(async()=>{const [year,month]=uploadMonth.split("-");update(await migration.bulkEditDocuments(id!,{version,clientId:uploadClient,year:year?Number(year):null,month:month?Number(month):null,category:uploadCategory==="general"?null:uploadCategory,confirmOwnershipAndPeriods:bulkOwnership,recordScope,previouslyFiled,historicalStatusConfirmed:historicalConfirmed,previousReviewer:previousReviewer||null,previousReviewDateUtc:previousReviewDate?`${previousReviewDate}T00:00:00Z`:null,historicalNotes:historicalNotes||null}));setNotice("Archive details saved. Check remaining errors and duplicate warnings before confirming.");})}>Apply to included files</Button>
                <ul className="grid gap-1 text-sm text-slate-600 sm:grid-cols-3">{Object.entries((batch.documents??[]).filter(r=>!r.values?.skip).reduce<Record<string,number>>((groups,row)=>{const v=row.values;const key=v?.recordScope==="permanent"?"Permanent records":v?.recordScope==="uncertain"?"Period needs checking":v?.recordScope==="annual"?`FY${v.year??" needs checking"} · Annual`:v?.year&&v.month?`${v.year}-${String(v.month).padStart(2,"0")}`:"Month needs checking";groups[key]=(groups[key]??0)+1;return groups;},{})).sort().map(([period,count])=><li key={period}>{period}: {count} files</li>)}</ul>
              </section> : null}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="p-4 font-medium">
                        {(batch.documents?.length ?? 0) > 0
                          ? "Client / document"
                          : "Client"}
                      </th>
                      <th className="p-4 font-medium">Details</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(page * 20, page * 20 + 20).map((row) => (
                      <tr
                        key={row.id}
                        className={
                          activeEditor === row.id ? "bg-emerald-50/40" : ""
                        }
                      >
                        <td className="p-4 font-medium text-slate-900">
                          {row.title}
                        </td>
                        <td className="p-4 text-slate-500">{row.detail}</td>
                        <td className="whitespace-nowrap p-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.skip ? "bg-slate-100 text-slate-600" : row.issues > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
                          >
                            {row.imported
                              ? "Imported"
                              : row.skip
                                ? "Left out"
                                : row.issues > 0
                                  ? "Needs attention"
                                  : "Ready"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={
                              busy ||
                              (dirty.size > 0 && activeEditor !== row.id)
                            }
                            aria-label={`Review ${row.title}`}
                            onClick={() => setActiveEditor(row.id)}
                          >
                            View details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 ? (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Page {page + 1} of {pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busy || dirty.size > 0 || page === 0}
                      onClick={() => {
                        setPage((p) => p - 1);
                        setActiveEditor(null);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy || dirty.size > 0 || page + 1 >= pages}
                      onClick={() => {
                        setPage((p) => p + 1);
                        setActiveEditor(null);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
              <div ref={editorPanel} className="scroll-mt-24">
                {selectedClient ? (
                  <ClientEditor
                    key={`${id}-${activeEditor}-${editorEpoch}`}
                    row={selectedClient}
                    disabled={busy || !editable}
                    onDirty={() => markDirty(selectedClient.id!)}
                    onSave={(values, skip, useExistingClient) =>
                      void run(async () => {
                        update(
                          await migration.editClient(
                            id,
                            selectedClient.id!,
                            version,
                            values,
                            skip,
                            useExistingClient,
                          ),
                        );
                        clearDirty(selectedClient.id!);
                        setActiveEditor(null);
                      })
                    }
                  />
                ) : null}
                {selectedDocument ? (
                  <DocumentEditor
                    key={`${id}-${activeEditor}-${editorEpoch}`}
                    row={selectedDocument}
                    clients={clients}
                    disabled={busy || !editable}
                    onDirty={() => markDirty(selectedDocument.id!)}
                    onSave={(values) =>
                      void run(async () => {
                        update(
                          await migration.editDocument(
                            id,
                            selectedDocument.id!,
                            version,
                            values,
                          ),
                        );
                        clearDirty(selectedDocument.id!);
                        setActiveEditor(null);
                      })
                    }
                    onDownload={() =>
                      void run(async () => {
                        const result = await migration.downloadStagedDocument(
                          id,
                          selectedDocument.id!,
                        );
                        migration.saveDownload(
                          result.blob,
                          selectedDocument.fileName ?? "document",
                        );
                      })
                    }
                  />
                ) : null}
              </div>
              {!completed ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <Button
                    variant="secondary"
                    disabled={busy || dirty.size > 0}
                    onClick={() => {
                      setStep("upload");
                      setActiveEditor(null);
                    }}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to upload
                  </Button>
                  <Button
                    disabled={
                      busy || dirty.size > 0 || blocked || included === 0
                    }
                    onClick={() => {
                      setStep("confirm");
                      setConfirmed(false);
                      setActiveEditor(null);
                    }}
                  >
                    Continue to confirmation{" "}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {!completed && step === "confirm" && batch && id ? (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 w-fit">
                <CheckCircle2 size={28} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  Ready to add these records?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You're adding{" "}
                  {(batch.clients ?? []).filter((r) => !r.skip && !r.useExistingClient).length} new clients
                  and{" "}
                  {
                    (batch.documents ?? []).filter((r) => !r.values?.skip)
                      .length
                  }{" "}
                  documents to Secure Client. {(batch.clients ?? []).filter(r => !r.skip && r.useExistingClient).length} existing clients will be linked and assigned without changing their profiles.{" "}
                  {rows.filter((r) => r.skip).length} items will be left out.
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p>
                  Documents will be available to the confirmed client and
                  authorised staff.
                </p>
                <p>
                  Previously filed records retain an audited historical confirmation; other records still need accountant review. New
                  clients won't receive a login invitation from this import.
                </p>
              </div>
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I have checked the details and confirm that each document
                belongs to the selected client and archive section or accounting period.
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep("review")}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back to check details
                </Button>
                <Button
                  disabled={
                    busy ||
                    dirty.size > 0 ||
                    !confirmed ||
                    blocked ||
                    included === 0
                  }
                  onClick={() =>
                    void run(async () => {
                      update(await migration.approveMigration(id, version));
                      setClients(
                        await apiGetJson("/api/clients"),
                      );
                      setNotice(
                        "Import complete. Your records have been added.",
                      );
                    })
                  }
                >
                  {busy ? "Adding records..." : "Confirm and import"}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}
      {!kind || completed ? (
        <section
          aria-label="Previous imports"
          className="admin-register admin-import-history space-y-4"
        >
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Previous imports</h2>
          </div>
          {!loaded && !error ? (
            <p role="status" className="text-sm text-slate-500">
              Loading previous imports...
            </p>
          ) : null}
          {loaded && history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No imports yet. Choose a client list or documents above to get
              started.
            </div>
          ) : null}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {history.map((h) => (
              <button
                key={h.id}
                disabled={busy || dirty.size > 0}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 disabled:opacity-50"
                onClick={() => void run(() => openHistory(h.id!))}
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {h.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {h.updatedAtUtc
                      ? new Date(h.updatedAtUtc).toLocaleDateString()
                      : ""}{" "}
                    · {h.clientRows ?? 0} clients · {h.documents ?? 0}{" "}
                    documents
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${h.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                >
                  {h.status === "approved" ? "Complete" : "Continue import"}
                </span>
              </button>
            ))}
          </div>
          {history.length > 0 ? (
            <p className="text-xs text-slate-500">
              Your 100 most recent imports are shown here.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
