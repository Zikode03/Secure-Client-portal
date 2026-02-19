import express from "express";
import { store } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const unreadOnly = String(req.query.unread || "") === "true";
  const type = String(req.query.type || "").toLowerCase();

  const sourceNotifications = db
    ? await db.notification.findMany({ where: { userId: req.user.id } })
    : store.notifications;
  const all = sourceNotifications
    .filter((notification) => notification.userId === req.user.id)
    .filter((notification) => !unreadOnly || !notification.read)
    .filter((notification) => !type || notification.type.toLowerCase() === type)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = all.slice(start, end);
  res.json({
    items,
    unreadCount: all.filter((n) => !n.read).length,
    pagination: {
      page,
      limit,
      total: all.length,
      hasMore: end < all.length,
    },
  });
});

router.post("/read-all", async (req, res) => {
  if (db) {
    await db.notification.updateMany({
      where: { userId: req.user.id },
      data: { read: true },
    });
  } else {
    for (const notification of store.notifications) {
      if (notification.userId === req.user.id) {
        notification.read = true;
      }
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "notification.read_all",
    entityType: "notification",
    entityId: req.user.id,
  });

  res.json({ ok: true });
});

router.post("/:notificationId/read", async (req, res) => {
  const notification = db
    ? await db.notification.findFirst({
        where: { id: req.params.notificationId, userId: req.user.id },
      })
    : store.notifications.find((item) => item.id === req.params.notificationId && item.userId === req.user.id);
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  if (db) {
    await db.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });
    notification.read = true;
  } else {
    notification.read = true;
  }
  addAudit({
    actorUserId: req.user.id,
    action: "notification.read_one",
    entityType: "notification",
    entityId: notification.id,
  });
  res.json({ ok: true, notification });
});

export default router;
