import express from "express";
import { canAccessClient } from "../lib/auth.js";
import {
  getClientComplianceOverview,
  getFirmComplianceOverview,
  getFrameworkComplianceItems,
  listFirmAlerts,
  markAlertAsRead,
  syncClientCompliance,
} from "../lib/compliance/service.js";

const router = express.Router();

function resolveClientIdFromSession(req) {
  const ids = Array.isArray(req.user?.clientIds) ? req.user.clientIds : [];
  return ids.length ? ids[0] : "";
}

router.get("/frameworks", async (req, res, next) => {
  try {
    const items = await getFrameworkComplianceItems(req.user);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/overview", async (req, res, next) => {
  try {
    if (req.user.role === "accountant") {
      const firm = await getFirmComplianceOverview(req.user);
      return res.json(firm);
    }
    const clientId = resolveClientIdFromSession(req);
    if (!clientId) return res.status(400).json({ error: "Client profile is not linked." });
    const overview = await getClientComplianceOverview(req.user, clientId);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get("/client/:clientId/overview", async (req, res, next) => {
  try {
    const clientId = String(req.params.clientId || "");
    const overview = await getClientComplianceOverview(req.user, clientId);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get("/client/:clientId/events", async (req, res, next) => {
  try {
    const clientId = String(req.params.clientId || "");
    const overview = await getClientComplianceOverview(req.user, clientId);
    return res.json({ items: overview.events });
  } catch (error) {
    return next(error);
  }
});

router.get("/firm/overview", async (req, res, next) => {
  try {
    const overview = await getFirmComplianceOverview(req.user);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get("/firm/alerts", async (req, res, next) => {
  try {
    const includeResolved = String(req.query.includeResolved || "") === "true";
    const items = await listFirmAlerts(req.user, includeResolved);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post("/sync/:clientId", async (req, res, next) => {
  try {
    const clientId = String(req.params.clientId || "");
    if (!canAccessClient(req.user, clientId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const result = await syncClientCompliance(clientId, req.user.id);
    return res.json({ ok: true, clientId, snapshot: result.snapshot });
  } catch (error) {
    return next(error);
  }
});

router.post("/alerts/:alertId/read", async (req, res, next) => {
  try {
    const alertId = String(req.params.alertId || "");
    const item = await markAlertAsRead(req.user, alertId);
    return res.json({ ok: true, item });
  } catch (error) {
    return next(error);
  }
});

export default router;
