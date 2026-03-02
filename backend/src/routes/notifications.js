import express from "express";
import { store } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

function normalizePrefs(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const channels = input.channels && typeof input.channels === "object" ? input.channels : {};
  const reminders = Array.isArray(input.reminderDays) ? input.reminderDays : [30, 14, 7, 3, 1];
  return {
    channels: {
      inApp: channels.inApp !== false,
      email: channels.email !== false,
      sms: channels.sms === true,
    },
    reminderDays: reminders
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0)
      .sort((a, b) => b - a),
  };
}

async function getUserById(userId) {
  if (db) return db.user.findUnique({ where: { id: userId } });
  return store.users.find((candidate) => candidate.id === userId) || null;
}

async function updateUserSecurity(user, nextSecurity) {
  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: { security: nextSecurity },
    });
    return;
  }
  user.security = nextSecurity;
}

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

router.post("/read-bulk", async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map((value) => String(value)).filter(Boolean)
    : [];

  if (!ids.length) {
    return res.status(400).json({ error: "ids array is required" });
  }

  if (db) {
    await db.notification.updateMany({
      where: {
        userId: req.user.id,
        id: { in: ids },
      },
      data: { read: true },
    });
  } else {
    const idSet = new Set(ids);
    for (const notification of store.notifications) {
      if (notification.userId === req.user.id && idSet.has(notification.id)) {
        notification.read = true;
      }
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "notification.read_bulk",
    entityType: "notification",
    entityId: req.user.id,
    metadata: { count: ids.length },
  });

  return res.json({ ok: true, count: ids.length });
});

router.get("/preferences", async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const current = normalizePrefs(user.security?.notificationPreferences);
  return res.json({ preferences: current });
});

router.patch("/preferences", async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const security = user.security && typeof user.security === "object" ? user.security : {};
  const current = normalizePrefs(security.notificationPreferences);
  const input = req.body && typeof req.body === "object" ? req.body : {};

  const next = normalizePrefs({
    channels: {
      inApp: input.channels?.inApp !== undefined ? Boolean(input.channels.inApp) : current.channels.inApp,
      email: input.channels?.email !== undefined ? Boolean(input.channels.email) : current.channels.email,
      sms: input.channels?.sms !== undefined ? Boolean(input.channels.sms) : current.channels.sms,
    },
    reminderDays: Array.isArray(input.reminderDays) ? input.reminderDays : current.reminderDays,
  });

  security.notificationPreferences = next;
  await updateUserSecurity(user, security);

  addAudit({
    actorUserId: req.user.id,
    action: "notification.preferences.update",
    entityType: "user",
    entityId: req.user.id,
  });

  return res.json({ ok: true, preferences: next });
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
