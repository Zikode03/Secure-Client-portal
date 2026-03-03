import { config } from "../config.js";
import { getDb } from "../db.js";
import { store, utils } from "../store.js";
import { canAccessClient } from "../auth.js";
import { addAudit, addNotification } from "../audit.js";
import { pullSarsState } from "./connector-sars.js";
import { pullCipcState } from "./connector-cipc.js";
import { pullCsdState } from "./connector-csd.js";
import { deriveSnapshot, buildEvents } from "./rules.js";

const db = config.databaseUrl ? getDb() : null;
const OPEN_ALERTS = ["open", "acknowledged", "in_progress", "escalated"];
const REMINDER_DAYS = [30, 14, 7, 3, 1];

const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const nowIso = () => new Date().toISOString();
const hasClientAccess = (u, id) => {
  if (!canAccessClient(u, id)) {
    const e = new Error("Access denied");
    e.status = 403;
    throw e;
  }
};
const normStatus = (s) => (["overdue", "non_compliant"].includes(String(s || "").toLowerCase()) ? "overdue" : String(s || "").toLowerCase() === "due_soon" ? "due_soon" : "compliant");
const weight = (s) => (normStatus(s) === "overdue" ? 1 : normStatus(s) === "due_soon" ? 0.4 : 0);
const sev = (s) => (String(s || "").toLowerCase() === "high" ? 3 : String(s || "").toLowerCase() === "medium" ? 2 : 1);
const j = (v, f = {}) => (v && typeof v === "object" ? v : f);
const defaultPref = { channels: { inApp: true, email: true, sms: false }, reminderDays: REMINDER_DAYS };
const hasComplianceDbModels = !db || (
  db.complianceAccount &&
  db.complianceObligation &&
  db.complianceStatusSnapshot &&
  db.complianceEvent &&
  db.complianceAlert
);

function ensureComplianceDbReady() {
  if (hasComplianceDbModels) return;
  throw new Error("Compliance DB models are unavailable. Run `npx prisma generate` and migrate.");
}

async function getClient(clientId) {
  return db ? db.client.findUnique({ where: { id: clientId } }) : store.clients.find((x) => x.id === clientId) || null;
}
async function listClients() {
  return db ? db.client.findMany() : store.clients;
}
async function usersByClient(clientId) {
  if (db) {
    const users = await db.user.findMany();
    return users.filter((user) => Array.isArray(user.clientIds) && user.clientIds.includes(clientId));
  }
  return store.users.filter((user) => Array.isArray(user.clientIds) && user.clientIds.includes(clientId));
}
async function listUsers() {
  return db ? db.user.findMany() : store.users;
}
function prefForUser(user) {
  const security = j(user?.security, {});
  const raw = j(security.notificationPreferences, {});
  const channels = j(raw.channels, {});
  const reminderDays = Array.isArray(raw.reminderDays)
    ? raw.reminderDays.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)
    : defaultPref.reminderDays;
  return {
    channels: {
      inApp: channels.inApp !== false,
      email: channels.email !== false,
      sms: channels.sms === true,
    },
    reminderDays: reminderDays.length ? reminderDays : defaultPref.reminderDays,
  };
}
async function obligationsByClient(clientId) {
  return db
    ? db.complianceObligation.findMany({ where: { clientId }, orderBy: [{ source: "asc" }, { obligationType: "asc" }] })
    : store.complianceObligations.filter((x) => x.clientId === clientId);
}
async function latestSnapshot(clientId) {
  return db
    ? db.complianceStatusSnapshot.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } })
    : store.complianceSnapshots.filter((x) => x.clientId === clientId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;
}
async function eventsByClient(clientId, f = {}) {
  if (db) {
    const where = { clientId };
    if (f.source) where.source = f.source;
    if (f.obligationType) where.obligationRef = f.obligationType;
    if (f.eventType) where.eventType = f.eventType;
    return db.complianceEvent.findMany({ where, orderBy: { occurredAt: "desc" }, take: Math.min(500, Number(f.limit) || 200) });
  }
  return store.complianceEvents
    .filter((x) => x.clientId === clientId && (!f.source || x.source === f.source) && (!f.obligationType || x.obligationRef === f.obligationType) && (!f.eventType || x.eventType === f.eventType))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, Math.min(500, Number(f.limit) || 200));
}
async function alertsByClient(clientId, includeResolved = true) {
  if (db) {
    return db.complianceAlert.findMany({
      where: { clientId, ...(includeResolved ? {} : { status: { in: OPEN_ALERTS } }) },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }
  return store.complianceAlerts
    .filter((x) => x.clientId === clientId && (includeResolved || OPEN_ALERTS.includes(String(x.status || "").toLowerCase())))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function upsertAccounts(clientId, sars, cipc, csd) {
  const rows = [
    { source: "SARS", reference: `SARS-${clientId}`, status: sars.tcsStatus === "red" ? "attention" : "active", lastError: null, credentialsMeta: { tcsStatus: sars.tcsStatus, retryCount: 0, nextRetryAt: null, syncLatencyMs: 100 }, lastSyncedAt: toDate(sars.fetchedAt) || new Date() },
    { source: "CIPC", reference: `CIPC-${clientId}`, status: cipc.status === "red" ? "attention" : "active", lastError: null, credentialsMeta: { status: cipc.status, retryCount: 0, nextRetryAt: null, syncLatencyMs: 100 }, lastSyncedAt: toDate(cipc.fetchedAt) || new Date() },
    { source: "CSD", reference: `CSD-${clientId}`, status: csd.status === "red" ? "attention" : "active", lastError: null, credentialsMeta: { status: csd.status, retryCount: 0, nextRetryAt: null, syncLatencyMs: 100 }, lastSyncedAt: toDate(csd.fetchedAt) || new Date() },
  ];
  if (db) {
    for (const row of rows) {
      const ex = await db.complianceAccount.findFirst({ where: { clientId, source: row.source } });
      if (ex) await db.complianceAccount.update({ where: { id: ex.id }, data: row });
      else await db.complianceAccount.create({ data: { id: utils.makeId("ca"), clientId, ...row } });
    }
  } else {
    for (const row of rows) {
      const ex = store.complianceAccounts.find((x) => x.clientId === clientId && x.source === row.source);
      if (ex) Object.assign(ex, row, { updatedAt: nowIso() });
      else store.complianceAccounts.push({ id: utils.makeId("ca"), clientId, ...row, createdAt: nowIso(), updatedAt: nowIso() });
    }
  }
}

function statusFromObligations(obligations, source) {
  const subset = obligations.filter((item) => String(item.source || "").toUpperCase() === source.toUpperCase());
  if (!subset.length) return "unknown";
  if (subset.some((item) => normStatus(item.status) === "overdue")) return "red";
  if (subset.some((item) => normStatus(item.status) === "due_soon")) return "amber";
  return "green";
}

async function replaceObligations(clientId, obligations) {
  if (db) {
    await db.complianceObligation.deleteMany({ where: { clientId } });
    if (obligations.length) await db.complianceObligation.createMany({ data: obligations });
  } else {
    store.complianceObligations = store.complianceObligations.filter((x) => x.clientId !== clientId);
    store.complianceObligations.push(...obligations.map((x) => ({ ...x, createdAt: nowIso(), updatedAt: nowIso() })));
  }
}
async function addSnapshot(clientId, snap) {
  const row = { id: utils.makeId("css"), clientId, overallStatus: snap.overallStatus, score: snap.score, sarsStatus: snap.sarsStatus, cipcStatus: snap.cipcStatus, compliantCount: snap.compliantCount, nonCompliantCount: snap.nonCompliantCount, overdueCount: snap.overdueCount, dueSoonCount: snap.dueSoonCount, sourceTimestamp: new Date() };
  if (db) await db.complianceStatusSnapshot.create({ data: row });
  else store.complianceSnapshots.push({ ...row, sourceTimestamp: row.sourceTimestamp.toISOString(), createdAt: nowIso() });
}
async function addEventsAndAlerts(client, events) {
  for (const ev of events) {
    const evRow = { id: utils.makeId("ce"), clientId: client.id, source: ev.source, eventType: ev.eventType, severity: ev.severity, title: ev.title, description: ev.description, obligationRef: ev.obligationRef || null, payload: ev.payload || {}, occurredAt: toDate(ev.occurredAt) || new Date() };
    if (db) await db.complianceEvent.create({ data: evRow });
    else store.complianceEvents.unshift({ ...evRow, occurredAt: evRow.occurredAt.toISOString(), createdAt: nowIso() });

    const dup = db
      ? await db.complianceAlert.findFirst({ where: { clientId: client.id, source: ev.source, obligationType: ev.obligationRef || null, title: ev.title, status: { in: OPEN_ALERTS } } })
      : store.complianceAlerts.find((x) => x.clientId === client.id && x.source === ev.source && x.obligationType === (ev.obligationRef || null) && x.title === ev.title && OPEN_ALERTS.includes(String(x.status || "").toLowerCase()));
    if (dup) continue;
    const a = { id: utils.makeId("cal"), clientId: client.id, severity: ev.severity, status: "open", title: ev.title, message: ev.description, source: ev.source, obligationType: ev.obligationRef || null, assignedUserId: client.assignedAccountantId || null };
    if (db) await db.complianceAlert.create({ data: a });
    else store.complianceAlerts.unshift({ ...a, createdAt: nowIso(), updatedAt: nowIso(), resolvedAt: null, readAt: null });
  }
}

async function addStatusRegressionAlert(client, prevStatus, nextStatus) {
  const from = String(prevStatus || "").toLowerCase();
  const to = String(nextStatus || "").toLowerCase();
  if (!(from === "green" && ["amber", "red"].includes(to))) return;
  const title = "Compliance status changed to attention";
  const duplicate = db
    ? await db.complianceAlert.findFirst({
      where: { clientId: client.id, title, status: { in: OPEN_ALERTS } },
    })
    : store.complianceAlerts.find((x) => x.clientId === client.id && x.title === title && OPEN_ALERTS.includes(String(x.status || "").toLowerCase()));
  if (duplicate) return;

  const message = `${client.name} moved from compliant (green) to ${to}. Immediate review is required.`;
  const alert = {
    id: utils.makeId("cal"),
    clientId: client.id,
    severity: to === "red" ? "high" : "medium",
    status: "open",
    title,
    message,
    source: "SYSTEM",
    obligationType: null,
    assignedUserId: client.assignedAccountantId || null,
  };
  const event = {
    id: utils.makeId("ce"),
    clientId: client.id,
    source: "SYSTEM",
    eventType: "status.regression",
    severity: alert.severity,
    title,
    description: message,
    obligationRef: null,
    payload: { from, to },
    occurredAt: new Date(),
  };

  if (db) {
    await db.complianceEvent.create({ data: event });
    await db.complianceAlert.create({ data: alert });
  } else {
    store.complianceEvents.unshift({ ...event, occurredAt: event.occurredAt.toISOString(), createdAt: nowIso() });
    store.complianceAlerts.unshift({ ...alert, createdAt: nowIso(), updatedAt: nowIso(), resolvedAt: null, readAt: null });
  }
}

function scoreV2(obligations) {
  const t = obligations.length || 1;
  const risk = Math.round((obligations.reduce((s, o) => s + weight(o.status), 0) / t) * 100);
  return { complianceScore: Math.max(0, 100 - risk), riskPercent: risk };
}

async function snapshotsWindow(clientId, days) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return db
    ? db.complianceStatusSnapshot.findMany({ where: { clientId, createdAt: { gte: from } }, orderBy: { createdAt: "asc" } })
    : store.complianceSnapshots.filter((x) => x.clientId === clientId && new Date(x.createdAt) >= from).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}
function trend(snaps, windows = [7, 30, 90]) {
  return windows.map((d) => {
    const from = new Date();
    from.setDate(from.getDate() - d);
    const p = snaps.filter((x) => new Date(x.createdAt || x.sourceTimestamp) >= from);
    const s = Number((p[0] || {}).score || 0);
    const e = Number((p[p.length - 1] || {}).score || 0);
    return { windowDays: d, startScore: s, endScore: e, delta: e - s, points: p.map((x) => ({ at: x.createdAt || x.sourceTimestamp, score: x.score, status: x.overallStatus })) };
  });
}

export async function syncClientCompliance(clientId, actorUserId = null) {
  ensureComplianceDbReady();
  const client = await getClient(clientId);
  if (!client) throw new Error("Client not found");
  const previousSnapshot = await latestSnapshot(clientId);
  const [sars, cipc, csd] = await Promise.all([pullSarsState(client), pullCipcState(client), pullCsdState(client)]);
  const snap = deriveSnapshot({ sarsState: sars, cipcState: cipc, csdState: csd });
  const obligations = snap.obligations.map((o) => ({ id: utils.makeId("obl"), clientId, source: String(o.source || "Unknown"), obligationType: String(o.obligationType || "Obligation"), periodLabel: o.periodLabel ? String(o.periodLabel) : null, dueDate: toDate(o.dueDate), submittedAt: toDate(o.submittedAt), paidAt: toDate(o.paidAt), status: String(o.status || "compliant"), amountDue: o.amountDue == null ? null : Number(o.amountDue), metadata: o.metadata || {} }));
  snap.score = scoreV2(obligations).complianceScore;
  await upsertAccounts(clientId, sars, cipc, csd);
  await replaceObligations(clientId, obligations);
  await addSnapshot(clientId, snap);
  await addStatusRegressionAlert(client, previousSnapshot?.overallStatus, snap.overallStatus);
  await addEventsAndAlerts(client, buildEvents({ client, obligations }));
  if (actorUserId) addAudit({ actorUserId, action: "compliance.sync", entityType: "client", entityId: clientId, metadata: { overallStatus: snap.overallStatus, score: snap.score } });
  return { clientId, snapshot: snap, obligations };
}

export async function syncAllClientsCompliance(actorUserId = null) {
  ensureComplianceDbReady();
  const clients = await listClients();
  const out = [];
  for (const c of clients) {
    try { const r = await syncClientCompliance(c.id, actorUserId); out.push({ clientId: c.id, ok: true, snapshot: r.snapshot }); }
    catch (e) { out.push({ clientId: c.id, ok: false, error: e.message }); }
  }
  return out;
}

export async function getClientComplianceOverview(reqUser, clientId) {
  hasClientAccess(reqUser, clientId);
  let snap = await latestSnapshot(clientId);
  if (!snap) snap = (await syncClientCompliance(clientId)).snapshot;
  const obligations = await obligationsByClient(clientId);
  const alerts = await alertsByClient(clientId, true);
  const events = await eventsByClient(clientId, { limit: 50 });
  const risk = scoreV2(obligations);
  const csdStatus = statusFromObligations(obligations, "CSD");
  return { clientId, status: snap.overallStatus, score: snap.score, scoreV2: risk.complianceScore, riskPercentV2: risk.riskPercent, sarsStatus: snap.sarsStatus, cipcStatus: snap.cipcStatus, csdStatus, counts: { compliant: snap.compliantCount, nonCompliant: snap.nonCompliantCount, overdue: snap.overdueCount, dueSoon: snap.dueSoonCount }, obligations, alerts, events, trends: trend(await snapshotsWindow(clientId, 90)), lastUpdatedAt: snap.createdAt || snap.sourceTimestamp };
}

export async function getFrameworkComplianceItems(reqUser) {
  const clientId = Array.isArray(reqUser.clientIds) && reqUser.clientIds.length ? reqUser.clientIds[0] : "";
  if (!clientId) return [];
  const o = await getClientComplianceOverview(reqUser, clientId);
  const mk = (src) => { const l = o.obligations.filter((x) => x.source === src); const c = l.filter((x) => normStatus(x.status) === "compliant").length; return { name: src, requiredControls: l.length, completedControls: c, percent: l.length ? Math.round((c / l.length) * 100) : 0 }; };
  return [mk("SARS"), mk("CIPC"), mk("CSD"), { name: "Overall", requiredControls: o.obligations.length, completedControls: o.obligations.filter((x) => normStatus(x.status) === "compliant").length, percent: o.scoreV2 }];
}

export async function getClientTimeline(reqUser, clientId, filters = {}) {
  hasClientAccess(reqUser, clientId);
  return eventsByClient(clientId, filters);
}

export async function getClientActionCenter(reqUser, clientId) {
  hasClientAccess(reqUser, clientId);
  const obligations = await obligationsByClient(clientId);
  const alerts = await alertsByClient(clientId, false);
  const acts = obligations.filter((o) => ["overdue", "due_soon"].includes(normStatus(o.status))).map((o) => ({ type: "obligation", source: o.source, title: `${o.obligationType} ${normStatus(o.status) === "overdue" ? "overdue" : "due soon"}`, urgency: normStatus(o.status) === "overdue" ? 1000 : 500, dueDate: o.dueDate, directLink: `/Client/Clientpages/documents.html?obligationId=${encodeURIComponent(o.id)}&obligation=${encodeURIComponent(o.obligationType)}&source=${encodeURIComponent(o.source)}`, obligationId: o.id }))
    .concat(alerts.map((a) => ({ type: "alert", source: a.source, title: a.title, urgency: sev(a.severity) * 200 + (a.status === "escalated" ? 150 : 0), directLink: `/Client/Clientpages/notifications.html?alertId=${encodeURIComponent(a.id)}`, alertId: a.id })))
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3);
  return { items: acts };
}

export async function getFirmComplianceOverview(reqUser) {
  if (reqUser.role !== "accountant") { const e = new Error("Insufficient role"); e.status = 403; throw e; }
  const ids = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];
  const clients = db ? await getDb().client.findMany({ where: { id: { in: ids } } }) : store.clients.filter((c) => ids.includes(c.id));
  const items = [];
  for (const c of clients) {
    const o = await getClientComplianceOverview(reqUser, c.id);
    items.push({ clientId: c.id, clientName: c.name, status: o.status, score: o.score, scoreV2: o.scoreV2, riskPercentV2: o.riskPercentV2, overdueCount: o.counts.overdue, dueSoonCount: o.counts.dueSoon, nonCompliantCount: o.counts.nonCompliant, lastUpdatedAt: o.lastUpdatedAt, sarsStatus: o.sarsStatus, cipcStatus: o.cipcStatus, csdStatus: o.csdStatus, serviceLine: c.entityType || "General", industry: j(c.profile || {}, {}).industry || "General" });
  }
  return { totalClients: items.length, green: items.filter((x) => x.status === "green").length, amber: items.filter((x) => x.status === "amber").length, red: items.filter((x) => x.status === "red").length, items };
}

export async function getCompliancePortfolio(reqUser, filters = {}) {
  if (reqUser.role !== "accountant") {
    const e = new Error("Insufficient role");
    e.status = 403;
    throw e;
  }

  const sourceFilter = String(filters.source || "").toUpperCase();
  const ownerFilter = String(filters.owner || "").trim().toLowerCase();
  const statusFilter = String(filters.status || "").toLowerCase();
  const overdueOnly = String(filters.overdueOnly || "").toLowerCase() === "true";
  const sortBy = String(filters.sortBy || "risk").toLowerCase();
  const sortDir = String(filters.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
  const ids = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];
  const [clients, users] = await Promise.all([
    db ? getDb().client.findMany({ where: { id: { in: ids } } }) : Promise.resolve(store.clients.filter((c) => ids.includes(c.id))),
    listUsers(),
  ]);
  const userNameById = new Map(users.map((u) => [u.id, u.fullName || u.email || u.id]));
  const accountItems = db
    ? await db.complianceAccount.findMany({ where: { clientId: { in: ids } } })
    : store.complianceAccounts.filter((item) => ids.includes(item.clientId));

  const records = [];
  for (const client of clients) {
    const overview = await getClientComplianceOverview(reqUser, client.id);
    const obligations = Array.isArray(overview.obligations) ? overview.obligations : [];
    const accounts = accountItems.filter((a) => a.clientId === client.id);
    const openAlerts = (overview.alerts || []).filter((a) => OPEN_ALERTS.includes(String(a.status || "").toLowerCase()));
    const overdueCount = Number(overview.counts?.overdue || 0);
    const dueSoonCount = Number(overview.counts?.dueSoon || 0);
    const syncFailures = accounts.filter((a) => Boolean(a.lastError)).length;
    const nextDueAt = obligations
      .map((o) => toDate(o.dueDate))
      .filter((d) => d && d.getTime() >= Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;
    const lastSyncedAt = accounts
      .map((a) => toDate(a.lastSyncedAt))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    const ownerUserId = openAlerts.find((a) => a.assignedUserId)?.assignedUserId || client.assignedAccountantId || reqUser.id;
    const ownerName = userNameById.get(ownerUserId) || "Unassigned";
    const sourceStatuses = {
      SARS: String(overview.sarsStatus || "unknown").toLowerCase(),
      CIPC: String(overview.cipcStatus || "unknown").toLowerCase(),
      CSD: String(overview.csdStatus || "unknown").toLowerCase(),
    };
    const riskScore = overdueCount > 0 ? 100 : dueSoonCount > 0 || syncFailures > 0 ? 60 : 20;
    const normalizedStatus = overdueCount > 0 ? "red" : dueSoonCount > 0 || syncFailures > 0 ? "amber" : "green";
    const latestAlert = openAlerts[0] || null;

    records.push({
      clientId: client.id,
      clientName: client.name,
      overallStatus: normalizedStatus,
      riskScore,
      sarsStatus: sourceStatuses.SARS,
      cipcStatus: sourceStatuses.CIPC,
      csdStatus: sourceStatuses.CSD,
      overdueCount,
      dueSoonCount,
      nonCompliantCount: Number(overview.counts?.nonCompliant || 0),
      nextDueDate: nextDueAt ? nextDueAt.toISOString() : null,
      lastSync: lastSyncedAt ? lastSyncedAt.toISOString() : null,
      ownerUserId,
      ownerName,
      syncFailures,
      actionAlertId: latestAlert?.id || null,
      actionObligationId: obligations.find((o) => ["overdue", "due_soon"].includes(normStatus(o.status)))?.id || null,
      actionObligationType: obligations.find((o) => ["overdue", "due_soon"].includes(normStatus(o.status)))?.obligationType || null,
    });
  }

  let filtered = records.filter((item) => {
    if (statusFilter && item.overallStatus !== statusFilter) return false;
    if (overdueOnly && item.overdueCount < 1) return false;
    if (ownerFilter && !item.ownerName.toLowerCase().includes(ownerFilter)) return false;
    if (sourceFilter) {
      const value = item[`${sourceFilter.toLowerCase()}Status`];
      if (!value || value === "unknown" || value === "green") return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.overallStatus !== b.overallStatus) {
      const order = { red: 3, amber: 2, green: 1 };
      return (order[b.overallStatus] - order[a.overallStatus]);
    }
    if (sortBy === "next_due") {
      const av = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bv = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return (av - bv) * sortDir;
    }
    return (a.riskScore - b.riskScore) * sortDir;
  });

  return {
    kpis: {
      compliantClients: filtered.filter((x) => x.overallStatus === "green").length,
      atRiskClients: filtered.filter((x) => x.overallStatus === "amber").length,
      nonCompliantClients: filtered.filter((x) => x.overallStatus === "red").length,
      overdueObligations: filtered.reduce((sum, row) => sum + row.overdueCount, 0),
      syncFailures: filtered.reduce((sum, row) => sum + row.syncFailures, 0),
    },
    items: filtered,
  };
}

export async function getFirmHeatmap(reqUser) {
  const firm = await getFirmComplianceOverview(reqUser);
  const m = new Map();
  for (const i of firm.items) {
    const d = toDate(i.lastUpdatedAt) || new Date();
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!m.has(month)) m.set(month, {});
    const s = i.serviceLine || "General";
    if (!m.get(month)[s]) m.get(month)[s] = { green: 0, amber: 0, red: 0 };
    m.get(month)[s][i.status] = (m.get(month)[s][i.status] || 0) + 1;
  }
  return { items: Array.from(m.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1)).map(([month, services]) => ({ month, services })) };
}

export async function listFirmAlerts(reqUser, includeResolved = false) {
  if (reqUser.role !== "accountant") { const e = new Error("Insufficient role"); e.status = 403; throw e; }
  const ids = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];
  if (db) return db.complianceAlert.findMany({ where: { clientId: { in: ids }, ...(includeResolved ? {} : { status: { in: OPEN_ALERTS } }) }, orderBy: { createdAt: "desc" }, take: 300 });
  return store.complianceAlerts.filter((x) => ids.includes(x.clientId) && (includeResolved || OPEN_ALERTS.includes(String(x.status || "").toLowerCase()))).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 300);
}

export async function markAlertAsRead(reqUser, alertId) {
  const a = db ? await db.complianceAlert.findUnique({ where: { id: alertId } }) : store.complianceAlerts.find((x) => x.id === alertId);
  if (!a) { const e = new Error("Alert not found"); e.status = 404; throw e; }
  hasClientAccess(reqUser, a.clientId);
  if (db) return db.complianceAlert.update({ where: { id: alertId }, data: { readAt: new Date() } });
  a.readAt = nowIso(); a.updatedAt = nowIso(); return a;
}

export async function updateAlertLifecycle(reqUser, alertId, { status, ownerUserId, completionNotes }) {
  const valid = ["open", "acknowledged", "in_progress", "resolved", "dismissed", "escalated"];
  const s = String(status || "").toLowerCase();
  if (!valid.includes(s)) throw new Error("Invalid lifecycle status");
  const a = db ? await db.complianceAlert.findUnique({ where: { id: alertId } }) : store.complianceAlerts.find((x) => x.id === alertId);
  if (!a) { const e = new Error("Alert not found"); e.status = 404; throw e; }
  hasClientAccess(reqUser, a.clientId);
  const msg = completionNotes ? `${a.message}\n\nNote: ${completionNotes}` : a.message;
  if (db) {
    const u = await db.complianceAlert.update({ where: { id: alertId }, data: { status: s, assignedUserId: ownerUserId || a.assignedUserId, resolvedAt: s === "resolved" ? new Date() : null, readAt: s === "acknowledged" ? new Date() : a.readAt, message: msg, updatedAt: new Date() } });
    addAudit({ actorUserId: reqUser.id, action: "compliance.alert.lifecycle.update", entityType: "compliance_alert", entityId: alertId, metadata: { status: s, ownerUserId, completionNotes } });
    return u;
  }
  a.status = s; if (ownerUserId) a.assignedUserId = ownerUserId; if (s === "resolved") a.resolvedAt = nowIso(); if (s === "acknowledged") a.readAt = nowIso(); a.message = msg; a.updatedAt = nowIso();
  addAudit({ actorUserId: reqUser.id, action: "compliance.alert.lifecycle.update", entityType: "compliance_alert", entityId: alertId, metadata: { status: s, ownerUserId, completionNotes } });
  return a;
}

export async function assignObligation(reqUser, obligationId, { ownerUserId, dueDate, completionNotes }) {
  const o = db ? await db.complianceObligation.findUnique({ where: { id: obligationId } }) : store.complianceObligations.find((x) => x.id === obligationId);
  if (!o) { const e = new Error("Obligation not found"); e.status = 404; throw e; }
  hasClientAccess(reqUser, o.clientId);
  const m = j(o.metadata, {});
  m.assignment = { ownerUserId: ownerUserId || j(m.assignment, {}).ownerUserId || null, dueDate: dueDate || j(m.assignment, {}).dueDate || null, completionNotes: completionNotes || j(m.assignment, {}).completionNotes || "", updatedAt: nowIso() };
  if (db) {
    const u = await db.complianceObligation.update({ where: { id: obligationId }, data: { metadata: m, updatedAt: new Date() } });
    addAudit({ actorUserId: reqUser.id, action: "compliance.obligation.assign", entityType: "compliance_obligation", entityId: obligationId, metadata: m.assignment });
    return u;
  }
  o.metadata = m; o.updatedAt = nowIso(); addAudit({ actorUserId: reqUser.id, action: "compliance.obligation.assign", entityType: "compliance_obligation", entityId: obligationId, metadata: m.assignment }); return o;
}

export async function acknowledgeAlert(reqUser, alertId, note = "") {
  return updateAlertLifecycle(reqUser, alertId, { status: "acknowledged", completionNotes: note || "Client acknowledged this alert." });
}

export async function attachObligationEvidence(reqUser, obligationId, payload) {
  const { documentId = null, fileName = "", notes = "", complete = false } = payload || {};
  const o = db ? await db.complianceObligation.findUnique({ where: { id: obligationId } }) : store.complianceObligations.find((x) => x.id === obligationId);
  if (!o) { const e = new Error("Obligation not found"); e.status = 404; throw e; }
  hasClientAccess(reqUser, o.clientId);
  const m = j(o.metadata, {}); const ev = Array.isArray(m.evidence) ? m.evidence : [];
  ev.unshift({ id: utils.makeId("ev"), documentId, fileName, notes, uploadedBy: reqUser.id, uploadedAt: nowIso() });
  m.evidence = ev.slice(0, 50); m.evidenceComplete = Boolean(complete); m.evidenceStatus = complete ? "complete" : "pending";
  if (db) { const u = await db.complianceObligation.update({ where: { id: obligationId }, data: { metadata: m, updatedAt: new Date() } }); addAudit({ actorUserId: reqUser.id, action: "compliance.obligation.evidence.attach", entityType: "compliance_obligation", entityId: obligationId, metadata: { documentId, fileName, complete } }); return u; }
  o.metadata = m; o.updatedAt = nowIso(); addAudit({ actorUserId: reqUser.id, action: "compliance.obligation.evidence.attach", entityType: "compliance_obligation", entityId: obligationId, metadata: { documentId, fileName, complete } }); return o;
}

export async function runEscalationRules() {
  ensureComplianceDbReady();
  const now = new Date();
  const list = db ? await db.complianceAlert.findMany({ where: { status: { in: ["open", "acknowledged", "in_progress"] } } }) : store.complianceAlerts.filter((x) => ["open", "acknowledged", "in_progress"].includes(String(x.status || "").toLowerCase()));
  const users = await listUsers();
  const managerByClient = new Map();
  for (const user of users) {
    const role = String(user.role || "").toLowerCase();
    if (!["accountant_manager", "accountant_admin"].includes(role)) continue;
    const userClientIds = Array.isArray(user.clientIds) ? user.clientIds : [];
    for (const clientId of userClientIds) {
      if (!managerByClient.has(clientId)) managerByClient.set(clientId, user.id);
    }
  }
  const thresholdDays = Number(config.complianceEscalationDays || 5);
  let escalated = 0;
  for (const a of list) {
    const age = (now.getTime() - (toDate(a.createdAt) || now).getTime()) / (1000 * 60 * 60 * 24);
    const t = thresholdDays;
    if (age < t) continue;
    const managerUserId = managerByClient.get(a.clientId) || a.assignedUserId || null;
    if (db) await db.complianceAlert.update({ where: { id: a.id }, data: { status: "escalated", assignedUserId: managerUserId, updatedAt: new Date(), message: `${a.message}\n\nEscalated: unresolved for ${Math.floor(age)} days` } });
    else { a.status = "escalated"; a.assignedUserId = managerUserId; a.updatedAt = nowIso(); a.message = `${a.message}\n\nEscalated: unresolved for ${Math.floor(age)} days`; }
    escalated += 1;
  }
  return { escalated };
}

export async function runReminderRules() {
  ensureComplianceDbReady();
  const obligations = db ? await db.complianceObligation.findMany() : store.complianceObligations;
  const now = new Date(); let remindersCreated = 0;
  const usersByClientCache = new Map();
  for (const o of obligations) {
    if (normStatus(o.status) === "overdue") continue;
    const due = toDate(o.dueDate); if (!due) continue;
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (!REMINDER_DAYS.includes(days)) continue;

    if (!usersByClientCache.has(o.clientId)) {
      usersByClientCache.set(o.clientId, await usersByClient(o.clientId));
    }
    const linkedUsers = usersByClientCache.get(o.clientId) || [];
    const recipients = linkedUsers
      .map((user) => ({ user, pref: prefForUser(user) }))
      .filter((entry) => entry.pref.reminderDays.includes(days));
    if (!recipients.length) continue;

    const marker = `${o.source}:${o.obligationType}:${days}`;
    const dup = db
      ? await db.complianceEvent.findFirst({ where: { clientId: o.clientId, eventType: "reminder.due", obligationRef: o.obligationType, payload: { path: ["marker"], equals: marker } } })
      : store.complianceEvents.find((x) => x.clientId === o.clientId && x.eventType === "reminder.due" && x.obligationRef === o.obligationType && j(x.payload, {}).marker === marker);
    if (dup) continue;
    const channelUnion = Array.from(new Set(recipients.flatMap((entry) => {
      const channels = [];
      if (entry.pref.channels.inApp) channels.push("in_app");
      if (entry.pref.channels.email) channels.push("email");
      if (entry.pref.channels.sms) channels.push("sms");
      return channels;
    })));
    const e = { id: utils.makeId("ce"), clientId: o.clientId, source: o.source, eventType: "reminder.due", severity: days <= 3 ? "high" : "medium", title: `${o.obligationType} due in ${days} day${days === 1 ? "" : "s"}`, description: `Reminder for ${o.source} ${o.obligationType}`, obligationRef: o.obligationType, payload: { marker, channel: channelUnion, dueDate: due.toISOString(), daysUntilDue: days }, occurredAt: new Date() };
    if (db) await db.complianceEvent.create({ data: e });
    else store.complianceEvents.unshift({ ...e, occurredAt: e.occurredAt.toISOString(), createdAt: nowIso() });

    for (const recipient of recipients) {
      if (!recipient.pref.channels.inApp) continue;
      addNotification({
        userId: recipient.user.id,
        type: "compliance_reminder",
        title: `${o.source} reminder`,
        message: `${o.obligationType} is due in ${days} day${days === 1 ? "" : "s"}.`,
      });
    }
    remindersCreated += 1;
  }
  return { remindersCreated };
}

export async function getSyncDiagnostics(reqUser) {
  if (reqUser.role !== "accountant") { const e = new Error("Insufficient role"); e.status = 403; throw e; }
  const ids = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];
  const items = db ? await db.complianceAccount.findMany({ where: { clientId: { in: ids } } }) : store.complianceAccounts.filter((x) => ids.includes(x.clientId));
  return { items: items.map((x) => ({ id: x.id, clientId: x.clientId, source: x.source, status: x.status, lastSyncedAt: x.lastSyncedAt, lastError: x.lastError || null, retryCount: j(x.credentialsMeta, {}).retryCount || 0, nextRetryAt: j(x.credentialsMeta, {}).nextRetryAt || null, syncLatencyMs: j(x.credentialsMeta, {}).syncLatencyMs || null })) };
}

const csv = (rows) => {
  if (!rows.length) return "";
  const h = Object.keys(rows[0]);
  const q = (v) => { const t = String(v ?? ""); return (t.includes(",") || t.includes("\"") || t.includes("\n")) ? `"${t.replace(/"/g, "\"\"")}"` : t; };
  return [h.join(","), ...rows.map((r) => h.map((k) => q(r[k])).join(","))].join("\n");
};

export async function getClientComplianceReport(reqUser, clientId) {
  const o = await getClientComplianceOverview(reqUser, clientId);
  return { summary: { clientId, status: o.status, score: o.score, scoreV2: o.scoreV2, riskPercentV2: o.riskPercentV2, sarsStatus: o.sarsStatus, cipcStatus: o.cipcStatus, lastUpdatedAt: o.lastUpdatedAt }, obligations: o.obligations, events: o.events, alerts: o.alerts, evidence: o.obligations.map((x) => ({ obligationId: x.id, obligationType: x.obligationType, source: x.source, evidenceStatus: j(x.metadata, {}).evidenceStatus || "pending", evidenceCount: Array.isArray(j(x.metadata, {}).evidence) ? j(x.metadata, {}).evidence.length : 0 })) };
}

export async function getFirmComplianceReportCsv(reqUser) {
  const f = await getFirmComplianceOverview(reqUser);
  return csv(f.items.map((x) => ({ clientId: x.clientId, clientName: x.clientName, status: x.status, score: x.score, scoreV2: x.scoreV2, riskPercentV2: x.riskPercentV2, overdueCount: x.overdueCount, dueSoonCount: x.dueSoonCount, nonCompliantCount: x.nonCompliantCount, sarsStatus: x.sarsStatus, cipcStatus: x.cipcStatus, csdStatus: x.csdStatus, lastUpdatedAt: x.lastUpdatedAt })));
}
