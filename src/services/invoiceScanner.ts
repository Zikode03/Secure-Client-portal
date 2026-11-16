export interface InvoiceDetails {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
}

export const emptyInvoiceDetails: InvoiceDetails = { supplierName: '', invoiceNumber: '', invoiceDate: '', amount: '' };

// Conservative suggestions only. Missing or ambiguous values stay editable.
export function extractInvoiceDetails(text: string): InvoiceDetails {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const supplier = text.match(/(?:supplier|vendor|sold by)\s*:\s*([^\r\n]+)/i)?.[1]
    ?? lines.find(line => /[a-z]{3}/i.test(line) && !/invoice|receipt|tax|date|total|vat|tel|www\.|@/i.test(line)) ?? '';
  const number = text.match(/(?:invoice|receipt)\s*(?:number|no\.?|#)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]*)/i)?.[1] ?? '';
  const date = text.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);
  const localDate = text.match(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/);
  const candidate = date ? `${date[1]}-${date[2]}-${date[3]}` : localDate ? `${localDate[3]}-${localDate[2]}-${localDate[1]}` : '';
  const invoiceDate = candidate && Number.isFinite(Date.parse(candidate)) && new Date(candidate).toISOString().slice(0, 10) === candidate ? candidate : '';
  const totals = lines.filter(line => /(?:grand total|amount due|total due|^total\b)/i.test(line) && !/subtotal|sub total|vat total|tax total/i.test(line));
  const value = totals[totals.length - 1]?.match(/(?:R|ZAR)?\s*([\d, ]+[.,]\d{2})\s*$/i)?.[1]?.replace(/[ ,]/g, '') ?? '';
  return { supplierName: supplier.slice(0, 160), invoiceNumber: number.slice(0, 80), invoiceDate, amount: /^\d+\.\d{2}$/.test(value) ? value : '' };
}

export function suggestedInvoiceName(details: InvoiceDetails, extension: string) {
  const part = (value: string) => value.normalize('NFKC').replace(/[^a-z0-9-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return [details.invoiceDate, part(details.supplierName), part(details.invoiceNumber)].filter(Boolean).join('_') + `.${extension.replace(/[^a-z0-9]/gi, '') || 'jpg'}`;
}

export function duplicateInvoiceReasons(a: InvoiceDetails, b: InvoiceDetails) {
  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const reasons: string[] = [];
  if (a.supplierName && b.supplierName && normalized(a.supplierName).length > 0 && normalized(a.supplierName) === normalized(b.supplierName)) reasons.push('supplier');
  if (a.invoiceNumber && b.invoiceNumber && normalized(a.invoiceNumber) === normalized(b.invoiceNumber)) reasons.push('invoice number');
  if (a.invoiceDate && a.invoiceDate === b.invoiceDate) reasons.push('date');
  if (a.amount && b.amount && Number(a.amount) === Number(b.amount)) reasons.push('amount');
  return reasons;
}

export async function recognizeInvoiceImage(file: File, signal: AbortSignal, progress: (value: number) => void, includeRegions = false) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Scan a JPG or PNG photo. Other files can still be uploaded normally.');
  const { createWorker } = await import('tesseract.js');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const worker = await createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js', corePath: '/ocr', langPath: '/ocr', workerBlobURL: false,
    cacheMethod: 'none', logger: message => { if (!signal.aborted && message.status === 'recognizing text') progress(Math.round(message.progress * 100)); },
  });
  let rejectAbort: (reason: Error) => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = () => rejectAbort(new DOMException('Cancelled', 'AbortError'));
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => rejectAbort(new Error('The photo took too long to read. Try a smaller or clearer image.')), 120_000);
  try {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const { data } = await Promise.race([worker.recognize(file, {}, { text: true, blocks: includeRegions }), aborted]);
    return data;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
    await worker.terminate();
  }
}

export async function scanInvoicePhoto(file: File, signal: AbortSignal, progress: (value: number) => void) {
  const data = await recognizeInvoiceImage(file, signal, progress);
  return extractInvoiceDetails(data.text);
}
