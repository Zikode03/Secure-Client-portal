const memoryStore = new Map();
const WINDOW_MS = 2 * 60 * 1000;

export function idempotencyMiddleware() {
  return (req, res, next) => {
    const key = String(req.get("Idempotency-Key") || "").trim();
    if (!key) return next();

    const scope = `${req.method}:${req.originalUrl}:${key}`;
    const existing = memoryStore.get(scope);
    const now = Date.now();
    if (existing && now - existing.createdAt < WINDOW_MS) {
      return res.status(409).json({
        error: "Duplicate request",
        message: "This request was already submitted recently. Refresh and verify before retrying.",
      });
    }

    memoryStore.set(scope, { createdAt: now });
    if (memoryStore.size > 2000) {
      for (const [entryKey, entry] of memoryStore.entries()) {
        if (now - entry.createdAt > WINDOW_MS) memoryStore.delete(entryKey);
      }
    }
    return next();
  };
}

