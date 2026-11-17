import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FormValue = { value: string; checked: boolean };
type Request = { message: string; initialValue?: string; checkbox?: string; initialChecked?: boolean; expected?: string; destructive?: boolean; confirmLabel?: string; kind: "confirm" | "prompt" | "edit" };

/** App-styled confirmations. No native dialogs, and cancel never performs work. */
export function useActionDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const resolve = useRef<((result: FormValue | null) => void) | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => () => { resolve.current?.(null); resolve.current = null; }, []);
  useEffect(() => {
    if (!request) return;
    container.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [request]);
  function finish(result: FormValue | null) {
    const callback = resolve.current; resolve.current = null; setRequest(null); callback?.(result);
    queueMicrotask(() => { if (origin.current?.isConnected) origin.current.focus(); });
  }
  function ask(next: Request): Promise<FormValue | null> {
    if (resolve.current) return Promise.resolve(null);
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setValue(next.initialValue ?? ""); setChecked(next.initialChecked ?? false); setRequest(next);
    return new Promise<FormValue | null>(done => { resolve.current = done; });
  }
  async function confirm(message: string, options: { destructive?: boolean; confirmLabel?: string } = {}) {
    return (await ask({ message, kind: "confirm", ...options })) !== null;
  }
  async function prompt(message: string, initialValue = "", options: { destructive?: boolean; expected?: string; confirmLabel?: string } = {}) {
    return (await ask({ message, initialValue, kind: "prompt", ...options }))?.value ?? null;
  }
  function edit(message: string, initialValue: string, checkbox: string, initialChecked: boolean) {
    return ask({ message, initialValue, checkbox, initialChecked, kind: "edit", confirmLabel: "Save requirement" });
  }
  const dialog = request && <div ref={container} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(null); }
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "checkbox") {
      event.preventDefault();
      if (request.expected !== undefined ? value === request.expected : !!value.trim()) finish({ value, checked });
    }
    if (event.key === "Tab") {
      const items = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}><Modal isOpen title={request.kind === "edit" ? "Edit recurring requirement" : request.kind === "prompt" ? "Action details" : "Confirm action"} description={request.message} onClose={() => finish(null)} panelClassName="!max-w-lg !rounded-xl" footer={<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => finish(null)}>Cancel</Button><Button type="button" variant={request.destructive ? "danger" : "primary"} disabled={request.expected !== undefined ? value !== request.expected : request.kind !== "confirm" && !value.trim()} onClick={() => finish({ value, checked })}>{request.confirmLabel ?? "Continue"}</Button></div>}>
    {request.kind !== "confirm" && <div className="space-y-4"><TextField label={request.expected ? `Type ${request.expected} to confirm` : request.kind === "edit" ? "Requirement name" : "Reason"} value={value} onChange={event => setValue(event.target.value)} />{request.checkbox && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />{request.checkbox}</label>}</div>}
  </Modal></div>;
  return { confirm, prompt, edit, dialog };
}
