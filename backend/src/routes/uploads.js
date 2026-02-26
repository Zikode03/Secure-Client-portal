import express from "express";
import path from "path";
import crypto from "crypto";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
  appendFile,
  access,
} from "fs/promises";
import { constants as fsConstants } from "fs";
import { canAccessClient } from "../lib/auth.js";
import { addAudit } from "../lib/audit.js";
import { config } from "../lib/config.js";
import { getDb } from "../lib/db.js";
import { store, utils } from "../lib/store.js";

const router = express.Router();
const db = config.databaseUrl ? getDb() : null;

const CHUNK_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
const UPLOAD_ROOT_DIR = path.resolve(process.cwd(), "storage", "uploads");
const UPLOAD_SESSION_DIR = path.join(UPLOAD_ROOT_DIR, "sessions");
const UPLOAD_CHUNK_DIR = path.join(UPLOAD_ROOT_DIR, "chunks");
const UPLOAD_FILE_DIR = path.join(UPLOAD_ROOT_DIR, "files");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const COMPLETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let ensureDirsPromise = null;
let cleanupTimerStarted = false;

function safeName(name) {
  return String(name || "upload.bin").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function sessionFile(uploadId) {
  return path.join(UPLOAD_SESSION_DIR, `${uploadId}.json`);
}

function chunkDir(uploadId) {
  return path.join(UPLOAD_CHUNK_DIR, uploadId);
}

function chunkFile(uploadId, index) {
  return path.join(chunkDir(uploadId), `${index}.part`);
}

function finalFile(uploadId, originalName) {
  return path.join(UPLOAD_FILE_DIR, `${uploadId}_${safeName(originalName)}`);
}

async function ensureDirs() {
  if (!ensureDirsPromise) {
    ensureDirsPromise = (async () => {
      await mkdir(UPLOAD_SESSION_DIR, { recursive: true });
      await mkdir(UPLOAD_CHUNK_DIR, { recursive: true });
      await mkdir(UPLOAD_FILE_DIR, { recursive: true });
    })();
  }
  await ensureDirsPromise;
  startCleanupTimer();
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readSession(uploadId) {
  const fromMemory = store.uploadSessions.get(uploadId);
  if (fromMemory) return fromMemory;
  const filePath = sessionFile(uploadId);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  store.uploadSessions.set(uploadId, parsed);
  return parsed;
}

async function writeSession(session) {
  store.uploadSessions.set(session.uploadId, session);
  await writeFile(sessionFile(session.uploadId), JSON.stringify(session, null, 2), "utf8");
}

async function computeUploadedIndexes(session) {
  if (session.completedAt) {
    return Array.from({ length: session.totalChunks }, (_unused, index) => index);
  }
  const indexes = [];
  for (let index = 0; index < session.totalChunks; index += 1) {
    if (await fileExists(chunkFile(session.uploadId, index))) {
      indexes.push(index);
    }
  }
  return indexes;
}

function assertSessionOwnership(req, session) {
  if (req.user.role === "accountant") {
    return canAccessClient(req.user, session.clientId);
  }
  return req.user.id === session.userId;
}

function computePhase(session) {
  if (!session.completedAt) return "uploading";
  const elapsed = Date.now() - new Date(session.completedAt).getTime();
  if (elapsed < 3000) return "scanning";
  if (elapsed < 9000) return "processing";
  return "available";
}

function shouldRemoveSession(session, nowMs) {
  const updatedAtMs = new Date(session.updatedAt || session.createdAt || 0).getTime();
  if (!Number.isFinite(updatedAtMs)) return true;
  const ageMs = nowMs - updatedAtMs;

  if (session.completedAt) {
    return ageMs > COMPLETED_RETENTION_MS;
  }
  return ageMs > SESSION_TTL_MS;
}

async function removeSessionArtifacts(session) {
  await rm(chunkDir(session.uploadId), { recursive: true, force: true });
  await rm(sessionFile(session.uploadId), { force: true });
  store.uploadSessions.delete(session.uploadId);
}

async function cleanupStaleSessions() {
  await ensureDirs();
  const nowMs = Date.now();
  const files = await readdir(UPLOAD_SESSION_DIR);
  for (const fileName of files) {
    if (!fileName.endsWith(".json")) continue;
    const absolutePath = path.join(UPLOAD_SESSION_DIR, fileName);
    let session = null;
    try {
      const raw = await readFile(absolutePath, "utf8");
      session = JSON.parse(raw);
    } catch {
      await rm(absolutePath, { force: true });
      continue;
    }
    if (!session?.uploadId) {
      await rm(absolutePath, { force: true });
      continue;
    }
    if (shouldRemoveSession(session, nowMs)) {
      await removeSessionArtifacts(session);
    } else {
      store.uploadSessions.set(session.uploadId, session);
    }
  }
}

function startCleanupTimer() {
  if (cleanupTimerStarted) return;
  cleanupTimerStarted = true;
  setInterval(() => {
    cleanupStaleSessions().catch((error) => {
      console.error("[uploads] cleanup failed:", error.message);
    });
  }, CLEANUP_INTERVAL_MS).unref();
}

async function syncDocumentStatus(session, phase) {
  if (!session.documentId) return;
  let nextStatus = "pending";
  if (phase === "scanning") nextStatus = "scanning";
  if (phase === "processing") nextStatus = "processing";

  if (db) {
    const doc = await db.document.findUnique({ where: { id: session.documentId } });
    if (doc && doc.status !== nextStatus) {
      await db.document.update({
        where: { id: doc.id },
        data: { status: nextStatus },
      });
    }
    return;
  }

  const doc = store.documents.find((item) => item.id === session.documentId);
  if (doc) doc.status = nextStatus;
}

function statusPayload(session, uploadedIndexes) {
  const phase = computePhase(session);
  const uploadedCount = uploadedIndexes.length;
  const uploadPercent = session.totalChunks === 0 ? 0 : Math.round((uploadedCount / session.totalChunks) * 100);
  let overallPercent = Math.min(70, Math.round(uploadPercent * 0.7));
  if (phase === "scanning") overallPercent = Math.max(overallPercent, 80);
  if (phase === "processing") overallPercent = Math.max(overallPercent, 92);
  if (phase === "available") overallPercent = 100;

  return {
    uploadId: session.uploadId,
    phase,
    file: {
      name: session.fileName,
      sizeBytes: session.fileSize,
      mimeType: session.mimeType,
    },
    chunks: {
      chunkSizeBytes: session.chunkSizeBytes,
      total: session.totalChunks,
      uploaded: uploadedCount,
      uploadedIndexes,
    },
    progress: {
      uploadPercent,
      overallPercent,
    },
    server: {
      scanState: phase === "uploading" ? "waiting" : phase === "scanning" ? "running" : "done",
      processingState: phase === "processing" ? "running" : phase === "available" ? "done" : "waiting",
    },
    documentId: session.documentId || null,
  };
}

async function resolveClientIdForCreate(req, requestedClientId) {
  const requested = String(requestedClientId || "");
  if (requested) {
    if (!canAccessClient(req.user, requested)) {
      throw { status: 403, error: "Access denied" };
    }
    return requested;
  }

  if (req.user.role !== "client") {
    throw { status: 400, error: "clientId is required" };
  }

  const sessionIds = Array.isArray(req.user.clientIds) ? req.user.clientIds : [];
  if (sessionIds.length) return sessionIds[0];

  if (db) {
    const user = await db.user.findUnique({ where: { id: req.user.id } });
    const userIds = Array.isArray(user?.clientIds) ? user.clientIds : [];
    if (userIds.length) {
      req.user.clientIds = userIds;
      return userIds[0];
    }

    let linkedClient = await db.client.findFirst({
      where: { email: req.user.email },
      select: { id: true },
    });

    if (!linkedClient) {
      linkedClient = await db.client.create({
        data: {
          id: utils.makeId("c"),
          name: req.user.fullName || req.user.email,
          entityType: "Individual",
          status: "active",
          complianceHealth: 100,
          assignedAccountantId: req.user.id,
          primaryContact: req.user.fullName || req.user.email,
          email: req.user.email,
          createdAt: new Date(),
        },
        select: { id: true },
      });
    }

    await db.user.update({
      where: { id: req.user.id },
      data: { clientIds: [linkedClient.id] },
    });
    req.user.clientIds = [linkedClient.id];
    return linkedClient.id;
  }

  const inMemoryUser = store.users.find((candidate) => candidate.id === req.user.id);
  const inMemoryIds = Array.isArray(inMemoryUser?.clientIds) ? inMemoryUser.clientIds : [];
  if (inMemoryIds.length) {
    req.user.clientIds = inMemoryIds;
    return inMemoryIds[0];
  }

  let linkedClient = store.clients.find((client) => client.email.toLowerCase() === req.user.email.toLowerCase());
  if (!linkedClient) {
    linkedClient = {
      id: utils.makeId("c"),
      name: req.user.fullName || req.user.email,
      entityType: "Individual",
      status: "active",
      complianceHealth: 100,
      assignedAccountantId: req.user.id,
      primaryContact: req.user.fullName || req.user.email,
      email: req.user.email,
      createdAt: utils.nowIso(),
    };
    store.clients.push(linkedClient);
  }

  if (inMemoryUser) {
    inMemoryUser.clientIds = [linkedClient.id];
  }
  req.user.clientIds = [linkedClient.id];
  return linkedClient.id;
}

async function findReusableSession(userId, fileFingerprint) {
  if (!fileFingerprint) return null;

  for (const session of store.uploadSessions.values()) {
    if (
      session.userId === userId &&
      session.fileFingerprint === fileFingerprint &&
      !session.completedAt &&
      Date.now() - new Date(session.updatedAt || session.createdAt).getTime() < SESSION_TTL_MS
    ) {
      return session;
    }
  }

  await ensureDirs();
  const files = await readdir(UPLOAD_SESSION_DIR);
  for (const fileName of files) {
    if (!fileName.endsWith(".json")) continue;
    const raw = await readFile(path.join(UPLOAD_SESSION_DIR, fileName), "utf8");
    const session = JSON.parse(raw);
    const freshEnough = Date.now() - new Date(session.updatedAt || session.createdAt).getTime() < SESSION_TTL_MS;
    if (session.userId === userId && session.fileFingerprint === fileFingerprint && !session.completedAt && freshEnough) {
      store.uploadSessions.set(session.uploadId, session);
      return session;
    }
  }
  return null;
}

router.post("/init", async (req, res, next) => {
  try {
    await ensureDirs();
    await cleanupStaleSessions();
    const { fileName, fileSize, mimeType, category, notes, clientId, fileFingerprint } = req.body || {};
    const normalizedName = String(fileName || "").trim();
    const normalizedSize = Number(fileSize || 0);
    if (!normalizedName) return res.status(400).json({ error: "fileName is required" });
    if (!Number.isFinite(normalizedSize) || normalizedSize <= 0) {
      return res.status(400).json({ error: "fileSize must be greater than 0" });
    }
    if (normalizedSize > config.maxUploadBytes) {
      return res.status(413).json({ error: `File exceeds max size (${config.maxUploadBytes} bytes)` });
    }

    const resolvedClientId = await resolveClientIdForCreate(req, clientId);
    const reusable = await findReusableSession(req.user.id, String(fileFingerprint || ""));
    if (reusable) {
      const uploadedIndexes = await computeUploadedIndexes(reusable);
      return res.json({
        resumed: true,
        ...statusPayload(reusable, uploadedIndexes),
      });
    }

    const uploadId = `up_${crypto.randomUUID().replace(/-/g, "")}`;
    const totalChunks = Math.max(1, Math.ceil(normalizedSize / CHUNK_SIZE_BYTES));
    const now = new Date().toISOString();
    const session = {
      uploadId,
      userId: req.user.id,
      clientId: resolvedClientId,
      fileName: normalizedName,
      fileSize: normalizedSize,
      mimeType: String(mimeType || "application/octet-stream"),
      category: String(category || "General"),
      notes: String(notes || ""),
      fileFingerprint: String(fileFingerprint || ""),
      chunkSizeBytes: CHUNK_SIZE_BYTES,
      totalChunks,
      documentId: null,
      finalFilePath: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    await mkdir(chunkDir(uploadId), { recursive: true });
    await writeSession(session);
    return res.status(201).json({
      resumed: false,
      ...statusPayload(session, []),
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:uploadId/chunks/:chunkIndex", express.raw({ type: "application/octet-stream", limit: "9mb" }), async (req, res, next) => {
  try {
    await ensureDirs();
    const uploadId = String(req.params.uploadId || "");
    const chunkIndex = Number(req.params.chunkIndex);
    if (!uploadId) return res.status(400).json({ error: "uploadId is required" });
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ error: "chunkIndex must be a non-negative integer" });
    }

    const session = await readSession(uploadId).catch(() => null);
    if (!session) return res.status(404).json({ error: "Upload session not found" });
    if (!assertSessionOwnership(req, session)) return res.status(403).json({ error: "Access denied" });
    if (session.completedAt) return res.status(409).json({ error: "Upload is already completed" });
    if (chunkIndex >= session.totalChunks) return res.status(400).json({ error: "chunkIndex out of range" });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Chunk body is required" });
    }
    if (req.body.length > MAX_CHUNK_BYTES) {
      return res.status(413).json({ error: `Chunk exceeds max allowed (${MAX_CHUNK_BYTES} bytes)` });
    }

    const chunkPath = chunkFile(uploadId, chunkIndex);
    await mkdir(path.dirname(chunkPath), { recursive: true });
    await writeFile(chunkPath, req.body);
    session.updatedAt = new Date().toISOString();
    await writeSession(session);

    const uploadedIndexes = await computeUploadedIndexes(session);
    return res.json({
      ok: true,
      chunkIndex,
      ...statusPayload(session, uploadedIndexes),
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:uploadId", async (req, res, next) => {
  try {
    const uploadId = String(req.params.uploadId || "");
    const session = await readSession(uploadId).catch(() => null);
    if (!session) return res.status(404).json({ error: "Upload session not found" });
    if (!assertSessionOwnership(req, session)) return res.status(403).json({ error: "Access denied" });
    if (session.completedAt) {
      return res.status(409).json({ error: "Upload already completed and cannot be canceled" });
    }

    await removeSessionArtifacts(session);
    return res.json({ ok: true, canceled: true, uploadId });
  } catch (error) {
    return next(error);
  }
});

router.get("/:uploadId/status", async (req, res, next) => {
  try {
    const uploadId = String(req.params.uploadId || "");
    const session = await readSession(uploadId).catch(() => null);
    if (!session) return res.status(404).json({ error: "Upload session not found" });
    if (!assertSessionOwnership(req, session)) return res.status(403).json({ error: "Access denied" });

    const uploadedIndexes = await computeUploadedIndexes(session);
    const payload = statusPayload(session, uploadedIndexes);
    await syncDocumentStatus(session, payload.phase);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.post("/:uploadId/complete", async (req, res, next) => {
  try {
    await ensureDirs();
    const uploadId = String(req.params.uploadId || "");
    const session = await readSession(uploadId).catch(() => null);
    if (!session) return res.status(404).json({ error: "Upload session not found" });
    if (!assertSessionOwnership(req, session)) return res.status(403).json({ error: "Access denied" });

    const uploadedIndexes = await computeUploadedIndexes(session);
    if (!session.completedAt && uploadedIndexes.length !== session.totalChunks) {
      return res.status(400).json({
        error: "Missing chunks. Resume upload first.",
        missingCount: session.totalChunks - uploadedIndexes.length,
      });
    }

    if (!session.finalFilePath) {
      const targetFile = finalFile(uploadId, session.fileName);
      await writeFile(targetFile, Buffer.alloc(0));
      for (let index = 0; index < session.totalChunks; index += 1) {
        const buffer = await readFile(chunkFile(uploadId, index));
        await appendFile(targetFile, buffer);
      }
      session.finalFilePath = targetFile;
      await rm(chunkDir(uploadId), { recursive: true, force: true });
    }

    if (!session.documentId) {
      const fileStats = await stat(session.finalFilePath);
      const document = {
        id: utils.makeId("d"),
        clientId: session.clientId,
        name: session.fileName,
        category: session.category || "General",
        status: "scanning",
        sizeBytes: Number(fileStats.size || session.fileSize || 0),
        key: path.relative(process.cwd(), session.finalFilePath),
        uploadedBy: req.user.id,
        uploadedAt: utils.nowIso(),
      };
      if (db) {
        await db.document.create({ data: document });
      } else {
        store.documents.unshift(document);
      }
      session.documentId = document.id;

      addAudit({
        actorUserId: req.user.id,
        action: "document.upload",
        entityType: "document",
        entityId: document.id,
        metadata: {
          uploadId,
          clientId: session.clientId,
          sizeBytes: document.sizeBytes,
        },
      });
    }

    if (!session.completedAt) {
      session.completedAt = new Date().toISOString();
    }
    session.updatedAt = new Date().toISOString();
    await writeSession(session);

    const payload = statusPayload(session, uploadedIndexes);
    await syncDocumentStatus(session, payload.phase);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

export default router;
