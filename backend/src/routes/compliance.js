import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import {
  acknowledgeAlert,
  assignObligation,
  attachObligationEvidence,
  getClientActionCenter,
  getClientComplianceOverview,
  getClientComplianceReport,
  getClientTimeline,
  getFirmComplianceReportCsv,
  getFirmHeatmap,
  getFirmComplianceOverview,
  getCompliancePortfolio,
  getFrameworkComplianceItems,
  getSyncDiagnostics,
  listFirmAlerts,
  markAlertAsRead,
  runEscalationRules,
  runReminderRules,
  syncClientCompliance,
  updateAlertLifecycle,
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
    const items = await getClientTimeline(req.user, clientId, {
      source: String(req.query.source || ""),
      obligationType: String(req.query.obligationType || ""),
      eventType: String(req.query.eventType || ""),
      limit: Number(req.query.limit || 200),
    });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/client/:clientId/actions", async (req, res, next) => {
  try {
    const clientId = String(req.params.clientId || "");
    const payload = await getClientActionCenter(req.user, clientId);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/firm/overview", requireRole("accountant"), async (req, res, next) => {
  try {
    const overview = await getFirmComplianceOverview(req.user);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get("/portfolio", requireRole("accountant"), async (req, res, next) => {
  try {
    const payload = await getCompliancePortfolio(req.user, {
      status: String(req.query.status || ""),
      source: String(req.query.source || ""),
      owner: String(req.query.owner || ""),
      overdueOnly: String(req.query.overdueOnly || ""),
      sortBy: String(req.query.sortBy || ""),
      sortDir: String(req.query.sortDir || ""),
    });
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/firm/alerts", requireRole("accountant"), async (req, res, next) => {
  try {
    const includeResolved = String(req.query.includeResolved || "") === "true";
    const items = await listFirmAlerts(req.user, includeResolved);
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get("/firm/heatmap", requireRole("accountant"), async (req, res, next) => {
  try {
    const payload = await getFirmHeatmap(req.user);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/diagnostics/sync", requireRole("accountant"), async (req, res, next) => {
  try {
    const payload = await getSyncDiagnostics(req.user);
    return res.json(payload);
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

router.post("/alerts/:alertId/lifecycle", async (req, res, next) => {
  try {
    const alertId = String(req.params.alertId || "");
    const item = await updateAlertLifecycle(req.user, alertId, req.body || {});
    return res.json({ ok: true, item });
  } catch (error) {
    return next(error);
  }
});

router.post("/alerts/:alertId/acknowledge", async (req, res, next) => {
  try {
    const alertId = String(req.params.alertId || "");
    const item = await acknowledgeAlert(req.user, alertId, String(req.body?.note || ""));
    return res.json({ ok: true, item });
  } catch (error) {
    return next(error);
  }
});

router.post("/obligations/:obligationId/assign", async (req, res, next) => {
  try {
    const obligationId = String(req.params.obligationId || "");
    const item = await assignObligation(req.user, obligationId, req.body || {});
    return res.json({ ok: true, item });
  } catch (error) {
    return next(error);
  }
});

router.post("/obligations/:obligationId/evidence", async (req, res, next) => {
  try {
    const obligationId = String(req.params.obligationId || "");
    const item = await attachObligationEvidence(req.user, obligationId, req.body || {});
    return res.json({ ok: true, item });
  } catch (error) {
    return next(error);
  }
});

router.post("/rules/escalations/run", requireRole("accountant"), async (req, res, next) => {
  try {
    const payload = await runEscalationRules();
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return next(error);
  }
});

router.post("/rules/reminders/run", requireRole("accountant"), async (req, res, next) => {
  try {
    const payload = await runReminderRules();
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return next(error);
  }
});

router.get("/reports/client/:clientId", async (req, res, next) => {
  try {
    const clientId = String(req.params.clientId || "");
    const report = await getClientComplianceReport(req.user, clientId);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

router.get("/reports/firm.csv", requireRole("accountant"), async (req, res, next) => {
  try {
    const csv = await getFirmComplianceReportCsv(req.user);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="firm-compliance-report.csv"');
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
});

export default router;
