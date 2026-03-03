import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function toTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function riskBandFromHealth(health) {
  const h = Number(health || 0);
  if (h < 50) return "high";
  if (h < 80) return "medium";
  return "low";
}

function complianceStatusFromHealth(health) {
  const h = Number(health || 0);
  if (h < 50) return "non-compliant";
  if (h < 80) return "at-risk";
  return "compliant";
}

function extractIndustry(client) {
  const profile = client?.profile && typeof client.profile === "object" ? client.profile : {};
  return String(profile.industry || client.entityType || "General");
}

async function loadVisibleData(req) {
  const sourceClients = db ? await db.client.findMany() : store.clients;
  const sourceDocs = db ? await db.document.findMany() : store.documents;
  const sourceTasks = db ? await db.task.findMany() : store.tasks;
  const sourceMessages = db ? await db.message.findMany() : store.messages;
  const visibleClients = sourceClients.filter((client) => canAccessClient(req.user, client.id));
  return { sourceClients, sourceDocs, sourceTasks, sourceMessages, visibleClients };
}

function lastActivityForClient(clientId, docs, tasks, messages, fallback) {
  const times = [
    toTime(fallback),
    ...docs.filter((x) => x.clientId === clientId).map((x) => toTime(x.uploadedAt || x.createdAt)),
    ...tasks.filter((x) => x.clientId === clientId).map((x) => toTime(x.updatedAt || x.createdAt || x.dueDate)),
    ...messages.filter((x) => x.clientId === clientId).map((x) => toTime(x.createdAt)),
  ];
  const max = Math.max(...times, 0);
  return max ? new Date(max).toISOString() : null;
}

function enrichClient(client, docs, tasks, messages) {
  const pendingDocs = docs.filter((d) => d.clientId === client.id && ["pending", "in-review", "review", "request-fix"].includes(String(d.status || "").toLowerCase())).length;
  const overdueTasks = tasks.filter((t) => t.clientId === client.id && String(t.status || "").toLowerCase() === "overdue").length;
  const unreadMessages = messages.filter((m) => m.clientId === client.id && !Array.isArray(m.readBy)).length;
  const complianceHealth = Number(client.complianceHealth || 0);
  return {
    ...client,
    industry: extractIndustry(client),
    riskBand: riskBandFromHealth(complianceHealth),
    complianceStatus: complianceStatusFromHealth(complianceHealth),
    pendingDocs,
    overdueTasks,
    unreadMessages,
    lastActivity: lastActivityForClient(client.id, docs, tasks, messages, client.createdAt),
  };
}

function sortClients(items, sortBy, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;
  const pick = (item) => {
    switch (sortBy) {
      case "name": return String(item.name || "").toLowerCase();
      case "status": return String(item.status || "").toLowerCase();
      case "risk": return Number(item.complianceHealth || 0);
      case "lastActivity": return toTime(item.lastActivity);
      default: return toTime(item.lastActivity);
    }
  };
  return items.sort((a, b) => {
    const av = pick(a);
    const bv = pick(b);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

router.get("/", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();
  const industry = String(req.query.industry || "").toLowerCase();
  const riskBand = String(req.query.riskBand || "").toLowerCase();
  const complianceStatus = String(req.query.complianceStatus || "").toLowerCase();
  const view = String(req.query.view || "").toLowerCase();
  const page = clamp(Number(req.query.page || 1), 1, 100000);
  const pageSize = clamp(Number(req.query.pageSize || 20), 1, 100);
  const sortBy = String(req.query.sortBy || "lastActivity");
  const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const { sourceDocs, sourceTasks, sourceMessages, visibleClients } = await loadVisibleData(req);
  let items = visibleClients.map((client) => enrichClient(client, sourceDocs, sourceTasks, sourceMessages));

  items = items.filter((client) => {
    if (status && String(client.status || "").toLowerCase() !== status) return false;
    if (industry && String(client.industry || "").toLowerCase() !== industry) return false;
    if (riskBand && String(client.riskBand || "").toLowerCase() !== riskBand) return false;
    if (complianceStatus && String(client.complianceStatus || "").toLowerCase() !== complianceStatus) return false;
    if (view === "at-risk" && !["medium", "high"].includes(String(client.riskBand || "").toLowerCase())) return false;
    if (view === "no-activity-30d") {
      const daysSince = (Date.now() - toTime(client.lastActivity || client.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) return false;
    }
    if (!search) return true;
    return [
      client.name,
      client.entityType,
      client.primaryContact,
      client.email,
      client.industry,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });

  items = sortClients(items, sortBy, sortDir);
  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  res.json({
    items: paged,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: start + pageSize < total,
      sortBy,
      sortDir,
      savedViews: [
        { key: "at-risk", label: "At Risk" },
        { key: "no-activity-30d", label: "No Activity 30d" },
      ],
      generatedAt: new Date().toISOString(),
    },
  });
});

router.post("/bulk", requireRole("accountant"), async (req, res) => {
  const action = String(req.body?.action || "").toLowerCase();
  const clientIds = Array.isArray(req.body?.clientIds) ? req.body.clientIds.map((id) => String(id)) : [];
  const value = req.body?.value;
  if (!clientIds.length) return res.status(400).json({ error: "clientIds are required" });
  if (!["status", "assign_owner", "archive"].includes(action)) return res.status(400).json({ error: "Invalid bulk action" });

  const sourceClients = db ? await db.client.findMany() : store.clients;
  const visibleClientIds = clientIds.filter((id) => {
    const client = sourceClients.find((item) => item.id === id);
    return client && canAccessClient(req.user, id);
  });
  if (!visibleClientIds.length) return res.status(403).json({ error: "No accessible clients selected" });

  let updated = 0;
  if (db) {
    for (const clientId of visibleClientIds) {
      const updateData = {};
      if (action === "status") updateData.status = String(value || "");
      if (action === "assign_owner") updateData.assignedAccountantId = String(value || req.user.id);
      if (action === "archive") updateData.status = "archived";
      await db.client.update({ where: { id: clientId }, data: updateData });
      updated += 1;
    }
  } else {
    for (const clientId of visibleClientIds) {
      const client = store.clients.find((item) => item.id === clientId);
      if (!client) continue;
      if (action === "status") client.status = String(value || client.status || "pending");
      if (action === "assign_owner") client.assignedAccountantId = String(value || req.user.id);
      if (action === "archive") client.status = "archived";
      updated += 1;
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.bulk.update",
    entityType: "client",
    entityId: String(updated),
    metadata: { action, value, clientIds: visibleClientIds },
  });

  res.json({ ok: true, updated, clientIds: visibleClientIds });
});

router.get("/:clientId/timeline", async (req, res) => {
  const clientId = String(req.params.clientId || "");
  if (!canAccessClient(req.user, clientId)) return res.status(403).json({ error: "Access denied" });
  const limit = clamp(Number(req.query.limit || 80), 1, 300);

  const [docs, tasks, messages, audits] = await Promise.all([
    db ? db.document.findMany({ where: { clientId } }) : Promise.resolve(store.documents.filter((x) => x.clientId === clientId)),
    db ? db.task.findMany({ where: { clientId } }) : Promise.resolve(store.tasks.filter((x) => x.clientId === clientId)),
    db ? db.message.findMany({ where: { clientId } }) : Promise.resolve(store.messages.filter((x) => x.clientId === clientId)),
    db ? db.audit.findMany({ orderBy: { createdAt: "desc" }, take: 500 }) : Promise.resolve(store.audits.slice(0, 500)),
  ]);

  const docIds = new Set(docs.map((d) => d.id));
  const taskIds = new Set(tasks.map((t) => t.id));
  const messageIds = new Set(messages.map((m) => m.id));

  const complianceEvents = db && db.complianceEvent
    ? await db.complianceEvent.findMany({ where: { clientId }, orderBy: { occurredAt: "desc" }, take: 250 })
    : store.complianceEvents.filter((item) => item.clientId === clientId).slice(0, 250);

  const merged = [
    ...docs.map((d) => ({
      type: "document",
      source: "document",
      title: `Document uploaded: ${d.name}`,
      status: d.status,
      occurredAt: d.uploadedAt || d.createdAt,
      entityId: d.id,
    })),
    ...tasks.map((t) => ({
      type: "task",
      source: "task",
      title: `Task ${String(t.status || "").toLowerCase() === "completed" ? "completed" : "updated"}: ${t.title}`,
      status: t.status,
      occurredAt: t.updatedAt || t.createdAt || t.dueDate,
      entityId: t.id,
    })),
    ...messages.map((m) => ({
      type: "message",
      source: "message",
      title: `Message ${m.fromUserId === req.user.id ? "sent" : "received"}`,
      status: m.deliveryStatus || "sent",
      occurredAt: m.createdAt,
      entityId: m.id,
    })),
    ...complianceEvents.map((e) => ({
      type: "compliance",
      source: String(e.source || "SYSTEM"),
      title: e.title || e.eventType || "Compliance event",
      status: e.severity || "info",
      occurredAt: e.occurredAt || e.createdAt,
      entityId: e.id,
    })),
    ...audits
      .filter((a) => {
        const metaClientId = String(a.metadata?.clientId || "");
        if (metaClientId === clientId) return true;
        if (a.entityType === "client" && a.entityId === clientId) return true;
        if (a.entityType === "document" && docIds.has(a.entityId)) return true;
        if (a.entityType === "task" && taskIds.has(a.entityId)) return true;
        if (a.entityType === "message" && messageIds.has(a.entityId)) return true;
        return false;
      })
      .map((a) => ({
        type: "audit",
        source: "audit",
        title: `Audit: ${a.action}`,
        status: "logged",
        occurredAt: a.createdAt,
        entityId: a.id,
        actorUserId: a.actorUserId,
      })),
  ]
    .sort((a, b) => (toTime(b.occurredAt) - toTime(a.occurredAt)))
    .slice(0, limit);

  res.json({ items: merged, generatedAt: new Date().toISOString() });
});

router.get("/:clientId", async (req, res) => {
  const client = db
    ? await db.client.findUnique({ where: { id: req.params.clientId } })
    : store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const sourceDocs = db ? await db.document.findMany({ where: { clientId: client.id } }) : store.documents.filter((x) => x.clientId === client.id);
  const sourceTasks = db ? await db.task.findMany({ where: { clientId: client.id } }) : store.tasks.filter((x) => x.clientId === client.id);
  const sourceMessages = db ? await db.message.findMany({ where: { clientId: client.id } }) : store.messages.filter((x) => x.clientId === client.id);
  const enriched = enrichClient(client, sourceDocs, sourceTasks, sourceMessages);
  const riskReasons = [];
  if (enriched.pendingDocs > 0) riskReasons.push(`${enriched.pendingDocs} pending document(s)`);
  if (enriched.overdueTasks > 0) riskReasons.push(`${enriched.overdueTasks} overdue task(s)`);
  if (!riskReasons.length) riskReasons.push("No immediate risk signals");

  const latestAudit = db
    ? await db.audit.findFirst({ where: { entityType: "client", entityId: client.id }, orderBy: { createdAt: "desc" } })
    : store.audits.find((a) => a.entityType === "client" && a.entityId === client.id) || null;

  res.json({
    client,
    health: {
      score: Number(client.complianceHealth || 0),
      riskBand: enriched.riskBand,
      complianceStatus: enriched.complianceStatus,
      pendingDocs: enriched.pendingDocs,
      overdueTasks: enriched.overdueTasks,
      unreadMessages: enriched.unreadMessages,
      riskReasons,
    },
    audit: latestAudit
      ? {
        action: latestAudit.action,
        actorUserId: latestAudit.actorUserId,
        occurredAt: latestAudit.createdAt,
      }
      : null,
  });
});

router.post("/", requireRole("accountant"), async (req, res) => {
  const { name, entityType, primaryContact, email } = req.body || {};
  if (!name || !entityType || !primaryContact || !email) {
    return res.status(400).json({ error: "name, entityType, primaryContact and email are required" });
  }

  const client = {
    id: utils.makeId("c"),
    name,
    entityType,
    status: "pending",
    complianceHealth: 0,
    assignedAccountantId: req.user.id,
    primaryContact,
    email,
    createdAt: utils.nowIso(),
  };

  if (db) {
    await db.client.create({ data: client });
    const accountant = await db.user.findUnique({ where: { id: req.user.id } });
    if (accountant) {
      const ids = Array.isArray(accountant.clientIds) ? accountant.clientIds : [];
      if (!ids.includes(client.id)) {
        await db.user.update({
          where: { id: req.user.id },
          data: { clientIds: [...ids, client.id] },
        });
      }
    }
  } else {
    store.clients.push(client);
  }

  if (!db) {
    const linkedUser = store.users.find((candidate) => candidate.id === req.user.id);
    if (linkedUser && !linkedUser.clientIds.includes(client.id)) {
      linkedUser.clientIds.push(client.id);
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
  });

  res.status(201).json({ client });
});

router.patch("/:clientId", requireRole("accountant"), async (req, res) => {
  const client = db
    ? await db.client.findUnique({ where: { id: req.params.clientId } })
    : store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) return res.status(403).json({ error: "Access denied" });

  const allowed = ["name", "entityType", "status", "complianceHealth", "primaryContact", "email", "assignedAccountantId"];
  const updateData = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
      client[key] = req.body[key];
    }
  }

  if (db && Object.keys(updateData).length) {
    await db.client.update({
      where: { id: client.id },
      data: updateData,
    });
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.update",
    entityType: "client",
    entityId: client.id,
    metadata: { fields: Object.keys(req.body || {}) },
  });

  res.json({ client });
});

export default router;
