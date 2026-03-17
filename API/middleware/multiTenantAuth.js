import { ApiKeyService } from "../services/ApiKeyService.js";

const DEFAULT_INSTANCE_ID = "inst_default";

/**
 * Lit x-api-key ou query api_key, valide via ApiKeyService ou clé globale (rétrocompat),
 * attache request.instanceId.
 */
export async function multiTenantAuth(request, reply) {
  const headerKey = request.headers["x-api-key"];
  const queryKey = request.query?.api_key;
  const rawKey = [headerKey, queryKey].find((k) => k != null && String(k).trim() !== "");
  const trimmed = rawKey != null ? String(rawKey).trim() : "";

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
