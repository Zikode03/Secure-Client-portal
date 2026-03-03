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
  const docsSource = db ? await db.document.findMany() : store.documents;
  const clientsSource = db ? await db.client.findMany() : store.clients;
  const items = docsSource
    .filter((doc) => canAccessClient(req.user, doc.clientId))
    .filter((doc) => ["pending", "in-review", "review", "request-fix"].includes(String(doc.status || "").toLowerCase()))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
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
        sizeBytes: doc.sizeBytes,
      };
    });

  res.json({ items, generatedAt: new Date().toISOString() });
});

export default router;
