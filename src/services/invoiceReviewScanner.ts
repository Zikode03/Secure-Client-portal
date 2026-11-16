import { extractInvoiceDetails, recognizeInvoiceImage } from "./invoiceScanner";

export interface ReviewInvoiceValues {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  invoiceTotal: string;
  amountDue: string;
  subtotal: string;
  vatAmount: string;
  adjustments: string;
  allAdjustmentsAccountedFor: boolean;
}
export interface ReviewEvidence {
  field: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
  pageIndex?: number;
}
export const emptyReviewValues: ReviewInvoiceValues = {
  supplierName: "",
  invoiceNumber: "",
  invoiceDate: "",
  currency: "ZAR",
  invoiceTotal: "",
  amountDue: "",
  subtotal: "",
  vatAmount: "",
  adjustments: "",
  allAdjustmentsAccountedFor: false,
};

function lastAmount(line: string) {
  const match = line.match(/(?:R|ZAR)?\s*(\d[\d, ]*\.\d{2})\s*$/i);
  return match ? match[1].replace(/[, ]/g, "") : "";
}

export function extractReviewInvoiceValues(text: string): ReviewInvoiceValues {
  const base = extractInvoiceDetails(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const from = (pattern: RegExp) => {
    const matches = lines.filter((line) => pattern.test(line));
    return matches.length === 1 ? lastAmount(matches[0]) : "";
  };
  const dateMatches = text.match(/\b\d{2}[/-]\d{2}[/-]20\d{2}\b/g) ?? [];
  const ambiguousDate = dateMatches.some((value) => {
    const [day, month] = value.split(/[/-]/).map(Number);
    return day <= 12 && month <= 12 && day !== month;
  });
  return {
    ...emptyReviewValues,
    supplierName: base.supplierName,
    invoiceNumber: base.invoiceNumber,
    invoiceDate: ambiguousDate ? "" : base.invoiceDate,
    currency: /\b(?:USD|EUR|GBP)\b/.test(text)
      ? (text.match(/\b(?:USD|EUR|GBP)\b/)?.[0] ?? "")
      : "ZAR",
    invoiceTotal: from(
      /^(?:grand total|invoice total|total(?: incl(?:usive)?(?:\.?\s*(?:vat|tax))?)?)\s*[:R\d ]/i,
    ),
    amountDue: from(/^(?:amount due|total due|balance due)\b/i),
    subtotal: from(/^(?:subtotal|sub total|net subtotal)\b/i),
    vatAmount: from(/^(?:vat(?: total| amount)?|tax total)\b/i),
  };
}

export async function scanReviewInvoicePhoto(
  file: File,
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  const data = await recognizeInvoiceImage(file, signal, progress, true);
  const values = extractReviewInvoiceValues(data.text);
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  const lines =
    data.blocks?.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines),
    ) ?? [];
  const evidence: ReviewEvidence[] = [];
  const keys = [
    "supplierName",
    "invoiceNumber",
    "invoiceDate",
    "invoiceTotal",
    "amountDue",
    "subtotal",
    "vatAmount",
  ] as const;
  for (const field of keys) {
    const value = values[field];
    if (!value) continue;
    const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const candidates = lines.filter(line => extractReviewInvoiceValues(line.text)[field].toLowerCase().replace(/[^a-z0-9]/g, "") === normalized);
    if (candidates.length !== 1) continue;
    const line = candidates[0];
    const x = Math.max(0, Math.min(1, line.bbox.x0 / width));
    const y = Math.max(0, Math.min(1, line.bbox.y0 / height));
    const regionWidth = Math.min(1 - x, (line.bbox.x1 - line.bbox.x0) / width);
    const regionHeight = Math.min(
      1 - y,
      (line.bbox.y1 - line.bbox.y0) / height,
    );
    if (regionWidth <= 0 || regionHeight <= 0) continue;
    evidence.push({
      field,
      text: line.text.trim().slice(0, 500),
      x,
      y,
      width: regionWidth,
      height: regionHeight,
      confidence: Number.isFinite(line.confidence) ? line.confidence : null,
    });
  }
  return { values, evidence, lineItems: extractReviewLineItems(data.text) };
}

/** Reads one invoice per file. Suggestions always require original-document confirmation. */
export async function scanReviewInvoiceDocument(
  file: File,
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const { readInvoicePdfWithSources } = await import("./invoicePdfReader");
    const {text, lines} = await readInvoicePdfWithSources(file, signal, progress);
    const values = extractReviewInvoiceValues(text);
    const evidence: ReviewEvidence[] = [];
    for (const field of ["supplierName", "invoiceNumber", "invoiceDate", "invoiceTotal", "amountDue", "subtotal", "vatAmount"] as const) {
      const value = values[field];
      if (!value) continue;
      const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
      const candidates = lines.filter(line => key(extractReviewInvoiceValues(line.text)[field]) === key(value));
      // Repeated continuation lines are safe only when their source text is identical.
      if (candidates.length && new Set(candidates.map(line => key(line.text))).size === 1) {
        const line = candidates[0];
        evidence.push({...line, field, text: line.text.trim().slice(0, 500)});
      }
    }
    return { values, evidence, lineItems: extractReviewLineItems(text) };
  }
  return scanReviewInvoicePhoto(file, signal, progress);
}

export interface ReviewLineItem { description: string; quantity: string; unitPrice: string; discount: string; netTotal: string; }
/** Only explicit net-column tables are suggested. Unsupported layouts stay manual. */
export function extractReviewLineItems(text: string): ReviewLineItem[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => /description/i.test(line) && /qty|quantity/i.test(line) && /unit\s*price/i.test(line) && /net\s*(?:total|amount)/i.test(line));
  if (start < 0 || /discount\s*%|discount\s*percent|tax inclusive|incl\.?\s*(?:vat|tax)/i.test(lines[start])) return [];
  if (/discount/i.test(lines[start]) && !/discount\s*amount/i.test(lines[start])) return [];
  const hasDiscount = /discount/i.test(lines[start]);
  const result: ReviewLineItem[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*(?:subtotal|sub total|vat|tax|grand total|invoice total)\b/i.test(line)) break;
    const columns = line.trim().split(/\s*\|\s*|\s{2,}/);
    if (columns.length !== (hasDiscount ? 5 : 4)) continue;
    const [description, quantity, unitPrice] = columns;
    if (!description || !columns.slice(1).every(value => /^\d+(?:\.\d{1,4})?$/.test(value))) continue;
    result.push({ description: description.slice(0, 200), quantity, unitPrice,
      discount: hasDiscount ? columns[3] : "", netTotal: columns[hasDiscount ? 4 : 3] });
    if (result.length === 100) break;
  }
  return result;
}
