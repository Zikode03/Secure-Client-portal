// Friendly guide: this module (Modal) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

// Component flow: gather data first, then render a focused UI state.
export function Modal({ children, description, isOpen, onClose, title }: ModalProps) {
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
          "relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/40 bg-white p-6 shadow-2xl shadow-slate-900/20",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-950" id="modal-title">
              {title}
            </h2>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close modal</span>
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}