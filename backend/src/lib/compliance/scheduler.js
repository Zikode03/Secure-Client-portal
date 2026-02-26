import { runEscalationRules, runReminderRules, syncAllClientsCompliance } from "./service.js";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
let schedulerStarted = false;

export function startComplianceScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  syncAllClientsCompliance().catch((error) => {
    console.error("[compliance] initial sync failed:", error.message);
  });
  runEscalationRules().catch((error) => {
    console.error("[compliance] initial escalation run failed:", error.message);
  });
  runReminderRules().catch((error) => {
    console.error("[compliance] initial reminder run failed:", error.message);
  });

  setInterval(() => {
    Promise.all([
      syncAllClientsCompliance(),
      runEscalationRules(),
      runReminderRules(),
    ]).catch((error) => {
      console.error("[compliance] scheduled run failed:", error.message);
    });
  }, SYNC_INTERVAL_MS).unref();
}
