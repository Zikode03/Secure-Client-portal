import express from "express";
import { requireRole } from "../lib/auth.js";
import { store } from "../lib/store.js";

const router = express.Router();

router.get("/", requireRole("accountant"), (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const action = String(req.query.action || "").toLowerCase();
  const entityType = String(req.query.entityType || "").toLowerCase();
  const actorUserId = String(req.query.actorUserId || "");

  const items = store.audits
    .filter((item) => !action || item.action.toLowerCase().includes(action))
    .filter((item) => !entityType || item.entityType.toLowerCase() === entityType)
    .filter((item) => !actorUserId || item.actorUserId === actorUserId)
    .slice(0, limit);
  res.json({ items });
});

export default router;
