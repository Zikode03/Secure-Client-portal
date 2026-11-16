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
const root = "/api/admin/migrations";
export const listMigrations = () => apiGetJson<MigrationSummary[]>(root);
export const getMigration = (id: string) =>
  apiGetJson<MigrationDetail>(`${root}/${id}`);
export const createMigration = (requestId: string, name: string) =>
  apiPostJson<MigrationDetail, { requestId: string; name: string }>(root, {
    requestId,
    name,
  });
export function stageSpreadsheet(id: string, version: number, file: File) {
  const data = new FormData();
  data.append("version", String(version));
  data.append("file", file);
  return apiPostForm<MigrationDetail>(`${root}/${id}/clients`, data);
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
  return apiPostForm<MigrationDetail>(
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
) =>
  apiPutJson<
    MigrationDetail,
    Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationClientRequest"]
  >(`${root}/${id}/clients/${rowId}`, { version, values, skip });
export const editDocument = (
  id: string,
  rowId: string,
  version: number,
  values: DocumentInput,
) =>
  apiPutJson<
    MigrationDetail,
    Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.EditMigrationDocumentRequest"]
  >(`${root}/${id}/documents/${rowId}`, { version, values });
export const approveMigration = (id: string, version: number) =>
  apiPostJson<
    MigrationDetail,
    Schemas["SecureClientPortal.Backend.Application.Contracts.Modules.Migration.ApproveMigrationRequest"]
  >(`${root}/${id}/approve`, { version, confirmOwnershipAndPeriods: true });
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
