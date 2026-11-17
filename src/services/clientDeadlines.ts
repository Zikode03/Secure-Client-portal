import { apiGetJson } from "./apiClient";
import { formatDateLabel } from "../utils/formatters";

/** Use persisted due dates, never an assumed firm-wide day. */
export async function getClientDeadlineLabel(clientId: string): Promise<string> {
  const packs = await apiGetJson(`/api/monthly-packs?clientId=${encodeURIComponent(clientId)}`);
  const pack = [...packs].filter(item => !["closed", "complete"].includes(item.status.toLowerCase()))
    .sort((a, b) => b.year - a.year || b.month - a.month)[0];
  if (!pack) return "No open monthly pack";
  const slots = await apiGetJson(`/api/document-slots/${encodeURIComponent(pack.id)}`);
  const dates = slots.filter(item => item.isRequired && item.status !== "not_applicable" && item.dueDateUtc)
    .map(item => item.dueDateUtc!).filter(date => Number.isFinite(Date.parse(date))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return dates.length ? `Earliest required due date: ${formatDateLabel(dates[0])}` : "No required document due date configured";
}
