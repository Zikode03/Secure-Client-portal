import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

const ACTION_TO_STATUS = {
  approve: "approved",
  reject: "rejected",
  request_fix: "request-fix",
};

router.post("/:documentId/action", requireRole("accountant"), async (req, res) => {
  const { documentId } = req.params;
  const { action, note = "" } = req.body || {};
  const nextStatus = ACTION_TO_STATUS[action];
  if (!nextStatus) {
    return res.status(400).json({ error: "action must be approve, reject, or request_fix" });
  }

  const document = db
    ? await db.document.findUnique({ where: { id: documentId } })
    : store.documents.find((doc) => doc.id === documentId);
  if (!document) return res.status(404).json({ error: "Document not found" });
  if (!canAccessClient(req.user, document.clientId)) return res.status(403).json({ error: "Access denied" });

  const reviewedAt = utils.nowIso();
  const reviewNote = String(note).slice(0, 1000);
  if (db) {
    await db.document.update({
      where: { id: document.id },
      data: {
        status: nextStatus,
      },
    });
    document.status = nextStatus;
    document.reviewedAt = reviewedAt;
    document.reviewedBy = req.user.id;
    document.reviewNote = reviewNote;
  } else {
    document.status = nextStatus;
    document.reviewedAt = reviewedAt;
    document.reviewedBy = req.user.id;
    document.reviewNote = reviewNote;
  }

  addAudit({
    actorUserId: req.user.id,
    action: `review.${action}`,
    entityType: "document",
    entityId: document.id,
    metadata: { clientId: document.clientId, note: reviewNote },
  });

  const users = db
    ? await db.user.findMany({ where: { role: "client" } })
    : store.users.filter((u) => u.role === "client");
  for (const user of users.filter((u) => (u.clientIds || []).includes(document.clientId))) {
    addNotification({
      userId: user.id,
      type: "document_reviewed",
      title: "Document review update",
      message: `${document.name} status changed to ${nextStatus}.`,
    });
  }

  res.json({ document });
});

export default router;
