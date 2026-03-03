import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function isPendingReviewStatus(status) {
  return ["pending", "in-review", "review", "request-fix"].includes(String(status || "").toLowerCase());
}

function isOpenTaskStatus(status) {
  return ["pending", "in-progress", "review", "overdue"].includes(String(status || "").toLowerCase());
}

function toTime(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function categoryWeight(category) {
  const normalized = String(category || "").toLowerCase();
  if (normalized.includes("tax")) return 22;
  if (normalized.includes("invoice")) return 18;
  if (normalized.includes("payroll")) return 14;
  if (normalized.includes("bank")) return 12;
  return 10;
}

function dueDatePriorityScore(dueDate) {
  const dueTs = toTime(dueDate);
  if (!dueTs) return 5;
  const days = Math.ceil((dueTs - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 35;
  if (days <= 3) return 28;
  if (days <= 7) return 20;
  if (days <= 14) return 12;
  return 5;
}

function riskScoreFromClient(client) {
  const health = Number(client?.complianceHealth || 100);
  return Math.max(0, Math.min(35, Math.round((100 - health) * 0.5)));
}

function statusFromPriority(priorityScore) {
  if (priorityScore >= 70) return "high";
  if (priorityScore >= 40) return "medium";
  return "low";
}

function computeKpis(visibleClients, visibleTasks, visibleDocuments) {
  const activeClients = visibleClients.filter((client) => String(client.status || "").toLowerCase() === "active").length;
  const pendingReviews = visibleDocuments.filter((doc) => isPendingReviewStatus(doc.status)).length;
  const criticalTasks = visibleTasks.filter(
    (task) => String(task.priority || "").toLowerCase() === "high" && isOpenTaskStatus(task.status)
  ).length;
  const upcomingDeadlines = visibleTasks.filter((task) => {
    const days = daysUntil(task.dueDate);
    return days >= 0 && days <= 7 && String(task.status || "").toLowerCase() !== "completed";
  }).length;

  return { activeClients, pendingReviews, criticalTasks, upcomingDeadlines };
}

router.get("/summary", requireRole("accountant"), async (req, res) => {
  const visibleClientIds = req.user.clientIds;
  const clientsSource = db ? await db.client.findMany() : store.clients;
  const tasksSource = db ? await db.task.findMany() : store.tasks;
  const docsSource = db ? await db.document.findMany() : store.documents;

  const visibleClients = clientsSource.filter((client) => visibleClientIds.includes(client.id));
  const visibleTasks = tasksSource.filter((task) => visibleClientIds.includes(task.clientId));
  const visibleDocuments = docsSource.filter((doc) => visibleClientIds.includes(doc.clientId));
  const stats = computeKpis(visibleClients, visibleTasks, visibleDocuments);

  const reviewQueue = visibleDocuments
    .filter((doc) => isPendingReviewStatus(doc.status))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 8)
    .map((doc) => {
      const client = clientsSource.find((c) => c.id === doc.clientId);
      return {
        id: doc.id,
        documentName: doc.name,
        category: doc.category,
        status: doc.status,
        clientId: doc.clientId,
        clientName: client?.name || doc.clientId,
        uploadedAt: doc.uploadedAt,
      };
    });

  const assignedClients = visibleClients.map((client) => {
    const pendingItems = docsSource.filter((doc) => doc.clientId === client.id && isPendingReviewStatus(doc.status)).length;
    return {
      id: client.id,
      name: client.name,
      status: client.status,
      complianceHealth: client.complianceHealth,
      pendingItems,
      lastActivity: client.createdAt,
    };
  });

  res.json({
    stats,
    generatedAt: new Date().toISOString(),
    reviewQueue,
    assignedClients,
  });
});

router.get("/kpis", requireRole("accountant"), async (req, res) => {
  const visibleClientIds = req.user.clientIds;
  const clientsSource = db ? await db.client.findMany() : store.clients;
  const tasksSource = db ? await db.task.findMany() : store.tasks;
  const docsSource = db ? await db.document.findMany() : store.documents;

  const visibleClients = clientsSource.filter((client) => visibleClientIds.includes(client.id));
  const visibleTasks = tasksSource.filter((task) => visibleClientIds.includes(task.clientId));
  const visibleDocuments = docsSource.filter((doc) => visibleClientIds.includes(doc.clientId));
  const stats = computeKpis(visibleClients, visibleTasks, visibleDocuments);

  res.json({
    generatedAt: new Date().toISOString(),
    freshnessSeconds: 90,
    formulas: {
      activeClients: "clients.status == active",
      pendingReviews: "documents.status in [pending,in-review,review,request-fix]",
      criticalTasks: "tasks.priority == high AND tasks.status in [pending,in-progress,review,overdue]",
      upcomingDeadlines: "tasks.dueDate within 7 days AND tasks.status != completed",
    },
    stats,
  });
});

router.get("/review-queue", requireRole("accountant"), async (req, res) => {
  const [docsSource, clientsSource, tasksSource, usersSource, obligationsSource, alertsSource] = await Promise.all([
    db ? db.document.findMany() : Promise.resolve(store.documents),
    db ? db.client.findMany() : Promise.resolve(store.clients),
    db ? db.task.findMany() : Promise.resolve(store.tasks),
    db ? db.user.findMany() : Promise.resolve(store.users),
    db && db.complianceObligation ? db.complianceObligation.findMany() : Promise.resolve(store.complianceObligations),
    db && db.complianceAlert ? db.complianceAlert.findMany() : Promise.resolve(store.complianceAlerts),
  ]);

  const queueDocs = docsSource
    .filter((doc) => canAccessClient(req.user, doc.clientId))
    .filter((doc) => isPendingReviewStatus(doc.status));

  const docIds = queueDocs.map((doc) => doc.id);
  const auditsSource = db
    ? await db.audit.findMany({
      where: {
        entityType: "document",
        entityId: { in: docIds },
      },
      orderBy: { createdAt: "desc" },
    })
    : store.audits
      .filter((audit) => audit.entityType === "document" && docIds.includes(audit.entityId))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const usersById = new Map(usersSource.map((user) => [user.id, user]));
  const assignmentsByDocId = new Map();
  for (const audit of auditsSource) {
    if (String(audit.action || "").toLowerCase() !== "review.assign") continue;
    if (assignmentsByDocId.has(audit.entityId)) continue;
    const metadata = audit.metadata && typeof audit.metadata === "object" ? audit.metadata : {};
    const reviewerUserId = String(metadata.reviewerUserId || "");
    if (!reviewerUserId) continue;
    assignmentsByDocId.set(audit.entityId, {
      reviewerUserId,
      reviewerName: usersById.get(reviewerUserId)?.fullName || usersById.get(reviewerUserId)?.email || reviewerUserId,
      assignedAt: metadata.assignedAt || audit.createdAt,
      assignedByUserId: audit.actorUserId || null,
    });
  }

  const clientDueDateMap = new Map();
  for (const task of tasksSource) {
    if (!canAccessClient(req.user, task.clientId)) continue;
    if (String(task.status || "").toLowerCase() === "completed") continue;
    const dueTs = toTime(task.dueDate);
    if (!dueTs) continue;
    const prev = clientDueDateMap.get(task.clientId);
    if (!prev || dueTs < toTime(prev.dueDate)) {
      clientDueDateMap.set(task.clientId, {
        dueDate: task.dueDate,
        source: "task",
        title: task.title,
      });
    }
  }

  for (const obligation of obligationsSource) {
    if (!canAccessClient(req.user, obligation.clientId)) continue;
    const normalizedStatus = String(obligation.status || "").toLowerCase();
    if (!["overdue", "due_soon", "non_compliant"].includes(normalizedStatus)) continue;
    const dueTs = toTime(obligation.dueDate);
    if (!dueTs) continue;
    const prev = clientDueDateMap.get(obligation.clientId);
    if (!prev || dueTs < toTime(prev.dueDate)) {
      clientDueDateMap.set(obligation.clientId, {
        dueDate: obligation.dueDate,
        source: "compliance",
        title: obligation.obligationType || "Compliance obligation",
      });
    }
  }

  const escalatedByClient = new Map();
  for (const alert of alertsSource) {
    if (!canAccessClient(req.user, alert.clientId)) continue;
    if (String(alert.status || "").toLowerCase() !== "escalated") continue;
    if (escalatedByClient.has(alert.clientId)) continue;
    escalatedByClient.set(alert.clientId, {
      escalatedAt: alert.updatedAt || alert.createdAt || null,
      escalatedByUserId: alert.assignedUserId || null,
      escalationReason: String(alert.message || "Escalated compliance alert"),
    });
  }

  const items = queueDocs
    .map((doc) => {
      const client = clientsSource.find((c) => c.id === doc.clientId);
      const dueContext = clientDueDateMap.get(doc.clientId) || null;
      const ageHours = Math.max(0, Math.floor((Date.now() - toTime(doc.uploadedAt)) / (1000 * 60 * 60)));
      const slaRemainingHours = Math.max(0, 48 - ageHours);
      const slaBreached = ageHours > 48;
      const riskScore = riskScoreFromClient(client);
      const dueScore = dueDatePriorityScore(dueContext?.dueDate || null);
      const catScore = categoryWeight(doc.category);
      const slaScore = slaBreached ? Math.min(35, 18 + Math.round((ageHours - 48) / 2)) : ageHours > 24 ? 10 : 4;
      const escalationScore = escalatedByClient.has(doc.clientId) ? 10 : 0;
      const priorityScore = riskScore + dueScore + catScore + slaScore + escalationScore;
      const assignment = assignmentsByDocId.get(doc.id) || null;
      const escalation = escalatedByClient.get(doc.clientId) || null;
      return {
        id: doc.id,
        documentName: doc.name,
        category: doc.category,
        status: doc.status,
        clientId: doc.clientId,
        clientName: client?.name || doc.clientId,
        uploadedAt: doc.uploadedAt,
        sizeBytes: doc.sizeBytes,
        priorityScore,
        priorityBand: statusFromPriority(priorityScore),
        priorityReason: {
          riskScore,
          dueScore,
          categoryScore: catScore,
          slaScore,
          escalationScore,
          dueContext,
        },
        reviewerUserId: assignment?.reviewerUserId || null,
        reviewerName: assignment?.reviewerName || null,
        reviewerAssignedAt: assignment?.assignedAt || null,
        slaAgeHours: ageHours,
        slaTargetHours: 48,
        slaRemainingHours,
        slaBreached,
        escalated: Boolean(escalation) || slaBreached,
        escalatedAt: escalation?.escalatedAt || null,
        escalatedByUserId: escalation?.escalatedByUserId || null,
        escalationReason: escalation?.escalationReason || (slaBreached ? "Review SLA breached" : null),
      };
    })
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return toTime(b.uploadedAt) - toTime(a.uploadedAt);
    });

  res.json({
    items,
    generatedAt: new Date().toISOString(),
    orderingPolicy: "priority_score_desc_then_uploadedAt_desc",
  });
});

export default router;
