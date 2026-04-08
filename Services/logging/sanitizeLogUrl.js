/**
 * Retire ou masque les paramètres de requête sensibles dans une URL (logs uniquement).
 */
const SENSITIVE_QUERY_KEYS = new Set([
  "api_key",
  "apikey",
  "x-api-key",
  "token",
  "access_token",
  "refresh_token",
]);

export function sanitizeUrlForLog(url) {
  if (url == null) return url;
  if (typeof url !== "string") return url;
  const q = url.indexOf("?");
  if (q === -1) return url;
  const base = url.slice(0, q);
  const query = url.slice(q + 1);
  try {
    const sp = new URLSearchParams(query);
    let changed = false;
    for (const key of [...sp.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        sp.set(key, "[REDACTED]");
        changed = true;
      }
    }
    return changed ? `${base}?${sp.toString()}` : url;
  } catch {
    return `${base}?[parse_error]`;
  }
}
