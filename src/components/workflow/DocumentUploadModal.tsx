import { acceptedFilesForSlot, normaliseDocumentType } from "../../services/clientMonthlyPackBackend";
// Friendly guide: this module (DocumentUploadModal) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { InvoicePhotoDetails } from "./InvoicePhotoDetails";
import { emptyInvoiceDetails, suggestedInvoiceName, type InvoiceDetails } from "../../services/invoiceScanner";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MonthlyDocumentSlot, UploadSubmission } from "../../types/portal";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Camera, Check, ChevronDown, FileText, Landmark, Upload, X } from "lucide-react";
import { TextAreaField } from "../ui/TextAreaField";
import { TextField } from "../ui/TextField";

// Shared shape notes: these types keep UI and data contracts aligned.
interface DocumentUploadModalProps {
  clientName: string;
  clientId?: string;
  existingFileNames?: string[];
  isOpen: boolean;
  selectedSlot: MonthlyDocumentSlot | null;
  onClose: () => void;
  onUploaded: (submission: UploadSubmission) => void;
}

const allowedTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function normaliseAcceptedFileToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fileExtension(value: string) {
  return value.split(".").pop()?.toLowerCase() ?? "";
}

function matchesAcceptedFiles(file: File, acceptedFiles: string[]) {
  if (acceptedFiles.length === 0) {
    return true;
  }

  const ext = fileExtension(file.name);
  const accepted = acceptedFiles.map((item) => normaliseAcceptedFileToken(item));

  const extensionMap: Record<string, string[]> = {
    pdf: ["pdf"],
    png: ["png"],
    jpg: ["jpg", "jpeg"],
    jpeg: ["jpg", "jpeg"],
    docx: ["docx"],
    xlsx: ["xlsx"],
    csv: ["csv"],
    zip: ["zip"],
  };

  return accepted.some((token) => {
    const mapped = extensionMap[token];
    if (mapped) {
      return mapped.includes(ext);
    }
    return token === ext;
  });
}

// Component flow: gather data first, then render a focused UI state.
function sanitiseNameSegment(value: string) {
  const compactValue = value.replace(/[^a-z0-9]+/gi, "");
  return compactValue || "Document";
}

function shouldTrackExpiryDate(documentType: string, selectedSlot: MonthlyDocumentSlot | null) {
  if (selectedSlot?.supportsExpiryDate) {
    return true;
  }

  return /(tax|certificate|contract|id|address|coida|csd|insurance|lease|vat|paye|uif|sdl)/i.test(
    documentType,
  );
}

export function DocumentUploadModal({
  clientName,
  clientId,
  existingFileNames = [],
  isOpen,
  onClose,
  onUploaded,
  selectedSlot,
}: DocumentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [documentType, setDocumentType] = useState("");
  const clientBusinessName = clientName.trim();
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(emptyInvoiceDetails);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const invoiceDocument = /invoice|receipt/i.test(documentType);
  const [errors, setErrors] = useState<Record<string, string>>({});

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (!isOpen || !selectedSlot) {
      setScanBusy(false);
      return;
    }

    setDocumentType(selectedSlot.documentType);
    setMonth(selectedSlot.month);
    setYear(String(selectedSlot.year));
    setDescription(selectedSlot.description);
    setExpiryDate("");
    setScanBusy(false);
    setSelectedFile(null);
    setInvoiceDetails(emptyInvoiceDetails);
    setDetailsConfirmed(false);
    setAllowDuplicate(false);
    setErrors({});
  }, [selectedSlot, isOpen]);

  const bankStatement = normaliseDocumentType(documentType).includes("bank statement");
  const signedDocument = normaliseDocumentType(documentType).includes("signed");
  const uploadTitle = bankStatement ? "Upload bank statement" : invoiceDocument ? /receipt/i.test(documentType) ? "Upload receipt" : "Upload invoice" : signedDocument ? "Upload signed document" : "Upload document";
  const uploadHelp = bankStatement
    ? "Upload the original PDF downloaded from your bank for this account and month."
    : invoiceDocument ? "Choose an invoice or receipt, or take a clear photo."
    : signedDocument ? "Upload the complete, signed PDF."
    : shouldTrackExpiryDate(documentType, selectedSlot)
      ? "Upload the supporting record and add its expiry date if applicable."
      : "Choose the document requested in your checklist.";
  const supportedFormats = acceptedFilesForSlot(documentType, documentType).filter(format =>
    !selectedSlot?.acceptedFiles.length || selectedSlot.acceptedFiles.some(value => {
      const token = normaliseAcceptedFileToken(value);
      return token === format.toLowerCase() || format === "JPG" && token === "jpeg";
    }),
  );
  const fileAccept = supportedFormats.flatMap(format => format === "JPG" ? [".jpg", ".jpeg"] : [`.${format.toLowerCase()}`]).join(",");

  const autoNamePreview = useMemo(() => {
    const clientPrefix = clientBusinessName ? `${sanitiseNameSegment(clientBusinessName)}_` : "";
    const safeDocumentType = sanitiseNameSegment(documentType);
    const extension = selectedFile?.name.split(".").pop() ?? "pdf";

    if (invoiceDocument && detailsConfirmed) return `${clientPrefix}${suggestedInvoiceName(invoiceDetails, extension)}`;
    return `${clientPrefix}${safeDocumentType}_${month}_${year}.${extension}`;
  }, [clientBusinessName, documentType, month, selectedFile, year, invoiceDocument, detailsConfirmed, invoiceDetails]);

  const expiryDateNeeded = useMemo(
    () => shouldTrackExpiryDate(documentType, selectedSlot),
    [documentType, selectedSlot],
  );
  const normalisedExistingNames = useMemo(
    () => new Set(existingFileNames.map((name) => name.trim().toLowerCase())),
    [existingFileNames],
  );

  function validateFile(file: File) {
    if (bankStatement && (fileExtension(file.name) !== "pdf" || file.type !== "application/pdf")) {
      return "Bank statements must be the original bank-issued PDF. Photos, screenshots and spreadsheets are not accepted here.";
    }
    if (!allowedTypes.includes(file.type)) {
      return "Use PDF, PNG, JPG, DOCX, or XLSX so the slot can be reviewed correctly.";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "Keep uploads under 10 MB so the review queue stays fast and reliable.";
    }

    if (!matchesAcceptedFiles(file, supportedFormats)) {
      return `This document type only accepts: ${supportedFormats.join(", ")}.`;
    }

    return "";
  }

  function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    const fileError = validateFile(file);
    if (fileError) {
      setErrors((current) => ({ ...current, file: fileError }));
      return;
    }

    setScanBusy(false);
    setSelectedFile(file);
    setInvoiceDetails(emptyInvoiceDetails);
    setDetailsConfirmed(false);
    setAllowDuplicate(false);
    setErrors((current) => ({ ...current, file: "" }));
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};

    if (!selectedSlot) {
      return;
    }

    if (!documentType.trim()) {
      nextErrors.documentType = "Document type is required.";
    }

    if (!month.trim()) {
      nextErrors.month = "Month is required.";
    }

    if (!year.trim()) {
      nextErrors.year = "Year is required.";
    } else if (Number.isNaN(Number(year)) || year.trim().length !== 4) {
      nextErrors.year = "Use a four-digit year so the filing period stays clear.";
    }

    if (!selectedFile) {
      nextErrors.file = "Choose the file that belongs in this structured slot.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!selectedFile) {
      return;
    }

    let fileDataUrl = "";
    try {
      fileDataUrl = await readFileAsDataUrl(selectedFile);
    } catch {
      setErrors((current) => ({
        ...current,
        file: "Could not prepare this file for preview. Please try again.",
      }));
      return;
    }

    onUploaded({
      slotId: selectedSlot.id,
      fileName: selectedFile.name,
      autoName: autoNamePreview,
      documentType,
      clientBusinessName: clientBusinessName.trim(),
      month,
      year: Number(year),
      description,
      expiryDate: expiryDate || undefined,
      file: selectedFile,
      fileDataUrl,
      fileMimeType: selectedFile.type,
      invoiceDetails: detailsConfirmed ? invoiceDetails : undefined,
      detailsConfirmed,
      allowDuplicate,
    });
    onClose();
  }

  function removeFile() {
    setSelectedFile(null);
    setInvoiceDetails(emptyInvoiceDetails);
    setDetailsConfirmed(false);
    setAllowDuplicate(false);
    setScanBusy(false);
    setErrors(current => ({ ...current, file: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <Modal
      description={uploadHelp}
      isOpen={isOpen}
      onClose={onClose}
      title={uploadTitle}
      scrollBody
      footer={<div className="flex items-center justify-between gap-3">
        <span className="hidden text-xs text-slate-500 sm:block">Your accountant reviews it after submission.</span>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button disabled={scanBusy || (invoiceDocument && Object.values(invoiceDetails).some(Boolean) && !detailsConfirmed)} onClick={() => void handleSubmit()}>
            <Upload aria-hidden="true" className="h-4 w-4" />Upload document
          </Button>
        </div>
      </div>}
    >
      <div className="space-y-5">
        {selectedSlot ? <section aria-label="Upload destination" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {bankStatement ? <Landmark aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" /> : <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />}
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Checklist slot</p>
              <p className="text-sm font-semibold text-slate-900">{selectedSlot.documentType}</p>
              <p className="truncate text-xs text-slate-500">{clientBusinessName || "Your linked business"}</p>
            </div>
          </div>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">{month} {year}</span>
        </section> : null}

        <section aria-label="Choose your document" className="space-y-3">
          <div
            className={`rounded-xl border border-dashed px-4 py-5 text-center transition ${errors.file ? "border-rose-300 bg-rose-50/30" : "border-slate-300 bg-white hover:border-emerald-500 hover:bg-slate-50/60"}`}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); handleFile(event.dataTransfer.files[0] ?? null); }}
          >
            <input accept={fileAccept} aria-label="Choose document file" className="hidden" onChange={event => handleFile(event.target.files?.[0] ?? null)} ref={fileInputRef} type="file" />
            {invoiceDocument ? <input accept="image/jpeg,image/png" capture="environment" className="hidden" aria-label="Take invoice or receipt photo" ref={cameraInputRef} type="file" onChange={event => handleFile(event.target.files?.[0] ?? null)} /> : null}
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Upload aria-hidden="true" className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-slate-900">{selectedFile ? "Choose a different file" : bankStatement ? "Drop your bank statement PDF here" : invoiceDocument ? "Drop your invoice or receipt here" : "Drop your document here"}</p>
            <p className="mt-1 text-xs text-slate-500">{supportedFormats.join(", ")} · Up to 10 MB</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose file</Button>
              {invoiceDocument ? <Button size="sm" variant="ghost" onClick={() => cameraInputRef.current?.click()}><Camera aria-hidden="true" className="h-4 w-4" />Take a photo</Button> : null}
            </div>
          </div>
          {errors.file ? <p role="alert" className="text-xs text-rose-600">{errors.file}</p> : null}
          {selectedFile ? <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Check aria-hidden="true" className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{selectedFile.name}</p><p className="text-xs text-slate-500">{selectedFile.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(selectedFile.size / 1024))} KB` : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`} · File selected</p></div>
            <button type="button" aria-label="Remove selected file" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={removeFile}><X aria-hidden="true" className="h-4 w-4" /></button>
          </div> : <p className="text-center text-xs text-slate-500">No need to rename your file.</p>}
          {selectedFile && normalisedExistingNames.has(selectedFile.name.trim().toLowerCase()) ? <p className="text-xs leading-5 text-amber-800">A file with this name already exists. Check that this is a new document.</p> : null}
        </section>

        {invoiceDocument && selectedFile ? <InvoicePhotoDetails key={`${selectedFile.name}:${selectedFile.lastModified}`} file={selectedFile} clientId={clientId} details={invoiceDetails} onChange={value => { setInvoiceDetails(value); setDetailsConfirmed(false); setAllowDuplicate(false); }} confirmed={detailsConfirmed} onConfirmed={setDetailsConfirmed} allowDuplicate={allowDuplicate} onAllowDuplicate={setAllowDuplicate} onBusy={setScanBusy} /> : null}

        {expiryDateNeeded ? <TextField className="rounded-lg" label="Expiry date (optional)" onChange={event => setExpiryDate(event.target.value)} type="date" value={expiryDate} /> : null}

        {bankStatement ? <p className="text-xs leading-5 text-slate-500">A transaction CSV is imported separately; it does not replace your monthly statement.</p> : null}
        <details className="group border-t border-slate-100 pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-600 [&::-webkit-details-marker]:hidden">Add a note (optional) <ChevronDown aria-hidden="true" className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="mt-4 space-y-4">
            <TextAreaField className="min-h-20 rounded-lg" rows={2} label="Note for your accountant (optional)" onChange={event => setDescription(event.target.value)} value={description} />
          </div>
        </details>

        {selectedFile ? <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">Saved as</p><p className="mt-1 break-all text-xs font-medium leading-5 text-slate-700">{autoNamePreview}</p>
        </div> : null}
      </div>
    </Modal>
  );
}
