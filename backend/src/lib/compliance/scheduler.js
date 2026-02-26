import { syncAllClientsCompliance } from "./service.js";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
let schedulerStarted = false;

export function startComplianceScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  syncAllClientsCompliance().catch((error) => {
    console.error("[compliance] initial sync failed:", error.message);
  });

  setInterval(() => {
    syncAllClientsCompliance().catch((error) => {
      console.error("[compliance] scheduled sync failed:", error.message);
    });
  }, SYNC_INTERVAL_MS).unref();
}
