import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";
import { hasApiBaseUrl } from "../../services/apiClient";

interface InputFieldProps {
  id: string;
  label: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  autoComplete?: string;
  endAdornment?: ReactNode;
}

function IconShield() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 48 48">
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
  );
}

function IconEmail() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7.5 12 13l8-5.5M5 19h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 11V8a4 4 0 1 1 8 0v3m-9 9h10a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconEye({ open }: { open: boolean }) {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      {open ? (
        <>
          <path
            d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <path
          d="M3 3l18 18M10.6 10.7a3 3 0 0 0 3.8 3.8M9.8 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-4.2 4.8M6.1 6.1A15 15 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 7 3.5 12 8 17M16 7l4.5 5L16 17M14 4.5 10 19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconBank() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 40 40">
      <path
        d="M20 5.5 30.5 9.8v8.1c0 7.1-4.2 12.1-10.5 14.6-6.3-2.5-10.5-7.5-10.5-14.6V9.8L20 5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
      <path
        d="M16.4 18.4v-1.5a3.6 3.6 0 1 1 7.2 0v1.5m-8 8.2h8.8a1.6 1.6 0 0 0 1.6-1.6v-4.9a1.6 1.6 0 0 0-1.6-1.6h-8.8a1.6 1.6 0 0 0-1.6 1.6V25a1.6 1.6 0 0 0 1.6 1.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
      <path
        d="M20 21.7v2.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </svg>
  );
}

function BrandVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="h-full w-full object-cover"
        src="/login-document-workflow.png"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,18,0.18)_0%,rgba(2,8,18,0.34)_38%,rgba(2,8,18,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(24,172,95,0.12),transparent_24%)]" />
      <div className="absolute inset-y-0 right-0 w-24 bg-[linear-gradient(90deg,transparent_0%,rgba(7,20,33,0.35)_100%)]" />
    </div>
  );
}

function InputField({
  autoComplete,
  endAdornment,
  id,
  icon,
  label,
  name,
  onChange,
  placeholder,
  type,
  value,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.8rem] font-medium text-[#22314f]">
        {label}
      </span>

      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-[#4d7a67]">
          {icon}
        </span>

        <input
          autoComplete={autoComplete}
          className="h-10 w-full rounded-xl border border-[#d8e1ee] bg-[#fbfcfe] pl-10.5 pr-10.5 text-[0.88rem] text-[#07133d] shadow-none outline-none placeholder:text-slate-400 focus:border-[#9cb8a8] focus:bg-white focus:ring-4 focus:ring-[#edf4ef]"
          id={id}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />

        {endAdornment ? (
          <span className="absolute inset-y-0 right-4 flex items-center text-slate-500">
            {endAdornment}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { authNotice, clearAuthNotice, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeveloperAccess, setShowDeveloperAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    clearAuthNotice();

    const result = await login({ email, password, rememberMe });

    if (!result.ok || !result.user) {
      setError(result.message ?? "Unable to sign in.");
      setIsSubmitting(false);
      return;
    }

    setError("");
    setIsSubmitting(false);
    navigate(defaultPathForRole(result.user.role));
  }

  function useMockAccount(nextEmail: string) {
    const passwordsByEmail: Record<string, string> = hasApiBaseUrl()
      ? {
          "admin@secureportal.local": "Password123!",
          "accountant@secureportal.local": "Password123!",
          "client@secureportal.local": "Password123!",
        }
      : {
          "admin@example.com": "Admin@2026",
          "accountant@example.com": "Accountant@2026",
          "client@example.com": "Client@2026",
        };

    setEmail(nextEmail);
    setPassword(passwordsByEmail[nextEmail] ?? "");
    setError("");
    clearAuthNotice();
  }
  return (
    <main className="relative h-screen overflow-hidden bg-[#071421] text-[#07133d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(22,163,116,0.26),transparent_28%),radial-gradient(circle_at_72%_78%,rgba(6,31,77,0.52),transparent_34%),linear-gradient(135deg,#071421_0%,#10233b_50%,#06111e_100%)]" />
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.24)_1px,transparent_1px),radial-gradient(circle_at_70%_20%,rgba(24,172,95,0.18)_1px,transparent_1px)] [background-size:80px_80px,110px_110px]" />

      <section className="relative z-10 flex h-screen items-center justify-center px-4 py-4">
        <div className="grid h-full max-h-[960px] w-full max-w-[1080px] overflow-hidden rounded-[24px] bg-white shadow-[0_24px_56px_rgba(0,0,0,0.26)] lg:max-h-[calc(100vh-2rem)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden overflow-hidden rounded-l-[20px] lg:block">
            <BrandVisual />

            <div className="absolute left-9 top-8 z-10 flex items-center gap-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/20">
                <IconShield />
              </span>
              <span className="text-[0.8rem] font-medium uppercase tracking-[0.2em]">Secure Accounting</span>
            </div>

            <div className="absolute bottom-9 left-9 right-9 z-10 text-white">
              <div className="mb-4 h-px w-20 bg-emerald-300/60" />
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-white/68">
                Trusted Workspace
              </p>
              <h1 className="mt-3 max-w-[360px] text-[2rem] font-medium leading-[1.14] tracking-[-0.025em] drop-shadow-[0_14px_24px_rgba(0,0,0,0.24)]">
                Document control and compliance oversight for modern accounting teams.
              </h1>
              <p className="mt-3 max-w-[360px] text-[0.86rem] leading-6 text-white/68">
                Track requests, filings, monthly packs, and client records in one controlled portal.
              </p>
            </div>
          </div>

          <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] px-6 py-6 sm:px-9 lg:px-10">
            <div className="w-full max-w-[400px]">
              <div className="mb-5">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[#e3ebf2] bg-white px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f4faf6_0%,#edf6f0_100%)] text-[#2d6c57] ring-1 ring-[#dbe9df]">
                    <IconBank />
                  </span>
                  <div className="text-left">
                    <p className="text-[0.92rem] font-medium tracking-[-0.01em] text-[#07133d]">
                      Secure Client Portal
                    </p>
                    <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-[0.1em] text-[#7b879d]">
                      Protected client workspace
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-3 rounded-[20px] border border-[#e6edf5] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4" onSubmit={handleSubmit}>
                {authNotice ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-left text-[0.78rem] leading-5 text-sky-900">
                    <div className="font-medium">Session update</div>
                    <div className="mt-1 font-medium">{authNotice}</div>
                  </div>
                ) : null}

                <InputField
                  autoComplete="email"
                  id="login-email"
                  icon={<IconEmail />}
                  label="Work email"
                  name="email"
                  onChange={setEmail}
                  placeholder="you@company.com"
                  type="email"
                  value={email}
                />

                <InputField
                  autoComplete="current-password"
                  endAdornment={
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="transition hover:text-[#06113c]"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      <IconEye open={showPassword} />
                    </button>
                  }
                  id="login-password"
                  icon={<IconLock />}
                  label="Password"
                  name="password"
                  onChange={setPassword}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />

                <div className="flex items-center justify-between gap-4 text-[0.74rem]">
                  <label className="flex cursor-pointer items-center gap-2 text-[#22314f]">
                    <span className="relative flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-white">
                      <input
                        checked={rememberMe}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      {rememberMe ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded bg-emerald-600">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <path
                              d="m5 12 4 4L19 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                            />
                          </svg>
                        </span>
                      ) : null}
                    </span>
                    Keep me signed in on this device
                  </label>

                  <Link
                    className="font-medium text-[#315b7e] transition hover:text-emerald-700"
                    to="/forgot-password"
                  >
                    Reset password
                  </Link>
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[0.74rem] text-rose-700">
                    <div className="font-medium">Couldn&apos;t sign you in</div>
                    <div className="mt-1 font-medium">{error}</div>
                  </div>
                ) : null}

                <button
                  disabled={isSubmitting}
                  className="flex h-10 w-full items-center justify-center gap-3 rounded-xl bg-[#0a2540] text-[0.86rem] font-medium text-white shadow-[0_10px_18px_rgba(10,37,64,0.16)] transition hover:bg-[#0c2f52] active:translate-y-px"
                  type="submit"
                >
                  <IconLock />
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  className="inline-flex items-center gap-3 text-[0.76rem] font-medium text-[#22314f] transition hover:text-emerald-700"
                  onClick={() => setShowDeveloperAccess((current) => !current)}
                  type="button"
                >
                  <span className="text-emerald-600">
                    <IconCode />
                  </span>
                  Developer access for local testing
                  <svg
                    className={`h-4 w-4 text-emerald-600 transition ${
                      showDeveloperAccess ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                    />
                  </svg>
                </button>

                {showDeveloperAccess ? (
                  <div className="mt-3 grid gap-2 text-left text-[0.72rem] font-medium">
                    <button
                      className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() =>
                        useMockAccount(
                          hasApiBaseUrl() ? "client@secureportal.local" : "client@example.com",
                        )
                      }
                      type="button"
                    >
                      Client: <span className="text-emerald-600">{hasApiBaseUrl() ? "client@secureportal.local" : "client@example.com"}</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">{hasApiBaseUrl() ? "Password123!" : "Client@2026"}</span>
                    </button>
                    <button
                      className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() =>
                        useMockAccount(
                          hasApiBaseUrl()
                            ? "accountant@secureportal.local"
                            : "accountant@example.com",
                        )
                      }
                      type="button"
                    >
                      Accountant: <span className="text-emerald-600">{hasApiBaseUrl() ? "accountant@secureportal.local" : "accountant@example.com"}</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">{hasApiBaseUrl() ? "Password123!" : "Accountant@2026"}</span>
                    </button>
                    <button
                      className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() =>
                        useMockAccount(
                          hasApiBaseUrl() ? "admin@secureportal.local" : "admin@example.com",
                        )
                      }
                      type="button"
                    >
                      Admin: <span className="text-emerald-600">{hasApiBaseUrl() ? "admin@secureportal.local" : "admin@example.com"}</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">{hasApiBaseUrl() ? "Password123!" : "Admin@2026"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
