import express from "express";
import { authRequired, findUserByCredentials, issueToken, revokeToken, toPublicUser } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = findUserByCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = issueToken(user.id);
  store.loginActivities.unshift({
    id: utils.makeId("la"),
    userId: user.id,
    device: req.get("user-agent")?.slice(0, 80) || "Unknown Device",
    location: req.get("x-location") || "Unknown Location",
    ipAddress: req.ip || "0.0.0.0",
    createdAt: utils.nowIso(),
  });

  addAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({ token, user: toPublicUser(user) });
});

router.post("/signup", (req, res) => {
  const { fullName, email, password, role = "client", clientId } = req.body || {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "fullName, email and password are required" });
  }
  if (!["client", "accountant"].includes(role)) {
    return res.status(400).json({ error: "role must be client or accountant" });
  }
  if (store.users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
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
  store.users.push(user);

  addAudit({
    actorUserId: user.id,
    action: "auth.signup",
    entityType: "user",
    entityId: user.id,
  });

  return res.status(201).json({ user: toPublicUser(user) });
});

router.get("/me", authRequired, (req, res) => {
  const user = store.users.find((candidate) => candidate.id === req.user.id);
  return res.json({ user: toPublicUser(user) });
});

router.post("/logout", authRequired, (req, res) => {
  revokeToken(req.authToken);
  addAudit({
    actorUserId: req.user.id,
    action: "auth.logout",
    entityType: "user",
    entityId: req.user.id,
  });
  return res.json({ ok: true });
});

export default router;
