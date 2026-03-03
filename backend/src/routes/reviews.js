import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { addNotification } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { idempotencyMiddleware } from "../lib/idempotency.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;
const idempotency = idempotencyMiddleware();

const ACTION_TO_STATUS = {
  approve: "approved",
  reject: "rejected",
  request_fix: "request-fix",
};

const REVIEWER_ROLES = new Set(["accountant", "accountant_manager", "accountant_admin"]);
const NOTE_REQUIRED_ACTIONS = new Set(["reject", "request_fix"]);

function toIso(value) {
  if (!value) return utils.nowIso();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return utils.nowIso();
  return d.toISOString();
}

async function persistAudit({ actorUserId, action, entityType, entityId, metadata }) {
  const entry = {
    id: utils.makeId("audit"),
    actorUserId: actorUserId || null,
    action,
    entityType,
    entityId,
    metadata: metadata || null,
    createdAt: utils.nowIso(),
  };
  if (db) {
    await db.audit.create({ data: entry });
  } else {
    store.audits.unshift(entry);
  }
  return entry;
}

async function loadUsers() {
  return db ? db.user.findMany() : store.users;
}

async function loadDocument(documentId) {
  return db
    ? db.document.findUnique({ where: { id: documentId } })
    : store.documents.find((doc) => doc.id === documentId) || null;
}

async function loadAuditsForDocument(documentId, action = "") {
  if (db) {
    const where = {
      entityType: "document",
      entityId: documentId,
      ...(action ? { action } : {}),
    };
    return db.audit.findMany({ where, orderBy: { createdAt: "asc" } });
  }
  return store.audits
    .filter((audit) => audit.entityType === "document" && audit.entityId === documentId && (!action || audit.action === action))
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

async function loadAssignableReviewers(reqUser) {
  const userClientIds = new Set(Array.isArray(reqUser.clientIds) ? reqUser.clientIds : []);
  const users = await loadUsers();
  return users
    .filter((user) => REVIEWER_ROLES.has(String(user.role || "").toLowerCase()))
    .filter((user) => {
      if (user.id === reqUser.id) return true;
      const ids = Array.isArray(user.clientIds) ? user.clientIds : [];
      return ids.some((id) => userClientIds.has(id));
    })
    .map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    }));
}

function requireReviewNote(action, note) {
  if (!NOTE_REQUIRED_ACTIONS.has(action)) return true;
  return Boolean(String(note || "").trim());
}

async function ensureDocumentAccess(req, documentId) {
  const document = await loadDocument(documentId);
  if (!document) {
    const error = new Error("Document not found");
    error.status = 404;
    throw error;
  }
  if (!canAccessClient(req.user, document.clientId)) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }
  return document;
}

async function updateDocumentStatus(document, status) {
  if (db) {
    await db.document.update({
      where: { id: document.id },
      data: { status },
    });
  } else {
    document.status = status;
  }
}

async function applyReviewAction({ req, document, action, note }) {
  const nextStatus = ACTION_TO_STATUS[action];
  if (!nextStatus) {
    const error = new Error("action must be approve, reject, or request_fix");
    error.status = 400;
    throw error;
  }
  if (!requireReviewNote(action, note)) {
    const error = new Error("Review note is required for reject/request_fix actions");
    error.status = 400;
    throw error;
  }

  const reviewNote = String(note || "").trim().slice(0, 1000);
  await updateDocumentStatus(document, nextStatus);
  document.status = nextStatus;

  await persistAudit({
    actorUserId: req.user.id,
    action: `review.${action}`,
    entityType: "document",
    entityId: document.id,
    metadata: {
      clientId: document.clientId,
      status: nextStatus,
      note: reviewNote,
      reviewedAt: utils.nowIso(),
    },
  });

  const users = await loadUsers();
  for (const user of users.filter((u) => String(u.role || "").toLowerCase() === "client")) {
    const ids = Array.isArray(user.clientIds) ? user.clientIds : [];
    if (!ids.includes(document.clientId)) continue;
    addNotification({
      userId: user.id,
      type: "document_reviewed",
      title: "Document review update",
      message: `${document.name} status changed to ${nextStatus}.`,
    });
  }

  return {
    id: document.id,
    status: nextStatus,
    reviewedAt: utils.nowIso(),
    reviewNote,
  };
}

router.get("/reviewers", requireRole("accountant"), async (req, res) => {
  const items = await loadAssignableReviewers(req.user);
  res.json({ items });
});

router.post("/:documentId/action", requireRole("accountant"), idempotency, async (req, res) => {
  const { documentId } = req.params;
  const { action, note = "" } = req.body || {};
  let document;
  try {
    document = await ensureDocumentAccess(req, documentId);
    await applyReviewAction({
      req,
      document,
      action: String(action || ""),
      note: String(note || ""),
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Review action failed" });
  }

  res.json({ document });
});

router.post("/bulk", requireRole("accountant"), idempotency, async (req, res) => {
  const action = String(req.body?.action || "").toLowerCase();
  const documentIds = Array.isArray(req.body?.documentIds)
    ? req.body.documentIds.map((id) => String(id)).filter(Boolean)
    : [];
  const note = String(req.body?.note || "");
  const reviewerUserId = String(req.body?.reviewerUserId || "");

  if (!documentIds.length) return res.status(400).json({ error: "documentIds are required" });
  if (!["approve", "reject", "request_fix", "assign"].includes(action)) {
    return res.status(400).json({ error: "action must be approve, reject, request_fix, or assign" });
  }

  if (action === "assign" && !reviewerUserId) {
    return res.status(400).json({ error: "reviewerUserId is required for assign action" });
  }
  if (NOTE_REQUIRED_ACTIONS.has(action) && !note.trim()) {
    return res.status(400).json({ error: "Review note is required for reject/request_fix actions" });
  }

  const reviewers = await loadAssignableReviewers(req.user);
  if (action === "assign" && !reviewers.some((item) => item.id === reviewerUserId)) {
    return res.status(400).json({ error: "reviewerUserId is not assignable for this session" });
  }

  const results = [];
  for (const documentId of documentIds) {
    try {
      const document = await ensureDocumentAccess(req, documentId);
      if (action === "assign") {
        await persistAudit({
          actorUserId: req.user.id,
          action: "review.assign",
          entityType: "document",
          entityId: document.id,
          metadata: {
            clientId: document.clientId,
            reviewerUserId,
            assignedAt: utils.nowIso(),
          },
        });
        results.push({ documentId, ok: true, action, reviewerUserId });
      } else {
        const updated = await applyReviewAction({ req, document, action, note });
        results.push({ documentId, ok: true, action, status: updated.status });
      }
    } catch (error) {
      results.push({ documentId, ok: false, error: error.message || "Failed to process document" });
    }
  }

  res.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  });
});

router.post("/:documentId/assign", requireRole("accountant"), idempotency, async (req, res) => {
  const reviewerUserId = String(req.body?.reviewerUserId || "");
  if (!reviewerUserId) return res.status(400).json({ error: "reviewerUserId is required" });

  let document;
  try {
    document = await ensureDocumentAccess(req, req.params.documentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Unable to assign reviewer" });
  }

  const reviewers = await loadAssignableReviewers(req.user);
  const reviewer = reviewers.find((item) => item.id === reviewerUserId);
  if (!reviewer) return res.status(400).json({ error: "reviewerUserId is not assignable for this session" });

  const assignment = await persistAudit({
    actorUserId: req.user.id,
    action: "review.assign",
    entityType: "document",
    entityId: document.id,
    metadata: {
      clientId: document.clientId,
      reviewerUserId,
      assignedAt: utils.nowIso(),
    },
  });

  res.json({
    ok: true,
    assignment: {
      documentId: document.id,
      reviewerUserId,
      reviewerName: reviewer.fullName || reviewer.email,
      assignedAt: assignment.createdAt,
      assignedByUserId: req.user.id,
    },
  });
});

router.get("/:documentId/comments", async (req, res) => {
  let document;
  try {
    document = await ensureDocumentAccess(req, req.params.documentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Unable to load comments" });
  }

  const audits = await loadAuditsForDocument(document.id, "review.comment.add");
  const users = await loadUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  const items = audits.map((audit) => {
    const metadata = audit.metadata && typeof audit.metadata === "object" ? audit.metadata : {};
    const author = usersById.get(audit.actorUserId) || null;
    return {
      id: String(metadata.commentId || audit.id),
      documentId: document.id,
      parentId: metadata.parentId ? String(metadata.parentId) : null,
      message: String(metadata.message || ""),
      createdAt: toIso(audit.createdAt),
      author: {
        userId: audit.actorUserId || null,
        fullName: author?.fullName || author?.email || "Unknown",
      },
    };
  });

  res.json({ items });
});

router.post("/:documentId/comments", idempotency, async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const parentId = req.body?.parentId ? String(req.body.parentId) : null;
  if (!message) return res.status(400).json({ error: "message is required" });

  let document;
  try {
    document = await ensureDocumentAccess(req, req.params.documentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Unable to add comment" });
  }

  const commentId = utils.makeId("rc");
  const audit = await persistAudit({
    actorUserId: req.user.id,
    action: "review.comment.add",
    entityType: "document",
    entityId: document.id,
    metadata: {
      clientId: document.clientId,
      commentId,
      parentId,
      message: message.slice(0, 2000),
    },
  });

  res.status(201).json({
    comment: {
      id: commentId,
      documentId: document.id,
      parentId,
      message: message.slice(0, 2000),
      createdAt: audit.createdAt,
      author: {
        userId: req.user.id,
        fullName: req.user.fullName || req.user.email || req.user.id,
      },
    },
  });
});

router.get("/:documentId/context", async (req, res) => {
  let document;
  try {
    document = await ensureDocumentAccess(req, req.params.documentId);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || "Unable to load review context" });
  }

  const [tasks, requests, obligations, alerts, assignments] = await Promise.all([
    db
      ? db.task.findMany({ where: { clientId: document.clientId }, orderBy: { dueDate: "asc" }, take: 8 })
      : Promise.resolve(store.tasks.filter((task) => task.clientId === document.clientId).slice(0, 8)),
    db
      ? db.request.findMany({ where: { clientId: document.clientId }, orderBy: { requestedAt: "desc" }, take: 8 })
      : Promise.resolve(store.requests.filter((request) => request.clientId === document.clientId).slice(0, 8)),
    db && db.complianceObligation
      ? db.complianceObligation.findMany({ where: { clientId: document.clientId }, orderBy: { dueDate: "asc" }, take: 8 })
      : Promise.resolve(store.complianceObligations.filter((item) => item.clientId === document.clientId).slice(0, 8)),
    db && db.complianceAlert
      ? db.complianceAlert.findMany({ where: { clientId: document.clientId }, orderBy: { createdAt: "desc" }, take: 8 })
      : Promise.resolve(store.complianceAlerts.filter((item) => item.clientId === document.clientId).slice(0, 8)),
    loadAuditsForDocument(document.id),
  ]);

  const reviewerAudit = [...assignments]
    .reverse()
    .find((audit) => String(audit.action || "").toLowerCase() === "review.assign");
  const assignmentMeta = reviewerAudit?.metadata && typeof reviewerAudit.metadata === "object" ? reviewerAudit.metadata : {};

  const users = await loadUsers();
  const reviewersById = new Map(users.map((item) => [item.id, item]));
  const reviewer = reviewersById.get(String(assignmentMeta.reviewerUserId || ""));
  const uploadedAt = new Date(document.uploadedAt || utils.nowIso());
  const ageHours = Math.max(0, Math.floor((Date.now() - uploadedAt.getTime()) / (1000 * 60 * 60)));
  const slaTargetHours = 48;

  res.json({
    document: {
      id: document.id,
      clientId: document.clientId,
      status: document.status,
      category: document.category,
      uploadedAt: document.uploadedAt,
    },
    workflow: {
      reviewerUserId: reviewer?.id || null,
      reviewerName: reviewer?.fullName || reviewer?.email || null,
      assignedAt: assignmentMeta.assignedAt || reviewerAudit?.createdAt || null,
      slaAgeHours: ageHours,
      slaTargetHours,
      slaRemainingHours: Math.max(0, slaTargetHours - ageHours),
      slaBreached: ageHours > slaTargetHours,
    },
    related: {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate,
        link: `tasks.html?clientId=${encodeURIComponent(document.clientId)}`,
      })),
      requests: requests.map((request) => ({
        id: request.id,
        title: request.title,
        status: request.status,
        dueDate: request.dueDate,
        link: `documents.html?clientId=${encodeURIComponent(document.clientId)}`,
      })),
      compliance: obligations.map((obligation) => ({
        id: obligation.id,
        source: obligation.source,
        obligationType: obligation.obligationType,
        status: obligation.status,
        dueDate: obligation.dueDate,
        link: `compliance-board.html`,
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        source: alert.source,
        title: alert.title,
        status: alert.status,
        severity: alert.severity,
        link: `compliance-board.html`,
      })),
    },
  });
});

export default router;
