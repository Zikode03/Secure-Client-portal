import { config } from "../config.js";
import { getDb } from "../db.js";
import { store, utils } from "../store.js";
import { canAccessClient } from "../auth.js";
import { addAudit } from "../audit.js";
import { pullSarsState } from "./connector-sars.js";
import { pullCipcState } from "./connector-cipc.js";
import { deriveSnapshot, buildEvents } from "./rules.js";

const db = config.databaseUrl ? getDb() : null;

function normalizeDate(value) {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function listClientsForSync() {
  if (db) return db.client.findMany();
  return store.clients;
}

async function getClientById(clientId) {
  if (db) return db.client.findUnique({ where: { id: clientId } });
  return store.clients.find((item) => item.id === clientId) || null;
}

function mapObligationData(clientId, item) {
  return {
    id: utils.makeId("obl"),
    clientId,
    source: String(item.source || "Unknown"),
    obligationType: String(item.obligationType || "Obligation"),
    periodLabel: item.periodLabel ? String(item.periodLabel) : null,
    dueDate: normalizeDate(item.dueDate),
    submittedAt: normalizeDate(item.submittedAt),
    paidAt: normalizeDate(item.paidAt),
    status: String(item.status || "compliant"),
    amountDue: item.amountDue == null ? null : Number(item.amountDue),
    metadata: item.metadata || null,
  };
}

async function replaceObligations(clientId, obligations) {
  if (db) {
    await db.complianceObligation.deleteMany({ where: { clientId } });
    if (obligations.length) {
      await db.complianceObligation.createMany({
        data: obligations.map((item) => ({
          ...item,
          dueDate: item.dueDate || null,
          submittedAt: item.submittedAt || null,
          paidAt: item.paidAt || null,
        })),
      });
    }
    return;
  }
  store.complianceObligations = store.complianceObligations.filter((item) => item.clientId !== clientId);
  store.complianceObligations.push(...obligations.map((item) => ({ ...item, createdAt: utils.nowIso(), updatedAt: utils.nowIso() })));
}

async function insertSnapshot(clientId, snapshot, sourceTimestamp) {
  const payload = {
    id: utils.makeId("css"),
    clientId,
    overallStatus: snapshot.overallStatus,
    score: snapshot.score,
    sarsStatus: snapshot.sarsStatus,
    cipcStatus: snapshot.cipcStatus,
    compliantCount: snapshot.compliantCount,
    nonCompliantCount: snapshot.nonCompliantCount,
    overdueCount: snapshot.overdueCount,
    dueSoonCount: snapshot.dueSoonCount,
    sourceTimestamp: normalizeDate(sourceTimestamp) || new Date(),
  };

  if (db) {
    await db.complianceStatusSnapshot.create({ data: payload });
    return payload;
  }
  store.complianceSnapshots.push({ ...payload, sourceTimestamp: payload.sourceTimestamp.toISOString(), createdAt: utils.nowIso() });
  return payload;
}

async function upsertComplianceAccounts(clientId, sarsState, cipcState) {
  const accountRows = [
    {
      source: "SARS",
      reference: `SARS-${clientId}`,
      status: sarsState.tcsStatus === "red" ? "attention" : "active",
      lastError: null,
      credentialsMeta: { tcsStatus: sarsState.tcsStatus },
      lastSyncedAt: normalizeDate(sarsState.fetchedAt) || new Date(),
    },
    {
      source: "CIPC",
      reference: `CIPC-${clientId}`,
      status: cipcState.status === "red" ? "attention" : "active",
      lastError: null,
      credentialsMeta: { status: cipcState.status },
      lastSyncedAt: normalizeDate(cipcState.fetchedAt) || new Date(),
    },
  ];

  if (db) {
    for (const row of accountRows) {
      const existing = await db.complianceAccount.findFirst({ where: { clientId, source: row.source } });
      if (existing) {
        await db.complianceAccount.update({
          where: { id: existing.id },
          data: row,
        });
      } else {
        await db.complianceAccount.create({
          data: { id: utils.makeId("ca"), clientId, ...row },
        });
      }
    }
    return;
  }

  for (const row of accountRows) {
    const existing = store.complianceAccounts.find((item) => item.clientId === clientId && item.source === row.source);
    if (existing) {
      Object.assign(existing, row, { updatedAt: utils.nowIso() });
    } else {
      store.complianceAccounts.push({ id: utils.makeId("ca"), clientId, ...row, createdAt: utils.nowIso(), updatedAt: utils.nowIso() });
    }
  }
}

async function insertEventsAndAlerts(client, events) {
  if (!events.length) return;

  if (db) {
    for (const event of events) {
      const eventRow = {
        id: utils.makeId("ce"),
        clientId: client.id,
        source: event.source,
        eventType: event.eventType,
        severity: event.severity,
        title: event.title,
        description: event.description,
        obligationRef: event.obligationRef || null,
        payload: event.payload || null,
        occurredAt: normalizeDate(event.occurredAt) || new Date(),
      };
      await db.complianceEvent.create({ data: eventRow });

      const isUnreadOpen = await db.complianceAlert.findFirst({
        where: {
          clientId: client.id,
          source: event.source,
          obligationType: event.obligationRef || null,
          status: "open",
          title: event.title,
        },
      });
      if (!isUnreadOpen) {
        await db.complianceAlert.create({
          data: {
            id: utils.makeId("cal"),
            clientId: client.id,
            severity: event.severity,
            status: "open",
            title: event.title,
            message: event.description,
            source: event.source,
            obligationType: event.obligationRef || null,
            assignedUserId: client.assignedAccountantId || null,
          },
        });
      }
    }
    return;
  }

  for (const event of events) {
    store.complianceEvents.unshift({
      id: utils.makeId("ce"),
      clientId: client.id,
      source: event.source,
      eventType: event.eventType,
      severity: event.severity,
      title: event.title,
      description: event.description,
      obligationRef: event.obligationRef || null,
      payload: event.payload || null,
      occurredAt: event.occurredAt || utils.nowIso(),
      createdAt: utils.nowIso(),
    });

    const existing = store.complianceAlerts.find((item) =>
      item.clientId === client.id &&
      item.source === event.source &&
      item.status === "open" &&
      item.title === event.title
    );
    if (!existing) {
      store.complianceAlerts.unshift({
        id: utils.makeId("cal"),
        clientId: client.id,
        severity: event.severity,
        status: "open",
        title: event.title,
        message: event.description,
        source: event.source,
        obligationType: event.obligationRef || null,
        assignedUserId: client.assignedAccountantId || null,
        createdAt: utils.nowIso(),
        updatedAt: utils.nowIso(),
        resolvedAt: null,
        readAt: null,
      });
    }
  }
}

export async function syncClientCompliance(clientId, actorUserId = null) {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  const [sarsState, cipcState] = await Promise.all([
    pullSarsState(client),
    pullCipcState(client),
  ]);

  const snapshot = deriveSnapshot({ sarsState, cipcState });
  const obligations = snapshot.obligations.map((item) => mapObligationData(client.id, item));

  await upsertComplianceAccounts(client.id, sarsState, cipcState);
  await replaceObligations(client.id, obligations);
  await insertSnapshot(client.id, snapshot, new Date().toISOString());
  const events = buildEvents({ client, obligations });
  await insertEventsAndAlerts(client, events);

  if (actorUserId) {
    addAudit({
      actorUserId,
      action: "compliance.sync",
      entityType: "client",
      entityId: client.id,
      metadata: { overallStatus: snapshot.overallStatus, score: snapshot.score },
    });
  }

  return { clientId: client.id, snapshot, obligations };
}

export async function syncAllClientsCompliance(actorUserId = null) {
  const clients = await listClientsForSync();
  const results = [];
  for (const client of clients) {
    try {
      const synced = await syncClientCompliance(client.id, actorUserId);
      results.push({ clientId: client.id, ok: true, snapshot: synced.snapshot });
    } catch (error) {
      results.push({ clientId: client.id, ok: false, error: error.message });
    }
  }
  return results;
}

async function latestSnapshotForClient(clientId) {
  if (db) {
    return db.complianceStatusSnapshot.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }
  return store.complianceSnapshots
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;
}

async function obligationsForClient(clientId) {
  if (db) {
    return db.complianceObligation.findMany({
      where: { clientId },
      orderBy: [{ source: "asc" }, { obligationType: "asc" }],
    });
  }
  return store.complianceObligations.filter((item) => item.clientId === clientId);
}

async function eventsForClient(clientId, limit = 20) {
  if (db) {
    return db.complianceEvent.findMany({
      where: { clientId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  }
  return store.complianceEvents
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, limit);
}

export async function getClientComplianceOverview(reqUser, clientId) {
  if (!canAccessClient(reqUser, clientId)) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }

  let snapshot = await latestSnapshotForClient(clientId);
  if (!snapshot) {
    const synced = await syncClientCompliance(clientId);
    snapshot = { ...synced.snapshot, createdAt: utils.nowIso(), sourceTimestamp: utils.nowIso() };
  }

  const obligations = await obligationsForClient(clientId);
  const events = await eventsForClient(clientId, 25);

  return {
    clientId,
    status: snapshot.overallStatus,
    score: snapshot.score,
    sarsStatus: snapshot.sarsStatus,
    cipcStatus: snapshot.cipcStatus,
    counts: {
      compliant: snapshot.compliantCount,
      nonCompliant: snapshot.nonCompliantCount,
      overdue: snapshot.overdueCount,
      dueSoon: snapshot.dueSoonCount,
    },
    obligations,
    events,
    lastUpdatedAt: snapshot.createdAt || snapshot.sourceTimestamp,
  };
}

export async function getFrameworkComplianceItems(reqUser) {
  const clientId = Array.isArray(reqUser.clientIds) && reqUser.clientIds.length ? reqUser.clientIds[0] : "";
  if (!clientId) return [];
  const overview = await getClientComplianceOverview(reqUser, clientId);
  const sarsRequired = overview.obligations.filter((item) => item.source === "SARS");
  const cipcRequired = overview.obligations.filter((item) => item.source === "CIPC");
  const totalRequired = overview.obligations.length;
  return [
    {
      name: "SARS",
      requiredControls: sarsRequired.length,
      completedControls: sarsRequired.filter((item) => item.status === "compliant").length,
      percent: sarsRequired.length ? Math.round((sarsRequired.filter((item) => item.status === "compliant").length / sarsRequired.length) * 100) : 0,
    },
    {
      name: "CIPC",
      requiredControls: cipcRequired.length,
      completedControls: cipcRequired.filter((item) => item.status === "compliant").length,
      percent: cipcRequired.length ? Math.round((cipcRequired.filter((item) => item.status === "compliant").length / cipcRequired.length) * 100) : 0,
    },
    {
      name: "Overall",
      requiredControls: totalRequired,
      completedControls: overview.obligations.filter((item) => item.status === "compliant").length,
      percent: overview.score,
    },
  ];
}

export async function getFirmComplianceOverview(reqUser) {
  if (reqUser.role !== "accountant") {
    const error = new Error("Insufficient role");
    error.status = 403;
    throw error;
  }

  const clientIds = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];
  const clients = db
    ? await getDb().client.findMany({ where: { id: { in: clientIds } } })
    : store.clients.filter((client) => clientIds.includes(client.id));

  const items = [];
  for (const client of clients) {
    const overview = await getClientComplianceOverview(reqUser, client.id);
    items.push({
      clientId: client.id,
      clientName: client.name,
      status: overview.status,
      score: overview.score,
      overdueCount: overview.counts.overdue,
      dueSoonCount: overview.counts.dueSoon,
      nonCompliantCount: overview.counts.nonCompliant,
      lastUpdatedAt: overview.lastUpdatedAt,
      sarsStatus: overview.sarsStatus,
      cipcStatus: overview.cipcStatus,
    });
  }

  return {
    totalClients: items.length,
    green: items.filter((item) => item.status === "green").length,
    amber: items.filter((item) => item.status === "amber").length,
    red: items.filter((item) => item.status === "red").length,
    items,
  };
}

export async function listFirmAlerts(reqUser, includeResolved = false) {
  if (reqUser.role !== "accountant") {
    const error = new Error("Insufficient role");
    error.status = 403;
    throw error;
  }
  const clientIds = Array.isArray(reqUser.clientIds) ? reqUser.clientIds : [];

  if (db) {
    const alerts = await db.complianceAlert.findMany({
      where: {
        clientId: { in: clientIds },
        ...(includeResolved ? {} : { status: "open" }),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return alerts;
  }

  return store.complianceAlerts
    .filter((item) => clientIds.includes(item.clientId) && (includeResolved || item.status === "open"))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 200);
}

export async function markAlertAsRead(reqUser, alertId) {
  if (db) {
    const alert = await db.complianceAlert.findUnique({ where: { id: alertId } });
    if (!alert) {
      const error = new Error("Alert not found");
      error.status = 404;
      throw error;
    }
    if (!canAccessClient(reqUser, alert.clientId)) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }
    return db.complianceAlert.update({
      where: { id: alertId },
      data: { readAt: new Date() },
    });
  }

  const alert = store.complianceAlerts.find((item) => item.id === alertId);
  if (!alert) {
    const error = new Error("Alert not found");
    error.status = 404;
    throw error;
  }
  if (!canAccessClient(reqUser, alert.clientId)) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }
  alert.readAt = utils.nowIso();
  alert.updatedAt = utils.nowIso();
  return alert;
}
