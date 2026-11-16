import { useRef } from "react";

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export function VerificationCodeInput({
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: VerificationCodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i]?.trim() ?? "");
  const focus = (index: number) => {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  };
  const enter = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, 6);
    if (!incoming) return;
    const start = incoming.length === 6 ? 0 : index;
    const next = [...digits];
    for (let i = 0; i < incoming.length && start + i < 6; i++)
      next[start + i] = incoming[i];
    onChange(next.map((d) => d || " ").join(""));
    focus(Math.min(start + incoming.length, 5));
  };
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={describedBy}
      className="min-w-0 space-y-3"
    >
      <legend className="text-sm font-medium">Authenticator code</legend>
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            aria-label={`Digit ${index + 1} of 6`}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            autoFocus={index === 0}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            inputMode="numeric"
            type="text"
            pattern="[0-9]*"
            maxLength={6}
            value={digit}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              if (event.target.value === "") {
                const next = [...digits];
                next[index] = "";
                onChange(next.map((d) => d || " ").join(""));
              } else enter(index, event.target.value);
            }}
            onPaste={(event) => {
              event.preventDefault();
              enter(index, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                focus(
                  Math.max(
                    0,
                    Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)),
                  ),
                );
              } else if (event.key === "Backspace") {
                event.preventDefault();
                const target = digits[index] ? index : Math.max(0, index - 1);
                const next = [...digits];
                next[target] = "";
                onChange(next.map((d) => d || " ").join(""));
                focus(target);
              }
            }}
            className="h-14 min-w-0 w-full rounded-xl border border-slate-300 bg-white text-center font-mono text-2xl font-semibold text-slate-900 caret-slate-900 shadow-sm transition focus-visible:border-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60 aria-[invalid=true]:border-rose-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:caret-slate-100 dark:focus-visible:outline-emerald-300 sm:h-16"
          />
        ))}
      </div>
    </fieldset>
  );
}
