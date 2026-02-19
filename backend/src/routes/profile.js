import express from "express";
import { addAudit } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

function findUser(req) {
  return store.users.find((candidate) => candidate.id === req.user.id);
}

router.get("/me", async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    profile: {
      fullName: user.fullName,
      firstName: user.profile?.firstName || "",
      lastName: user.profile?.lastName || "",
      email: user.email,
      phone: user.profile?.phone || "",
      role: user.role,
      clientIds: user.clientIds,
      createdAt: user.createdAt,
    },
  });
});

router.patch("/me", async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { firstName, lastName, phone, email } = req.body || {};

  const profile = user.profile || {};
  if (firstName !== undefined) profile.firstName = String(firstName);
  if (lastName !== undefined) profile.lastName = String(lastName);
  if (phone !== undefined) profile.phone = String(phone);
  const nextEmail = email !== undefined ? String(email).toLowerCase() : user.email;
  const nextFullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.fullName;

  if (db) {
    await db.user.update({
      where: { id: user.id },
      data: {
        profile,
        email: nextEmail,
        fullName: nextFullName,
      },
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

  res.json({ ok: true });
});

router.get("/security", async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.security = user.security || {};
  res.json({ security: user.security });
});

router.patch("/security", async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : findUser(req);
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

  res.json({ security });
});

router.post("/security/generate-backup-codes", async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : findUser(req);
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
  res.json({ codes });
});

router.get("/login-activity", async (req, res) => {
  const sourceItems = db
    ? await db.loginActivity.findMany({ where: { userId: req.user.id } })
    : store.loginActivities;
  const items = sourceItems
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);
  res.json({ items });
});

export default router;
