import express from "express";
import { canAccessClient } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

function toTime(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(
    input
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6)
  ));
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function encodeMessageBody(bodyText, options = {}) {
  const payload = String(bodyText || "");
  const meta = {};
  if (options.attachment && typeof options.attachment === "object") meta.attachment = options.attachment;
  const tags = normalizeTags(options.tags);
  if (tags.length) meta.tags = tags;
  if (options.linkedDocumentId) meta.linkedDocumentId = String(options.linkedDocumentId);
  if (options.linkedDocumentName) meta.linkedDocumentName = String(options.linkedDocumentName);
  const slaDueAt = toIsoOrNull(options.slaDueAt);
  if (slaDueAt) meta.slaDueAt = slaDueAt;
  if (!Object.keys(meta).length) return payload;
  return `__META__:${JSON.stringify(meta)}\n${payload}`;
}

function decodeMessageBody(value) {
  const raw = String(value || "");
  if (raw.startsWith("__META__:")) {
    const nl = raw.indexOf("\n");
    if (nl < 0) return { text: raw, meta: {} };
    const metaRaw = raw.slice("__META__:".length, nl).trim();
    const text = raw.slice(nl + 1);
    try {
      const parsed = JSON.parse(metaRaw);
      return {
        text,
        meta: parsed && typeof parsed === "object" ? parsed : {},
      };
    } catch (_error) {
      return { text, meta: {} };
    }
  }
  if (!raw.startsWith("__ATTACHMENT__:")) {
    return { text: raw, meta: {} };
  }
  const nl = raw.indexOf("\n");
  if (nl < 0) return { text: raw, meta: {} };
  const metaRaw = raw.slice("__ATTACHMENT__:".length, nl).trim();
  const text = raw.slice(nl + 1);
  try {
    const attachment = JSON.parse(metaRaw);
    return { text, meta: { attachment } };
  } catch (_error) {
    return { text: raw, meta: {} };
  }
}

function decorateMessageForUser(message, userId) {
  const decoded = decodeMessageBody(message.body);
  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  const tags = normalizeTags(decoded.meta?.tags || []);
  const slaDueAt = toIsoOrNull(decoded.meta?.slaDueAt);
  return {
    ...message,
    body: decoded.text,
    attachment: decoded.meta?.attachment || null,
    tags,
    linkedDocumentId: decoded.meta?.linkedDocumentId || "",
    linkedDocumentName: decoded.meta?.linkedDocumentName || "",
    slaDueAt,
    readByCount: readBy.length,
    isReadByCurrentUser: readBy.includes(userId),
    isReadByRecipient: readBy.length > 1,
  };
}

function calculateThreadSla(messages, reqUserId, reqRole) {
  if (reqRole !== "accountant") return { responseDueAt: null, slaStatus: "none" };
  const ordered = [...messages].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  const latestInbound = [...ordered].reverse().find((item) => item.fromUserId !== reqUserId);
  if (!latestInbound) return { responseDueAt: null, slaStatus: "none" };
  const inboundTs = toTime(latestInbound.createdAt);
  if (!inboundTs) return { responseDueAt: null, slaStatus: "none" };
  const responded = ordered.some((item) => item.fromUserId === reqUserId && toTime(item.createdAt) > inboundTs);
  if (responded) return { responseDueAt: null, slaStatus: "met" };

  const decoded = decodeMessageBody(latestInbound.body);
  const explicitDueTs = toTime(decoded.meta?.slaDueAt);
  const dueTs = explicitDueTs || (inboundTs + 24 * 60 * 60 * 1000);
  const remaining = dueTs - Date.now();
  const status = remaining < 0 ? "overdue" : (remaining <= 4 * 60 * 60 * 1000 ? "due_soon" : "open");
  return {
    responseDueAt: new Date(dueTs).toISOString(),
    slaStatus: status,
  };
}

function collectThreadTags(messages) {
  const tags = new Set();
  for (const message of messages.slice(-40)) {
    const decoded = decodeMessageBody(message.body);
    normalizeTags(decoded.meta?.tags || []).forEach((tag) => tags.add(tag));
  }
  return Array.from(tags);
}

router.get("/threads", async (req, res) => {
  const tagFilter = String(req.query.tag || "").trim().toLowerCase();
  const slaFilter = String(req.query.slaStatus || "").trim().toLowerCase();
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
    const lastMessage = messages[0] ? decorateMessageForUser(messages[0], req.user.id) : null;
    const { responseDueAt, slaStatus } = calculateThreadSla(messages, req.user.id, req.user.role);
    const tags = collectThreadTags(messages);
    return {
      clientId,
      clientName: client?.name || "Unknown Client",
      count: messages.length,
      unreadCount: messages.filter((msg) => !msg.readBy?.includes(req.user.id) && msg.fromUserId !== req.user.id).length,
      lastMessage,
      tags,
      responseDueAt,
      slaStatus,
    };
  });
  let items = threads;
  if (tagFilter) items = items.filter((thread) => thread.tags.includes(tagFilter));
  if (slaFilter) items = items.filter((thread) => String(thread.slaStatus || "") === slaFilter);
  items.sort((a, b) => toTime(b.lastMessage?.createdAt) - toTime(a.lastMessage?.createdAt));
  res.json({ items });
});

router.get("/threads/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const since = String(req.query.since || "");
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const sourceMessages = db
    ? await db.message.findMany({ where: { clientId } })
    : store.messages;
  let all = sourceMessages
    .filter((msg) => msg.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (since) {
    const sinceTs = new Date(since).getTime();
    if (!Number.isNaN(sinceTs)) {
      all = all.filter((item) => new Date(item.createdAt).getTime() > sinceTs);
    }
  }
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = all.slice(start, end).map((message) => decorateMessageForUser(message, req.user.id));
  const threadSla = calculateThreadSla(all, req.user.id, req.user.role);
  res.json({
    items,
    threadSla,
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
  const { body, attachment, tags, linkedDocumentId, slaDueAt } = req.body || {};
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  if (!body && !attachment) return res.status(400).json({ error: "body or attachment is required" });

  let linkedDocument = null;
  if (linkedDocumentId) {
    linkedDocument = db
      ? await db.document.findFirst({ where: { id: String(linkedDocumentId), clientId } })
      : store.documents.find((item) => item.id === String(linkedDocumentId) && item.clientId === clientId);
    if (!linkedDocument) return res.status(400).json({ error: "Linked document not found for this client" });
  }
  const normalizedTags = normalizeTags(tags || []);

  const message = {
    id: utils.makeId("m"),
    clientId,
    fromUserId: req.user.id,
    toRole: req.user.role === "accountant" ? "client" : "accountant",
    body: encodeMessageBody(body, {
      attachment: attachment || null,
      tags: normalizedTags,
      linkedDocumentId: linkedDocument?.id || "",
      linkedDocumentName: linkedDocument?.name || "",
      slaDueAt,
    }),
    deliveryStatus: "sent",
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
    metadata: {
      clientId,
      tags: normalizedTags,
      linkedDocumentId: linkedDocument?.id || null,
      slaDueAt: toIsoOrNull(slaDueAt),
    },
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

  res.status(201).json({ message: decorateMessageForUser(message, req.user.id) });
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

router.post("/threads/:clientId/:messageId/read", async (req, res) => {
  const { clientId, messageId } = req.params;
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const message = db
    ? await db.message.findFirst({ where: { id: messageId, clientId } })
    : store.messages.find((item) => item.id === messageId && item.clientId === clientId);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  if (!readBy.includes(req.user.id)) readBy.push(req.user.id);
  const deliveryStatus = readBy.length > 1 ? "read" : "delivered";

  if (db) {
    await db.message.update({
      where: { id: message.id },
      data: { readBy, deliveryStatus },
    });
  } else {
    message.readBy = readBy;
    message.deliveryStatus = deliveryStatus;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "message.read_one",
    entityType: "message",
    entityId: message.id,
    metadata: { clientId },
  });

  return res.json({ ok: true, message: decorateMessageForUser({ ...message, readBy, deliveryStatus }, req.user.id) });
});

export default router;
