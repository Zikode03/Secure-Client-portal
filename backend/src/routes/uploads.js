import express from "express";
import {
  S3Client,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { canAccessClient } from "../lib/auth.js";
import { addAudit, addNotification } from "../lib/audit.js";
import { config } from "../lib/config.js";
import { store, utils } from "../lib/store.js";
import { getDb } from "../lib/db.js";

const router = express.Router();
const s3 = config.awsRegion ? new S3Client({ region: config.awsRegion }) : null;
const db = config.databaseUrl ? getDb() : null;

function assertS3(res) {
  if (!s3 || !config.s3Bucket) {
    res.status(503).json({ error: "S3 not configured. Set AWS_REGION and S3_BUCKET." });
    return false;
  }
  return true;
}

router.post("/initiate", (req, res, next) => {
  Promise.resolve()
    .then(async () => {
      const { fileName, fileType, fileSize, category, documentName, clientId } = req.body || {};
      if (!assertS3(res)) return;

      if (!fileName || !fileType || !fileSize || !clientId) {
        return res.status(400).json({
          error: "fileName, fileType, fileSize and clientId are required",
        });
      }
      if (!canAccessClient(req.user, String(clientId))) {
        return res.status(403).json({ error: "Access denied for client" });
      }
      if (Number(fileSize) > config.maxUploadBytes) {
        return res.status(413).json({
          error: `File too large. Max allowed is ${config.maxUploadBytes} bytes`,
        });
      }

      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `uploads/${clientId}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`;

      const command = new CreateMultipartUploadCommand({
        Bucket: config.s3Bucket,
        Key: key,
        ContentType: fileType,
        Metadata: {
          originalname: safeName.slice(0, 200),
          category: String(category || "Uncategorized").slice(0, 100),
          documentname: String(documentName || safeName).slice(0, 200),
          clientid: String(clientId).slice(0, 80),
          uploaderid: req.user.id,
        },
      });

      const result = await s3.send(command);
      store.uploadSessions.set(result.UploadId, {
        key,
        fileName: safeName,
        fileType,
        fileSize: Number(fileSize),
        category: String(category || "Uncategorized"),
        documentName: String(documentName || safeName),
        clientId: String(clientId),
        uploaderId: req.user.id,
      });

      res.json({
        uploadId: result.UploadId,
        key,
        bucket: config.s3Bucket,
        partSizeBytes: 8 * 1024 * 1024,
      });
    })
    .catch(next);
});

router.post("/:uploadId/part-url", (req, res, next) => {
  Promise.resolve()
    .then(async () => {
      const { uploadId } = req.params;
      const { key, partNumber } = req.body || {};
      if (!assertS3(res)) return;

      if (!uploadId || !key || !partNumber) {
        return res.status(400).json({ error: "uploadId, key and partNumber are required" });
      }

      const session = store.uploadSessions.get(uploadId);
      if (!session || session.key !== key || session.uploaderId !== req.user.id) {
        return res.status(403).json({ error: "Invalid upload session" });
      }

      const command = new UploadPartCommand({
        Bucket: config.s3Bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: Number(partNumber),
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: config.signedUrlTtlSeconds });
      res.json({ signedUrl });
    })
    .catch(next);
});

router.post("/:uploadId/complete", (req, res, next) => {
  Promise.resolve()
    .then(async () => {
      const { uploadId } = req.params;
      const { key, parts } = req.body || {};
      if (!assertS3(res)) return;

      if (!uploadId || !key || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ error: "uploadId, key and parts[] are required" });
      }

      const session = store.uploadSessions.get(uploadId);
      if (!session || session.key !== key || session.uploaderId !== req.user.id) {
        return res.status(403).json({ error: "Invalid upload session" });
      }

      const formattedParts = parts
        .map((p) => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) }))
        .sort((a, b) => a.PartNumber - b.PartNumber);

      const result = await s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: config.s3Bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: formattedParts },
        })
      );

      const document = {
        id: utils.makeId("d"),
        clientId: session.clientId,
        name: session.documentName,
        category: session.category,
        status: "pending",
        sizeBytes: session.fileSize,
        key,
        uploadedBy: req.user.id,
        uploadedAt: utils.nowIso(),
      };
      if (db) {
        await db.document.create({ data: document });
      } else {
        store.documents.unshift(document);
      }
      store.uploadSessions.delete(uploadId);

      addAudit({
        actorUserId: req.user.id,
        action: "document.upload.complete",
        entityType: "document",
        entityId: document.id,
        metadata: { key, clientId: document.clientId },
      });

      const users = db
        ? await db.user.findMany({ where: { role: "accountant" } })
        : store.users.filter((u) => u.role === "accountant");
      for (const user of users.filter((u) => (u.clientIds || []).includes(document.clientId))) {
        if (user.id === req.user.id) continue;
        addNotification({
          userId: user.id,
          type: "document_uploaded",
          title: "New document uploaded",
          message: `${document.name} was uploaded.`,
        });
      }

      res.json({
        ok: true,
        key,
        bucket: config.s3Bucket,
        location: result.Location || null,
        eTag: result.ETag || null,
        document,
      });
    })
    .catch(next);
});

router.post("/:uploadId/abort", (req, res, next) => {
  Promise.resolve()
    .then(async () => {
      const { uploadId } = req.params;
      const { key } = req.body || {};
      if (!assertS3(res)) return;
      if (!uploadId || !key) return res.status(400).json({ error: "uploadId and key are required" });

      const session = store.uploadSessions.get(uploadId);
      if (!session || session.key !== key || session.uploaderId !== req.user.id) {
        return res.status(403).json({ error: "Invalid upload session" });
      }

      await s3.send(
        new AbortMultipartUploadCommand({
          Bucket: config.s3Bucket,
          Key: key,
          UploadId: uploadId,
        })
      );
      store.uploadSessions.delete(uploadId);

      addAudit({
        actorUserId: req.user.id,
        action: "document.upload.abort",
        entityType: "upload",
        entityId: uploadId,
      });

      res.json({ ok: true });
    })
    .catch(next);
});

router.delete("/files", (req, res, next) => {
  Promise.resolve()
    .then(async () => {
      const { key, documentId } = req.body || {};
      if (!assertS3(res)) return;
      if (!key) return res.status(400).json({ error: "key is required" });

      const document = db
        ? await db.document.findFirst({
            where: {
              OR: [{ key }, ...(documentId ? [{ id: documentId }] : [])],
            },
          })
        : store.documents.find((doc) => doc.key === key || doc.id === documentId);
      if (!document) return res.status(404).json({ error: "Document not found" });
      if (!canAccessClient(req.user, document.clientId)) return res.status(403).json({ error: "Access denied" });

      await s3.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: key }));
      if (db) {
        await db.document.delete({ where: { id: document.id } });
      } else {
        store.documents = store.documents.filter((doc) => doc.id !== document.id);
      }

      addAudit({
        actorUserId: req.user.id,
        action: "document.delete",
        entityType: "document",
        entityId: document.id,
        metadata: { key },
      });

      res.json({ ok: true });
    })
    .catch(next);
});

export default router;
