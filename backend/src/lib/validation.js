export function isEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function asNonEmptyString(value, { max = 1000 } = {}) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, max);
}

export function requireFields(payload, fields) {
  const source = payload && typeof payload === "object" ? payload : {};
  const missing = fields.filter((field) => !asNonEmptyString(source[field]));
  if (missing.length) {
    return { ok: false, error: `${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required` };
  }
  return { ok: true };
}

export function asEnum(value, allowed, fallback = "") {
  const normalized = String(value || "").toLowerCase();
  if (allowed.includes(normalized)) return normalized;
  return fallback;
}

