import { MfaChallengePage } from "../../components/auth/MfaChallengePage";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileCheck2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";

interface InputFieldProps {
  autoComplete: string;
  endAdornment?: ReactNode;
  icon: ReactNode;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}

function PortalMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-[14px] ${
          inverse
            ? "bg-white/10 text-white ring-1 ring-white/20"
            : "bg-brand-800 text-white shadow-[0_10px_24px_rgba(7,36,79,0.18)]"
        }`}
      >
        <ShieldCheck aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-brand-500" />
      </span>
      <span>
        <span className={`block text-[1.05rem] font-semibold tracking-[-0.02em] ${inverse ? "text-white" : "text-slate-950"}`}>
          Secure Accounting
        </span>
        <span className={`mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${inverse ? "text-white/55" : "text-slate-400"}`}>
          Client portal
        </span>
      </span>
    </div>
  );
}

function InputField({
  autoComplete,
  endAdornment,
  icon,
  id,
  label,
  name,
  onChange,
  placeholder,
  type,
  value,
}: InputFieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="group relative block">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-brand-600">
          {icon}
        </span>
        <input
          autoComplete={autoComplete}
          className="h-13 w-full rounded-[14px] border border-slate-200 bg-slate-50/80 pl-11 pr-12 text-[0.94rem] text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100/80"
          id={id}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {endAdornment ? (
          <span className="absolute inset-y-0 right-3 flex items-center">{endAdornment}</span>
        ) : null}
      </span>
    </label>
  );
}

function PopiaNotice({ accepted, onChange }: { accepted: boolean; onChange: (accepted: boolean) => void }) {
  return (
    <div className="rounded-[16px] border border-emerald-200/80 bg-emerald-50/55 p-3.5">
      <label className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-emerald-300 bg-white text-white shadow-sm">
          <input
            aria-describedby="popia-summary"
            aria-required="true"
            checked={accepted}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.checked)}
            type="checkbox"
          />
          {accepted ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-[5px] bg-brand-600">
              <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          ) : null}
        </span>
        <span className="text-[0.78rem] leading-5 text-slate-700">
          I have read and understand the <strong className="font-semibold text-slate-900">POPIA privacy notice</strong> for this portal.
        </span>
      </label>

      <details className="group mt-2.5 border-t border-emerald-200/70 pt-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.72rem] font-semibold text-brand-700 marker:content-none">
          <span>How we handle your information</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div id="popia-summary" className="mt-3 space-y-2 text-[0.72rem] leading-5 text-slate-600">
          <p>
            Your account, authentication and activity information is processed to provide, secure and audit access to this client portal in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA).
          </p>
          <p>
            You may request access to or correction of your personal information through your account administrator. You may also learn more from the{" "}
            <a
              className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-500"
              href="https://inforegulator.org.za/acts/"
              rel="noreferrer"
              target="_blank"
            >
              Information Regulator
            </a>.
          </p>
        </div>
      </details>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { clearAuthNotice, login, pendingMfa } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [popiaAccepted, setPopiaAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!popiaAccepted) {
      setError("Please acknowledge the POPIA privacy notice before signing in.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    clearAuthNotice();

    const result = await login({ email, password, rememberMe });

    if (result.mfaRequired) { setPassword(""); setIsSubmitting(false); return; }
    if (!result.ok || !result.user) {
      setError(result.message ?? "Unable to sign in.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    navigate(defaultPathForRole(result.user.role));
  }

  if (pendingMfa) return <MfaChallengePage />;
  return (
    <main className="relative h-svh overflow-hidden bg-[#eef3f6] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(24,172,95,0.12),transparent_28%),radial-gradient(circle_at_92%_90%,rgba(10,47,102,0.12),transparent_30%)]" />

      <div className="relative mx-auto flex h-full w-full max-w-[1480px] items-stretch p-0 lg:p-5 xl:p-7">
        <div className="grid h-full min-h-0 w-full overflow-hidden bg-white shadow-[0_30px_90px_rgba(7,25,48,0.16)] lg:grid-cols-[1.08fr_0.92fr] lg:rounded-[30px]">
          <section className="relative hidden min-h-0 overflow-hidden bg-[#071826] lg:flex lg:flex-col lg:justify-between">
            <img
              alt="Secure digital document workspace"
              className="absolute inset-0 h-full w-full object-cover object-[57%_center]"
              src="/login-document-workflow.png"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,13,23,0.42)_0%,rgba(3,13,23,0.18)_38%,rgba(3,13,23,0.92)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(42,214,151,0.12),transparent_28%)]" />

            <div className="relative z-10 flex items-center justify-between px-9 py-8 xl:px-12">
              <PortalMark inverse />
              <span className="rounded-full border border-white/15 bg-slate-950/25 px-3.5 py-2 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md">
                Protected workspace
              </span>
            </div>

            <div className="relative z-10 max-w-[690px] px-9 pb-10 xl:px-12 xl:pb-12">
              <div className="mb-5 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-px w-9 bg-emerald-300/70" />
                One secure place to work
              </div>
              <div
                aria-level={1}
                className="max-w-[600px] text-[2.55rem] font-semibold leading-[1.08] tracking-[-0.045em] text-white xl:text-[3rem]"
                role="heading"
              >
                Your financial work,<br />protected and in motion.
              </div>
              <p className="mt-5 max-w-[560px] text-[0.95rem] leading-7 text-slate-200/80">
                Share records, follow review progress and keep every monthly accounting task moving—with a complete, accountable trail.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { icon: FileCheck2, label: "Controlled records" },
                  { icon: UsersRound, label: "Shared progress" },
                  { icon: BadgeCheck, label: "Audit ready" },
                ].map(({ icon: Icon, label }) => (
                  <div className="rounded-[16px] border border-white/12 bg-white/[0.07] px-4 py-4 backdrop-blur-md" key={label}>
                    <Icon aria-hidden="true" className="h-5 w-5 text-emerald-300" strokeWidth={1.8} />
                    <p className="mt-3 text-[0.72rem] font-medium leading-5 text-white/82">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] px-5 py-5 sm:px-10 lg:px-12 lg:py-6 xl:px-16">
            <div className="flex items-center justify-between lg:hidden">
              <PortalMark />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <LockKeyhole aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>

            <div className="mx-auto flex min-h-0 w-full max-w-[470px] flex-1 flex-col justify-center py-4 lg:py-3">
              <div className="mb-4 hidden lg:block">
                <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-brand-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                    <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  Secure sign in
                </div>
              </div>

              <form className="space-y-3.5" onSubmit={handleSubmit}>
                <InputField
                  autoComplete="email"
                  icon={<Mail aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.9} />}
                  id="login-email"
                  label="Work email"
                  name="email"
                  onChange={setEmail}
                  placeholder="name@company.co.za"
                  type="email"
                  value={email}
                />

                <InputField
                  autoComplete="current-password"
                  endAdornment={
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  }
                  icon={<LockKeyhole aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.9} />}
                  id="login-password"
                  label="Password"
                  name="password"
                  onChange={setPassword}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 text-[0.76rem]">
                  <label className="flex cursor-pointer items-center gap-2.5 text-slate-600">
                    <span className="relative flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border border-slate-300 bg-white text-white">
                      <input
                        checked={rememberMe}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      {rememberMe ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-[4px] bg-brand-700">
                          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    Keep me signed in
                  </label>
                  <Link className="font-semibold text-brand-700 transition hover:text-brand-500" to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <PopiaNotice accepted={popiaAccepted} onChange={setPopiaAccepted} />

                {error ? (
                  <div aria-live="polite" className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[0.78rem] leading-5 text-rose-700" role="alert">
                    <strong className="font-semibold">Sign-in unsuccessful.</strong> {error}
                  </div>
                ) : null}

                <button
                  className="group flex h-13 w-full items-center justify-center gap-2.5 rounded-[14px] bg-brand-800 px-5 text-[0.92rem] font-semibold text-white shadow-[0_14px_28px_rgba(7,36,79,0.2)] transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-[0_18px_34px_rgba(7,36,79,0.24)] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Signing you in…" : "Sign in securely"}
                  {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 text-[0.7rem] text-slate-400">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
                <span>Encrypted access · Activity monitored for your protection</span>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[0.68rem] text-slate-400">
              <span>© 2026 Secure Accounting</span>
              <span>Authorised users only</span>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
