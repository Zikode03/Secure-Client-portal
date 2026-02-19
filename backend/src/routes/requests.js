import express from "express";
import { canAccessClient } from "../lib/auth.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.get("/", async (req, res) => {
  const status = String(req.query.status || "").toLowerCase();
  const role = String(req.query.role || "received").toLowerCase();
  const clientIds = req.user.clientIds;

  const sourceRequests = db ? await db.request.findMany() : store.requests;
  let items = sourceRequests.filter((request) => clientIds.includes(request.clientId));
  if (status) items = items.filter((request) => request.status.toLowerCase() === status);
  if (role === "sent") items = items.filter((request) => request.requestedByUserId === req.user.id);
  if (role === "received") items = items.filter((request) => request.requestedByUserId !== req.user.id);

  items = items.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  res.json({ items });
});

router.post("/", async (req, res) => {
  const { clientId, title, description = "", priority = "medium", dueDate } = req.body || {};
  if (!clientId || !title || !dueDate) {
    return res.status(400).json({ error: "clientId, title and dueDate are required" });
  }
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const request = {
    id: utils.makeId("r"),
    clientId,
    title,
    description,
    priority: String(priority).toLowerCase(),
    status: "pending",
    dueDate,
    requestedByUserId: req.user.id,
    requestedAt: utils.nowIso(),
    history: [
      {
        at: utils.nowIso(),
        byUserId: req.user.id,
        action: "created",
        note: "Request created",
      },
    ],
  };
  if (db) {
    await db.request.create({
      data: {
        ...request,
        dueDate: request.dueDate ? new Date(request.dueDate) : null,
      },
    });
  } else {
    store.requests.unshift(request);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "request.create",
    entityType: "request",
    entityId: request.id,
    metadata: { clientId },
  });

  const targets = db
    ? (await db.user.findMany()).filter((user) => user.id !== req.user.id && (user.clientIds || []).includes(clientId))
    : store.users.filter((user) => user.id !== req.user.id && user.clientIds.includes(clientId));
  for (const user of targets) {
    addNotification({
      userId: user.id,
      type: "request_created",
      title: "New document request",
      message: `${title} (due ${dueDate})`,
    });
  }

  res.status(201).json({ request });
});

router.patch("/:requestId/status", async (req, res) => {
  const request = db
    ? await db.request.findUnique({ where: { id: req.params.requestId } })
    : store.requests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (!canAccessClient(req.user, request.clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { status, note = "" } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  const nextStatus = String(status).toLowerCase();
  const nextHistory = Array.isArray(request.history) ? [...request.history] : [];
  nextHistory.unshift({
    at: utils.nowIso(),
    byUserId: req.user.id,
    action: `status:${nextStatus}`,
    note: String(note).slice(0, 400),
  });

  if (db) {
    await db.request.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        history: nextHistory,
      },
    });
    request.status = nextStatus;
    request.history = nextHistory;
  } else {
    request.status = nextStatus;
    request.history = nextHistory;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "request.status.update",
    entityType: "request",
    entityId: request.id,
    metadata: { status: nextStatus },
  });

  res.json({ request });
});

router.get("/:requestId/timeline", async (req, res) => {
  const request = db
    ? await db.request.findUnique({ where: { id: req.params.requestId } })
    : store.requests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (!canAccessClient(req.user, request.clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ requestId: request.id, history: request.history || [] });
});

export default router;
