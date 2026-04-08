/**
 * Déploiement mono-instance : un dossier / un .env / une base par client.
 * Pas de résolution par clé API multi-tenant ; `instanceId` vient de `INSTANCE_ID` (défaut inst_default).
 */
const DEFAULT_INSTANCE_ID = "inst_default";

export async function multiTenantAuth(request, reply) {
  if (request.method === "OPTIONS") {
    return;
  }
  const fromEnv = process.env.INSTANCE_ID != null ? String(process.env.INSTANCE_ID).trim() : "";
  request.instanceId = fromEnv || DEFAULT_INSTANCE_ID;
}
