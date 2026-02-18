import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";

const router = express.Router();

router.get("/", (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();

  const visible = store.clients.filter((client) => canAccessClient(req.user, client.id));
  const filtered = visible.filter((client) => {
    const statusOk = !status || client.status.toLowerCase() === status;
    const searchOk =
      !search ||
      client.name.toLowerCase().includes(search) ||
      client.entityType.toLowerCase().includes(search) ||
      client.primaryContact.toLowerCase().includes(search);
    return statusOk && searchOk;
  });

  res.json({ items: filtered });
});

router.get("/:clientId", (req, res) => {
  const client = store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ client });
});

router.post("/", requireRole("accountant"), (req, res) => {
  const { name, entityType, primaryContact, email } = req.body || {};
  if (!name || !entityType || !primaryContact || !email) {
    return res.status(400).json({ error: "name, entityType, primaryContact and email are required" });
  }

  const client = {
    id: utils.makeId("c"),
    name,
    entityType,
    status: "pending",
    complianceHealth: 0,
    assignedAccountantId: req.user.id,
    primaryContact,
    email,
    createdAt: utils.nowIso(),
  };
  store.clients.push(client);

  const linkedUser = store.users.find((user) => user.id === req.user.id);
  if (linkedUser && !linkedUser.clientIds.includes(client.id)) {
    linkedUser.clientIds.push(client.id);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
  });

  res.status(201).json({ client });
});

router.patch("/:clientId", requireRole("accountant"), (req, res) => {
  const client = store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) return res.status(403).json({ error: "Access denied" });

  const allowed = ["name", "entityType", "status", "complianceHealth", "primaryContact", "email"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) client[key] = req.body[key];
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.update",
    entityType: "client",
    entityId: client.id,
    metadata: { fields: Object.keys(req.body || {}) },
  });

  res.json({ client });
});

export default router;
