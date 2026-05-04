import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { AuthLayout } from "../../layouts/AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.includes("@")) {
      setError("Use the email tied to the client or firm account.");
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage(
      "Reset instructions have been prepared for this frontend workspace. Backend integration can wire this form to the real identity service later.",
    );
  }

  return (
    <AuthLayout
      badge="Password Recovery"
      description="Keep access secure without breaking the workflow. Reset requests should be just as clear and calm as the rest of the product."
      title="Recover portal access"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">Forgot your password?</h2>
          <p className="text-sm leading-6 text-slate-500">
            Enter the email used for your portal access and we will prepare a reset flow.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            label="Email address"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@firm.com"
            type="email"
            value={email}
          />

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <Button fullWidth size="lg" type="submit">
            Send reset instructions
          </Button>
        </form>

        <Link className="text-sm font-medium text-brand-700 transition hover:text-brand-800" to="/login">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
