import { getApiKey } from "../apiKey.js";
const VITE_API_URL = import.meta.env.VITE_API_URL;

async function readErrorBody(res) {
  try {
    const body = await res.json();
    return body?.error ?? body?.message ?? res.statusText ?? "Erreur inconnue";
  } catch {
    return res.statusText || "Erreur inconnue";
  }
}

export async function getPhoneLineStatus() {
  const res = await fetch(`${VITE_API_URL}api/phone-line`, {
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const msg = await readErrorBody(res);
    throw new Error(msg);
  }
  return res.json();
}

export async function updatePhoneLineEnabled(enabled) {
  const res = await fetch(`${VITE_API_URL}api/phone-line`, {
    method: "PATCH",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const msg = await readErrorBody(res);
    throw new Error(msg);
  }
  return res.json();
}
