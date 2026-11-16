import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { InvoicePdfSource } from "../components/invoice-review/InvoicePdfSource";
const mocks = vi.hoisted(() => ({ getPage: vi.fn(), destroy: vi.fn(), cancel: vi.fn(), promise: vi.fn() }));
vi.mock("../services/invoicePdfReader", () => ({ localPdfEngine: async () => ({ getDocument: () => ({
  promise: mocks.promise(), destroy: mocks.destroy,
}) }) }));
const regions = [{field: "invoiceTotal", text: "Invoice total 115.00", x: .1, y: .2, width: .4, height: .05, pageIndex: 1}];
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  mocks.destroy.mockResolvedValue(undefined);
  mocks.getPage.mockResolvedValue({ getViewport: ({scale}: {scale: number}) => ({width: 600 * scale, height: 800 * scale}), render: () => ({promise: Promise.resolve(), cancel: mocks.cancel}) });
  mocks.promise.mockResolvedValue({numPages: 3, getPage: mocks.getPage});
});
afterEach(() => vi.unstubAllGlobals());
it("opens the evidenced PDF page, highlights its original region and navigates pages", async () => {
  const view = render(<InvoicePdfSource url="blob:private" fileName="invoice.pdf" regions={regions} />);
  expect(await screen.findByLabelText("Source for invoiceTotal, page 2")).toHaveStyle({left: "10%", top: "20%"});
  expect(mocks.getPage).toHaveBeenCalledWith(2);
  fireEvent.click(screen.getByRole("button", {name: "Next page"}));
  await waitFor(() => expect(mocks.getPage).toHaveBeenLastCalledWith(3));
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  expect(screen.queryByLabelText("Source for invoiceTotal, page 2")).not.toBeInTheDocument();
  view.unmount(); expect(mocks.destroy).toHaveBeenCalled();
});
it("falls back to the original PDF without inventing a highlight when rendering fails", async () => {
  mocks.promise.mockRejectedValue(new Error("Unreadable source page"));
  render(<InvoicePdfSource url="blob:private" fileName="invoice.pdf" regions={regions} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unreadable source page");
  expect(screen.getByTitle("invoice.pdf")).toHaveAttribute("src", "blob:private");
  expect(screen.queryByLabelText("Source for invoiceTotal, page 2")).not.toBeInTheDocument();
});
