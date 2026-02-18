import express from "express";
import { canAccessClient } from "../lib/auth.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";

const router = express.Router();

router.get("/", (req, res) => {
  const status = String(req.query.status || "").toLowerCase();
  const role = String(req.query.role || "received").toLowerCase();
  const clientIds = req.user.clientIds;

  let items = store.requests.filter((request) => clientIds.includes(request.clientId));
  if (status) items = items.filter((request) => request.status.toLowerCase() === status);
  if (role === "sent") items = items.filter((request) => request.requestedByUserId === req.user.id);
  if (role === "received") items = items.filter((request) => request.requestedByUserId !== req.user.id);

  items = items.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  res.json({ items });
});

router.post("/", (req, res) => {
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
  store.requests.unshift(request);

  addAudit({
    actorUserId: req.user.id,
    action: "request.create",
    entityType: "request",
    entityId: request.id,
    metadata: { clientId },
  });

  const targets = store.users.filter(
    (user) => user.id !== req.user.id && user.clientIds.includes(clientId)
  );
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

router.patch("/:requestId/status", (req, res) => {
  const request = store.requests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (!canAccessClient(req.user, request.clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { status, note = "" } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });

  request.status = String(status).toLowerCase();
  request.history.unshift({
    at: utils.nowIso(),
    byUserId: req.user.id,
    action: `status:${request.status}`,
    note: String(note).slice(0, 400),
  });

  addAudit({
    actorUserId: req.user.id,
    action: "request.status.update",
    entityType: "request",
    entityId: request.id,
    metadata: { status: request.status },
  });

  res.json({ request });
});

router.get("/:requestId/timeline", (req, res) => {
  const request = store.requests.find((item) => item.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (!canAccessClient(req.user, request.clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ requestId: request.id, history: request.history || [] });
});

export default router;
