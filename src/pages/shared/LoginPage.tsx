// Friendly guide: this module (LoginPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";

// Shared shape notes: these types keep UI and data contracts aligned.
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

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

// Component flow: gather data first, then render a focused UI state.
function ShieldLogo() {
// Render output: this is the visual state users interact with.
  return (
    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 48 48">
      <path
        d="M24 4 39 9v13c0 10.4-6 18.4-15 22-9-3.6-15-11.6-15-22V9l15-5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
      <path
        d="M18 15h10m-10 6h8m10 7 2.5 2.5L43 26"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

function PanelDecoration() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-0 hidden h-full w-[34%] text-white/10 lg:block"
      fill="none"
      viewBox="0 0 460 720"
    >
      <path
        d="M140 88c80 10 140 50 178 130 20 42 28 86 22 132-8 68-4 126 12 176"
        stroke="currentColor"
        strokeDasharray="7 10"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M224 42h58a10 10 0 0 1 10 10v78a10 10 0 0 1-10 10h-58a10 10 0 0 1-10-10V52a10 10 0 0 1 10-10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M238 72h32M238 92h24" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M130 160h84a12 12 0 0 1 12 12v50a12 12 0 0 1-12 12h-84a12 12 0 0 1-12-12v-50a12 12 0 0 1 12-12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M118 185h42l12 15h42" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M182 282c0-4.4 3.6-8 8-8h92c4.4 0 8 3.6 8 8v34c0 42-20 75-54 95-34-20-54-53-54-95v-34Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m214 332 17 17 32-35" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function PortalHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] border border-white/14 bg-white/8">
        <ShieldLogo />
      </div>
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70">
          Accounting
        </p>
        <h1 className="text-[1.18rem] font-semibold leading-tight text-white">
          Document Control
          <br />
          &amp; Compliance Portal
        </h1>
      </div>
    </div>
  );
}

function FeatureCard({ description, icon, title }: FeatureCardProps) {
  return (
    <div className="rounded-[0.9rem] border border-white/10 bg-white/5 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-white/10 text-white">
        {icon}
      </div>
      <h2 className="mt-2.5 text-[0.82rem] font-semibold leading-5 text-white">{title}</h2>
      <p className="mt-1.5 text-[0.76rem] leading-5 text-slate-200/84">{description}</p>
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
    <label className="block space-y-2">
      <span className="text-[0.84rem] font-semibold text-slate-900">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
          {icon}
        </span>
        <input
          autoComplete={autoComplete}
          className="h-11 w-full rounded-[0.9rem] border border-slate-200 bg-white pl-12 pr-12 text-[0.9rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {endAdornment ? (
          <span className="absolute inset-y-0 right-4 flex items-center">
            {endAdornment}
          </span>
        ) : null}
      </div>
    </label>
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
        strokeWidth="1.8"
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
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l1.5 2H19.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3v3M17 3v3M4 9h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3 19 6v6c0 4.9-2.8 8.7-7 10-4.2-1.3-7-5.1-7-10V6l7-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m9.5 12 1.8 1.8 3.7-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 20h16M7 20V8l5-3 5 3v12M9 11h.01M9 14h.01M9 17h.01M15 11h.01M15 14h.01M15 17h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
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
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <path
            d="M3 3 21 21M10.6 10.7a2.8 2.8 0 0 0 3.8 3.8M9.9 5.8A9.3 9.3 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-4.3 4.9M6.1 6.1A15 15 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  );
}

function DeveloperAccount({
  email,
  label,
  onUse,
}: {
  email: string;
  label: string;
  onUse: (email: string) => void;
}) {
  return (
    <button
      className="rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-brand-200 hover:bg-brand-50"
      onClick={() => onUse(email)}
      type="button"
    >
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-[0.8rem] font-medium text-slate-800">{email}</p>
    </button>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeveloperAccess, setShowDeveloperAccess] = useState(false);

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
    setEmail(nextEmail);
    setPassword("Password123");
    setError("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1180px] flex-col justify-between gap-4">
        <div className="grid flex-1 overflow-hidden rounded-[1.4rem] border border-slate-200/70 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] lg:grid-cols-[0.88fr_1.12fr]">
          <section className="relative overflow-hidden bg-[linear-gradient(145deg,#12285c_0%,#0d1f49_44%,#091735_100%)] px-4 py-5 text-white sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <PanelDecoration />

            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="flex h-full w-full max-w-[410px] flex-col rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <PortalHeader />

                <div className="mt-6 max-w-[360px] lg:mt-7">
                  <h2 className="text-[1.55rem] font-semibold leading-[1.06] tracking-tight text-white sm:text-[1.95rem]">
                    Document control
                    <br />
                    built for accounting firms
                  </h2>
                  <p className="mt-3 max-w-[350px] text-[0.8rem] leading-5 text-slate-200/84 sm:text-[0.86rem]">
                    Streamline monthly document packs, ensure nothing is missed, and stay
                    compliant with confidence.
                    <br />
                    Secure uploads. Structured review. Complete visibility.
                  </p>
                </div>

                <div className="mt-5 grid gap-2 md:grid-cols-3">
                  <FeatureCard
                    description="Upload into the right slots every time."
                    icon={<IconFolder />}
                    title="Structured slots"
                  />
                  <FeatureCard
                    description="Automated reminders and expiry tracking."
                    icon={<IconCalendar />}
                    title="Compliance"
                  />
                  <FeatureCard
                    description="Every action recorded and review-ready."
                    icon={<IconShield />}
                    title="Audit trail"
                  />
                </div>

                <div className="mt-5 rounded-[1rem] bg-white px-3.5 py-3.5 text-slate-900 shadow-[0_10px_22px_rgba(3,12,34,0.16)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-brand-50 text-brand-600">
                        <IconFolder />
                      </div>
                      <div>
                        <p className="text-[1rem] font-semibold tracking-tight text-slate-950">
                          April 2026 Pack
                        </p>
                        <p className="mt-0.5 text-[0.76rem] text-slate-500">
                          8 of 12 documents uploaded
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      On track
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)]" />
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 lg:grid-cols-[1fr_140px]">
                    <div>
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-rose-600">
                        Missing
                      </p>
                      <ul className="mt-2 space-y-1.5 text-[0.74rem] text-slate-700">
                        <li className="flex items-center gap-2.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Bank statement
                        </li>
                        <li className="flex items-center gap-2.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Invoices
                        </li>
                      </ul>
                    </div>
                    <div className="border-slate-200 lg:border-l lg:pl-4">
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Deadline
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-[0.74rem] font-medium text-amber-600">
                        <span className="text-slate-400">
                          <IconCalendar />
                        </span>
                        Due in 3 days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex items-start gap-3 text-slate-200/84">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                      <IconLock />
                    </div>
                    <div>
                      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white/78">
                        Security
                      </p>
                      <p className="mt-1.5 text-[0.78rem] font-semibold text-white">
                        Your data is secure and encrypted.
                      </p>
                      <p className="mt-1 text-[0.68rem] leading-4.5 text-slate-200/78">
                        We follow industry best practices to protect your information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.05),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-5 py-6 sm:px-6 lg:px-7">
            <div className="mx-auto w-full max-w-[420px] space-y-3">
              <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5">
                <div className="mx-auto max-w-[320px]">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] bg-brand-50 text-brand-600 shadow-[0_8px_18px_rgba(37,99,235,0.1)]">
                      <IconBuilding />
                    </div>
                    <h2 className="mt-4 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                      Welcome back
                    </h2>
                    <p className="mt-2.5 max-w-[260px] text-[0.82rem] leading-5 text-slate-500">
                      Sign in to manage documents, compliance tasks, and monthly packs.
                    </p>
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
                          className="text-slate-400 transition hover:text-slate-600"
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

                    <div className="flex flex-col gap-2.5 text-[0.8rem] sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2.5 text-slate-600">
                        <input
                          checked={rememberMe}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          onChange={(event) => setRememberMe(event.target.checked)}
                          type="checkbox"
                        />
                        <span className="font-medium">Remember me</span>
                      </label>
                      <Link
                        className="font-semibold text-brand-700 transition hover:text-brand-800"
                        to="/forgot-password"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    {error ? (
                      <div className="rounded-[0.9rem] border border-rose-200 bg-rose-50 px-3.5 py-3 text-[0.8rem] text-rose-700">
                        {error}
                      </div>
                    ) : null}

                    <Button
                      className="h-11 rounded-[0.9rem] bg-[linear-gradient(135deg,#112a64_0%,#0b1d49_100%)] text-[0.9rem] shadow-[0_10px_18px_rgba(17,42,100,0.14)]"
                      fullWidth
                      type="submit"
                    >
                      <IconLock />
                      Sign in
                    </Button>
                  </form>

                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[0.78rem] font-medium text-slate-400">or</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <Button
                    className="h-11 rounded-[0.9rem] border-brand-200 text-[0.9rem] text-brand-700 hover:border-brand-300 hover:bg-brand-50"
                    fullWidth
                    onClick={() => navigate("/invite-setup?email=client@example.com")}
                    variant="secondary"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M4 19.5h16M8.5 9.5V8a3.5 3.5 0 0 1 7 0v1.5M12 14.5v-7M8.5 11h7"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    Set up invited account
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 text-center">
                <button
                  className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-slate-500 transition hover:text-slate-700"
                  onClick={() => setShowDeveloperAccess((current) => !current)}
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M8 7 3.5 12 8 17M16 7l4.5 5L16 17M13.5 4.5 10.5 19.5"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                  Developer access for local testing
                  <svg
                    className={`h-4 w-4 text-slate-400 transition ${showDeveloperAccess ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>

                {showDeveloperAccess ? (
                  <div className="rounded-[0.95rem] border border-slate-200 bg-white p-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                    <p className="text-[0.76rem] text-slate-500">
                      Choose a mock account to prefill the email field. Use any password with
                      at least 8 characters.
                    </p>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                      <DeveloperAccount
                        email="client@example.com"
                        label="Client"
                        onUse={useMockAccount}
                      />
                      <DeveloperAccount
                        email="accountant@example.com"
                        label="Accountant"
                        onUse={useMockAccount}
                      />
                      <DeveloperAccount
                        email="admin@example.com"
                        label="Admin"
                        onUse={useMockAccount}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-2 text-center text-[0.76rem] text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
            <IconShield />
          </span>
          Trusted by accounting professionals to keep clients compliant and audit-ready.
        </div>
      </div>
    </div>
  );
}