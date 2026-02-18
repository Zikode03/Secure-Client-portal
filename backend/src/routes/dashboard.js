import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store } from "../lib/store.js";

const router = express.Router();

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

router.get("/summary", requireRole("accountant"), (req, res) => {
  const visibleClientIds = req.user.clientIds;
  const visibleClients = store.clients.filter((client) => visibleClientIds.includes(client.id));
  const visibleTasks = store.tasks.filter((task) => visibleClientIds.includes(task.clientId));
  const visibleDocuments = store.documents.filter((doc) => visibleClientIds.includes(doc.clientId));

  const activeClients = visibleClients.filter((client) => client.status === "active").length;
  const pendingReviews = visibleDocuments.filter((doc) => ["pending", "in-review", "review"].includes(doc.status)).length;
  const criticalTasks = visibleTasks.filter(
    (task) => task.priority === "high" && ["pending", "in-progress", "review"].includes(task.status)
  ).length;
  const upcomingDeadlines = visibleTasks.filter((task) => {
    const days = daysUntil(task.dueDate);
    return days >= 0 && days <= 7;
  }).length;

  const reviewQueue = visibleDocuments
    .filter((doc) => ["pending", "in-review", "review"].includes(doc.status))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 8)
    .map((doc) => {
      const client = store.clients.find((c) => c.id === doc.clientId);
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
    const pendingItems = store.documents.filter(
      (doc) => doc.clientId === client.id && ["pending", "in-review", "review"].includes(doc.status)
    ).length;
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
    stats: {
      activeClients,
      pendingReviews,
      criticalTasks,
      upcomingDeadlines,
    },
    reviewQueue,
    assignedClients,
  });
});

router.get("/review-queue", requireRole("accountant"), (req, res) => {
  const items = store.documents
    .filter((doc) => canAccessClient(req.user, doc.clientId))
    .filter((doc) => ["pending", "in-review", "review", "request-fix"].includes(doc.status))
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .map((doc) => {
      const client = store.clients.find((c) => c.id === doc.clientId);
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

  res.json({ items });
});

export default router;
