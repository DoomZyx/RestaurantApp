/**
 * Clé API pour les appels vers l'app backend.
 * En mode intégré (VITE_WEBSITE_API_URL défini) : uniquement la clé tenant (site ou session).
 * Pas de fallback sur la clé serveur pour éviter d'afficher les données de inst_default.
 * En mode standalone : VITE_API_KEY ou clé en session.
 */
const STORAGE_KEY = "app_tenant_api_key";

let memoryKey = null;

export function getApiKey() {
  const fromStorage = memoryKey || sessionStorage.getItem(STORAGE_KEY) || "";
  if (fromStorage) return fromStorage;
  const websiteApiUrl = import.meta.env.VITE_WEBSITE_API_URL;
  if (websiteApiUrl && typeof websiteApiUrl === "string" && websiteApiUrl.trim() !== "") {
    return "";
  }
  return import.meta.env.VITE_API_KEY || "";
}

export function setTenantApiKey(key) {
  if (key && typeof key === "string") {
    memoryKey = key;
    sessionStorage.setItem(STORAGE_KEY, key);
  }
}

export function clearTenantApiKey() {
  memoryKey = null;
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Récupère la clé tenant depuis le backend du site (si l'utilisateur y est connecté).
 * À appeler au chargement de l'app quand VITE_WEBSITE_API_URL est défini.
 * @returns {Promise<string|null>} La clé si récupérée, null sinon.
 */
export async function fetchTenantKeyFromWebsite() {
  const base = import.meta.env.VITE_WEBSITE_API_URL;
  if (!base || typeof base !== "string") return null;
  const url = `${base.replace(/\/$/, "")}/api/auth/tenant-key`;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.apiKey) {
      setTenantApiKey(data.apiKey);
      return data.apiKey;
    }
  } catch (_) {
    return null;
  }
  return null;
}

const WEBSITE_USER_KEY = "app_website_user";

/**
 * Récupère l'utilisateur courant depuis le backend du site (cookie de session).
 * À appeler après fetchTenantKeyFromWebsite quand on a une clé tenant.
 * @returns {Promise<object|null>} L'objet user du site ou null.
 */
export async function fetchWebsiteUser() {
  const base = import.meta.env.VITE_WEBSITE_API_URL;
  if (!base || typeof base !== "string") return null;
  const url = `${base.replace(/\/$/, "")}/api/auth/me`;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.email || data.id)) {
      sessionStorage.setItem(WEBSITE_USER_KEY, JSON.stringify(data));
      return data;
    }
  } catch (_) {
    return null;
  }
  return null;
}

export function getStoredWebsiteUser() {
  try {
    const raw = sessionStorage.getItem(WEBSITE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearWebsiteUser() {
  sessionStorage.removeItem(WEBSITE_USER_KEY);
}
