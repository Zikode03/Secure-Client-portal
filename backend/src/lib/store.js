import crypto from "crypto";

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const store = {
  users: [],
  sessions: new Map(),
  clients: [],
  messages: [],
  requests: [],
  tasks: [],
  documents: [],
  notifications: [],
  loginActivities: [],
  audits: [],
  uploadSessions: new Map(),
};

export const utils = {
  sha256,
  nowIso,
  makeId(prefix) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  },
};
