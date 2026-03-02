import express from "express";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { store, utils } from "../lib/store.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

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

export default router;
