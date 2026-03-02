import crypto from "crypto";
import { config } from "./config.js";
import { getDb } from "./db.js";
import { store, utils } from "./store.js";

const db = config.databaseUrl ? getDb() : null;

function normalizeClientIds(clientIds) {
  return Array.isArray(clientIds) ? clientIds : [];
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    clientIds: normalizeClientIds(user.clientIds),
  };
}

export async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + config.authTokenTtlSeconds * 1000;

  if (db) {
    await db.session.create({
      data: {
        token,
        userId,
        expiresAt: new Date(expiresAtMs),
      },
    });
    return token;
  }

  store.sessions.set(token, { userId, expiresAt: expiresAtMs });
  return token;
}

export async function revokeToken(token) {
  if (db) {
    try {
      await db.session.delete({ where: { token } });
    } catch {
      // Ignore missing token.
    }
    return;
  }

  store.sessions.delete(token);
}

export function findUserByCredentials(email, password) {
  const user = store.users.find((candidate) => candidate.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return null;
  return user.passwordHash === utils.sha256(password) ? user : null;
}

export function authRequired(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, bearerToken] = header.split(" ");
  const cookieToken = String(req.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("portal_token="))
    ?.split("=")[1];
  const token = scheme === "Bearer" && bearerToken ? bearerToken : cookieToken;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  (async () => {
    if (db) {
      const session = await db.session.findUnique({ where: { token } });
      if (!session) {
        return res.status(401).json({ error: "Invalid token" });
      }

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        await revokeToken(token);
        return res.status(401).json({ error: "Session expired" });
      }

      const user = await db.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        await revokeToken(token);
        return res.status(401).json({ error: "User not found" });
      }

      req.authToken = token;
      req.user = sanitizeUser(user);
      return next();
    }

    const session = store.sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (session.expiresAt < Date.now()) {
      store.sessions.delete(token);
      return res.status(401).json({ error: "Session expired" });
    }

    const user = store.users.find((candidate) => candidate.id === session.userId);
    if (!user) {
      store.sessions.delete(token);
      return res.status(401).json({ error: "User not found" });
    }

    req.authToken = token;
    req.user = sanitizeUser(user);
    return next();
  })().catch(next);
}

export function requireRole(...roles) {
  const ROLE_ALIASES = {
    accountant_admin: "accountant",
    accountant_manager: "accountant",
  };
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Auth required" });
    const effectiveRole = ROLE_ALIASES[req.user.role] || req.user.role;
    const allowed = roles.map((role) => ROLE_ALIASES[role] || role);
    if (!allowed.includes(effectiveRole)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    return next();
  };
}

export function canAccessClient(user, clientId) {
  if (!user) return false;
  if (["accountant", "accountant_admin", "accountant_manager"].includes(user.role)) {
    return user.clientIds.includes(clientId);
  }
  if (user.role === "client") return user.clientIds.includes(clientId);
  return false;
}

export function getVisibleClientIds(user) {
  if (!user) return [];
  return [...user.clientIds];
}

export function toPublicUser(user) {
  return sanitizeUser(user);
}
