import { store, utils } from "./store.js";
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
  const latestMatchingInMemory = store.notifications.find((item) => (
    item.userId === userId &&
    item.type === type &&
    item.title === title &&
    item.message === message &&
    item.read === false &&
    new Date(item.createdAt).getTime() > Date.now() - 5 * 60 * 1000
  ));
  if (latestMatchingInMemory) return latestMatchingInMemory;

  const notification = {
    id: utils.makeId("notif"),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: utils.nowIso(),
  };
  store.notifications.unshift(notification);
  if (!db) return notification;
  db.notification
    .create({ data: notification })
    .catch((error) => console.error("Failed to persist notification:", error.message));
  return notification;
}
