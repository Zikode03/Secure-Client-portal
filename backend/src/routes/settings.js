import express from "express";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { store, utils } from "../lib/store.js";
import { requireRole } from "../lib/auth.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;
const TEAM_ROLES = ["accountant", "accountant_manager", "accountant_admin"];

function normalizePermissions(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    manageClients: Boolean(source.manageClients),
    manageCompliance: Boolean(source.manageCompliance),
    manageBilling: Boolean(source.manageBilling),
    manageTeam: Boolean(source.manageTeam),
    viewAuditLogs: Boolean(source.viewAuditLogs),
  };
}

function defaultNotificationMatrix() {
  return {
    compliance_alert: { inApp: true, email: true, sms: false },
    overdue_task: { inApp: true, email: true, sms: false },
    message_received: { inApp: true, email: false, sms: false },
    document_uploaded: { inApp: true, email: false, sms: false },
  };
}

function normalizeNotificationMatrix(value) {
  const base = defaultNotificationMatrix();
  const source = value && typeof value === "object" ? value : {};
  const output = {};
  for (const key of Object.keys(base)) {
    const row = source[key] && typeof source[key] === "object" ? source[key] : {};
    output[key] = {
      inApp: row.inApp === undefined ? base[key].inApp : Boolean(row.inApp),
      email: row.email === undefined ? base[key].email : Boolean(row.email),
      sms: row.sms === undefined ? base[key].sms : Boolean(row.sms),
    };
  }
  return output;
}

function findUser(userId) {
  return store.users.find((candidate) => candidate.id === userId);
}

async function getUser(userId) {
  return db ? db.user.findUnique({ where: { id: userId } }) : findUser(userId);
}

function buildProfileResponse(user) {
  return {
    fullName: user.fullName || "",
    firstName: user.profile?.firstName || "",
    lastName: user.profile?.lastName || "",
    email: user.email || "",
    phone: user.profile?.phone || "",
    professionalTitle: user.profile?.professionalTitle || "",
    certification: user.profile?.certification || "",
    role: user.role,
    clientIds: Array.isArray(user.clientIds) ? user.clientIds : [],
    createdAt: user.createdAt,
  };
}

function buildSecurityResponse(user) {
  const security = user.security || {};
  return {
    twoFactorEnabled: Boolean(security.twoFactorEnabled),
    smsEnabled: Boolean(security.smsEnabled),
    backupCodesGeneratedAt: security.backupCodesGeneratedAt || null,
    lastPasswordChange: security.lastPasswordChange || user.createdAt || utils.nowIso(),
  };
}

function maskIpAddress(ipAddress) {
  if (!ipAddress || typeof ipAddress !== "string") return "Unknown";
  if (ipAddress.includes(".")) {
    const parts = ipAddress.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  return ipAddress;
}

router.get("/profile", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const profile = buildProfileResponse(user);
  return res.json({ ...profile, profile });
});

router.patch("/profile", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { firstName, lastName, phone, email, professionalTitle, certification } = req.body || {};
  const profile = user.profile || {};

  if (firstName !== undefined) profile.firstName = String(firstName).trim();
  if (lastName !== undefined) profile.lastName = String(lastName).trim();
  if (phone !== undefined) profile.phone = String(phone).trim();
  if (professionalTitle !== undefined) profile.professionalTitle = String(professionalTitle).trim();
  if (certification !== undefined) profile.certification = String(certification).trim();

  const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : user.email;
  const nextFullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.fullName;

  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: { profile, email: nextEmail, fullName: nextFullName },
    });
  } else {
    user.profile = profile;
    user.email = nextEmail;
    user.fullName = nextFullName;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "profile.update",
    entityType: "user",
    entityId: user.id,
  });

  const updatedUser = await getUser(req.user.id);
  const updatedProfile = buildProfileResponse(updatedUser || user);
  return res.json({ ok: true, ...updatedProfile, profile: updatedProfile });
});

router.get("/security", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const security = buildSecurityResponse(user);
  return res.json({ ...security, security });
});

router.patch("/security", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const security = user.security || {};
  const { twoFactorEnabled, smsEnabled } = req.body || {};

  if (twoFactorEnabled !== undefined) security.twoFactorEnabled = Boolean(twoFactorEnabled);
  if (smsEnabled !== undefined) security.smsEnabled = Boolean(smsEnabled);

  if (db) {
    await db.user.update({ where: { id: user.id }, data: { security } });
  } else {
    user.security = security;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "profile.security.update",
    entityType: "user",
    entityId: user.id,
  });

  const updatedUser = await getUser(req.user.id);
  const response = buildSecurityResponse(updatedUser || user);
  return res.json({ ...response, security: response });
});

router.post("/security/change-password", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  if (utils.sha256(String(currentPassword)) !== user.passwordHash) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const security = user.security || {};
  security.lastPasswordChange = utils.nowIso();

  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: utils.sha256(String(newPassword)),
        security,
      },
    });
  } else {
    user.passwordHash = utils.sha256(String(newPassword));
    user.security = security;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "profile.security.password.change",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({ ok: true, lastPasswordChange: security.lastPasswordChange });
});

router.post("/security/generate-backup-codes", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const codes = Array.from({ length: 8 }).map(() => utils.makeId("code").slice(-8).toUpperCase());
  const security = user.security || {};
  security.backupCodesGeneratedAt = utils.nowIso();
  security.backupCodes = codes;

  if (db) {
    await db.user.update({ where: { id: user.id }, data: { security } });
  } else {
    user.security = security;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "profile.security.backup_codes.generate",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({
    ok: true,
    codes,
    backupCodesGeneratedAt: security.backupCodesGeneratedAt,
  });
});

router.get("/security/login-activity", async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const sourceItems = db
    ? await db.loginActivity.findMany({ where: { userId: req.user.id } })
    : store.loginActivities;

  const items = sourceItems
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      device: item.device || "Unknown Device",
      location: item.location || "Unknown",
      ipAddress: maskIpAddress(item.ipAddress),
      createdAt: item.createdAt,
    }));

  return res.json({ items });
});

router.get("/security/connected-devices", async (req, res) => {
  const sourceItems = db
    ? await db.loginActivity.findMany({ where: { userId: req.user.id } })
    : store.loginActivities;

  const grouped = new Map();
  sourceItems
    .filter((item) => item.userId === req.user.id)
    .forEach((item) => {
      const key = `${item.device || "Unknown Device"}|${item.ipAddress || "Unknown"}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          device: item.device || "Unknown Device",
          location: item.location || "Unknown",
          ipAddress: maskIpAddress(item.ipAddress),
          lastSeenAt: item.createdAt,
          loginCount: 1,
        });
        return;
      }

      existing.loginCount += 1;
      if (String(item.createdAt) > String(existing.lastSeenAt)) {
        existing.lastSeenAt = item.createdAt;
        existing.location = item.location || existing.location;
      }
    });

  const items = Array.from(grouped.values())
    .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1))
    .slice(0, 10);

  return res.json({ items });
});

router.get("/settings/team", requireRole("accountant"), async (req, res) => {
  const [users, clients] = await Promise.all([
    db ? db.user.findMany() : Promise.resolve(store.users),
    db ? db.client.findMany() : Promise.resolve(store.clients),
  ]);

  const availableClientIds = new Set(Array.isArray(req.user.clientIds) ? req.user.clientIds : []);
  const availableClients = clients
    .filter((client) => availableClientIds.has(client.id))
    .map((client) => ({ id: client.id, name: client.name }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const items = users
    .filter((user) => TEAM_ROLES.includes(String(user.role || "").toLowerCase()))
    .map((user) => {
      const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
      const permissions = normalizePermissions(profile.permissions || {});
      const managerUserId = String(profile.managerUserId || "");
      const scopedClientIds = Array.isArray(user.clientIds)
        ? user.clientIds.filter((id) => availableClientIds.has(id))
        : [];
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        clientIds: scopedClientIds,
        managerUserId,
        permissions,
      };
    })
    .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));

  return res.json({
    items,
    roles: TEAM_ROLES,
    availableClients,
  });
});

router.patch("/settings/team/:userId", requireRole("accountant"), async (req, res) => {
  const userId = String(req.params.userId || "");
  const target = db
    ? await db.user.findUnique({ where: { id: userId } })
    : store.users.find((item) => item.id === userId);
  if (!target) return res.status(404).json({ error: "Team member not found" });
  if (!TEAM_ROLES.includes(String(target.role || "").toLowerCase())) {
    return res.status(400).json({ error: "Only accountant team members can be updated here" });
  }

  const role = req.body?.role !== undefined ? String(req.body.role || "").trim().toLowerCase() : target.role;
  if (req.body?.role !== undefined && !TEAM_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid team role" });
  }

  const allowedClientIds = new Set(Array.isArray(req.user.clientIds) ? req.user.clientIds : []);
  const nextClientIds = req.body?.clientIds !== undefined
    ? (Array.isArray(req.body.clientIds) ? req.body.clientIds : [])
      .map((id) => String(id))
      .filter((id) => allowedClientIds.has(id))
    : (Array.isArray(target.clientIds) ? target.clientIds.filter((id) => allowedClientIds.has(id)) : []);

  const profile = target.profile && typeof target.profile === "object" ? target.profile : {};
  if (req.body?.managerUserId !== undefined) profile.managerUserId = String(req.body.managerUserId || "");
  if (req.body?.permissions !== undefined) profile.permissions = normalizePermissions(req.body.permissions);

  if (db) {
    await db.user.update({
      where: { id: userId },
      data: {
        role,
        clientIds: nextClientIds,
        profile,
      },
    });
  } else {
    target.role = role;
    target.clientIds = nextClientIds;
    target.profile = profile;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "settings.team.update",
    entityType: "user",
    entityId: userId,
    metadata: {
      role,
      clientIds: nextClientIds,
      managerUserId: profile.managerUserId || "",
    },
  });

  return res.json({
    ok: true,
    user: {
      id: target.id,
      fullName: target.fullName,
      email: target.email,
      role,
      clientIds: nextClientIds,
      managerUserId: String(profile.managerUserId || ""),
      permissions: normalizePermissions(profile.permissions || {}),
    },
  });
});

router.get("/settings/notification-matrix", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
  const matrix = normalizeNotificationMatrix(profile.notificationMatrix || {});
  return res.json({ matrix });
});

router.patch("/settings/notification-matrix", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
  const matrix = normalizeNotificationMatrix(req.body?.matrix || {});
  profile.notificationMatrix = matrix;

  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: { profile },
    });
  } else {
    user.profile = profile;
  }

  addAudit({
    actorUserId: req.user.id,
    action: "settings.notification_matrix.update",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({ ok: true, matrix });
});

router.get("/settings/integrations/health", requireRole("accountant"), async (req, res) => {
  const ids = Array.isArray(req.user.clientIds) ? req.user.clientIds : [];
  const accounts = db
    ? await db.complianceAccount.findMany({ where: { clientId: { in: ids } } })
    : store.complianceAccounts.filter((item) => ids.includes(item.clientId));

  const bySource = new Map();
  for (const source of ["SARS", "CIPC", "CSD"]) {
    bySource.set(source, {
      source,
      status: "disconnected",
      connectedClients: 0,
      errors: 0,
      lastSyncedAt: null,
    });
  }

  for (const account of accounts) {
    const source = String(account.source || "").toUpperCase();
    const bucket = bySource.get(source) || {
      source,
      status: "disconnected",
      connectedClients: 0,
      errors: 0,
      lastSyncedAt: null,
    };
    if (String(account.status || "").toLowerCase() === "connected") bucket.connectedClients += 1;
    if (account.lastError) bucket.errors += 1;
    if (account.lastSyncedAt) {
      const ts = new Date(account.lastSyncedAt);
      if (!Number.isNaN(ts.getTime())) {
        const prev = bucket.lastSyncedAt ? new Date(bucket.lastSyncedAt) : null;
        if (!prev || ts.getTime() > prev.getTime()) bucket.lastSyncedAt = ts.toISOString();
      }
    }
    bucket.status = bucket.errors > 0 ? "warning" : (bucket.connectedClients > 0 ? "healthy" : "disconnected");
    bySource.set(source, bucket);
  }

  const connectors = Array.from(bySource.values());
  const overallStatus = connectors.some((item) => item.errors > 0)
    ? "warning"
    : connectors.some((item) => item.connectedClients > 0)
      ? "healthy"
      : "disconnected";

  return res.json({
    overallStatus,
    api: {
      status: "healthy",
      checkedAt: utils.nowIso(),
    },
    database: {
      enabled: Boolean(config.databaseUrl),
      status: config.databaseUrl ? "connected" : "disabled",
    },
    connectors,
    links: {
      complianceBoard: "compliance-board.html",
    },
  });
});

export default router;
