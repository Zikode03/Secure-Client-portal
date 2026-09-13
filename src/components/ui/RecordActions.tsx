import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface RecordAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/** A table-safe action menu: rendered outside scrolling register containers. */
export function RecordActions({ label, actions, disabled = false }: { label: string; actions: RecordAction[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const height = menu.current.offsetHeight;
    setPosition({
      left: Math.max(8, Math.min(anchor.right - 208, window.innerWidth - 216)),
      top: Math.max(8, anchor.bottom + height + 8 <= window.innerHeight ? anchor.bottom + 6 : anchor.top - height - 6),
    });
    menu.current.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const reposition = () => close();
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50">
      Actions <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
    {open && createPortal(
      <div ref={menu} role="menu" aria-label={label} className="fixed z-[100] w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" style={{ ...position, maxHeight: "calc(100vh - 16px)" }} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== trigger.current) close();
      }} onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); close(true); }
        if (event.key === "Tab") close(true);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
      }}>
        {actions.map((action) => <button key={action.label} type="button" role="menuitem" tabIndex={-1} onClick={() => { close(true); action.onSelect(); }} className={`flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm outline-none ${action.destructive ? "border-t border-slate-100 text-rose-700 hover:bg-rose-50 focus:bg-rose-50" : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50"}`}>{action.label}</button>)}
      </div>, document.body,
    )}
  </>;
}
