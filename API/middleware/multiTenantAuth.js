import { ApiKeyService } from "../services/ApiKeyService.js";

const DEFAULT_INSTANCE_ID = "inst_default";

/**
 * Lit x-api-key ou query api_key, valide via ApiKeyService ou clé globale (rétrocompat),
 * attache request.instanceId.
 */
function pathWithoutQuery(url) {
  if (url == null || typeof url !== "string") return "";
  return url.split("?")[0].replace(/\/+$/, "") || "/";
}

function isLoginPath(request) {
  if (request.method !== "POST") return false;
  const p = pathWithoutQuery(request.url);
  return p === "/api/auth/login" || p.endsWith("/api/auth/login");
}

export async function multiTenantAuth(request, reply) {
  // Preflight CORS : pas de x-api-key sur OPTIONS → ne pas répondre 401 sans en-têtes CORS.
  if (request.method === "OPTIONS") {
    return;
  }
  const headerKey = request.headers["x-api-key"];
  const queryKey = request.query?.api_key;
  const rawKey = [headerKey, queryKey].find((k) => k != null && String(k).trim() !== "");
  const trimmed = rawKey != null ? String(rawKey).trim() : "";

  // Login sans clé : OK pour utilisateurs globaux (admin / hors tenant) ; avec clé : validation ci‑dessous comme le reste de l’API.
  if (isLoginPath(request) && !trimmed) {
    return;
  }

  if (!trimmed) {
    return reply.code(401).send({ error: "Clé API manquante" });
  }

  const validated = await ApiKeyService.validate(trimmed);
  if (validated) {
    request.instanceId = validated.instanceId;
    return;
  }

  if (process.env.X_API_KEY && trimmed === process.env.X_API_KEY) {
    request.instanceId = DEFAULT_INSTANCE_ID;
    return;
  }

  return reply.code(401).send({ error: "Clé API invalide" });
}
