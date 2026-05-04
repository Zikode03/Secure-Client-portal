import { useEffect, useMemo, useRef, useState } from "react";
import type { MonthlyDocumentSlot, UploadSubmission } from "../../types/portal";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { SelectField } from "../ui/SelectField";
import { TextAreaField } from "../ui/TextAreaField";
import { TextField } from "../ui/TextField";

interface DocumentUploadModalProps {
  clientName: string;
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
  "Invoice",
  "Bank Statement",
  "Signed Document",
  "Tax Document",
];

const allowedTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

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
  isOpen,
  onClose,
  onUploaded,
  selectedSlot,
}: DocumentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [clientBusinessName, setClientBusinessName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const uniqueDocumentTypes = new Set(
      [selectedSlot?.documentType, ...baseDocumentTypes].filter(Boolean),
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

  function validateFile(file: File) {
    if (!allowedTypes.includes(file.type)) {
      return "Use PDF, PNG, JPG, DOCX, or XLSX so the slot can be reviewed correctly.";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "Keep uploads under 10 MB so the review queue stays fast and reliable.";
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

  function handleSubmit() {
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
    });
    onClose();
  }

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
