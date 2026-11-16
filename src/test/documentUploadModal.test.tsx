import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DocumentUploadModal } from "../components/workflow/DocumentUploadModal";
import type { MonthlyDocumentSlot } from "../types/portal";

const slot: MonthlyDocumentSlot = {
  id: "invoice-slot", documentType: "Invoices", description: "Invoices for November 2026.",
  status: "missing", month: "November", year: 2026, acceptedFiles: ["PDF", "PNG", "JPG", "ZIP", "CSV", "XLSX"],
  progress: 0, autoName: "", isRequired: true,
};
function open(selectedSlot = slot) {
  const onUploaded = vi.fn(), onClose = vi.fn();
  render(<DocumentUploadModal clientName="Test business" isOpen selectedSlot={selectedSlot} onUploaded={onUploaded} onClose={onClose} />);
  return { onUploaded, onClose };
}
it("uploads to the selected slot and period using the chosen original file", async () => {
  const { onUploaded, onClose } = open();
  const file = new File(["invoice"], "original.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Choose document file"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce());
  expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({
    slotId: "invoice-slot", documentType: "Invoices", month: "November", year: 2026,
    clientBusinessName: "Test business", fileName: "original.pdf", file,
  }));
  expect(onClose).toHaveBeenCalledOnce();
});
it("removing a file prevents submitting its old contents", async () => {
  const { onUploaded, onClose } = open();
  fireEvent.change(screen.getByLabelText("Choose document file"), { target: { files: [new File(["invoice"], "original.pdf", { type: "application/pdf" })] } });
  fireEvent.click(screen.getByRole("button", { name: "Remove selected file" }));
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Choose the file");
  expect(onUploaded).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
});

it("uses the account business without asking the client to choose or retype it", () => {
  open();
  fireEvent.click(screen.getByText("Add a note (optional)"));
  expect(screen.queryByLabelText(/Business name|Client \/ business name/i)).not.toBeInTheDocument();
  expect(screen.getByText("Test business")).toBeInTheDocument();
  expect(screen.getByRole("heading", {name: "Upload invoice"})).toBeInTheDocument();
});
it.each([["photo.jpg", "image/jpeg"], ["statement.png", "image/png"], ["statement.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]])("rejects %s as bank-statement evidence even when a legacy slot advertises images", (name, type) => {
  const {onUploaded} = open({...slot, documentType: "Bank Statement", acceptedFiles: ["PDF", "PNG", "JPG", "XLSX"]});
  expect(screen.getByRole("heading", {name: "Upload bank statement"})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Take a photo"})).not.toBeInTheDocument();
  expect(screen.getByLabelText("Choose document file")).toHaveAttribute("accept", ".pdf");
  fireEvent.change(screen.getByLabelText("Choose document file"), {target: {files: [new File(["invalid statement"], name, {type})]}});
  expect(screen.getByRole("alert")).toHaveTextContent("original bank-issued PDF");
  expect(onUploaded).not.toHaveBeenCalled();
});
it("keeps invoice photos available without allowing spreadsheets as invoice evidence", () => {
  open();
  expect(screen.getByRole("button", {name: "Take a photo"})).toBeInTheDocument();
  expect(screen.getByLabelText("Choose document file")).toHaveAttribute("accept", ".pdf,.png,.jpg,.jpeg");
});
