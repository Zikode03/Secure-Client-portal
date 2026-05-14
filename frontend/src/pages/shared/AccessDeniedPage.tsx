// Friendly guide: this module (AccessDeniedPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useNavigate } from "react-router-dom";
import { defaultPathForRole, useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Component flow: gather data first, then render a focused UI state.
export function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

// Render output: this is the visual state users interact with.
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <SurfaceCard className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">
          Access denied
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          You do not have permission to access this workspace.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your signed-in role can only access the routes and actions assigned to that workflow.
          Use your allowed dashboard to continue working.
        </p>
        {user ? (
          <p className="mt-3 text-sm font-medium text-slate-600">
            Signed in as: <span className="capitalize">{user.role}</span>
          </p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate(user ? defaultPathForRole(user.role) : "/login")}>
            Return to dashboard
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}