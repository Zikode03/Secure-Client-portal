// Friendly guide: this module (AdminAccountantsPage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useEffect, useMemo, useState } from "react";
import { usePortal } from "../../app/portal";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { ManagedAccountant, Tone } from "../../types/portal";

interface BackendAdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profileJson?: string | null;
  securityJson?: string | null;
  securityStatus?: string | null;
}

interface BackendAssignmentRecord {
  id: string;
  clientId: string;
  clientName?: string | null;
  accountantUserId: string;
  accountantName?: string | null;
  isPrimary: boolean;
  createdAtUtc: string;
}

interface BackendReviewQueueRecord {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  status?: string | null;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

function normalizeAccountantStatus(status?: string | null): ManagedAccountant["status"] {
  switch ((status ?? "").trim().toLowerCase()) {
    case "invited":
      return "capacity_available";
    case "disabled":
    case "locked":
      return "busy";
    default:
      return "active";
  }
}

function mapLiveAccountants(
  users: BackendAdminUserRecord[],
  assignments: BackendAssignmentRecord[],
  reviewQueue: BackendReviewQueueRecord[],
): ManagedAccountant[] {
  return users
    .filter((user) => user.role.trim().toLowerCase() === "accountant")
    .map((user) => {
      const assignedClientCount = assignments.filter(
        (assignment) => assignment.accountantUserId === user.id,
      ).length;
      const openReviews = reviewQueue.filter((item) => {
        const status = (item.status ?? "").trim().toLowerCase();
        return item.assignedToUserId === user.id && status !== "approved" && status !== "rejected";
      }).length;

      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        title: "Accountant",
        assignedClientCount,
        openReviews,
        status:
          openReviews >= 8
            ? "busy"
            : assignedClientCount <= 2
              ? "capacity_available"
              : normalizeAccountantStatus(user.securityStatus),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

// Component flow: gather data first, then render a focused UI state.
export function AdminAccountantsPage() {
  const portal = usePortal();
  const backendMode = hasApiBaseUrl();
  const [liveAccountants, setLiveAccountants] = useState<ManagedAccountant[] | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      return;
    }

    let isMounted = true;

    async function loadLiveAccountants() {
      try {
        const [users, assignments, reviewQueue] = await Promise.all([
          apiGetJson<BackendAdminUserRecord[]>("/api/admin/users"),
          apiGetJson<BackendAssignmentRecord[]>("/api/assignments"),
          apiGetJson<BackendReviewQueueRecord[]>("/api/review-queue"),
        ]);

        if (!isMounted) {
          return;
        }

        setLiveAccountants(mapLiveAccountants(users, assignments, reviewQueue));
        setFeedbackNotice(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedbackNotice({
          tone: "warning",
          title: "Live accountant view unavailable",
          message:
            error instanceof ApiError
              ? error.message
              : "The accountant management page could not load the live backend data, so the seeded workspace view is still shown.",
        });
      }
    }

    void loadLiveAccountants();

    return () => {
      isMounted = false;
    };
  }, [backendMode]);

  const accountants = useMemo(
    () => (backendMode && liveAccountants ? liveAccountants : portal.managedAccountants),
    [backendMode, liveAccountants, portal.managedAccountants],
  );

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-6">
      <PageHeader
        description="Track accountant capacity, open review volume, and whether anyone needs rebalancing before month-end pressure rises."
        eyebrow="Admin accountants"
        title="Manage accountants"
      />

      {feedbackNotice ? (
        <FeedbackBanner
          message={feedbackNotice.message}
          onDismiss={() => setFeedbackNotice(null)}
          title={feedbackNotice.title}
          tone={feedbackNotice.tone}
        />
      ) : null}

      <SurfaceCard className="space-y-4">
        {accountants.map((accountant) => (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={accountant.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{accountant.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {accountant.title} / {accountant.email}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {accountant.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {accountant.assignedClientCount} assigned clients / {accountant.openReviews} open reviews
            </p>
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
