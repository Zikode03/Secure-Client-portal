import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { formatRequestStatus } from "../../utils/formatters";

type RequestState =
  | "open"
  | "awaiting_accountant"
  | "awaiting_client"
  | "client_replied"
  | "resolved"
  | "closed";

interface TransitionRule {
  from: RequestState;
  to: RequestState;
  trigger: string;
  actor: string;
  slaHours: number;
  escalationAfterHours: number;
  reminderCadenceHours: number;
}

const transitionRules: TransitionRule[] = [
  {
    from: "awaiting_client",
    to: "client_replied",
    trigger: "Client responds or uploads the requested correction",
    actor: "Client",
    slaHours: 48,
    escalationAfterHours: 72,
    reminderCadenceHours: 24,
  },
  {
    from: "client_replied",
    to: "awaiting_accountant",
    trigger: "Response is returned to the accountant queue",
    actor: "System",
    slaHours: 24,
    escalationAfterHours: 48,
    reminderCadenceHours: 24,
  },
  {
    from: "awaiting_accountant",
    to: "open",
    trigger: "Accountant reviews and responds",
    actor: "Accountant",
    slaHours: 24,
    escalationAfterHours: 48,
    reminderCadenceHours: 24,
  },
  {
    from: "open",
    to: "resolved",
    trigger: "Requested work is complete and confirmed",
    actor: "Client or Accountant",
    slaHours: 0,
    escalationAfterHours: 0,
    reminderCadenceHours: 0,
  },
  {
    from: "resolved",
    to: "closed",
    trigger: "Confirmation window ends",
    actor: "System",
    slaHours: 24,
    escalationAfterHours: 0,
    reminderCadenceHours: 0,
  },
];

function statePill(state: RequestState) {
  const base = "rounded-full px-2.5 py-1 text-xs font-semibold";
  switch (state) {
    case "awaiting_client":
      return `${base} bg-amber-50 text-amber-700`;
    case "awaiting_accountant":
      return `${base} bg-indigo-50 text-indigo-700`;
    case "client_replied":
      return `${base} bg-sky-50 text-sky-700`;
    case "open":
      return `${base} bg-slate-100 text-slate-700`;
    case "resolved":
      return `${base} bg-emerald-50 text-emerald-700`;
    default:
      return `${base} bg-slate-200 text-slate-700`;
  }
}

export function AdminRequestStateMachinePage() {
  const navigate = useNavigate();
  const states = useMemo<RequestState[]>(
    () => ["awaiting_client", "client_replied", "awaiting_accountant", "open", "resolved", "closed"],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => navigate("/firm/admin/system-settings")}>Edit workflow rules</Button>
        }
        description="Reference the request lifecycle and SLA expectations. Editable reminder, deadline and escalation rules are managed in System Settings."
        eyebrow="Administration"
        title="Request SLA rules"
      />

      <SurfaceCard className="space-y-4">
        <div>
          <h2 className="portal-section-title text-slate-950">Request lifecycle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Client and Accountant screens use the same plain-language states shown here. Internal API values remain unchanged.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {states.map((state, index) => (
            <div className="flex items-center gap-2" key={state}>
              <span className={statePill(state)}>{formatRequestStatus(state)}</span>
              {index < states.length - 1 ? <span className="text-slate-300">→</span> : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="portal-section-title text-slate-950">Transition reference</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review the expected actor, response window, escalation threshold and reminder cadence for each transition.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">From</th>
                <th className="px-5 py-3">To</th>
                <th className="px-5 py-3">Trigger</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">SLA</th>
                <th className="px-5 py-3">Escalate</th>
                <th className="px-5 py-3">Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {transitionRules.map((rule) => (
                <tr key={`${rule.from}-${rule.to}`}>
                  <td className="px-5 py-4"><span className={statePill(rule.from)}>{formatRequestStatus(rule.from)}</span></td>
                  <td className="px-5 py-4"><span className={statePill(rule.to)}>{formatRequestStatus(rule.to)}</span></td>
                  <td className="px-5 py-4 text-slate-700">{rule.trigger}</td>
                  <td className="px-5 py-4 text-slate-600">{rule.actor}</td>
                  <td className="px-5 py-4 text-slate-600">{rule.slaHours ? `${rule.slaHours}h` : "N/A"}</td>
                  <td className="px-5 py-4 text-slate-600">{rule.escalationAfterHours ? `${rule.escalationAfterHours}h` : "N/A"}</td>
                  <td className="px-5 py-4 text-slate-600">{rule.reminderCadenceHours ? `Every ${rule.reminderCadenceHours}h` : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
