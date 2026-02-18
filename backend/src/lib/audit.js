import { store, utils } from "./store.js";

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
  store.audits.unshift(entry);
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
  store.notifications.unshift(notification);
  return notification;
}
