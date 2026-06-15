// Friendly guide: this module (InviteSetupPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";

// Component flow: gather data first, then render a focused UI state.
export function InviteSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get("email") ?? "client@example.com";
  const { completeInvite } = useAuth();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");

  const emailLabel = useMemo(() => inviteEmail.toLowerCase(), [inviteEmail]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim()) {
      setError("Enter the name that should appear in audit history.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords need to match before the account can be set up.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the security terms to continue.");
      return;
    }

    const result = completeInvite({
      email: emailLabel,
      fullName,
      password,
    });

    if (!result.ok || !result.user) {
      setError(result.message ?? "Unable to complete the invite.");
      return;
    }

    setError("");
    navigate(defaultPathForRole(result.user.role));
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

          <div className="relative grid min-h-[640px] items-center px-6 py-10 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14">
            <div className="hidden lg:block">
              <div className="max-w-[360px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-white/8 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.22)]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 48 48">
                    <path
                      d="M24 5 39 11v12c0 10.5-6.3 17.8-15 20-8.7-2.2-15-9.5-15-20V11l15-6Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.7"
                    />
                    <path
                      d="m17.5 24 4.4 4.4L31.5 18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.7"
                    />
                  </svg>
                </div>
                <p className="mt-8 text-sm font-black uppercase tracking-[0.42em] text-emerald-300">
                  Invite setup
                </p>
                <h1 className="mt-4 text-4xl font-light tracking-[-0.04em] text-white">
                  Secure access starts here.
                </h1>
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  Create your portal credentials, then manage document slots, audit history, and compliance tasks from your assigned workspace.
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[420px]">
              <div className="mb-8">
                <h2 className="text-[2.25rem] font-light tracking-[-0.04em] text-white">
                  Create an Account
                </h2>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Already have an account?{" "}
                  <Link className="font-bold text-emerald-300 transition hover:text-emerald-200" to="/login">
                    log in
                  </Link>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-200">
                    Invite Email*
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-white/8 bg-slate-700/70 px-4 text-sm font-medium text-slate-200 outline-none ring-0 transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-400/10"
                    readOnly
                    value={emailLabel}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-200">
                    Full Name*
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-white/8 bg-slate-700/70 px-4 text-sm font-medium text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-400/10"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    value={fullName}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-200">
                    Create Password*
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-white/8 bg-slate-700/70 px-4 text-sm font-medium text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-400/10"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create password"
                    type="password"
                    value={password}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-200">
                    Confirm Password*
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-white/8 bg-slate-700/70 px-4 text-sm font-medium text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-400/10"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    type="password"
                    value={confirmPassword}
                  />
                </label>

                <label className="flex items-start gap-3 rounded-md border border-white/8 bg-slate-900/38 px-4 py-3 text-xs leading-5 text-slate-300">
                  <input
                    checked={acceptedTerms}
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I understand that portal actions appear in audit history and that uploads must go into their assigned document slots.
                  </span>
                </label>

                {error ? (
                  <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
                    {error}
                  </div>
                ) : null}

                <button
                  className="h-12 w-full rounded-md bg-[linear-gradient(135deg,#18ac5f_0%,#0a7f74_48%,#0a2f66_100%)] text-sm font-black text-white shadow-[0_14px_30px_rgba(6,95,70,0.28)] transition hover:translate-y-[-1px] active:translate-y-0"
                  type="submit"
                >
                  Complete account setup
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
