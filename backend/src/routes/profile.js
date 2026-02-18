import express from "express";
import { addAudit } from "../lib/audit.js";
import { store, utils } from "../lib/store.js";

const router = express.Router();

function findUser(req) {
  return store.users.find((candidate) => candidate.id === req.user.id);
}

router.get("/me", (req, res) => {
  const user = findUser(req);
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

router.patch("/me", (req, res) => {
  const user = findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { firstName, lastName, phone, email } = req.body || {};

  user.profile = user.profile || {};
  if (firstName !== undefined) user.profile.firstName = String(firstName);
  if (lastName !== undefined) user.profile.lastName = String(lastName);
  if (phone !== undefined) user.profile.phone = String(phone);
  if (email !== undefined) user.email = String(email).toLowerCase();
  user.fullName = `${user.profile.firstName || ""} ${user.profile.lastName || ""}`.trim() || user.fullName;

  addAudit({
    actorUserId: req.user.id,
    action: "profile.update",
    entityType: "user",
    entityId: user.id,
  });

  res.json({ ok: true });
});

router.get("/security", (req, res) => {
  const user = findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.security = user.security || {};
  res.json({ security: user.security });
});

router.patch("/security", (req, res) => {
  const user = findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.security = user.security || {};
  const { twoFactorEnabled, smsEnabled } = req.body || {};
  if (twoFactorEnabled !== undefined) user.security.twoFactorEnabled = Boolean(twoFactorEnabled);
  if (smsEnabled !== undefined) user.security.smsEnabled = Boolean(smsEnabled);

  addAudit({
    actorUserId: req.user.id,
    action: "profile.security.update",
    entityType: "user",
    entityId: user.id,
  });

  res.json({ security: user.security });
});

router.post("/security/generate-backup-codes", (req, res) => {
  const user = findUser(req);
  if (!user) return res.status(404).json({ error: "User not found" });
  const codes = Array.from({ length: 8 }).map(() => utils.makeId("code").slice(-8).toUpperCase());
  user.security = user.security || {};
  user.security.backupCodesGeneratedAt = utils.nowIso();
  user.security.backupCodes = codes;
  addAudit({
    actorUserId: req.user.id,
    action: "profile.security.backup_codes.generate",
    entityType: "user",
    entityId: user.id,
  });
  res.json({ codes });
});

router.get("/login-activity", (req, res) => {
  const items = store.loginActivities
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);
  res.json({ items });
});

export default router;
