import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";

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

function IconDocumentStack() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 4.75h6l3.25 3.25v9.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 17V7A2.25 2.25 0 0 1 8 4.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M13.25 4.75V8h3.25M9 11h5.25M9 14h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="8.25" cy="8.5" r="2.75" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="15.75" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M3.75 18c1.1-2.7 3.35-4.25 6-4.25s4.9 1.55 6 4.25M13.2 14.65c1.55.3 2.9 1.3 3.8 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="m8.6 12.15 2.3 2.3 4.5-4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconGrowth() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 18.25h13M7.25 16V11.5M12 16V8M16.75 16V5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconProgressBullet() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 7.6v4.7l3 1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconDocumentsBullet() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 4.75h6l3.25 3.25v9.25a2 2 0 0 1-2 2H8A2.25 2.25 0 0 1 5.75 17V7A2.25 2.25 0 0 1 8 4.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M13.25 4.75V8h3.25M9 11h5.25M9 14h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function IconReviewBullet() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3.75 18.75 6.4v5.25c0 4.4-2.7 7.48-6.75 8.6-4.05-1.12-6.75-4.2-6.75-8.6V6.4L12 3.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="m9.45 11.95 1.75 1.75 3.35-3.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
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

function SecureAccountingBrandBlock() {
  const features = [
    { label: "Secure", icon: <IconShield /> },
    { label: "Document Control", icon: <IconDocumentStack /> },
    { label: "Client Collaboration", icon: <IconPeople /> },
    { label: "Compliance", icon: <IconCheckCircle /> },
    { label: "Accounting Intelligence", icon: <IconGrowth /> },
  ];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(24,172,95,0.08),transparent_26%),linear-gradient(180deg,#ffffff_0%,#f8fbfd_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[22px] bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <IconBank />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-[2rem] font-semibold leading-none tracking-[-0.045em] text-brand-800">
              Secure
            </span>
            <span className="text-[2rem] font-semibold leading-none tracking-[-0.045em] text-brand-500">
              Accounting
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span className="h-px w-14 bg-brand-200" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {features.map((feature) => (
          <div
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 sm:flex-col sm:items-center sm:justify-center sm:text-center"
            key={feature.label}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              {feature.icon}
            </span>
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-slate-700">
              {feature.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecureAccountingWordmark() {
  return (
    <div className="mx-auto max-w-[540px] text-center">
      <div className="text-center">
        <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-1">
          <span className="text-[2.8rem] font-semibold leading-none tracking-[-0.055em] text-brand-800">
            Secure
          </span>
          <span className="text-[2.8rem] font-semibold leading-none tracking-[-0.055em] text-brand-500">
            Accounting
          </span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-14 bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(216,242,228,0.9)]" />
          <span className="h-px w-14 bg-brand-200" />
        </div>
      </div>
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
      <span className="mb-2 block text-[0.8rem] font-medium text-slate-700">
        {label}
      </span>

      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-brand-600">
          {icon}
        </span>

        <input
          autoComplete={autoComplete}
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10.5 pr-10.5 text-[0.88rem] text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
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
  const { clearAuthNotice, login } = useAuth();
  const sellingPoints = [
    {
      icon: <IconProgressBullet />,
      text: "Know the progress of your monthly pack items at all times.",
    },
    {
      icon: <IconDocumentsBullet />,
      text: "Keep bank statements, invoices, and VAT submissions controlled.",
    },
    {
      icon: <IconReviewBullet />,
      text: "Reduce lost files and improve compliance across every review step.",
    },
  ];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <main className="relative h-screen overflow-hidden bg-[#071421] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(22,163,116,0.26),transparent_28%),radial-gradient(circle_at_72%_78%,rgba(6,31,77,0.52),transparent_34%),linear-gradient(135deg,#071421_0%,#10233b_50%,#06111e_100%)]" />
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.24)_1px,transparent_1px),radial-gradient(circle_at_70%_20%,rgba(24,172,95,0.18)_1px,transparent_1px)] [background-size:80px_80px,110px_110px]" />

      <section className="relative z-10 flex h-screen items-center justify-center px-4 py-4">
        <div className="grid h-full max-h-[960px] w-full max-w-[1080px] overflow-hidden rounded-[24px] bg-white shadow-[0_24px_56px_rgba(0,0,0,0.26)] lg:max-h-[calc(100vh-2rem)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden overflow-hidden rounded-l-[20px] lg:block">
            <BrandVisual />

            <div className="absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(180deg,rgba(4,14,24,0)_0%,rgba(4,14,24,0.82)_36%,rgba(4,14,24,0.94)_100%)] px-9 pb-9 pt-28 text-white">
              <div className="mb-5 h-px w-24 bg-brand-100/70" />
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.2em] text-white/70">
                Business Process Automation
              </p>
              <h1 className="mt-3 max-w-[430px] text-[2.2rem] font-medium leading-[1.1] tracking-[-0.03em] drop-shadow-[0_14px_24px_rgba(0,0,0,0.28)]">
                Speed up accounting operations with secure digital workflows.
              </h1>
              <div className="mt-5 h-px max-w-[360px] bg-white/45" />
              <div className="mt-6 space-y-3.5 text-[0.95rem] leading-6 text-white/84">
                {sellingPoints.map((point) => (
                  <div className="flex items-start gap-3" key={point.text}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-brand-100 ring-1 ring-white/12">
                      {point.icon}
                    </span>
                    <p>{point.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfd_100%)] px-6 py-6 sm:px-9 lg:px-10">
            <div className="flex min-h-full w-full max-w-[560px] flex-col">
              <div className="mb-8 hidden lg:block">
                <SecureAccountingWordmark />
              </div>

              <div className="mb-6 lg:hidden">
                <SecureAccountingBrandBlock />
              </div>

              <form className="mx-auto w-full max-w-[520px] space-y-5 px-2 sm:px-3" onSubmit={handleSubmit}>
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
                      className="transition hover:text-brand-800"
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
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <span className="relative flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-white">
                      <input
                        checked={rememberMe}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      {rememberMe ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded bg-brand-500">
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
                    className="font-medium text-brand-700 transition hover:text-brand-500"
                    to="/forgot-password"
                  >
                    Forgot Password ?
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
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-brand-700 text-[1.1rem] font-semibold text-white shadow-[0_18px_34px_rgba(10,47,102,0.2)] transition hover:bg-brand-800 active:translate-y-px"
                  type="submit"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mx-auto mt-auto w-full max-w-[520px] border-t border-slate-200 pt-5 text-center">
                <p className="text-[0.8rem] text-slate-500">
                  Copyright © 2026 Secure Accounting
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
