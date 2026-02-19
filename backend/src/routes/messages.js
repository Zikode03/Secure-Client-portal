import express from "express";
import { canAccessClient } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.get("/threads", async (req, res) => {
  const visibleClientIds = req.user.clientIds;
  const sourceClients = db ? await db.client.findMany({ where: { id: { in: visibleClientIds } } }) : store.clients;
  const sourceMessages = db
    ? await db.message.findMany({ where: { clientId: { in: visibleClientIds } } })
    : store.messages;
  const threads = visibleClientIds.map((clientId) => {
    const client = sourceClients.find((item) => item.id === clientId);
    const messages = sourceMessages
      .filter((msg) => msg.clientId === clientId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const lastMessage = messages[0] || null;
    return {
      clientId,
      clientName: client?.name || "Unknown Client",
      count: messages.length,
      unreadCount: messages.filter((msg) => !msg.readBy?.includes(req.user.id) && msg.fromUserId !== req.user.id).length,
      lastMessage,
    };
  });
  res.json({ items: threads });
});

router.get("/threads/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const sourceMessages = db
    ? await db.message.findMany({ where: { clientId } })
    : store.messages;
  const all = sourceMessages
    .filter((msg) => msg.clientId === clientId)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = all.slice(start, end);
  res.json({
    items,
    pagination: {
      page,
      limit,
      total: all.length,
      hasMore: end < all.length,
    },
  });
});

router.post("/threads/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const { body } = req.body || {};
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  if (!body) return res.status(400).json({ error: "body is required" });

  const message = {
    id: utils.makeId("m"),
    clientId,
    fromUserId: req.user.id,
    toRole: req.user.role === "accountant" ? "client" : "accountant",
    body: String(body),
    deliveryStatus: "delivered",
    readBy: [req.user.id],
    createdAt: utils.nowIso(),
  };
  if (db) {
    await db.message.create({ data: message });
  } else {
    store.messages.push(message);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "message.send",
    entityType: "message",
    entityId: message.id,
    metadata: { clientId },
  });

  if (req.user.role === "client") {
    const users = db
      ? await db.user.findMany({ where: { role: "accountant" } })
      : store.users.filter((u) => u.role === "accountant");
    for (const user of users.filter((u) => (u.clientIds || []).includes(clientId))) {
      addNotification({
        userId: user.id,
        type: "message_received",
        title: "Client message",
        message: `New message for client ${clientId}.`,
      });
    }
  } else {
    const users = db
      ? await db.user.findMany({ where: { role: "client" } })
      : store.users.filter((u) => u.role === "client");
    for (const user of users.filter((u) => (u.clientIds || []).includes(clientId))) {
      addNotification({
        userId: user.id,
        type: "message_received",
        title: "Accountant message",
        message: `New message from your accountant.`,
      });
    }
  }

  res.status(201).json({ message });
});

router.post("/threads/:clientId/read", async (req, res) => {
  const { clientId } = req.params;
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  let updated = 0;
  const sourceMessages = db
    ? await db.message.findMany({ where: { clientId } })
    : store.messages.filter((msg) => msg.clientId === clientId);

  for (const message of sourceMessages) {
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    if (!readBy.includes(req.user.id)) {
      readBy.push(req.user.id);
      updated += 1;
    }

    if (db) {
      await db.message.update({
        where: { id: message.id },
        data: {
          readBy,
          deliveryStatus: "read",
        },
      });
    } else {
      message.readBy = readBy;
      message.deliveryStatus = "read";
    }
  }
  addAudit({
    actorUserId: req.user.id,
    action: "message.read_all",
    entityType: "message",
    entityId: clientId,
    metadata: { updated },
  });
  res.json({ ok: true, updated });
});

export default router;
