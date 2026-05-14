// Friendly guide: this module (NotFoundPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Component flow: gather data first, then render a focused UI state.
export function NotFoundPage() {
  const navigate = useNavigate();

// Render output: this is the visual state users interact with.
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <SurfaceCard className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
          Page not found
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          That page is not part of the current workflow.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Use the main portal navigation to jump back into the structured document and compliance flow.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate("/login")}>Return to sign in</Button>
        </div>
      </SurfaceCard>
    </div>
  );
}