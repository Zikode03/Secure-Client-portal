// Friendly guide: this module (Modal) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  footer?: ReactNode;
  scrollBody?: boolean;
}

// Component flow: gather data first, then render a focused UI state.
export function Modal({ children, description, isOpen, onClose, panelClassName, title, footer, scrollBody = false }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  if (!isOpen) {
    return null;
  }

// Render output: this is the visual state users interact with.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full border border-white/40 bg-white shadow-2xl shadow-slate-900/20",
          scrollBody
            ? "flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden rounded-2xl"
            : "max-h-[90vh] max-w-3xl overflow-y-auto rounded-[2rem] p-6",
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className={cn("flex items-start justify-between gap-4", scrollBody ? "shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6" : "mb-6")}>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-950" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close modal</span>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {scrollBody ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div> : children}
        {footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
