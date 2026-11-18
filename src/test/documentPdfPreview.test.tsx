import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocumentPdfPreview } from "../components/documents/DocumentPdfPreview";
import { apiGetBlob, ApiError } from "./fixtures/apiTransportFixture";
const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), getPage: vi.fn(), destroy: vi.fn(), render: vi.fn() }));
vi.mock("../services/apiClient", async original => ({ ...(await original<typeof import("../services/apiClient")>()), apiGetBlob: vi.fn() }));
vi.mock("../services/invoicePdfReader", () => ({ localPdfEngine: async () => ({ getDocument: mocks.getDocument }) }));
afterEach(() => vi.unstubAllGlobals());
let ready = vi.fn<(id: string, ready: boolean) => void>();
beforeEach(() => {
  vi.clearAllMocks(); ready = vi.fn<(id: string, ready: boolean) => void>();
  vi.mocked(apiGetBlob).mockResolvedValue({ blob: { arrayBuffer: async () => new ArrayBuffer(4) } as Blob, contentType: "application/pdf" });
  mocks.destroy.mockResolvedValue(undefined);
  mocks.render.mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() });
  mocks.getPage.mockResolvedValue({ getViewport: () => ({ width: 600, height: 800 }), render: mocks.render });
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 3, getPage: mocks.getPage }), destroy: mocks.destroy });
});
it("renders real pages in the window, navigates and releases the PDF on close", async () => {
  const view = render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("img", { name: "statement.pdf, page 1 of 3" })).toBeInTheDocument();
  expect(apiGetBlob).toHaveBeenCalledWith("/api/documents/bank/download", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(ready).toHaveBeenLastCalledWith("bank", true);
  await waitFor(() => expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByRole("img", { name: "statement.pdf, page 2 of 3" });
  expect(mocks.getPage).toHaveBeenLastCalledWith(2);
  expect(screen.queryByRole("button", { name: /new tab/i })).not.toBeInTheDocument();
  view.unmount(); expect(mocks.destroy).toHaveBeenCalled();
});
it("retries transient failures and offers manual retry after the bounded attempts", async () => {
  vi.mocked(apiGetBlob).mockRejectedValue(new ApiError(503, "Unavailable"));
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  await screen.findByRole("alert"); expect(apiGetBlob).toHaveBeenCalledTimes(3);
  expect(ready).not.toHaveBeenCalledWith("bank", true);
  vi.mocked(apiGetBlob).mockResolvedValue({ blob: { arrayBuffer: async () => new ArrayBuffer(4) } as Blob, contentType: "application/pdf" });
  fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
  await screen.findByRole("img", { name: "statement.pdf, page 1 of 3" });
});
it("does not retry expired sessions or pretend the preview succeeded", async () => {
  vi.mocked(apiGetBlob).mockRejectedValue(new ApiError(401, "Expired"));
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again");
  expect(apiGetBlob).toHaveBeenCalledTimes(1); expect(ready).not.toHaveBeenCalledWith("bank", true);
});
it("keeps damaged PDFs unverified", async () => {
  mocks.getDocument.mockReturnValue({ promise: Promise.reject(Object.assign(new Error("Bad PDF"), { name: "InvalidPDFException" })), destroy: mocks.destroy });
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("damaged");
  expect(ready).not.toHaveBeenCalledWith("bank", true);
});
it("unlocks password-protected PDFs without sending the password to the backend", async () => {
  let resolve!: (pdf: unknown) => void;
  const task = { promise: new Promise(value => { resolve = value; }), destroy: mocks.destroy, onPassword: undefined as undefined | ((submit: (password: string) => void, reason: number) => void) };
  const submit = vi.fn(() => resolve({ numPages: 1, getPage: mocks.getPage }));
  mocks.getDocument.mockReturnValue(task);
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  await waitFor(() => expect(task.onPassword).toBeTypeOf("function"));
  const { act } = await import("@testing-library/react");
  act(() => task.onPassword?.(submit, 1));
  fireEvent.change(screen.getByLabelText("PDF password"), { target: { value: "private-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock PDF" }));
  await screen.findByRole("img", { name: "statement.pdf, page 1 of 1" });
  expect(submit).toHaveBeenCalledWith("private-password"); expect(apiGetBlob).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("PDF password")).not.toBeInTheDocument();
});

it("blocks readiness when page rendering fails", async () => {
  mocks.render.mockReturnValue({ promise: Promise.reject(new Error("Render failed")), cancel: vi.fn() });
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be rendered");
  expect(ready).toHaveBeenLastCalledWith("bank", false);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("identifies a missing stored file separately from a broken PDF viewer", async () => {
  vi.mocked(apiGetBlob).mockRejectedValue(new ApiError(404, "Missing file"));
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("original file could not be found");
  expect(apiGetBlob).toHaveBeenCalledTimes(1);
  expect(mocks.getDocument).not.toHaveBeenCalled();
});
it("identifies PDF worker failures after the original file downloads", async () => {
  mocks.getDocument.mockReturnValue({ promise: Promise.reject(new Error("Setting up fake worker failed")), destroy: mocks.destroy });
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("file downloaded, but the PDF viewer could not open it");
  expect(ready).not.toHaveBeenCalledWith("bank", true);
});

it("keeps the last painted page visible while zoom renders and clears the overlay when ready", async () => {
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  const canvas=await screen.findByRole("img",{name:"statement.pdf, page 1 of 3"});
  expect(screen.getByLabelText("Document zoom")).toHaveValue("-1");
  let finish!: () => void;
  mocks.render.mockReturnValueOnce({promise:new Promise<void>(resolve=>{finish=resolve;}),cancel:vi.fn()});
  fireEvent.change(screen.getByLabelText("Document zoom"),{target:{value:"125"}});
  await waitFor(()=>expect(mocks.render).toHaveBeenCalledTimes(2));
  expect(canvas).toBeInTheDocument();
  expect(screen.getByRole("status").parentElement).toHaveClass("document-pdf-stage");
  expect(ready).toHaveBeenLastCalledWith("bank",false);
  await act(async()=>{finish();});
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(ready).toHaveBeenLastCalledWith("bank",true);
});
it("does not keep rendering when the preview receives identical resize measurements", async () => {
  let resize!: (entries:Array<{contentRect:{width:number;height:number}}>)=>void;
  vi.stubGlobal("ResizeObserver",class {constructor(callback:typeof resize){resize=callback;} observe(){} disconnect(){}});
  render(<DocumentPdfPreview documentId="bank" fileName="statement.pdf" onReady={ready} />);
  await screen.findByRole("img",{name:"statement.pdf, page 1 of 3"});
  await act(async()=>resize([{contentRect:{width:900,height:650}}]));
  await waitFor(()=>expect(mocks.render).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByRole("status")).not.toBeInTheDocument());
  await act(async()=>{for(let i=0;i<5;i++)resize([{contentRect:{width:900,height:650}}]);});
  expect(mocks.render).toHaveBeenCalledTimes(2);
  expect(apiGetBlob).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenLastCalledWith("bank",true);
});
