import {
  apiGetBlob,
  apiGetJson,
  apiPostForm,
  apiPostJson,
  apiPutJson,
} from "./apiClient";
import type { components } from "./generated/portal-api";

type Schemas = components["schemas"];
export type MigrationDetail =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationBatchDetail"];
export type MigrationSummary =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationSummary"];
export type ClientRow =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientRow"];
export type DocumentRow =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentRow"];
export type ClientInput =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationClientInput"];
export type DocumentInput =
  Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.MigrationDocumentInput"];
const root = "/api/admin/migrations" as const;
export const listMigrations = () => apiGetJson(root);
export const getMigration = (id: string) =>
  apiGetJson(`${root}/${id}`);
export const createMigration = (requestId: string, name: string) =>
  apiPostJson(root, {
    requestId,
    name,
  });
export function stageSpreadsheet(id: string, version: number, file: File) {
  const data = new FormData();
  data.append("version", String(version));
  data.append("file", file);
  return apiPostForm(`${root}/${id}/clients`, data);
}
export function stageDocument(
  id: string,
  fileId: string,
  version: number,
  file: File,
) {
  const data = new FormData();
  data.append("version", String(version));
  data.append("file", file);
  return apiPostForm(
    `${root}/${id}/documents/${fileId}`,
    data,
  );
}
export const editClient = (
  id: string,
  rowId: string,
  version: number,
  values: ClientInput,
  skip: boolean,
  useExistingClient = false,
) =>
  apiPutJson(`${root}/${id}/clients/${rowId}`, { version, values, skip, useExistingClient });
export const editDocument = (
  id: string,
  rowId: string,
  version: number,
  values: DocumentInput,
) =>
  apiPutJson(`${root}/${id}/documents/${rowId}`, { version, values });
export const approveMigration = (id: string, version: number) =>
  apiPostJson(`${root}/${id}/approve`, { version, confirmOwnershipAndPeriods: true });
export const downloadStagedDocument = (id: string, rowId: string) =>
  apiGetBlob(`${root}/${id}/documents/${rowId}/content`);

export const clientColumns = [
  "name",
  "entityType",
  "industry",
  "contactName",
  "contactEmail",
  "registrationNumber",
  "accountantEmail",
] as const;
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  // Spreadsheet downloads must never turn untrusted text into formulas.
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
}
export function failedRowsCsv(batch: MigrationDetail) {
  const header = [
    "kind",
    "sourceRowOrFile",
    ...clientColumns,
    "errors",
    "warnings",
    "skipped",
  ];
  const rows: unknown[][] = [];
  for (const row of batch.clients ?? [])
    if ((row.errors?.length ?? 0) > 0)
      rows.push([
        "client",
        row.sourceRow,
        ...clientColumns.map((k) => row.values?.[k]),
        row.errors?.join("; "),
        "",
        row.skip,
      ]);
  for (const row of batch.documents ?? [])
    if ((row.errors?.length ?? 0) > 0 || (row.warnings?.length ?? 0) > 0)
      rows.push([
        "document",
        row.fileName,
        ...clientColumns.map(() => ""),
        row.errors?.join("; "),
        row.warnings?.join("; "),
        row.values?.skip,
      ]);
  for (const warning of batch.archiveWarnings ?? []) rows.push(["archive", "", ...clientColumns.map(()=>""), "", warning, true]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function saveDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Translate older backend wording while local installations are being updated. */
export function migrationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "The import could not be completed. Please try again.";
  if (/^Headers must be:/i.test(message)) {
    return "The column headings in your client list do not match the import template. Download the client template, copy your client details into it without changing the headings, then upload it again. No clients have been added.";
  }
  return message;
}

export function migrationValidationMessage(message: string): string {
  if (message.startsWith("Possible existing client.")) {
    return "This client already exists. Choose Use existing client to assign its accountant, or leave this row out of the import.";
  }
  return message;
}

export const bulkEditDocuments = (id: string, request: Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.BulkMigrationDocumentRequest"]) =>
  apiPutJson(`${root}/${id}/documents`, request);
