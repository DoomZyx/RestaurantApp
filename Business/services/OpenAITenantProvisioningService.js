/**
 * Provisionning OpenAI par tenant : créer un projet et un service account,
 * récupérer la clé API (visible une seule fois). Utiliser OPENAI_ADMIN_KEY.
 * Ne jamais logger la clé API.
 */

const OPENAI_BASE = "https://api.openai.com/v1";

/**
 * Crée un projet puis un service account pour ce projet.
 * @param {string} clientId - Identifiant client unique (nom du projet = tenant-<clientId>)
 * @returns {Promise<{ success: true, projectId: string, apiKey: string } | { success: false, error: string }>}
 */
export async function createProjectAndServiceAccount(clientId) {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey || typeof adminKey !== "string" || !adminKey.trim()) {
    return { success: false, error: "OPENAI_ADMIN_KEY manquant" };
  }

  const safeClientId = String(clientId || "").trim().replace(/[^a-zA-Z0-9-_]/g, "-") || "tenant";
  const projectName = `tenant-${safeClientId}`;
  const saName = `${projectName}-sa`;

  let projectId;
  try {
    const projectRes = await fetch(`${OPENAI_BASE}/organization/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ name: projectName }),
    });

    if (!projectRes.ok) {
      const errBody = await projectRes.text();
      return {
        success: false,
        error: `OpenAI project: ${projectRes.status} ${errBody ? errBody.slice(0, 200) : projectRes.statusText}`,
      };
    }

    const projectJson = await projectRes.json();
    projectId = projectJson.id;
    if (!projectId) {
      return { success: false, error: "OpenAI project: réponse sans id" };
    }
  } catch (err) {
    return {
      success: false,
      error: `OpenAI project: ${err.message || "Erreur réseau"}`,
    };
  }

  try {
    const saRes = await fetch(
      `${OPENAI_BASE}/organization/projects/${encodeURIComponent(projectId)}/service_accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ name: saName }),
      }
    );

    if (!saRes.ok) {
      const errBody = await saRes.text();
      return {
        success: false,
        error: `OpenAI service account: ${saRes.status} ${errBody ? errBody.slice(0, 200) : saRes.statusText}`,
      };
    }

    const saJson = await saRes.json();
    const apiKeyValue = saJson.api_key?.value;
    if (!apiKeyValue || typeof apiKeyValue !== "string") {
      return { success: false, error: "OpenAI service account: clé API absente de la réponse" };
    }

    return {
      success: true,
      projectId,
      apiKey: apiKeyValue.trim(),
    };
  } catch (err) {
    return {
      success: false,
      error: `OpenAI service account: ${err.message || "Erreur réseau"}`,
    };
  }
}
