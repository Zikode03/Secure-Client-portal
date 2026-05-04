import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { AuthLayout } from "../../layouts/AuthLayout";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("client@example.com");
  const [password, setPassword] = useState("Password123");
  const [error, setError] = useState("");

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

  return (
    <AuthLayout
      badge="Secure Workflow Access"
      description="Sign in to a structured accounting workspace for month packs, controlled uploads, review history, and deadline-driven compliance work."
      title="Accounting Document Control & Compliance Portal"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
          <p className="text-sm leading-6 text-slate-500">
            Role access is determined by your account, not selected on this screen.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Mock accounts for this frontend MVP:
          <br />
          client@example.com
          <br />
          accountant@example.com
          <br />
          admin@example.com
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            autoComplete="email"
            label="Work email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@firm.com"
            type="email"
            value={email}
          />
          <TextField
            autoComplete="current-password"
            hint="Use any password with at least 8 characters for this frontend-only MVP."
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button fullWidth size="lg" type="submit">
            Sign in to workspace
          </Button>
        </form>

        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link className="font-medium text-brand-700 transition hover:text-brand-800" to="/forgot-password">
            Forgot password?
          </Link>
          <Link className="font-medium text-brand-700 transition hover:text-brand-800" to="/invite-setup?email=client@example.com">
            Set up invited account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
