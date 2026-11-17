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
          {e}
        </p>
      ))}
      {warnings?.map((e, i) => (
        <p className="text-amber-800" key={`w${i}`}>
          {e}
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
  onSave: (v: ClientInput, skip: boolean) => void;
}) {
  const [values, setValues] = useState<ClientInput>(row.values!);
  const [skip, setSkip] = useState(row.skip ?? false);
  const saved = JSON.stringify([row.values, row.skip]);
  useEffect(() => {
    setValues(row.values!);
    setSkip(row.skip ?? false);
  }, [saved]);
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">
        Client details Â· row {row.sourceRow}:{" "}
        {row.values?.name || "Unnamed client"}
      </h3>
      {row.importedId ? (
        <p className="text-sm text-green-800">
          Client profile imported. Account access can be invited separately.
        </p>
      ) : null}
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
        <Button variant="secondary" onClick={() => onSave(values, skip)}>
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
      duplicateAcknowledged: false,
    });
    onDirty();
  };
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{row.fileName}</h3>
        <Button size="sm" variant="secondary" onClick={onDownload}>
          Download for review
        </Button>
      </div>
      {row.importedId ? (
        <p className="text-sm text-green-800">
          Imported as uploaded. Review, acceptance and filing remain separate.
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
          <label className="space-y-1 text-sm">
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
          </label>
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
  const [history, setHistory] = useState<MigrationSummary[]>([]);
  const [batch, setBatch] = useState<MigrationDetail | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [name, setName] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const [kind, setKind] = useState<"clients" | "documents" | null>(null);
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
  const [confirmed, setConfirmed] = useState(false);
  const [uploadClient, setUploadClient] = useState("");
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");
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
    if (user?.role !== "admin") return;
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
  }, [user?.role]);
  if (user?.role !== "admin")
    return <p>Only administrators can import client lists and documents.</p>;
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The operation failed. Refresh this import before trying again.",
      );
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
      update(
        await migration.stageSpreadsheet(
          current.summary!.id!,
          current.summary?.version ?? 0,
          file,
        ),
      );
      setStep("review");
      setPage(0);
      setActiveEditor(null);
    });
  const uploadDocuments = (files: File[]) =>
    run(async () => {
      if ((batch?.documents?.length ?? 0) + files.length > 100)
        throw new Error("Choose up to 100 documents for each import.");
      if (files.some((file) => file.size > 20 * 1024 * 1024))
        throw new Error("Each document must be 20 MB or smaller.");
      let current = await ensureImport();
      const failures: string[] = [];
      for (const file of files) {
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
          if (uploadClient || uploadMonth || uploadCategory !== "general") {
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
                  year: year ? Number(year) : null,
                  month: month ? Number(month) : null,
                  category: uploadCategory,
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
      detail: `${clients.find((c) => c.id === row.values?.clientId)?.name || "Choose a client"} Â· ${row.values?.year && row.values?.month ? `${row.values.year}-${String(row.values.month).padStart(2, "0")}` : "Choose a month"}`,
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
        title="Import Clients & Documents"
        description="Add your existing client list and paperwork to Secure Client."
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
              <button disabled={busy || !loaded} onClick={() => start("clients")} className="import-option-card">
                <span className="import-option-card__icon"><FileSpreadsheet size={21} strokeWidth={1.7} aria-hidden="true" /></span>
                <span className="import-option-card__content">
                  <span className="import-option-card__title">Import a client list</span>
                  <span className="import-option-card__description">Excel / CSV · Preview and validate client details before adding them.</span>
                </span>
                <ArrowRight size={17} className="import-option-card__arrow" aria-hidden="true" />
              </button>
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
                {batch?.summary?.importedClients ?? 0} clients and{" "}
                {batch?.summary?.importedDocuments ?? 0} documents added.
                Documents still need the accountant's normal review and
                filing.
              </p>
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
                    : "Choose an existing client and the month the documents cover. You'll confirm each document in the next step."}
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
                      ? "Uploading..."
                      : kind === "clients"
                        ? (batch?.clients?.length ?? 0) > 0
                          ? "Client list uploaded"
                          : "Choose your spreadsheet"
                        : "Choose documents from your computer"}
                  </span>
                  <span className="mt-2 text-xs text-slate-500">
                    {kind === "clients"
                      ? "Excel (.xlsx) or CSV Â· up to 500 clients Â· 2 MB maximum"
                      : "Select several files at once Â· up to 100 documents Â· 20 MB each"}
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
                        : ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt"
                    }
                    multiple={kind === "documents"}
                    disabled={
                      busy ||
                      (kind === "clients" && (batch?.clients?.length ?? 0) > 0)
                    }
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length)
                        void (kind === "clients"
                          ? uploadSpreadsheet(files[0])
                          : uploadDocuments(files));
                    }}
                  />
                </label>
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
                    onSave={(values, skip) =>
                      void run(async () => {
                        update(
                          await migration.editClient(
                            id,
                            selectedClient.id!,
                            version,
                            values,
                            skip,
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
                  {(batch.clients ?? []).filter((r) => !r.skip).length} clients
                  and{" "}
                  {
                    (batch.documents ?? []).filter((r) => !r.values?.skip)
                      .length
                  }{" "}
                  documents to Secure Client.{" "}
                  {rows.filter((r) => r.skip).length} items will be left out.
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                <p>
                  Documents will be available to the confirmed client and
                  authorised staff.
                </p>
                <p>
                  Your accountant still needs to review and file them. New
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
                belongs to the selected client and month.
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
                    Â· {h.clientRows ?? 0} clients Â· {h.documents ?? 0}{" "}
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
