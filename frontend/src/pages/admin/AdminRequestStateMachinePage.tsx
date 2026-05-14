// Friendly guide: this module (AdminRequestStateMachinePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useMemo } from "react";
import { SurfaceCard } from "../../components/ui/SurfaceCard";

// Shared shape notes: these types keep UI and data contracts aligned.
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
    trigger: "Client posts a comment",
    actor: "Client",
    slaHours: 48,
    escalationAfterHours: 72,
    reminderCadenceHours: 24,
  },
  {
    from: "client_replied",
    to: "awaiting_accountant",
    trigger: "System marks reply ready for accountant",
    actor: "System",
    slaHours: 24,
    escalationAfterHours: 48,
    reminderCadenceHours: 24,
  },
  {
    from: "awaiting_accountant",
    to: "open",
    trigger: "Accountant responds",
    actor: "Accountant",
    slaHours: 24,
    escalationAfterHours: 48,
    reminderCadenceHours: 24,
  },
  {
    from: "open",
    to: "resolved",
    trigger: "Task complete and confirmed",
    actor: "Client or Accountant",
    slaHours: 0,
    escalationAfterHours: 0,
    reminderCadenceHours: 0,
  },
  {
    from: "resolved",
    to: "closed",
    trigger: "Auto-close after confirmation window",
    actor: "System",
    slaHours: 24,
    escalationAfterHours: 0,
    reminderCadenceHours: 0,
  },
];

// Component flow: gather data first, then render a focused UI state.
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
  const states = useMemo<RequestState[]>(
    () => ["awaiting_client", "client_replied", "awaiting_accountant", "open", "resolved", "closed"],
    [],
  );

// Render output: this is the visual state users interact with.
  return (
    <div className="space-y-4">
      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h1 className="text-xl font-semibold text-slate-950">Request State Machine + SLA Rules</h1>
        <p className="mt-1 text-sm text-slate-500">
          Internal policy view for allowed status transitions, escalation timers, and reminder cadence.
        </p>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Lifecycle</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {states.map((state, index) => (
            <div className="flex items-center gap-2" key={state}>
              <span className={statePill(state)}>{state.replace(/_/g, " ")}</span>
              {index < states.length - 1 ? <span className="text-slate-300">?</span> : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Allowed Transitions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">SLA</th>
                <th className="px-3 py-2">Escalate</th>
                <th className="px-3 py-2">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {transitionRules.map((rule) => (
                <tr className="border-t border-slate-100" key={`${rule.from}-${rule.to}`}>
                  <td className="px-3 py-2">{rule.from.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{rule.to.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{rule.trigger}</td>
                  <td className="px-3 py-2">{rule.actor}</td>
                  <td className="px-3 py-2">{rule.slaHours ? `${rule.slaHours}h` : "N/A"}</td>
                  <td className="px-3 py-2">{rule.escalationAfterHours ? `${rule.escalationAfterHours}h` : "N/A"}</td>
                  <td className="px-3 py-2">{rule.reminderCadenceHours ? `Every ${rule.reminderCadenceHours}h` : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}