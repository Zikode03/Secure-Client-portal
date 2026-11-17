import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { InvoicePhotoDetails } from "../components/workflow/InvoicePhotoDetails";
import { emptyInvoiceDetails, scanInvoicePhoto } from "../services/invoiceScanner";
import { apiGetJson } from "./fixtures/apiTransportFixture";
vi.mock("../services/apiClient", async original => ({ ...await original<typeof import("../services/apiClient")>(), apiGetJson: vi.fn(), hasApiBaseUrl: () => true }));
vi.mock("../services/invoiceScanner", async original => ({ ...await original<typeof import("../services/invoiceScanner")>(), scanInvoicePhoto: vi.fn() }));
const details = { supplierName: "Acme", invoiceNumber: "INV-1", invoiceDate: "2026-11-11", amount: "115.00" };
function Harness() {
  const [value, setValue] = useState(emptyInvoiceDetails);
  const [confirmed, confirm] = useState(false); const [allow, allowDuplicate] = useState(false);
  return <InvoicePhotoDetails file={new File(["photo"], "IMG123.jpg", { type: "image/jpeg" })} clientId="client" details={value} onChange={next => { setValue(next); confirm(false); }} confirmed={confirmed} onConfirmed={confirm} allowDuplicate={allow} onAllowDuplicate={allowDuplicate} onBusy={() => undefined} />;
}
beforeEach(() => {
  vi.mocked(scanInvoicePhoto).mockResolvedValue(details); vi.mocked(apiGetJson).mockResolvedValue([]);
});
it("requires confirmation after OCR and invalidates it when a suggested field is edited", async () => {
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Read details from photo" }));
  await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("Acme"));
  const confirmation = await screen.findByLabelText("I checked the supplier, date, amount and number against the document.");
  await waitFor(() => expect(confirmation).toBeEnabled()); expect(confirmation).not.toBeChecked();
  fireEvent.click(confirmation); expect(confirmation).toBeChecked();
  fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: "Corrected supplier" } });
  expect(screen.getByRole("checkbox", { name: /I checked the supplier|Checking existing/ })).not.toBeChecked();
});
it("warns about matching invoices and requires acknowledgement before confirming", async () => {
  vi.mocked(apiGetJson).mockResolvedValue([{ clientId: "client", name: "existing.pdf", invoiceDetailsJson: JSON.stringify(details) }]);
  render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Read details from photo" }));
  expect(await screen.findByText("Possible duplicate invoice")).toBeInTheDocument();
  const confirmation = screen.getByLabelText("I checked the supplier, date, amount and number against the document.");
  expect(confirmation).toBeDisabled(); fireEvent.click(screen.getByLabelText("I checked these matches. This is a separate document."));
  expect(confirmation).toBeEnabled(); fireEvent.click(confirmation); expect(confirmation).toBeChecked();
});
