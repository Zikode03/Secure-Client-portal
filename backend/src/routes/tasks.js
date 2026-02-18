import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit, addNotification } from "../lib/audit.js";

const router = express.Router();

router.get("/", (req, res) => {
  const { clientId = "", status = "", priority = "", dueWithinDays = "" } = req.query;
  const dueWindow = Number(dueWithinDays || 0);
  const filtered = store.tasks.filter((task) => {
    const clientOk = !clientId || task.clientId === clientId;
    const statusOk = !status || task.status === status;
    const priorityOk = !priority || task.priority === priority;
    let dueOk = true;
    if (dueWindow > 0) {
      const diff = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      dueOk = diff >= 0 && diff <= dueWindow;
    }
    const permissionOk = canAccessClient(req.user, task.clientId);
    return clientOk && statusOk && priorityOk && dueOk && permissionOk;
  });
  res.json({ items: filtered });
});

router.post("/", requireRole("accountant"), (req, res) => {
  const { clientId, title, dueDate, priority = "medium" } = req.body || {};
  if (!clientId || !title || !dueDate) {
    return res.status(400).json({ error: "clientId, title and dueDate are required" });
  }
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const task = {
    id: utils.makeId("t"),
    clientId,
    title,
    status: "pending",
    dueDate,
    priority,
    createdBy: req.user.id,
    createdAt: utils.nowIso(),
  };
  store.tasks.push(task);

  addAudit({
    actorUserId: req.user.id,
    action: "task.create",
    entityType: "task",
    entityId: task.id,
    metadata: { clientId },
  });

  for (const user of store.users.filter((u) => u.role === "client" && u.clientIds.includes(clientId))) {
    addNotification({
      userId: user.id,
      type: "task_assigned",
      title: "New task assigned",
      message: title,
    });
  }

  res.status(201).json({ task });
});

router.patch("/:taskId", (req, res) => {
  const task = store.tasks.find((item) => item.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!canAccessClient(req.user, task.clientId)) return res.status(403).json({ error: "Access denied" });
  if (req.user.role === "client" && req.body.status && req.body.status !== "completed") {
    return res.status(403).json({ error: "Clients can only mark tasks completed" });
  }

  const allowed = ["title", "status", "dueDate", "priority"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) task[key] = req.body[key];
  }

  addAudit({
    actorUserId: req.user.id,
    action: "task.update",
    entityType: "task",
    entityId: task.id,
    metadata: { fields: Object.keys(req.body || {}) },
  });

  res.json({ task });
});

router.delete("/:taskId", requireRole("accountant"), (req, res) => {
  const index = store.tasks.findIndex((item) => item.id === req.params.taskId);
  if (index < 0) return res.status(404).json({ error: "Task not found" });
  const task = store.tasks[index];
  if (!canAccessClient(req.user, task.clientId)) return res.status(403).json({ error: "Access denied" });

  store.tasks.splice(index, 1);
  addAudit({
    actorUserId: req.user.id,
    action: "task.delete",
    entityType: "task",
    entityId: task.id,
  });

  res.json({ ok: true });
});

router.post("/automation/run", requireRole("accountant"), (req, res) => {
  const now = new Date();
  let remindersCreated = 0;
  let slaAlerts = 0;
  const updatedTaskIds = [];

  for (const task of store.tasks) {
    if (!canAccessClient(req.user, task.clientId)) continue;
    if (task.status === "completed") continue;

    const dueInDays = Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24));
    if (dueInDays < 0 && task.status !== "overdue") {
      task.status = "overdue";
      updatedTaskIds.push(task.id);
      slaAlerts += 1;

      addNotification({
        userId: req.user.id,
        type: "task_sla",
        title: "Task SLA breached",
        message: `${task.title} is overdue.`,
      });
    } else if (dueInDays >= 0 && dueInDays <= 2) {
      remindersCreated += 1;
      addNotification({
        userId: req.user.id,
        type: "task_reminder",
        title: "Task due soon",
        message: `${task.title} is due in ${dueInDays} day(s).`,
      });
    }
  }

  addAudit({
    actorUserId: req.user.id,
    action: "task.automation.run",
    entityType: "task",
    entityId: req.user.id,
    metadata: { remindersCreated, slaAlerts, updatedTaskIds },
  });

  res.json({ ok: true, remindersCreated, slaAlerts, updatedTaskIds });
});

export default router;
