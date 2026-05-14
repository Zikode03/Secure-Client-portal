// Friendly guide: this module (FirmWorkflowWorkspacePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useState } from "react";
import { AccountantFollowUpsPage } from "../accountant/AccountantFollowUpsPage";
import { AccountantReviewPage } from "../accountant/AccountantReviewPage";

// Shared shape notes: these types keep UI and data contracts aligned.
type WorkflowTab = "review" | "requests";

interface FirmWorkflowWorkspacePageProps {
  defaultTab: WorkflowTab;
}

// Component flow: gather data first, then render a focused UI state.
export function FirmWorkflowWorkspacePage({ defaultTab }: FirmWorkflowWorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<WorkflowTab>(defaultTab);

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Workflow Workspace</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review documents and handle requests in one place without changing pages.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              className={
                activeTab === "review"
                  ? "rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm"
                  : "rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800"
              }
              onClick={() => setActiveTab("review")}
              type="button"
            >
              Review Queue
            </button>
            <button
              className={
                activeTab === "requests"
                  ? "rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm"
                  : "rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800"
              }
              onClick={() => setActiveTab("requests")}
              type="button"
            >
              Requests
            </button>
          </div>
        </div>
      </section>

      {activeTab === "review" ? <AccountantReviewPage /> : <AccountantFollowUpsPage />}
    </div>
  );
}