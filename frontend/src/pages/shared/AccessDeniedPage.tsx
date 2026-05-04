import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { Button } from "../../components/ui/Button";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <SurfaceCard className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">
          Access denied
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          You do not have permission to open this workspace.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Your signed-in role can only access the routes assigned to that workflow. Use the role
          dashboard to continue working.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate(user ? `/${user.role}/dashboard` : "/login")}>
            Return to allowed workspace
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
