import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { addAudit } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { idempotencyMiddleware } from "../lib/idempotency.js";
import { asEnum, asNonEmptyString } from "../lib/validation.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;
const idempotency = idempotencyMiddleware();

const SLA_TARGET_HOURS = 48;

function nowTs() {
  return Date.now();
}

function toTime(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function normalizeVersionKey(name) {
  const base = String(name || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/([_\-\s]?v\d+)$/, "")
    .trim();
  return base || String(name || "").toLowerCase();
}

function safeText(value) {
  return String(value || "").trim();
}

function defaultWorkflow(document, client, reviewerName = null, reviewerUserId = null, escalation = null) {
  const ageHours = Math.max(0, Math.floor((nowTs() - toTime(document.uploadedAt)) / (1000 * 60 * 60)));
  const remaining = SLA_TARGET_HOURS - ageHours;
  const breached = remaining < 0;
  return {
    slaTargetHours: SLA_TARGET_HOURS,
    slaAgeHours: ageHours,
    slaRemainingHours: Math.max(0, remaining),
    slaBreached: breached,
    ownerUserId: reviewerUserId || client?.assignedAccountantId || null,
    ownerName: reviewerName || null,
    escalationFlag: Boolean(escalation) || breached,
    escalationReason: escalation?.reason || (breached ? "SLA breached" : null),
    escalatedAt: escalation?.at || null,
    escalatedBy: escalation?.by || null,
  };
}

async function resolveClientIdForCreate(req, requestedClientId) {
  const requested = String(requestedClientId || "");
  if (requested) {
    if (!canAccessClient(req.user, requested)) {
      throw { status: 403, error: "Access denied" };
    }
    return requested;
  }

  if (req.user.role !== "client") {
    throw { status: 400, error: "clientId is required" };
  }

  const sessionIds = Array.isArray(req.user.clientIds) ? req.user.clientIds : [];
  if (sessionIds.length) return sessionIds[0];

  if (db) {
    const user = await db.user.findUnique({ where: { id: req.user.id } });
    const userIds = Array.isArray(user?.clientIds) ? user.clientIds : [];
    if (userIds.length) {
      req.user.clientIds = userIds;
      return userIds[0];
    }

    let linkedClient = await db.client.findFirst({
      where: { email: req.user.email },
      select: { id: true },
    });

    if (!linkedClient) {
      linkedClient = await db.client.create({
        data: {
          id: utils.makeId("c"),
          name: req.user.fullName || req.user.email,
          entityType: "Individual",
          status: "active",
          complianceHealth: 100,
          assignedAccountantId: req.user.id,
          primaryContact: req.user.fullName || req.user.email,
          email: req.user.email,
          createdAt: new Date(),
        },
        select: { id: true },
      });
    }

    await db.user.update({
      where: { id: req.user.id },
      data: { clientIds: [linkedClient.id] },
    });
    req.user.clientIds = [linkedClient.id];
    return linkedClient.id;
  }

  const inMemoryUser = store.users.find((candidate) => candidate.id === req.user.id);
  const inMemoryIds = Array.isArray(inMemoryUser?.clientIds) ? inMemoryUser.clientIds : [];
  if (inMemoryIds.length) {
    req.user.clientIds = inMemoryIds;
    return inMemoryIds[0];
  }

  let linkedClient = store.clients.find((client) => client.email.toLowerCase() === req.user.email.toLowerCase());
  if (!linkedClient) {
    linkedClient = {
      id: utils.makeId("c"),
      name: req.user.fullName || req.user.email,
      entityType: "Individual",
      status: "active",
      complianceHealth: 100,
      assignedAccountantId: req.user.id,
      primaryContact: req.user.fullName || req.user.email,
      email: req.user.email,
      createdAt: utils.nowIso(),
    };
    store.clients.push(linkedClient);
  }

  if (inMemoryUser) {
    inMemoryUser.clientIds = [linkedClient.id];
  }
  req.user.clientIds = [linkedClient.id];
  return linkedClient.id;
}

async function loadAuditsForDocuments(documentIds = []) {
  const ids = Array.isArray(documentIds) ? documentIds.filter(Boolean) : [];
  if (!ids.length) return [];
  if (db) {
    return db.audit.findMany({
      where: {
        entityType: "document",
        entityId: { in: ids },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return store.audits
    .filter((audit) => audit.entityType === "document" && ids.includes(audit.entityId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function loadEscalationsByClient(clientIds = []) {
  const ids = Array.isArray(clientIds) ? clientIds.filter(Boolean) : [];
  if (!ids.length) return new Map();
  const alerts = db && db.complianceAlert
    ? await db.complianceAlert.findMany({
      where: {
        clientId: { in: ids },
        status: "escalated",
      },
      orderBy: { updatedAt: "desc" },
    })
    : store.complianceAlerts
      .filter((alert) => ids.includes(alert.clientId) && String(alert.status || "").toLowerCase() === "escalated")
      .sort((a, b) => (toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt)));

  const result = new Map();
  for (const alert of alerts) {
    if (result.has(alert.clientId)) continue;
    const reason = safeText(String(alert.message || "").split("\n").pop() || alert.message || "Escalated alert");
    result.set(alert.clientId, {
      at: alert.updatedAt || alert.createdAt || null,
      by: alert.assignedUserId || null,
      reason,
    });
  }
  return result;
}

async function buildWorkflowMetadata(documents) {
  const docIds = documents.map((doc) => doc.id);
  const clientIds = [...new Set(documents.map((doc) => doc.clientId))];

  const [clients, users, audits, escalations] = await Promise.all([
    db ? db.client.findMany({ where: { id: { in: clientIds } } }) : Promise.resolve(store.clients.filter((client) => clientIds.includes(client.id))),
    db ? db.user.findMany() : Promise.resolve(store.users),
    loadAuditsForDocuments(docIds),
    loadEscalationsByClient(clientIds),
  ]);

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const assignmentByDoc = new Map();

  for (const audit of audits) {
    if (String(audit.action || "").toLowerCase() !== "review.assign") continue;
    if (assignmentByDoc.has(audit.entityId)) continue;
    const metadata = audit.metadata && typeof audit.metadata === "object" ? audit.metadata : {};
    const reviewerUserId = String(metadata.reviewerUserId || "");
    if (!reviewerUserId) continue;
    const reviewer = usersById.get(reviewerUserId);
    assignmentByDoc.set(audit.entityId, {
      reviewerUserId,
      reviewerName: reviewer?.fullName || reviewer?.email || reviewerUserId,
    });
  }

  const workflowByDoc = new Map();
  for (const document of documents) {
    const client = clientsById.get(document.clientId) || null;
    const assignment = assignmentByDoc.get(document.id) || null;
    const escalation = escalations.get(document.clientId) || null;
    workflowByDoc.set(
      document.id,
      defaultWorkflow(
        document,
        client,
        assignment?.reviewerName || null,
        assignment?.reviewerUserId || null,
        escalation,
      ),
    );
  }
  return workflowByDoc;
}

function ensureDocumentVisible(req, document) {
  if (!document) return false;
  return canAccessClient(req.user, document.clientId);
}

router.get("/", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();
  const clientId = String(req.query.clientId || "");
  const category = String(req.query.category || "").toLowerCase();

  const sourceDocuments = db ? await db.document.findMany() : store.documents;
  const items = sourceDocuments.filter((doc) => {
    if (!canAccessClient(req.user, doc.clientId)) return false;
    if (clientId && doc.clientId !== clientId) return false;
    if (status && String(doc.status || "").toLowerCase() !== status) return false;
    if (category && String(doc.category || "").toLowerCase() !== category) return false;
    if (
      search &&
      !String(doc.name || "").toLowerCase().includes(search) &&
      !String(doc.category || "").toLowerCase().includes(search) &&
      !String(doc.clientId || "").toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });

  items.sort((a, b) => (toTime(b.uploadedAt) - toTime(a.uploadedAt)));
  const workflowByDoc = await buildWorkflowMetadata(items);

  const payload = items.map((document) => ({
    ...document,
    workflow: workflowByDoc.get(document.id) || defaultWorkflow(document, null),
    versionGroupKey: normalizeVersionKey(document.name),
  }));

  res.json({ items: payload });
});

router.post("/", idempotency, async (req, res) => {
  const { clientId, name, category = "Uncategorized", status = "pending", sizeBytes = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  let resolvedClientId = "";
  try {
    resolvedClientId = await resolveClientIdForCreate(req, clientId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.error || "Unable to resolve client profile" });
  }

  const document = {
    id: utils.makeId("d"),
    clientId: resolvedClientId,
    name: asNonEmptyString(name, { max: 200 }),
    category: asNonEmptyString(category, { max: 80 }) || "Uncategorized",
    status: asEnum(status, ["pending", "approved", "rejected", "request-fix", "processing"], "pending"),
    sizeBytes: Number(sizeBytes) || 0,
    key: null,
    uploadedBy: req.user.id,
    uploadedAt: utils.nowIso(),
  };
  if (db) {
    await db.document.create({ data: document });
  } else {
    store.documents.unshift(document);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "document.create",
    entityType: "document",
    entityId: document.id,
    metadata: { clientId: resolvedClientId },
  });

  res.status(201).json({ document });
});

router.patch("/:documentId/status", requireRole("accountant"), idempotency, async (req, res) => {
  const document = db
    ? await db.document.findUnique({ where: { id: req.params.documentId } })
    : store.documents.find((doc) => doc.id === req.params.documentId);
  if (!document) return res.status(404).json({ error: "Document not found" });
  if (!canAccessClient(req.user, document.clientId)) return res.status(403).json({ error: "Access denied" });

  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });
  const nextStatus = String(status);
  if (db) {
    await db.document.update({
      where: { id: document.id },
      data: { status: nextStatus },
    });
    document.status = nextStatus;
  } else {
    document.status = nextStatus;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "document.status.update",
    entityType: "document",
    entityId: document.id,
    metadata: { status },
  });

  res.json({ document });
});

router.get("/:documentId/history", async (req, res) => {
  const sourceDocuments = db ? await db.document.findMany() : store.documents;
  const current = sourceDocuments.find((item) => item.id === req.params.documentId);
  if (!current) return res.status(404).json({ error: "Document not found" });
  if (!ensureDocumentVisible(req, current)) return res.status(403).json({ error: "Access denied" });

  const key = normalizeVersionKey(current.name);
  const versions = sourceDocuments
    .filter((item) => item.clientId === current.clientId)
    .filter((item) => normalizeVersionKey(item.name) === key)
    .sort((a, b) => (toTime(b.uploadedAt) - toTime(a.uploadedAt)))
    .map((item, index) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      status: item.status,
      sizeBytes: item.sizeBytes,
      uploadedAt: item.uploadedAt,
      versionNumber: index + 1,
      isCurrent: item.id === current.id,
    }));

  const audits = await loadAuditsForDocuments(versions.map((item) => item.id));
  const reviewHistory = audits
    .filter((audit) => String(audit.action || "").startsWith("review.") || String(audit.action || "").startsWith("document.status"))
    .map((audit) => ({
      id: audit.id,
      action: audit.action,
      documentId: audit.entityId,
      actorUserId: audit.actorUserId || null,
      createdAt: audit.createdAt,
      metadata: audit.metadata || {},
    }));

  res.json({
    documentId: current.id,
    versionGroupKey: key,
    versions,
    reviewHistory,
    downloadHistory: [],
  });
});

router.get("/:documentId/compare", async (req, res) => {
  const leftId = String(req.query.left || req.params.documentId || "");
  const rightId = String(req.query.right || "");
  if (!leftId || !rightId) return res.status(400).json({ error: "left and right document ids are required" });

  const sourceDocuments = db ? await db.document.findMany() : store.documents;
  const left = sourceDocuments.find((item) => item.id === leftId);
  const right = sourceDocuments.find((item) => item.id === rightId);
  if (!left || !right) return res.status(404).json({ error: "One or both document versions were not found" });
  if (!ensureDocumentVisible(req, left) || !ensureDocumentVisible(req, right)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const comparisons = [
    ["name", left.name, right.name],
    ["category", left.category, right.category],
    ["status", left.status, right.status],
    ["sizeBytes", left.sizeBytes, right.sizeBytes],
    ["uploadedAt", left.uploadedAt, right.uploadedAt],
  ];
  const differences = comparisons
    .filter((entry) => String(entry[1] || "") !== String(entry[2] || ""))
    .map(([field, leftValue, rightValue]) => ({ field, leftValue, rightValue }));

  res.json({
    left: {
      id: left.id,
      name: left.name,
      category: left.category,
      status: left.status,
      sizeBytes: left.sizeBytes,
      uploadedAt: left.uploadedAt,
    },
    right: {
      id: right.id,
      name: right.name,
      category: right.category,
      status: right.status,
      sizeBytes: right.sizeBytes,
      uploadedAt: right.uploadedAt,
    },
    differences,
    summary: differences.length
      ? `${differences.length} metadata differences found between selected versions.`
      : "No metadata differences detected between selected versions.",
  });
});

router.get("/:documentId/download-url", async (_req, res) => {
  return res.status(410).json({ error: "Document file downloads are disabled in this system." });
});

export default router;
