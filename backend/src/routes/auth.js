import express from "express";
import { authRequired, findUserByCredentials, issueToken, revokeToken, toPublicUser } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  let user = null;
  if (db) {
    const candidate = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (candidate && candidate.passwordHash === utils.sha256(password)) {
      user = candidate;
    }
  } else {
    user = findUserByCredentials(email, password);
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (!db && !store.users.some((candidate) => candidate.id === user.id)) {
    store.users.push({
      ...user,
      clientIds: Array.isArray(user.clientIds) ? user.clientIds : [],
    });
  }

  const token = await issueToken(user.id);
  const activity = {
    id: utils.makeId("la"),
    userId: user.id,
    device: req.get("user-agent")?.slice(0, 80) || "Unknown Device",
    location: req.get("x-location") || "Unknown Location",
    ipAddress: req.ip || "0.0.0.0",
    createdAt: utils.nowIso(),
  };

  if (db) {
    await db.loginActivity.create({ data: activity });
  } else {
    store.loginActivities.unshift(activity);
  }

  addAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({ token, user: toPublicUser(user) });
});

router.post("/signup", async (req, res) => {
  const { fullName, email, password, role = "client", clientId } = req.body || {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "fullName, email and password are required" });
  }
  if (!["client", "accountant"].includes(role)) {
    return res.status(400).json({ error: "role must be client or accountant" });
  }
  if (db) {
    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already exists" });
  } else if (store.users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const user = {
    id: utils.makeId("u"),
    fullName: String(fullName),
    email: String(email).toLowerCase(),
    passwordHash: utils.sha256(String(password)),
    role,
    clientIds: clientId ? [String(clientId)] : [],
    createdAt: utils.nowIso(),
  };

  if (db) {
    await db.user.create({
      data: {
        ...user,
        clientIds: user.clientIds,
      },
    });
  }
  if (!db && !store.users.some((candidate) => candidate.id === user.id)) {
    store.users.push(user);
  }

  addAudit({
    actorUserId: user.id,
    action: "auth.signup",
    entityType: "user",
    entityId: user.id,
  });

  return res.status(201).json({ user: toPublicUser(user) });
});

router.get("/me", authRequired, async (req, res) => {
  const user = db
    ? await db.user.findUnique({ where: { id: req.user.id } })
    : store.users.find((candidate) => candidate.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: toPublicUser(user) });
});

router.post("/logout", authRequired, async (req, res) => {
  await revokeToken(req.authToken);
  addAudit({
    actorUserId: req.user.id,
    action: "auth.logout",
    entityType: "user",
    entityId: req.user.id,
  });
  return res.json({ ok: true });
});

export default router;
