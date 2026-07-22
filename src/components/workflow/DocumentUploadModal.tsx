// Friendly guide: this module (DocumentUploadModal) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useRef, useState } from "react";
import type { MonthlyDocumentSlot, UploadSubmission } from "../../types/portal";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/SelectField";
import { TextAreaField } from "../ui/TextAreaField";
import { TextField } from "../ui/TextField";

// Shared shape notes: these types keep UI and data contracts aligned.
interface DocumentUploadModalProps {
  clientName: string;
  existingFileNames?: string[];
  isOpen: boolean;
  selectedSlot: MonthlyDocumentSlot | null;
  onClose: () => void;
  onUploaded: (submission: UploadSubmission) => void;
}

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const baseDocumentTypes = [
  "Invoices",
  "Bank Statement",
  "Signed Documents",
  "Compliance Record",
];

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

function hasGenericFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").toLowerCase().trim();
  const genericPatterns = [
    /^img\d*$/,
    /^image\d*$/,
    /^document\d*$/,
    /^doc\d*$/,
    /^new\s*doc\d*$/,
    /^scan\d*$/,
    /^file\d*$/,
    /^untitled\d*$/,
    /^invoice$/,
    /^statement$/,
  ];

  return genericPatterns.some((pattern) => pattern.test(baseName));
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
  existingFileNames = [],
  isOpen,
  onClose,
  onUploaded,
  selectedSlot,
}: DocumentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [documentType, setDocumentType] = useState("");
  const [clientBusinessName, setClientBusinessName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

// Reactive sync: this block responds when dependencies change.
  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    setDocumentType(selectedSlot.documentType);
    setClientBusinessName(clientName);
    setMonth(selectedSlot.month);
    setYear(String(selectedSlot.year));
    setDescription(selectedSlot.description);
    setExpiryDate("");
    setSelectedFile(null);
    setErrors({});
  }, [clientName, selectedSlot]);

  const documentTypeOptions = useMemo(() => {
    // Lock type to the structured slot to prevent cross-slot misfiling.
    const uniqueDocumentTypes = new Set(
      selectedSlot?.documentType
        ? [selectedSlot.documentType]
        : baseDocumentTypes,
    );

    return [...uniqueDocumentTypes].map((value) => ({
      label: value as string,
      value: value as string,
    }));
  }, [selectedSlot?.documentType]);

  const autoNamePreview = useMemo(() => {
    const safeClientName = sanitiseNameSegment(clientBusinessName);
    const safeDocumentType = sanitiseNameSegment(documentType);
    const extension = selectedFile?.name.split(".").pop() ?? "pdf";

    return `${safeClientName}_${safeDocumentType}_${month}_${year}.${extension}`;
  }, [clientBusinessName, documentType, month, selectedFile, year]);

  const expiryDateNeeded = useMemo(
    () => shouldTrackExpiryDate(documentType, selectedSlot),
    [documentType, selectedSlot],
  );
  const normalisedExistingNames = useMemo(
    () => new Set(existingFileNames.map((name) => name.trim().toLowerCase())),
    [existingFileNames],
  );

  function validateFile(file: File) {
    if (!allowedTypes.includes(file.type)) {
      return "Use PDF, PNG, JPG, DOCX, or XLSX so the slot can be reviewed correctly.";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "Keep uploads under 10 MB so the review queue stays fast and reliable.";
    }

    if (hasGenericFileName(file.name)) {
      return "File name is too generic. Rename it to something specific like INV_May_ABCCompany_2026.pdf before uploading.";
    }

    if (normalisedExistingNames.has(file.name.trim().toLowerCase())) {
      return "This file was already uploaded for this slot and month. Remove duplicates and upload only new documents.";
    }

    if (selectedSlot && !matchesAcceptedFiles(file, selectedSlot.acceptedFiles)) {
      return `This slot only accepts: ${selectedSlot.acceptedFiles.join(", ")}.`;
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

    setSelectedFile(file);
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

    if (!clientBusinessName.trim()) {
      nextErrors.clientBusinessName = "Client or business name is required.";
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

    const normalisedAutoName = autoNamePreview.trim().toLowerCase();
    if (normalisedExistingNames.has(normalisedAutoName)) {
      setErrors((current) => ({
        ...current,
        file: "This file already exists in this slot for this month.",
      }));
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
    });
    onClose();
  }

// Render output: this is the visual state users interact with.
  return (
    <Modal
      description="Smart upload keeps every file attached to the right checklist slot, month, and naming pattern so the accountant can review it without guesswork."
      isOpen={isOpen}
      onClose={onClose}
      title="Smart document upload"
    >
      <div className="space-y-6">
        {selectedSlot ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Checklist slot</p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {selectedSlot.documentType}
            </p>
            <p className="mt-1 text-sm text-slate-500">{selectedSlot.description}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            error={errors.documentType}
            label="Document Type"
            onChange={(event) => setDocumentType(event.target.value)}
            options={documentTypeOptions}
            value={documentType}
          />
          <SelectField
            error={errors.month}
            label="Month"
            onChange={(event) => setMonth(event.target.value)}
            options={monthOptions.map((value) => ({ label: value, value }))}
            value={month}
          />
          <TextField
            error={errors.year}
            label="Year"
            onChange={(event) => setYear(event.target.value)}
            placeholder="2026"
            value={year}
          />
          <TextField
            error={errors.clientBusinessName}
            hint="This is used inside the locked file naming pattern."
            label="Client / business name"
            onChange={(event) => setClientBusinessName(event.target.value)}
            value={clientBusinessName}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextAreaField
            className="md:col-span-2"
            hint="Use the description to explain what this file contains or why it is being resubmitted."
            label="Description"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
          {expiryDateNeeded ? (
            <TextField
              hint="Use this for Tax PINs, B-BBEE certificates, proof of address, IDs, contracts, and other time-bound compliance records."
              label="Expiry date (if needed)"
              onChange={(event) => setExpiryDate(event.target.value)}
              type="date"
              value={expiryDate}
            />
          ) : null}
          <TextField
            hint="The checklist controls which formats belong in this slot, so users never have to guess the correct upload format."
            label="Accepted file types"
            readOnly
            value={selectedSlot?.acceptedFiles.join(", ") ?? "PDF"}
          />
        </div>

        <div
          className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <input
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />
          <p className="text-base font-semibold text-slate-900">
            Drag and drop the file here
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Or choose a file manually. The portal will lock the final name for you.
          </p>
          <Button
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          >
            Choose file
          </Button>
          {selectedFile ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Selected file: {selectedFile.name}
            </div>
          ) : null}
          {errors.file ? (
            <p className="mt-3 text-sm text-rose-600">{errors.file}</p>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50 p-5">
          <p className="text-sm font-medium text-brand-700">Auto-naming preview</p>
          <p className="mt-3 break-all text-lg font-semibold text-slate-950">
            {autoNamePreview}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Required format: <span className="font-medium">Client_DocumentType_Month_Year.ext</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save upload details</Button>
        </div>
      </div>
    </Modal>
  );
}
