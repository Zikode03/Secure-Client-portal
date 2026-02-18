import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";

const router = express.Router();

const ACTION_TO_STATUS = {
  approve: "approved",
  reject: "rejected",
  request_fix: "request-fix",
};

router.post("/:documentId/action", requireRole("accountant"), (req, res) => {
  const { documentId } = req.params;
  const { action, note = "" } = req.body || {};
  const nextStatus = ACTION_TO_STATUS[action];
  if (!nextStatus) {
    return res.status(400).json({ error: "action must be approve, reject, or request_fix" });
  }

  const document = store.documents.find((doc) => doc.id === documentId);
  if (!document) return res.status(404).json({ error: "Document not found" });
  if (!canAccessClient(req.user, document.clientId)) return res.status(403).json({ error: "Access denied" });

  document.status = nextStatus;
  document.reviewedAt = utils.nowIso();
  document.reviewedBy = req.user.id;
  document.reviewNote = String(note).slice(0, 1000);

  addAudit({
    actorUserId: req.user.id,
    action: `review.${action}`,
    entityType: "document",
    entityId: document.id,
    metadata: { clientId: document.clientId, note: document.reviewNote },
  });

  for (const user of store.users.filter((u) => u.role === "client" && u.clientIds.includes(document.clientId))) {
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
