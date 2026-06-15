import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";

interface InputFieldProps {
  label: string;
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
    <svg className="h-9 w-9" fill="none" viewBox="0 0 48 48">
      <path d="M8 20h32M12 36h24M16 20v16M24 20v16M32 20v16M10 40h28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <path d="m24 7 16 9H8l16-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,18,0.05)_0%,rgba(2,8,18,0.18)_42%,rgba(2,8,18,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(24,172,95,0.16),transparent_24%)]" />
    </div>
  );
}

function InputField({
  autoComplete,
  endAdornment,
  icon,
  label,
  onChange,
  placeholder,
  type,
  value,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.82rem] font-semibold text-[#07133d]">
        {label}
      </span>

      <div className="relative">
        <span className="absolute inset-y-0 left-5 flex items-center text-emerald-500">
          {icon}
        </span>

        <input
          autoComplete={autoComplete}
          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-[0.9rem] font-medium text-[#07133d] shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />

        {endAdornment ? (
          <span className="absolute inset-y-0 right-5 flex items-center text-slate-500">
            {endAdornment}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeveloperAccess, setShowDeveloperAccess] = useState(true);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = login({ email, password });

    if (!result.ok || !result.user) {
      setError(result.message ?? "Unable to sign in.");
      return;
    }

    setError("");
    navigate(defaultPathForRole(result.user.role));
  }

  function useMockAccount(nextEmail: string) {
    const passwordsByEmail: Record<string, string> = {
      "admin@example.com": "Admin@2026",
      "accountant@example.com": "Accountant@2026",
      "client@example.com": "Client@2026",
    };

    setEmail(nextEmail);
    setPassword(passwordsByEmail[nextEmail] ?? "");
    setError("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071421] text-[#07133d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(22,163,116,0.26),transparent_28%),radial-gradient(circle_at_72%_78%,rgba(6,31,77,0.52),transparent_34%),linear-gradient(135deg,#071421_0%,#10233b_50%,#06111e_100%)]" />
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.24)_1px,transparent_1px),radial-gradient(circle_at_70%_20%,rgba(24,172,95,0.18)_1px,transparent_1px)] [background-size:80px_80px,110px_110px]" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <div className="grid w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_34px_90px_rgba(0,0,0,0.34)] lg:min-h-[660px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden rounded-l-[20px] lg:block">
            <BrandVisual />

            <div className="absolute left-12 top-10 z-10 flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/20">
                <IconShield />
              </span>
              <span className="text-sm font-black uppercase tracking-[0.24em]">Accounting</span>
            </div>

            <div className="absolute bottom-14 left-12 right-12 z-10 text-white">
              <div className="mb-6 h-1 w-20 rounded-full bg-emerald-300" />
              <h1 className="max-w-[520px] text-[3rem] font-black uppercase leading-[1.03] tracking-[-0.02em] drop-shadow-[0_18px_28px_rgba(0,0,0,0.32)]">
                Document Control
                <br />
                &amp; Compliance Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-center px-7 py-10 sm:px-12">
            <div className="w-full max-w-[360px]">
              <div className="mb-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-emerald-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                  <IconBank />
                </div>
                <h2 className="mt-6 text-[1.72rem] font-black uppercase tracking-[-0.02em] text-[#07133d]">
                  Welcome back!
                </h2>
                <p className="mt-2 text-[0.86rem] font-medium text-slate-500">
                  Sign in to manage documents, compliance tasks, and monthly packs.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <InputField
                  autoComplete="email"
                  icon={<IconEmail />}
                  label="Work email"
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
                  icon={<IconLock />}
                  label="Password"
                  onChange={setPassword}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />

                <div className="flex items-center justify-between gap-4 text-[0.78rem] font-semibold">
                  <label className="flex cursor-pointer items-center gap-2 text-[#07133d]">
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
                    Remember me
                  </label>

                  <Link
                    className="text-[#0b4f5f] transition hover:text-emerald-700"
                    to="/forgot-password"
                  >
                    Forgot password
                  </Link>
                </div>

                {error ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.78rem] font-semibold text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#074e5f] text-[0.9rem] font-bold text-white shadow-[0_12px_22px_rgba(7,78,95,0.22)] transition hover:bg-[#063f4d] active:translate-y-px"
                  type="submit"
                >
                  <IconLock />
                  Sign in
                </button>
              </form>

              <div className="mt-7 text-center">
                <button
                  className="inline-flex items-center gap-3 text-[0.82rem] font-semibold text-[#07133d] transition hover:text-emerald-700"
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
                  <div className="mt-3 grid gap-2 text-left text-[0.72rem] font-semibold">
                    <button
                      className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() => useMockAccount("client@example.com")}
                      type="button"
                    >
                      Client: <span className="text-emerald-600">client@example.com</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">Client@2026</span>
                    </button>
                    <button
                      className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() => useMockAccount("accountant@example.com")}
                      type="button"
                    >
                      Accountant: <span className="text-emerald-600">accountant@example.com</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">Accountant@2026</span>
                    </button>
                    <button
                      className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={() => useMockAccount("admin@example.com")}
                      type="button"
                    >
                      Admin: <span className="text-emerald-600">admin@example.com</span>
                      <span className="mx-2 text-slate-400">&bull;</span>
                      <span className="text-emerald-600">Admin@2026</span>
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
