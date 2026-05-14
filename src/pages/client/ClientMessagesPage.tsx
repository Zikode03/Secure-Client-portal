// Friendly guide: this module (ClientMessagesPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Component flow: gather data first, then render a focused UI state.
export function ClientMessagesPage() {
  const navigate = useNavigate();

// Render output: this is the visual state users interact with.
  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div className="space-y-1.5">
        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
          Client comments
        </div>
        <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
          Comments now live inside requests and documents
        </h1>
        <p className="max-w-2xl text-[0.94rem] leading-7 text-slate-500">
          Messages are no longer a standalone workspace. Open the related request or document so
          the conversation stays attached to the correct workflow record.
        </p>
      </div>

      <SurfaceCard className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
        <EmptyState
          description="Messages are now attached to requests and documents. Open a request or document to view its comments."
          title="No standalone message centre"
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => navigate("/client/requests")} variant="primary">
            Open requests
          </Button>
          <Button onClick={() => navigate("/client/documents")} variant="secondary">
            Open documents
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}