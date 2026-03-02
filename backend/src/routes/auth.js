import express from "express";
import { authRequired, findUserByCredentials, issueToken, revokeToken, toPublicUser } from "../lib/auth.js";
import { store, utils } from "../lib/store.js";
import { addAudit } from "../lib/audit.js";
import { getDb } from "../lib/db.js";
import { config } from "../lib/config.js";
import { asNonEmptyString, isEmail, requireFields } from "../lib/validation.js";
import { idempotencyMiddleware } from "../lib/idempotency.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;
const RESET_TTL_MS = 15 * 60 * 1000;
const idempotency = idempotencyMiddleware();

function applySessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `portal_token=${token}; Path=/; Max-Age=${config.authTokenTtlSeconds}; HttpOnly; SameSite=Lax`,
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "portal_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const required = requireFields(req.body, ["email", "password"]);
  if (!required.ok) {
    return res.status(400).json({ error: required.error });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
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

  // Auto-link legacy client users that were created without clientIds.
  if (db && user.role === "client") {
    const currentIds = Array.isArray(user.clientIds) ? user.clientIds : [];
    if (!currentIds.length) {
      const linkedClient = await db.client.findFirst({
        where: { email: user.email },
        select: { id: true },
      });
      if (linkedClient?.id) {
        user = await db.user.update({
          where: { id: user.id },
          data: { clientIds: [linkedClient.id] },
        });
      } else {
        const newClient = await db.client.create({
          data: {
            id: utils.makeId("c"),
            name: user.fullName || user.email,
            entityType: "Individual",
            status: "active",
            complianceHealth: 100,
            assignedAccountantId: user.id,
            primaryContact: user.fullName || user.email,
            email: user.email,
            createdAt: new Date(),
          },
        });
        user = await db.user.update({
          where: { id: user.id },
          data: { clientIds: [newClient.id] },
        });
      }
    }
  }
  if (!db && user.role === "client" && (!Array.isArray(user.clientIds) || !user.clientIds.length)) {
    const linkedClient = store.clients.find((client) => client.email.toLowerCase() === user.email.toLowerCase());
    if (linkedClient) {
      user.clientIds = [linkedClient.id];
    } else {
      const newClient = {
        id: utils.makeId("c"),
        name: user.fullName || user.email,
        entityType: "Individual",
        status: "active",
        complianceHealth: 100,
        assignedAccountantId: user.id,
        primaryContact: user.fullName || user.email,
        email: user.email,
        createdAt: utils.nowIso(),
      };
      store.clients.push(newClient);
      user.clientIds = [newClient.id];
    }
  }

  if (!db && !store.users.some((candidate) => candidate.id === user.id)) {
    store.users.push({
      ...user,
      clientIds: Array.isArray(user.clientIds) ? user.clientIds : [],
    });
  }

  const token = await issueToken(user.id);
  applySessionCookie(res, token);
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

router.post("/signup", idempotency, async (req, res) => {
  const { fullName, email, password, role = "client", clientId } = req.body || {};
  const required = requireFields(req.body, ["fullName", "email", "password"]);
  if (!required.ok) {
    return res.status(400).json({ error: required.error });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!["client", "accountant", "accountant_admin", "accountant_manager"].includes(role)) {
    return res.status(400).json({ error: "role must be client, accountant, accountant_admin or accountant_manager" });
  }
  if (db) {
    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already exists" });
  } else if (store.users.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const user = {
    id: utils.makeId("u"),
    fullName: asNonEmptyString(fullName, { max: 120 }),
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

router.post("/forgot-password", idempotency, async (req, res) => {
  const { email, role = "" } = req.body || {};
  if (!isEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  const normalizedEmail = String(email).toLowerCase();
  const user = db
    ? await db.user.findUnique({ where: { email: normalizedEmail } })
    : store.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

  if (!user || (role && user.role !== role)) {
    // Prevent account enumeration.
    return res.json({ ok: true, message: "If this account exists, reset instructions have been generated." });
  }

  const rawToken = utils.makeId("reset");
  const tokenHash = utils.sha256(rawToken);
  const expiresAt = Date.now() + RESET_TTL_MS;

  if (db) {
    const security = user.security && typeof user.security === "object" ? user.security : {};
    security.passwordReset = {
      tokenHash,
      expiresAt,
      requestedAt: Date.now(),
    };
    await db.user.update({
      where: { id: user.id },
      data: { security },
    });
  } else {
    store.passwordResets.set(tokenHash, {
      userId: user.id,
      expiresAt,
      requestedAt: Date.now(),
    });
  }

  addAudit({
    actorUserId: user.id,
    action: "auth.password.reset.request",
    entityType: "user",
    entityId: user.id,
  });

  // Development-friendly response until email provider is configured.
  return res.json({
    ok: true,
    message: "If this account exists, reset instructions have been generated.",
    resetToken: rawToken,
    resetPath: `/Accountant/accountant logins/verification.html?token=${encodeURIComponent(rawToken)}`,
  });
});

router.post("/reset-password", idempotency, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!asNonEmptyString(token)) return res.status(400).json({ error: "token is required" });
  if (String(newPassword || "").length < 8) {
    return res.status(400).json({ error: "newPassword must be at least 8 characters" });
  }

  const tokenHash = utils.sha256(String(token));
  let user = null;

  if (db) {
    const users = await db.user.findMany();
    user = users.find((candidate) => {
      const reset = candidate.security?.passwordReset;
      return reset && reset.tokenHash === tokenHash && Number(reset.expiresAt || 0) >= Date.now();
    });
  } else {
    const reset = store.passwordResets.get(tokenHash);
    if (reset && reset.expiresAt >= Date.now()) {
      user = store.users.find((candidate) => candidate.id === reset.userId) || null;
    }
  }

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  if (db) {
    const security = user.security && typeof user.security === "object" ? user.security : {};
    delete security.passwordReset;
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: utils.sha256(String(newPassword)), security },
    });
  } else {
    user.passwordHash = utils.sha256(String(newPassword));
    store.passwordResets.delete(tokenHash);
  }

  addAudit({
    actorUserId: user.id,
    action: "auth.password.reset.complete",
    entityType: "user",
    entityId: user.id,
  });

  return res.json({ ok: true, message: "Password reset successfully." });
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
  clearSessionCookie(res);
  addAudit({
    actorUserId: req.user.id,
    action: "auth.logout",
    entityType: "user",
    entityId: req.user.id,
  });
  return res.json({ ok: true });
});

export default router;
