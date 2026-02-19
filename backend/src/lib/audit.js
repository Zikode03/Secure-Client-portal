import { utils } from "./store.js";
import { getDb } from "./db.js";
import { config } from "./config.js";

const db = config.databaseUrl ? getDb() : null;

export function addAudit({ actorUserId, action, entityType, entityId, metadata }) {
  const entry = {
    id: utils.makeId("audit"),
    actorUserId,
    action,
    entityType,
    entityId,
    metadata: metadata || null,
    createdAt: utils.nowIso(),
  };
  if (!db) return entry;
  db.audit
    .create({
      data: {
        ...entry,
        actorUserId: actorUserId || null,
      },
    })
    .catch((error) => console.error("Failed to persist audit log:", error.message));
  return entry;
}

export function addNotification({ userId, type, title, message }) {
  const notification = {
    id: utils.makeId("notif"),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: utils.nowIso(),
  };
  if (!db) return notification;
  db.notification
    .create({ data: notification })
    .catch((error) => console.error("Failed to persist notification:", error.message));
  return notification;
}
