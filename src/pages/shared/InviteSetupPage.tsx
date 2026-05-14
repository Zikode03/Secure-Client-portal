// Friendly guide: this module (InviteSetupPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { AuthLayout } from "../../layouts/AuthLayout";

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
    <AuthLayout
      badge="Invite Setup"
      description="A new portal account should be quick to create, while still making audit visibility, controlled uploads, and role-based access clear from day one."
      title="Set up your invited account"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">Create your password</h2>
          <p className="text-sm leading-6 text-slate-500">
            This invite is linked to {emailLabel}. The role for this account is fixed by the invite.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField label="Invite email" readOnly value={emailLabel} />
          <TextField
            label="Full name"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            value={fullName}
          />
          <TextField
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create password"
            type="password"
            value={password}
          />
          <TextField
            label="Confirm password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
          />

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              checked={acceptedTerms}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              type="checkbox"
            />
            <span>
              I understand that portal actions appear in audit history and that uploads must go into their assigned document slots.
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button fullWidth size="lg" type="submit">
            Complete account setup
          </Button>
        </form>

        <Link className="text-sm font-medium text-brand-700 transition hover:text-brand-800" to="/login">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}