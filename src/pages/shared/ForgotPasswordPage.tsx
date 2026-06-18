// Friendly guide: this module (ForgotPasswordPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/auth";

// Component flow: gather data first, then render a focused UI state.
export function ForgotPasswordPage() {
// Local UI state: keeps track of what the user is seeing or editing right now.
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.includes("@")) {
      setError("Use the email tied to the client or firm account.");
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    const result = await requestPasswordReset(email);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message ?? "Password reset could not be requested right now.");
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage(result.message ?? "If the account exists, reset instructions will be sent.");
  }

// Render output: this is the visual state users interact with.
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#273463] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(24,172,95,0.18),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(135deg,rgba(7,19,61,0.92)_0%,rgba(6,31,77,0.42)_48%,rgba(2,8,23,0)_100%)]" />

      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="relative w-full max-w-[980px] overflow-hidden rounded-[2rem] border border-[#07142d] bg-[#050b18] shadow-[0_34px_90px_rgba(0,0,0,0.38)] ring-8 ring-[#07142d]/70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.2),transparent_24%),radial-gradient(circle_at_8%_95%,rgba(16,185,129,0.18),transparent_26%),linear-gradient(120deg,rgba(10,47,102,0.56)_0%,rgba(5,11,24,0.94)_52%,rgba(2,6,23,0.98)_100%)]" />
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(135deg,rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(45deg,rgba(16,185,129,0.13)_1px,transparent_1px)] [background-size:72px_72px,116px_116px]" />

          <div className="relative grid min-h-[560px] items-center px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14">
            <div className="hidden lg:block">
              <div className="max-w-[360px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-white/8 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.22)]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 48 48">
                    <path
                      d="M8 22a16 16 0 1 1 5.4 12M8 34v-9h9"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.7"
                    />
                    <path
                      d="M24 16v9l6 4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.7"
                    />
                  </svg>
                </div>
                <p className="mt-8 text-sm font-black uppercase tracking-[0.42em] text-emerald-300">
                  Password recovery
                </p>
                <h1 className="mt-4 text-4xl font-light tracking-[-0.04em] text-white">
                  Recover access the right way.
                </h1>
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  Request a password reset for the email tied to your portal access. If the account exists, the backend will prepare a secure reset link for that user.
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[420px]">
              <div className="mb-8">
                <h2 className="text-[2.25rem] font-light tracking-[-0.04em] text-white">
                  Recover Access
                </h2>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Remembered your password?{" "}
                  <Link className="font-semibold text-[#0b4f5f] transition hover:text-emerald-700" to="/login">
                    Back to sign in
                  </Link>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-200">
                    Email Address*
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-white/8 bg-slate-700/70 px-4 text-sm font-medium text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-400/10"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@firm.com"
                    type="email"
                    value={email}
                  />
                </label>

                {error ? (
                  <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
                    {error}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-md border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold leading-5 text-emerald-100">
                    {successMessage}
                    <div className="mt-2 text-[0.72rem] font-medium text-emerald-100/85">
                      The reset email will open the password-reset screen directly when the link is valid.
                    </div>
                  </div>
                ) : null}

                <button
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-md bg-[linear-gradient(135deg,#18ac5f_0%,#0a7f74_48%,#0a2f66_100%)] text-sm font-black text-white shadow-[0_14px_30px_rgba(6,95,70,0.28)] transition hover:translate-y-[-1px] active:translate-y-0"
                  type="submit"
                >
                  {isSubmitting ? "Sending reset instructions..." : "Send reset instructions"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
