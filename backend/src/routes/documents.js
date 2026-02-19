import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { addAudit } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.get("/", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();
  const clientId = String(req.query.clientId || "");
  const category = String(req.query.category || "").toLowerCase();

  const sourceDocuments = db ? await db.document.findMany() : store.documents;
  const items = sourceDocuments.filter((doc) => {
    if (!canAccessClient(req.user, doc.clientId)) return false;
    if (clientId && doc.clientId !== clientId) return false;
    if (status && doc.status.toLowerCase() !== status) return false;
    if (category && doc.category.toLowerCase() !== category) return false;
    if (
      search &&
      !doc.name.toLowerCase().includes(search) &&
      !doc.category.toLowerCase().includes(search) &&
      !doc.clientId.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });

  res.json({ items });
});

router.post("/", async (req, res) => {
  const { clientId, name, category = "Uncategorized", status = "pending", sizeBytes = 0 } = req.body || {};
  if (!clientId || !name) return res.status(400).json({ error: "clientId and name are required" });
  if (!canAccessClient(req.user, clientId)) return res.status(403).json({ error: "Access denied" });

  const document = {
    id: utils.makeId("d"),
    clientId,
    name,
    category,
    status,
    sizeBytes: Number(sizeBytes) || 0,
    key: null,
    uploadedBy: req.user.id,
    uploadedAt: utils.nowIso(),
  };
  if (db) {
    await db.document.create({ data: document });
  } else {
    store.documents.unshift(document);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "document.create",
    entityType: "document",
    entityId: document.id,
    metadata: { clientId },
  });

  res.status(201).json({ document });
});

router.patch("/:documentId/status", requireRole("accountant"), async (req, res) => {
  const document = db
    ? await db.document.findUnique({ where: { id: req.params.documentId } })
    : store.documents.find((doc) => doc.id === req.params.documentId);
  if (!document) return res.status(404).json({ error: "Document not found" });
  if (!canAccessClient(req.user, document.clientId)) return res.status(403).json({ error: "Access denied" });

  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status is required" });
  const nextStatus = String(status);
  if (db) {
    await db.document.update({
      where: { id: document.id },
      data: { status: nextStatus },
    });
    document.status = nextStatus;
  } else {
    document.status = nextStatus;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "document.status.update",
    entityType: "document",
    entityId: document.id,
    metadata: { status },
  });

  res.json({ document });
});

router.get("/:documentId/download-url", async (req, res) => {
  return res.status(410).json({ error: "Document file downloads are disabled in this system." });
});

export default router;
