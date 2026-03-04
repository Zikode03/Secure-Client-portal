import express from "express";
import { canAccessClient, requireRole } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { idempotencyMiddleware } from "../lib/idempotency.js";
import { asEnum, asNonEmptyString } from "../lib/validation.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;
const idempotency = idempotencyMiddleware();

const TASK_STATUSES = ["pending", "in-progress", "review", "completed", "overdue", "not-started", "blocked"];
const PRIORITIES = ["low", "medium", "high"];
const DEPENDENCY_TYPES = ["none", "document", "review", "compliance"];
const RECURRENCE_RULES = ["none", "weekly", "monthly", "quarterly"];

function requireTaskAdmin(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "accountant_admin") {
    return res.status(403).json({ error: "Task manager is admin-only" });
  }
  return next();
}

router.use(requireTaskAdmin);

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toTime(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isOpenTaskStatus(status) {
  return String(status || "").toLowerCase() !== "completed";
}

function daysUntil(value) {
  const ts = toTime(value);
  if (!ts) return Number.POSITIVE_INFINITY;
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

function normalizeStringList(value, max = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeTaskMeta(input = {}) {
  const output = {};
  if (input.ownerUserId !== undefined) output.ownerUserId = String(input.ownerUserId || "").trim();
  if (input.dependencyType !== undefined) {
    const raw = String(input.dependencyType || "").trim().toLowerCase();
    output.dependencyType = DEPENDENCY_TYPES.includes(raw) ? raw : "none";
  }
  if (input.dependencyRef !== undefined) output.dependencyRef = String(input.dependencyRef || "").trim().slice(0, 160);
  if (input.dependencyIds !== undefined) output.dependencyIds = normalizeStringList(input.dependencyIds, 20);
  if (input.recurrenceRule !== undefined) {
    const raw = String(input.recurrenceRule || "").trim().toLowerCase();
    output.recurrenceRule = RECURRENCE_RULES.includes(raw) ? raw : "none";
  }
  if (input.templateId !== undefined) output.templateId = String(input.templateId || "").trim().slice(0, 48);
  if (input.completionNotes !== undefined) output.completionNotes = String(input.completionNotes || "").trim().slice(0, 1000);
  return output;
}

function parseTaskMeta(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const candidate = metadata.taskMeta;
  if (!candidate || typeof candidate !== "object") return null;
  return normalizeTaskMeta(candidate);
}

function mergeTaskMeta(prev = {}, patch = {}) {
  return {
    ...prev,
    ...patch,
  };
}

function recurrenceIntervalDays(rule) {
  switch (String(rule || "none")) {
    case "weekly": return 7;
    case "monthly": return 30;
    case "quarterly": return 90;
    default: return 0;
  }
}

function shouldGenerateTemplate(template) {
  if (!template || !template.enabled) return false;
  const interval = recurrenceIntervalDays(template.recurrenceRule);
  const last = toTime(template.lastGeneratedAt);
  if (!interval) return !last;
  if (!last) return true;
  return Date.now() - last >= interval * 24 * 60 * 60 * 1000;
}

function buildTaskTemplate(raw, previous = null) {
  const value = raw || {};
  const title = asNonEmptyString(value.title || previous?.title || "", { max: 160 });
  const priority = asEnum(value.priority || previous?.priority || "medium", PRIORITIES, "medium");
  const dependencyType = asEnum(value.dependencyType || previous?.dependencyType || "none", DEPENDENCY_TYPES, "none");
  const recurrenceRule = asEnum(value.recurrenceRule || previous?.recurrenceRule || "none", RECURRENCE_RULES, "none");
  const defaultDueInDays = Math.max(0, Math.min(180, Number(value.defaultDueInDays ?? previous?.defaultDueInDays ?? 7) || 7));
  const clientIds = normalizeStringList(value.clientIds ?? previous?.clientIds ?? [], 200);
  const ownerUserId = String(value.ownerUserId ?? previous?.ownerUserId ?? "").trim();
  const dependencyRef = String(value.dependencyRef ?? previous?.dependencyRef ?? "").trim().slice(0, 160);
  const enabled = value.enabled === undefined ? Boolean(previous?.enabled ?? true) : Boolean(value.enabled);
  const now = utils.nowIso();
  return {
    id: previous?.id || utils.makeId("tt"),
    title,
    priority,
    dependencyType,
    dependencyRef,
    recurrenceRule,
    defaultDueInDays,
    clientIds,
    ownerUserId,
    enabled,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    lastGeneratedAt: previous?.lastGeneratedAt || null,
  };
}

function buildAutomationRule(raw, previous = null) {
  const value = raw || {};
  const trigger = asEnum(value.trigger || previous?.trigger || "due_soon", ["due_soon", "overdue"], "due_soon");
  const action = asEnum(value.action || previous?.action || "notify_owner", ["notify_owner", "escalate_priority"], "notify_owner");
  const thresholdDays = Math.max(0, Math.min(60, Number(value.thresholdDays ?? previous?.thresholdDays ?? 2) || 2));
  const enabled = value.enabled === undefined ? Boolean(previous?.enabled ?? true) : Boolean(value.enabled);
  const now = utils.nowIso();
  return {
    id: previous?.id || utils.makeId("tr"),
    trigger,
    action,
    thresholdDays,
    enabled,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
}

async function getUserById(userId) {
  if (!userId) return null;
  return db ? db.user.findUnique({ where: { id: userId } }) : store.users.find((user) => user.id === userId) || null;
}

async function saveUserProfile(userId, profile) {
  if (db) {
    await db.user.update({
      where: { id: userId },
      data: { profile },
    });
    return;
  }
  const user = store.users.find((item) => item.id === userId);
  if (!user) return;
  user.profile = profile;
}

async function getTaskConfigForUser(userId) {
  const user = await getUserById(userId);
  if (!user) {
    return { user: null, templates: [], automationRules: [] };
  }
  const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
  const templates = Array.isArray(profile.taskTemplates)
    ? profile.taskTemplates.map((item) => {
      try { return buildTaskTemplate(item, item); } catch { return null; }
    }).filter(Boolean)
    : [];
  const automationRules = Array.isArray(profile.taskAutomationRules)
    ? profile.taskAutomationRules.map((item) => {
      try { return buildAutomationRule(item, item); } catch { return null; }
    }).filter(Boolean)
    : [];
  return { user, templates, automationRules };
}

async function saveTaskConfigForUser(userId, templates, automationRules) {
  const user = await getUserById(userId);
  if (!user) return;
  const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
  profile.taskTemplates = templates;
  profile.taskAutomationRules = automationRules;
  await saveUserProfile(userId, profile);
}

async function loadTaskMetaMap(taskIds = []) {
  const ids = Array.from(new Set(taskIds.filter(Boolean)));
  const map = new Map();
  if (!ids.length) return map;

  if (db) {
    const audits = await db.audit.findMany({
      where: {
        entityType: "task",
        entityId: { in: ids },
      },
      orderBy: { createdAt: "asc" },
    });
    for (const audit of audits) {
      const patch = parseTaskMeta(audit.metadata);
      if (!patch) continue;
      const prev = map.get(audit.entityId) || {};
      map.set(audit.entityId, mergeTaskMeta(prev, patch));
    }
    return map;
  }

  for (const task of store.tasks.filter((item) => ids.includes(item.id))) {
    if (task.meta && typeof task.meta === "object") {
      map.set(task.id, normalizeTaskMeta(task.meta));
    }
  }
  const audits = store.audits
    .filter((audit) => audit.entityType === "task" && ids.includes(audit.entityId))
    .sort((a, b) => (String(a.createdAt) < String(b.createdAt) ? -1 : 1));
  for (const audit of audits) {
    const patch = parseTaskMeta(audit.metadata);
    if (!patch) continue;
    const prev = map.get(audit.entityId) || {};
    map.set(audit.entityId, mergeTaskMeta(prev, patch));
  }
  return map;
}

async function getAllUsers() {
  return db ? db.user.findMany() : store.users;
}

function buildUserMap(users = []) {
  return new Map(users.map((user) => [user.id, user]));
}

function decorateTask(task, metaMap, userMap) {
  const meta = metaMap.get(task.id) || {};
  const dependencyType = meta.dependencyType || "none";
  const dependencyRef = meta.dependencyRef || "";
  const ownerUserId = meta.ownerUserId || task.createdBy || "";
  const owner = userMap.get(ownerUserId) || null;
  const dueInDays = daysUntil(task.dueDate);
  const blocked = dependencyType !== "none" && isOpenTaskStatus(task.status) && String(task.status || "") !== "in-progress";
  const createdAtTs = toTime(task.createdAt);
  const slaAgeDays = createdAtTs ? Math.max(0, Math.floor((Date.now() - createdAtTs) / (1000 * 60 * 60 * 24))) : 0;
  return {
    ...task,
    dueDate: toIso(task.dueDate),
    createdAt: toIso(task.createdAt),
    ownerUserId,
    ownerName: owner?.fullName || "Unassigned",
    dependencyType,
    dependencyRef,
    dependencyIds: Array.isArray(meta.dependencyIds) ? meta.dependencyIds : [],
    recurrenceRule: meta.recurrenceRule || "none",
    completionNotes: meta.completionNotes || "",
    templateId: meta.templateId || "",
    blocked,
    slaAgeDays,
    dueInDays,
  };
}

router.get("/", async (req, res) => {
  const {
    clientId = "",
    status = "",
    priority = "",
    dueWithinDays = "",
    ownerUserId = "",
    dependencyType = "",
    blockedOnly = "",
  } = req.query;
  const dueWindow = Number(dueWithinDays || 0);
  const sourceTasks = db ? await db.task.findMany() : store.tasks;
  const scoped = sourceTasks.filter((task) => {
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
  const [users, taskMeta] = await Promise.all([
    getAllUsers(),
    loadTaskMetaMap(scoped.map((task) => task.id)),
  ]);
  const userMap = buildUserMap(users);
  let items = scoped.map((task) => decorateTask(task, taskMeta, userMap));
  if (ownerUserId) items = items.filter((task) => task.ownerUserId === ownerUserId);
  if (dependencyType) items = items.filter((task) => task.dependencyType === dependencyType);
  if (String(blockedOnly).toLowerCase() === "true") items = items.filter((task) => task.blocked);
  items.sort((a, b) => toTime(a.dueDate) - toTime(b.dueDate));
  res.json({ items });
});

router.get("/capacity", requireRole("accountant"), async (req, res) => {
  const sourceTasks = db ? await db.task.findMany() : store.tasks;
  const visibleTasks = sourceTasks.filter((task) => canAccessClient(req.user, task.clientId));
  const [users, taskMeta] = await Promise.all([
    getAllUsers(),
    loadTaskMetaMap(visibleTasks.map((task) => task.id)),
  ]);
  const userMap = buildUserMap(users);
  const buckets = new Map();

  for (const task of visibleTasks) {
    const decorated = decorateTask(task, taskMeta, userMap);
    const ownerUserId = decorated.ownerUserId || "unassigned";
    const ownerName = decorated.ownerUserId ? decorated.ownerName : "Unassigned";
    const entry = buckets.get(ownerUserId) || {
      ownerUserId,
      ownerName,
      openTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      dueSoonTasks: 0,
      blockedTasks: 0,
      highPriorityOpen: 0,
    };

    if (isOpenTaskStatus(decorated.status)) {
      entry.openTasks += 1;
      if (decorated.priority === "high") entry.highPriorityOpen += 1;
      if (decorated.status === "overdue" || decorated.dueInDays < 0) entry.overdueTasks += 1;
      if (decorated.dueInDays >= 0 && decorated.dueInDays <= 7) entry.dueSoonTasks += 1;
      if (decorated.blocked) entry.blockedTasks += 1;
    } else {
      entry.completedTasks += 1;
    }
    buckets.set(ownerUserId, entry);
  }

  const items = Array.from(buckets.values()).sort((a, b) => b.openTasks - a.openTasks);
  res.json({
    items,
    totals: {
      owners: items.length,
      openTasks: items.reduce((sum, item) => sum + item.openTasks, 0),
      overdueTasks: items.reduce((sum, item) => sum + item.overdueTasks, 0),
      blockedTasks: items.reduce((sum, item) => sum + item.blockedTasks, 0),
    },
  });
});

router.get("/templates", requireRole("accountant"), async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  res.json({
    templates: configForUser.templates,
    automationRules: configForUser.automationRules,
  });
});

router.post("/templates", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  let template;
  try {
    template = buildTaskTemplate(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid template payload" });
  }
  configForUser.templates.push(template);
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.template.create",
    entityType: "task_template",
    entityId: template.id,
    metadata: { title: template.title },
  });
  res.status(201).json({ template });
});

router.patch("/templates/:templateId", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  const idx = configForUser.templates.findIndex((item) => item.id === req.params.templateId);
  if (idx < 0) return res.status(404).json({ error: "Template not found" });
  let next;
  try {
    next = buildTaskTemplate(req.body || {}, configForUser.templates[idx]);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid template payload" });
  }
  configForUser.templates[idx] = next;
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.template.update",
    entityType: "task_template",
    entityId: next.id,
    metadata: { title: next.title },
  });
  res.json({ template: next });
});

router.delete("/templates/:templateId", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  const before = configForUser.templates.length;
  configForUser.templates = configForUser.templates.filter((item) => item.id !== req.params.templateId);
  if (configForUser.templates.length === before) return res.status(404).json({ error: "Template not found" });
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.template.delete",
    entityType: "task_template",
    entityId: req.params.templateId,
  });
  res.json({ ok: true });
});

router.patch("/automation-rules/:ruleId", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  const idx = configForUser.automationRules.findIndex((item) => item.id === req.params.ruleId);
  if (idx < 0) return res.status(404).json({ error: "Automation rule not found" });
  let next;
  try {
    next = buildAutomationRule(req.body || {}, configForUser.automationRules[idx]);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid automation rule payload" });
  }
  configForUser.automationRules[idx] = next;
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.automation_rule.update",
    entityType: "task_automation_rule",
    entityId: next.id,
  });
  res.json({ automationRule: next });
});

router.post("/automation-rules", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  let rule;
  try {
    rule = buildAutomationRule(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid automation rule payload" });
  }
  configForUser.automationRules.push(rule);
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.automation_rule.create",
    entityType: "task_automation_rule",
    entityId: rule.id,
  });
  res.status(201).json({ automationRule: rule });
});

router.delete("/automation-rules/:ruleId", requireRole("accountant"), idempotency, async (req, res) => {
  const configForUser = await getTaskConfigForUser(req.user.id);
  const before = configForUser.automationRules.length;
  configForUser.automationRules = configForUser.automationRules.filter((item) => item.id !== req.params.ruleId);
  if (configForUser.automationRules.length === before) {
    return res.status(404).json({ error: "Automation rule not found" });
  }
  await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  addAudit({
    actorUserId: req.user.id,
    action: "task.automation_rule.delete",
    entityType: "task_automation_rule",
    entityId: req.params.ruleId,
  });
  res.json({ ok: true });
});

router.post("/", requireRole("accountant"), idempotency, async (req, res) => {
  const {
    clientId,
    title,
    dueDate,
    priority = "medium",
    status = "pending",
    ownerUserId,
    dependencyType,
    dependencyRef,
    dependencyIds,
    recurrenceRule,
  } = req.body || {};
  if (!clientId || !title || !dueDate) {
    return res.status(400).json({ error: "clientId, title and dueDate are required" });
  }
  if (!canAccessClient(req.user, clientId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const users = await getAllUsers();
  const normalizedMeta = normalizeTaskMeta({
    ownerUserId: ownerUserId || req.user.id,
    dependencyType,
    dependencyRef,
    dependencyIds,
    recurrenceRule,
  });
  const owner = users.find((candidate) => candidate.id === normalizedMeta.ownerUserId);
  if (!owner) {
    return res.status(400).json({ error: "ownerUserId is invalid" });
  }

  const task = {
    id: utils.makeId("t"),
    clientId,
    title: asNonEmptyString(title, { max: 160 }),
    status: asEnum(status, TASK_STATUSES, "pending"),
    dueDate,
    priority: asEnum(priority, PRIORITIES, "medium"),
    createdBy: req.user.id,
    createdAt: utils.nowIso(),
  };
  if (db) {
    await db.task.create({ data: { ...task, dueDate: task.dueDate ? new Date(task.dueDate) : null } });
  } else {
    task.meta = normalizedMeta;
    store.tasks.push(task);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "task.create",
    entityType: "task",
    entityId: task.id,
    metadata: { clientId, taskMeta: normalizedMeta },
  });

  const targetUsers = db
    ? (await db.user.findMany({ where: { role: "client" } })).filter((u) => (u.clientIds || []).includes(clientId))
    : store.users.filter((u) => u.role === "client" && u.clientIds.includes(clientId));
  for (const user of targetUsers) {
    addNotification({
      userId: user.id,
      type: "task_assigned",
      title: "New task assigned",
      message: title,
    });
  }

  if (normalizedMeta.ownerUserId && normalizedMeta.ownerUserId !== req.user.id) {
    addNotification({
      userId: normalizedMeta.ownerUserId,
      type: "task_owner_assigned",
      title: "Task owner assignment",
      message: `${title} was assigned to you.`,
    });
  }

  const userMap = buildUserMap(users);
  const decorated = decorateTask(task, new Map([[task.id, normalizedMeta]]), userMap);
  res.status(201).json({ task: decorated });
});

router.patch("/:taskId", idempotency, async (req, res) => {
  const task = db
    ? await db.task.findUnique({ where: { id: req.params.taskId } })
    : store.tasks.find((item) => item.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!canAccessClient(req.user, task.clientId)) return res.status(403).json({ error: "Access denied" });
  if (req.user.role === "client" && req.body.status && req.body.status !== "completed") {
    return res.status(403).json({ error: "Clients can only mark tasks completed" });
  }

  const allowed = ["title", "status", "dueDate", "priority"];
  const updateData = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "status") {
        updateData[key] = asEnum(req.body[key], TASK_STATUSES, String(task.status || "pending"));
      } else if (key === "priority") {
        updateData[key] = asEnum(req.body[key], PRIORITIES, String(task.priority || "medium"));
      } else {
        updateData[key] = req.body[key];
      }
      task[key] = updateData[key];
    }
  }

  const taskMetaPatch = normalizeTaskMeta({
    ownerUserId: req.body.ownerUserId,
    dependencyType: req.body.dependencyType,
    dependencyRef: req.body.dependencyRef,
    dependencyIds: req.body.dependencyIds,
    recurrenceRule: req.body.recurrenceRule,
    completionNotes: req.body.completionNotes,
    templateId: req.body.templateId,
  });
  const hasTaskMetaPatch = Object.keys(taskMetaPatch).length > 0;

  if (db && Object.keys(updateData).length) {
    if (updateData.dueDate !== undefined && updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    await db.task.update({
      where: { id: task.id },
      data: updateData,
    });
  }
  if (!db && hasTaskMetaPatch) {
    task.meta = mergeTaskMeta(task.meta || {}, taskMetaPatch);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "task.update",
    entityType: "task",
    entityId: task.id,
    metadata: {
      fields: Object.keys(req.body || {}),
      taskMeta: hasTaskMetaPatch ? taskMetaPatch : undefined,
    },
  });

  const users = await getAllUsers();
  const taskMetaMap = await loadTaskMetaMap([task.id]);
  if (!taskMetaMap.has(task.id) && task.meta) taskMetaMap.set(task.id, task.meta);
  if (hasTaskMetaPatch) {
    const current = taskMetaMap.get(task.id) || {};
    taskMetaMap.set(task.id, mergeTaskMeta(current, taskMetaPatch));
  }
  const decorated = decorateTask(task, taskMetaMap, buildUserMap(users));
  res.json({ task: decorated });
});

router.delete("/:taskId", requireRole("accountant"), idempotency, async (req, res) => {
  const task = db
    ? await db.task.findUnique({ where: { id: req.params.taskId } })
    : store.tasks.find((item) => item.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!canAccessClient(req.user, task.clientId)) return res.status(403).json({ error: "Access denied" });

  if (db) {
    await db.task.delete({ where: { id: task.id } });
  } else {
    const index = store.tasks.findIndex((item) => item.id === req.params.taskId);
    if (index >= 0) store.tasks.splice(index, 1);
  }
  addAudit({
    actorUserId: req.user.id,
    action: "task.delete",
    entityType: "task",
    entityId: task.id,
  });

  res.json({ ok: true });
});

router.post("/automation/run", requireRole("accountant"), idempotency, async (req, res) => {
  const now = new Date();
  let remindersCreated = 0;
  let slaAlerts = 0;
  const updatedTaskIds = [];
  let generatedFromTemplates = 0;
  let ruleActionsApplied = 0;

  const sourceTasks = db ? await db.task.findMany() : store.tasks;
  const [users, taskMetaMap, configForUser] = await Promise.all([
    getAllUsers(),
    loadTaskMetaMap(sourceTasks.map((task) => task.id)),
    getTaskConfigForUser(req.user.id),
  ]);
  const userMap = buildUserMap(users);
  const visibleTasks = sourceTasks.filter((task) => canAccessClient(req.user, task.clientId));
  const decoratedTasks = visibleTasks.map((task) => decorateTask(task, taskMetaMap, userMap));

  for (const task of decoratedTasks) {
    if (!canAccessClient(req.user, task.clientId)) continue;
    if (task.status === "completed") continue;

    const dueInDays = Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24));
    if (dueInDays < 0 && task.status !== "overdue") {
      if (db) {
        await db.task.update({ where: { id: task.id }, data: { status: "overdue" } });
      } else {
        const rawTask = store.tasks.find((item) => item.id === task.id);
        if (rawTask) rawTask.status = "overdue";
      }
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

    for (const rule of configForUser.automationRules.filter((item) => item.enabled)) {
      if (rule.trigger === "due_soon" && !(dueInDays >= 0 && dueInDays <= rule.thresholdDays)) continue;
      if (rule.trigger === "overdue" && !(dueInDays < 0 || task.status === "overdue")) continue;

      if (rule.action === "escalate_priority" && task.priority !== "high") {
        if (db) {
          await db.task.update({ where: { id: task.id }, data: { priority: "high" } });
        } else {
          const rawTask = store.tasks.find((item) => item.id === task.id);
          if (rawTask) rawTask.priority = "high";
        }
        ruleActionsApplied += 1;
      }
      if (rule.action === "notify_owner" && task.ownerUserId) {
        addNotification({
          userId: task.ownerUserId,
          type: "task_rule_alert",
          title: "Task automation alert",
          message: `${task.title} triggered ${rule.trigger.replace(/_/g, " ")} rule.`,
        });
        ruleActionsApplied += 1;
      }
    }
  }

  let templatesMutated = false;
  for (const template of configForUser.templates.filter((item) => item.enabled)) {
    if (!shouldGenerateTemplate(template)) continue;
    const scopedClientIds = template.clientIds.length
      ? template.clientIds.filter((id) => req.user.clientIds.includes(id))
      : req.user.clientIds.slice();

    if (!scopedClientIds.length) continue;
    for (const clientId of scopedClientIds) {
      const duplicate = decoratedTasks.some((task) => (
        task.clientId === clientId
        && task.templateId === template.id
        && isOpenTaskStatus(task.status)
      ));
      if (duplicate) continue;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.defaultDueInDays);
      const nextTask = {
        id: utils.makeId("t"),
        clientId,
        title: template.title,
        status: "pending",
        dueDate: dueDate.toISOString(),
        priority: template.priority,
        createdBy: req.user.id,
        createdAt: utils.nowIso(),
      };
      const nextTaskMeta = normalizeTaskMeta({
        ownerUserId: template.ownerUserId || req.user.id,
        dependencyType: template.dependencyType,
        dependencyRef: template.dependencyRef,
        recurrenceRule: template.recurrenceRule,
        templateId: template.id,
      });

      if (db) {
        await db.task.create({
          data: {
            ...nextTask,
            dueDate: new Date(nextTask.dueDate),
          },
        });
      } else {
        nextTask.meta = nextTaskMeta;
        store.tasks.push(nextTask);
      }

      addAudit({
        actorUserId: req.user.id,
        action: "task.create.template",
        entityType: "task",
        entityId: nextTask.id,
        metadata: { clientId, taskMeta: nextTaskMeta, templateId: template.id },
      });

      generatedFromTemplates += 1;
    }
    template.lastGeneratedAt = utils.nowIso();
    template.updatedAt = utils.nowIso();
    templatesMutated = true;
  }

  if (templatesMutated) {
    await saveTaskConfigForUser(req.user.id, configForUser.templates, configForUser.automationRules);
  }

  addAudit({
    actorUserId: req.user.id,
    action: "task.automation.run",
    entityType: "task",
    entityId: req.user.id,
    metadata: { remindersCreated, slaAlerts, updatedTaskIds, generatedFromTemplates, ruleActionsApplied },
  });

  res.json({
    ok: true,
    remindersCreated,
    slaAlerts,
    updatedTaskIds,
    generatedFromTemplates,
    ruleActionsApplied,
  });
});

export default router;
