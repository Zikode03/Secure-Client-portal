import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminMigrationPage } from "../pages/admin/AdminMigrationPage";
import * as api from "../services/migrationApi";
import { apiGetJson } from "../services/apiClient";
import type { MigrationDetail } from "../services/migrationApi";
const session = vi.hoisted(() => ({ role: "admin" }));
vi.mock("../app/auth", () => ({
  useAuth: () => ({ user: session, ready: true }),
}));
vi.mock("../services/apiClient", async (original) => ({
  ...(await original<typeof import("../services/apiClient")>()),
  apiGetJson: vi.fn(),
}));
vi.mock("../services/migrationApi", async (original) => ({
  ...(await original<typeof import("../services/migrationApi")>()),
  listMigrations: vi.fn(),
  getMigration: vi.fn(),
  createMigration: vi.fn(),
  stageSpreadsheet: vi.fn(),
  stageDocument: vi.fn(),
  editClient: vi.fn(),
  editDocument: vi.fn(),
  approveMigration: vi.fn(),
}));
const batch = (patch: Partial<MigrationDetail> = {}): MigrationDetail => ({
  summary: {
    id: "batch-1",
    name: "Historical records test",
    status: "draft",
    version: 0,
    createdAtUtc: "2026-11-11T00:00:00Z",
    updatedAtUtc: "2026-11-11T00:00:00Z",
    clientRows: 0,
    documents: 0,
    importedClients: 0,
    importedDocuments: 0,
  },
  clients: [],
  documents: [],
  ...patch,
});
const values = {
  name: "Import test company",
  entityType: "Company",
  industry: "Services",
  contactName: "Test Contact",
  contactEmail: "contact@example.invalid",
  registrationNumber: "REG1",
  accountantEmail: "accountant@example.invalid",
};
const documentValues = {
  clientId: null,
  year: null,
  month: null,
  category: "general",
  displayName: "historical.pdf",
  ownershipConfirmed: false,
  duplicateAcknowledged: false,
  skip: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  session.role = "admin";
  vi.mocked(api.listMigrations).mockResolvedValue([]);
  vi.mocked(apiGetJson).mockResolvedValue([
    { id: "client-1", name: "Import test company" },
  ]);
  vi.mocked(api.createMigration).mockResolvedValue(batch());
});
async function open(b: MigrationDetail) {
  vi.mocked(api.listMigrations).mockResolvedValue([b.summary!]);
  vi.mocked(api.getMigration).mockResolvedValue(b);
  render(<AdminMigrationPage />);
  fireEvent.click(
    await screen.findByRole("button", { name: /Historical records test/ }),
  );
  await screen.findByRole("region", { name: "Import review" });
}
async function chooseDocuments() {
  render(<AdminMigrationPage />);
  await screen.findByText(/No imports yet/);
  fireEvent.click(
    screen.getByRole("button", { name: /Import client documents/ }),
  );
}
it("starts with two plain-language choices and hides detailed forms until needed", async () => {
  render(<AdminMigrationPage />);
  expect(await screen.findByText(/No imports yet/)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Import Clients & Documents" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Import a client list/ }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: /Import client documents/ }),
  ).toBeEnabled();
  expect(screen.queryByLabelText("Import name")).not.toBeInTheDocument();
  expect(screen.queryByText("Data Migration Centre")).not.toBeInTheDocument();
  expect(apiGetJson).toHaveBeenCalledWith("/api/clients");
});
it("does not fetch private imports for accountants or clients", () => {
  session.role = "accountant";
  render(<AdminMigrationPage />);
  expect(screen.getByText(/Only administrators/)).toBeInTheDocument();
  expect(api.listMigrations).not.toHaveBeenCalled();
  expect(apiGetJson).not.toHaveBeenCalled();
});
it("reports live API errors without inventing imports", async () => {
  vi.mocked(api.listMigrations).mockRejectedValue(
    new Error("Database unavailable"),
  );
  render(<AdminMigrationPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(screen.queryByText(/No imports yet/)).not.toBeInTheDocument();
});
it("keeps client and document upload choices separate and creates an import only when a file is chosen", async () => {
  render(<AdminMigrationPage />);
  await screen.findByText(/No imports yet/);
  fireEvent.click(screen.getByRole("button", { name: /Import a client list/ }));
  expect(
    screen.getByLabelText("Upload client spreadsheet"),
  ).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Upload client documents"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Download client template" }),
  ).toBeInTheDocument();
  expect(api.createMigration).not.toHaveBeenCalled();
  const preview = batch({
    clients: [{ id: "row-1", sourceRow: 2, values, skip: false, errors: [] }],
  });
  vi.mocked(api.stageSpreadsheet).mockResolvedValue(preview);
  fireEvent.change(screen.getByLabelText("Upload client spreadsheet"), {
    target: { files: [new File(["header"], "clients.csv")] },
  });
  await screen.findByRole("heading", { name: "Check your details" });
  expect(api.createMigration).toHaveBeenCalledTimes(1);
  expect(api.stageSpreadsheet).toHaveBeenCalledWith(
    "batch-1",
    0,
    expect.any(File),
  );
  expect(screen.queryByLabelText("Client name")).not.toBeInTheDocument();
});
it("blocks confirmation for documents without a confirmed owner", async () => {
  await open(
    batch({
      documents: [
        {
          id: "file-1",
          fileName: "historical.pdf",
          sizeBytes: 10,
          values: documentValues,
          errors: ["Select an existing client."],
          warnings: [],
        },
      ],
    }),
  );
  expect(
    screen.getByRole("button", { name: "Continue to confirmation" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Confirm and import" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Review historical.pdf" }),
  );
  expect(
    screen.getByRole("option", { name: "Choose a client" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Select an existing client.")).toBeInTheDocument();
  expect(api.approveMigration).not.toHaveBeenCalled();
});
it("requires confirmation on a separate final step before importing", async () => {
  const initial = batch({
    clients: [{ id: "row-1", sourceRow: 2, values, skip: false, errors: [] }],
  });
  await open(initial);
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to confirmation" }),
  );
  expect(
    screen.getByRole("heading", { name: "Ready to add these records?" }),
  ).toBeInTheDocument();
  const submit = screen.getByRole("button", { name: "Confirm and import" });
  expect(submit).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/I have checked the details/));
  expect(submit).toBeEnabled();
  vi.mocked(api.approveMigration).mockResolvedValue({
    ...initial,
    summary: { ...initial.summary!, status: "approved", importedClients: 1 },
  });
  fireEvent.click(submit);
  expect(
    await screen.findByRole("heading", { name: "Import complete" }),
  ).toBeInTheDocument();
  expect(api.approveMigration).toHaveBeenCalledWith("batch-1", 0);
});
it("prevents switching away from unsaved corrections and supports explicit discard", async () => {
  await open(
    batch({
      clients: [
        { id: "row-1", sourceRow: 2, values, skip: false, errors: [] },
        {
          id: "row-2",
          sourceRow: 3,
          values: { ...values, name: "Second company" },
          skip: false,
          errors: [],
        },
      ],
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Review Import test company" }),
  );
  fireEvent.change(screen.getByLabelText("Client name"), {
    target: { value: "Unsaved company" },
  });
  expect(
    screen.getByRole("button", { name: "Review Second company" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Continue to confirmation" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Refresh import" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "All imports" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard changes and refresh" }),
  );
  await waitFor(() =>
    expect(screen.queryByLabelText("Client name")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Continue to confirmation" }),
  ).toBeEnabled();
});
it("stages multiple files sequentially with returned versions and keeps them on the upload step", async () => {
  await chooseDocuments();
  const staged = batch({
    summary: { ...batch().summary!, version: 1 },
    documents: [
      {
        id: "file-1",
        fileName: "first.pdf",
        sizeBytes: 4,
        values: { ...documentValues, displayName: "first.pdf" },
        errors: ["Choose a client"],
        warnings: [],
      },
    ],
  });
  vi.mocked(api.stageDocument)
    .mockResolvedValueOnce(staged)
    .mockResolvedValueOnce({
      ...staged,
      summary: { ...staged.summary!, version: 2 },
    });
  fireEvent.change(screen.getByLabelText("Upload client documents"), {
    target: {
      files: [
        new File(["first"], "first.pdf"),
        new File(["second"], "second.pdf"),
      ],
    },
  });
  await screen.findByText(/Documents uploaded privately/);
  expect(api.stageDocument).toHaveBeenCalledTimes(2);
  expect(vi.mocked(api.stageDocument).mock.calls[0][2]).toBe(0);
  expect(vi.mocked(api.stageDocument).mock.calls[1][2]).toBe(1);
  expect(
    screen.getByRole("button", { name: "Check details" }),
  ).toBeInTheDocument();
  expect(api.approveMigration).not.toHaveBeenCalled();
});
it("applies selected client and month as suggestions requiring individual confirmation", async () => {
  await chooseDocuments();
  fireEvent.change(screen.getByLabelText("Client"), {
    target: { value: "client-1" },
  });
  fireEvent.change(screen.getByLabelText("Month covered"), {
    target: { value: "2025-03" },
  });
  vi.mocked(api.stageDocument).mockImplementation(async (_id, fileId) =>
    batch({
      summary: { ...batch().summary!, version: 1 },
      documents: [
        {
          id: fileId,
          fileName: "historical.pdf",
          sizeBytes: 7,
          values: documentValues,
          errors: ["Confirm ownership"],
          warnings: [],
        },
      ],
    }),
  );
  vi.mocked(api.editDocument).mockImplementation(
    async (_id, rowId, _version, v) =>
      batch({
        summary: { ...batch().summary!, version: 2 },
        documents: [
          {
            id: rowId,
            fileName: "historical.pdf",
            sizeBytes: 7,
            values: v,
            errors: ["Confirm ownership"],
            warnings: [],
          },
        ],
      }),
  );
  fireEvent.change(screen.getByLabelText("Upload client documents"), {
    target: { files: [new File(["invoice"], "historical.pdf")] },
  });
  await waitFor(() => expect(api.editDocument).toHaveBeenCalled());
  expect(vi.mocked(api.editDocument).mock.calls[0][3]).toMatchObject({
    clientId: "client-1",
    year: 2025,
    month: 3,
    ownershipConfirmed: false,
    duplicateAcknowledged: false,
  });
  expect(api.approveMigration).not.toHaveBeenCalled();
});
it("paginates long previews instead of mounting hundreds of editing forms", async () => {
  await open(
    batch({
      clients: Array.from({ length: 21 }, (_, i) => ({
        id: `row-${i}`,
        sourceRow: i + 2,
        values: { ...values, name: `Client ${i + 1}` },
        skip: false,
        errors: [],
      })),
    }),
  );
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Review Client 21" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Client name")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    screen.getByRole("button", { name: "Review Client 21" }),
  ).toBeInTheDocument();
});
it("rejects unsupported files before creating an empty import", async () => {
  render(<AdminMigrationPage />);
  await screen.findByText(/No imports yet/);
  fireEvent.click(screen.getByRole("button", { name: /Import a client list/ }));
  fireEvent.change(screen.getByLabelText("Upload client spreadsheet"), {
    target: { files: [new File(["old"], "clients.xls")] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /Excel \(.xlsx\) or CSV/,
  );
  expect(api.createMigration).not.toHaveBeenCalled();
});
it("exports validation errors safely without enabling spreadsheet formulas", () => {
  const report = api.failedRowsCsv(
    batch({
      clients: [
        {
          id: "row",
          sourceRow: 2,
          values: { ...values, name: '=HYPERLINK("bad")' },
          skip: false,
          errors: ["Invalid client"],
        },
      ],
    }),
  );
  expect(report).toContain("'=");
  expect(report).toContain("Invalid client");
  expect(api.csvCell(" +cmd")).toBe('"\' +cmd"');
});
