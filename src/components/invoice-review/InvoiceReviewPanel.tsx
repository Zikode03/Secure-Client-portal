import { useActionDialog } from "../ui/useActionDialog";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { useEffect, useRef, useState } from "react";
import {
  invoiceReviewApi,
  type InvoiceReviewResponse,
} from "../../services/invoiceReviewApi";
import {
  emptyReviewValues,
  scanReviewInvoiceDocument,
  type ReviewInvoiceValues,
  type ReviewEvidence,
  type ReviewLineItem,
} from "../../services/invoiceReviewScanner";
import { Button } from "../ui/Button";
import { InvoiceEvidenceViewer } from "./InvoiceEvidenceViewer";

export interface InvoiceReviewReady {
  documentId: string;
  versionNumber: number;
  revision: number;
  ready: boolean;
  dirty: boolean;
}
interface Props {
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
  onReady: (value: InvoiceReviewReady | null) => void;
}
const labels: Record<
  Exclude<keyof ReviewInvoiceValues, "allAdjustmentsAccountedFor">,
  string
> = {
  supplierName: "Supplier",
  invoiceNumber: "Invoice number",
  invoiceDate: "Invoice date",
  currency: "Currency",
  invoiceTotal: "Invoice total",
  amountDue: "Amount due (if different)",
  subtotal: "Subtotal before VAT",
  vatAmount: "VAT amount",
  adjustments: "Signed adjustments",
};
const resultLabels: Record<string, string> = {
  no_issue_detected: "No issue detected",
  needs_attention: "Needs attention",
  unable_to_verify: "Unable to verify",
};
function toEvidence(data: InvoiceReviewResponse): ReviewEvidence[] {
  return (data.evidence ?? []).flatMap((e) =>
    typeof e.field === "string" &&
    typeof e.text === "string" &&
    typeof e.x === "number" &&
    typeof e.y === "number" &&
    typeof e.width === "number" &&
    typeof e.height === "number"
      ? [
          {
            field: e.field,
            text: e.text,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            confidence: e.confidence,
            pageIndex: e.pageIndex ?? 0,
          },
        ]
      : [],
  );
}
function reviewValues(data: InvoiceReviewResponse): ReviewInvoiceValues {
  const value = data.values;
  return {
    supplierName: value?.supplierName ?? "",
    invoiceNumber: value?.invoiceNumber ?? "",
    invoiceDate: value?.invoiceDate ?? "",
    currency: value?.currency ?? "ZAR",
    invoiceTotal: value?.invoiceTotal ?? "",
    amountDue: value?.amountDue ?? "",
    subtotal: value?.subtotal ?? "",
    vatAmount: value?.vatAmount ?? "",
    adjustments: value?.adjustments ?? "",
    allAdjustmentsAccountedFor: value?.allAdjustmentsAccountedFor ?? false,
  };
}
export function InvoiceReviewPanel({
  documentId,
  versionNumber,
  fileName,
  fileUrl,
  mimeType,
  onReady,
}: Props) {
  const actionDialog = useActionDialog();
  const [data, setData] = useState<InvoiceReviewResponse | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewInvoiceValues | null>(
    null,
  );
  const [values, setValues] = useState<ReviewInvoiceValues>(emptyReviewValues);
  const [evidence, setEvidence] = useState<ReviewEvidence[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState<ReviewLineItem[]>([]);
  const [lineItemsConfirmed, setLineItemsConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [source, setSource] = useState("manual");
  const scan = useRef<AbortController | null>(null);
  const request = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    const abort = new AbortController();
    mounted.current = true;
    setLoading(true);
    setError("");
    setData(null);
    setDirty(false);
    request.current = null;
    invoiceReviewApi
      .get(documentId)
      .then((response) => {
        if (!abort.signal.aborted) {
          if (response.versionNumber !== versionNumber)
            throw new Error(
              "This file has a newer version. Close the review and refresh the queue.",
            );
          setData(response);
          setSuggestions(response.suggestions ?? null);
          setValues(reviewValues(response));
          setEvidence(toEvidence(response));
          setConfirmed(response.originalConfirmed ?? false);
          setLineItems(response.lineItems ?? []);
          setLineItemsConfirmed(response.lineItemsConfirmed ?? false);
          setNote(response.reviewNote ?? "");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(
            e instanceof Error ? e.message : "Could not load invoice checks.",
          );
          setLoading(false);
        }
      });
    return () => {
      abort.abort();
      mounted.current = false;
      scan.current?.abort();
      onReady(null);
    };
  }, [documentId, versionNumber, onReady]);
  useEffect(() => {
    onReady({
      documentId,
      versionNumber,
      revision: data?.revision ?? 0,
      ready: !!data?.canAccept && data.versionNumber === versionNumber && !error && !dirty && !busy && !loading,
      dirty,
    });
  }, [data, dirty, busy, loading, error, documentId, versionNumber, onReady]);
  function change(patch: Partial<ReviewInvoiceValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setSource("manual");
    setConfirmed(false);
    setDirty(true);
    request.current = null;
  }
  async function readPhoto() {
    if (!fileUrl || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setProgress(0);
    setConfirmed(false);
    setDirty(true);
    request.current = null;
    const abort = new AbortController();
    scan.current = abort;
    try {
      const response = await fetch(fileUrl, { signal: abort.signal });
      if (!response.ok) throw new Error("The original document could not be downloaded.");
      const blob = await response.blob();
      const result = await scanReviewInvoiceDocument(
        new File([blob], fileName, { type: mimeType || blob.type }),
        abort.signal,
        (p) => {
          if (!abort.signal.aborted) setProgress(p);
        },
      );
      if (!abort.signal.aborted && mounted.current) {
        setValues(result.values);
        setSuggestions(result.values);
        setEvidence(result.evidence);
        setLineItems(result.lineItems);
        setLineItemsConfirmed(false);
        setSource("on_device_ocr");
        setDirty(true);
        request.current = null;
      }
    } catch (e) {
      if (!abort.signal.aborted && mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "The document could not be read. Enter the details manually.",
        );
    } finally {
      if (mounted.current) {
        setBusy(false);
        setProgress(null);
      }
      busyRef.current = false;
    }
  }
  async function save() {
    if (busyRef.current || !data) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    request.current ??= crypto.randomUUID();
    try {
      const response = await invoiceReviewApi.save(documentId, {
        requestId: request.current,
        expectedVersionNumber: versionNumber,
        expectedRevision: data.revision ?? 0,
        values,
        evidence,
        originalConfirmed: confirmed,
        lineItems,
        lineItemsConfirmed,
        reviewNote: note || null,
        source,
        suggestions: suggestions ?? undefined,
      });
      if (mounted.current) {
        setData(response);
        setValues(reviewValues(response));
        setEvidence(toEvidence(response));
        setDirty(false);
        request.current = null;
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Invoice details could not be saved.",
        );
    } finally {
      if (mounted.current) setBusy(false);
      busyRef.current = false;
    }
  }
  const readable =
    mimeType === "application/pdf" ||
    /\.pdf$/i.test(fileName) ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    /\.(?:jpe?g|png)$/i.test(fileName);
  const findings = data?.findings ?? [];
  const incomplete = findings.filter(
    (f) => f.result !== "no_issue_detected",
  ).length;
  return (
    <section aria-label="Invoice review assistant" className="space-y-4">
      {actionDialog.dialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">
            Invoice review assistant
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Check the suggested details against the original, then save to run
            the checks.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || loading}
          onClick={async () => {
            if (
              dirty &&
              !await actionDialog.confirm("Discard unsaved invoice details and reload?")
            )
              return;
            setLoading(true);
            setError("");
            void invoiceReviewApi
              .get(documentId)
              .then((r) => {
                if (r.versionNumber !== versionNumber)
                  throw new Error(
                    "This file has a newer version. Close the review and refresh the queue.",
                  );
                setData(r);
                setSuggestions(r.suggestions ?? null);
                setValues(reviewValues(r));
                setEvidence(toEvidence(r));
                setConfirmed(r.originalConfirmed ?? false);
                setNote(r.reviewNote ?? "");
                setDirty(false);
                request.current = null;
              })
              .catch((e) =>
                setError(e instanceof Error ? e.message : "Refresh failed."),
              )
              .finally(() => setLoading(false));
          }}
        >
          Refresh checks
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Loading invoice checks…
        </p>
      ) : null}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="xl:sticky xl:top-4">
          <InvoiceEvidenceViewer
            url={fileUrl}
            mimeType={mimeType}
            fileName={fileName}
            evidence={evidence}
            selectedField={selectedField}
          />
        </div>
        <div className="space-y-4">
          {readable ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !fileUrl || loading}
                onClick={() => void readPhoto()}
              >
                {progress !== null
                  ? `Reading document… ${progress}%`
                  : "Read invoice details"}
              </Button>
              {progress !== null ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => scan.current?.abort()}
                >
                  Cancel scan
                </Button>
              ) : null}
              <span className="text-xs text-slate-500">
                Processed on this device
              </span>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Automatic reading covers PDF, JPG and PNG invoices. Enter the
              details from this document manually.
            </p>
          )}
          {data?.legacyAmount ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Previously saved amount: R{data.legacyAmount}. Check the original
              to identify whether this is the invoice total or amount due, then
              enter it in the appropriate field.
            </p>
          ) : null}
          <fieldset disabled={busy || loading || !data} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(labels) as Array<keyof typeof labels>).map(
                (field) => (
                  <label
                    key={field}
                    className="space-y-1 text-xs font-medium text-slate-600"
                  >
                    {labels[field]}
                    <input
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={values[field]}
                      type={field === "invoiceDate" ? "date" : "text"}
                      inputMode={
                        [
                          "invoiceTotal",
                          "amountDue",
                          "subtotal",
                          "vatAmount",
                          "adjustments",
                        ].includes(field)
                          ? "decimal"
                          : undefined
                      }
                      maxLength={
                        field === "supplierName"
                          ? 160
                          : field === "invoiceNumber"
                            ? 80
                            : field === "currency"
                              ? 3
                              : field === "invoiceDate"
                                ? 10
                                : 18
                      }
                      onFocus={() => setSelectedField(field)}
                      onChange={(e) => change({ [field]: e.target.value })}
                    />
                    {suggestions &&
                    suggestions[field] &&
                    suggestions[field] !== values[field] ? (
                      <span className="block text-xs font-normal text-slate-500">
                        Read as {suggestions[field]}
                      </span>
                    ) : null}
                  </label>
                ),
              )}
            </div>
            <InvoiceLineItems lines={lineItems} confirmed={lineItemsConfirmed} onChange={next => { setLineItems(next); setLineItemsConfirmed(false); change({}); }} onConfirm={value => { setLineItemsConfirmed(value); change({}); }} />
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input
                type="checkbox"
                className="mt-1"
                checked={values.allAdjustmentsAccountedFor}
                onChange={(e) =>
                  change({ allAdjustmentsAccountedFor: e.target.checked })
                }
              />
              The subtotal excludes VAT. All discounts and other charges are
              reflected in the signed adjustment, without counting an amount
              twice. Enter 0 when there are no additional adjustments.
            </label>
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  setDirty(true);
                  request.current = null;
                }}
              />
              I checked these details against the original invoice and reviewed
              the findings.
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              Review explanation
              <textarea
                className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900"
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setDirty(true);
                  request.current = null;
                }}
                placeholder="Explain any warning or check you verified manually."
              />
            </label>
            <Button disabled={busy || loading} onClick={() => void save()}>
              {busy ? "Saving…" : "Save details and recheck"}
            </Button>
          </fieldset>
        </div>
      </div>
      {dirty ? (
        <p role="status" className="text-sm text-amber-800">
          Save your changes to update the checks before approving.
        </p>
      ) : null}
      {data?.isStale ? (
        <p role="status" className="text-sm text-amber-800">
          The invoice or matching records changed. Save and recheck before
          approving.
        </p>
      ) : null}
      {data ? (
        <section className="space-y-3" aria-label="Invoice findings">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Checks</h4>
            <span className="text-xs text-slate-500">
              {findings.length} checks · {incomplete} need attention or manual
              verification{dirty ? " · Previous saved results" : ""}
            </span>
          </div>
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold ${finding.result === "no_issue_detected" ? "text-emerald-800" : finding.result === "needs_attention" ? "text-amber-800" : "text-slate-600"}`}
                >
                  {resultLabels[finding.result ?? ""] ?? "Unable to verify"}
                </span>
                {(finding.fields?.length ?? 0) > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-700"
                    onClick={() => setSelectedField(finding.fields![0])}
                  >
                    Show source
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {finding.message}
              </p>
              {finding.relatedDocumentName ? (
                <p className="mt-1 text-xs text-slate-500">
                  Matching document: {finding.relatedDocumentName}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {(data?.history?.length ?? 0) > 0 ? (
        <details className="rounded-xl border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Correction history ({data?.history?.length})
          </summary>
          <div className="mt-3 space-y-3">
            {data?.history?.map((entry) => (
              <div
                key={entry.id}
                className="border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600"
              >
                <p>
                  File version {entry.versionNumber} · review revision{" "}
                  {entry.revision} ·{" "}
                  {entry.createdAtUtc
                    ? new Date(entry.createdAtUtc).toLocaleString()
                    : ""}
                </p>
                <p>
                  {entry.values?.supplierName} · {entry.values?.invoiceNumber} ·{" "}
                  {entry.values?.invoiceDate} · {entry.values?.invoiceTotal}
                </p>
                {(entry.lineItems?.length ?? 0) > 0 ? <details><summary>{entry.lineItems?.length} recorded lines · {entry.lineItemsConfirmed ? "confirmed net basis" : "not confirmed"}</summary>{entry.lineItems?.map((line,index) => <p key={index}>{line.description}: {line.quantity} × {line.unitPrice} − {line.discount || "unknown discount"} = {line.netTotal}</p>)}</details> : null}
                {entry.reviewNote ? <p>{entry.reviewNote}</p> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {data && !data.canAccept && !dirty ? (
        <p className="text-xs leading-5 text-slate-500">
          Confirm the original and save your review. Checks that need attention
          or cannot be verified require a review explanation of at least five
          characters.
        </p>
      ) : null}
    </section>
  );
}
