import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.get("/", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const status = String(req.query.status || "").toLowerCase();

  const sourceClients = db ? await db.client.findMany() : store.clients;
  const visible = sourceClients.filter((client) => canAccessClient(req.user, client.id));
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

router.get("/:clientId", async (req, res) => {
  const client = db
    ? await db.client.findUnique({ where: { id: req.params.clientId } })
    : store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ client });
});

router.post("/", requireRole("accountant"), async (req, res) => {
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

  if (db) {
    await db.client.create({ data: client });
    const accountant = await db.user.findUnique({ where: { id: req.user.id } });
    if (accountant) {
      const ids = Array.isArray(accountant.clientIds) ? accountant.clientIds : [];
      if (!ids.includes(client.id)) {
        await db.user.update({
          where: { id: req.user.id },
          data: { clientIds: [...ids, client.id] },
        });
      }
    }
  } else {
    store.clients.push(client);
  }

  if (!db) {
    const linkedUser = store.users.find((user) => user.id === req.user.id);
    if (linkedUser && !linkedUser.clientIds.includes(client.id)) {
      linkedUser.clientIds.push(client.id);
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
  });

  res.status(201).json({ client });
});

router.patch("/:clientId", requireRole("accountant"), async (req, res) => {
  const client = db
    ? await db.client.findUnique({ where: { id: req.params.clientId } })
    : store.clients.find((item) => item.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });
  if (!canAccessClient(req.user, client.id)) return res.status(403).json({ error: "Access denied" });

  const allowed = ["name", "entityType", "status", "complianceHealth", "primaryContact", "email"];
  const updateData = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
      client[key] = req.body[key];
    }
  }

  if (db && Object.keys(updateData).length) {
    await db.client.update({
      where: { id: client.id },
      data: updateData,
    });
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
