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

router.get("/", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();
  const clientId = String(req.query.clientId || "");
  const category = String(req.query.category || "").toLowerCase();

  const sourceDocuments = db ? await db.document.findMany() : store.documents;
  const items = sourceDocuments.filter((doc) => {
    if (!canAccessClient(req.user, doc.clientId)) return false;
    if (clientId && doc.clientId !== clientId) return false;
    if (status && doc.status.toLowerCase() !== status) return false;
    if (category && doc.category.toLowerCase() !== category) return false;
    if (
      search &&
      !doc.name.toLowerCase().includes(search) &&
      !doc.category.toLowerCase().includes(search) &&
      !doc.clientId.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });

  res.json({ items });
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

router.get("/:documentId/download-url", async (req, res) => {
  return res.status(410).json({ error: "Document file downloads are disabled in this system." });
});

export default router;
