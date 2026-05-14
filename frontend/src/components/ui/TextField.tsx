// Friendly guide: this module (TextField) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

// Shared shape notes: these types keep UI and data contracts aligned.
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Component flow: gather data first, then render a focused UI state.
export function TextField({ className, error, hint, id, label, ...props }: TextFieldProps) {
// Render output: this is the visual state users interact with.
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className={cn(
          "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
          error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
          className,
        )}
        id={id}
        {...props}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </label>
  );
}