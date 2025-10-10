const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;

export async function fetchCalls(page = 1, limit = 10, filters = {}) {
 // Construction des paramètres de requête
 const params = new URLSearchParams();
 params.append("page", page.toString());
 params.append("limit", limit.toString());

 // Ajout des filtres optionnels
 if (filters.date) {
   params.append("date", filters.date);
 }
 if (filters.nom) {
   params.append("nom", filters.nom);
 }
 if (filters.telephone) {
   params.append("telephone", filters.telephone);
 }

 const res = await fetch(`${VITE_API_URL}api/calls?${params.toString()}`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

export async function fetchCallsByDate() {
 const res = await fetch(`${VITE_API_URL}api/calls/dates`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

export async function fetchCall(id) {
 if (!id) throw new Error("ID manquant pour la requête");

 const res = await fetch(`${VITE_API_URL}api/calls/${id}`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

// Créer un nouvel appel
export async function createCall(callData) {
 const res = await fetch(`${VITE_API_URL}api/callsdata`, {
   method: "POST",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify(callData),
 });
 if (!res.ok) throw new Error("Erreur lors de la création de l'appel");
 return res.json();
}

// Mettre à jour le statut d'un appel
export async function updateCallStatus(id, status) {
 if (!id) throw new Error("ID manquant pour la mise à jour");
 if (!status) throw new Error("Statut manquant");

 const url = `${VITE_API_URL}api/calls/${id}/status`;
 const body = JSON.stringify({ statut: status });

 console.log("Tentative de mise à jour du statut:", { url, id, status, body });

 const res = await fetch(url, {
   method: "PATCH",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: body,
 });

 console.log("Réponse mise à jour statut:", res.status, res.statusText);

 if (!res.ok) {
   const errorText = await res.text();
   console.error("Erreur détaillée mise à jour statut:", errorText);
   throw new Error(
     `Erreur lors de la mise à jour du statut: ${res.status} ${res.statusText}`
   );
 }

 return res.json();
}

// Supprimer un appel
export async function deleteCall(id) {
 if (!id) throw new Error("ID manquant pour la suppression");

 const url = `${VITE_API_URL}api/calls/${id}`;
 console.log("Tentative de suppression:", url);

 const res = await fetch(url, {
   method: "DELETE",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
   },
 });
 console.log("Réponse suppression:", res.status, res.statusText);

 if (!res.ok) {
   const errorText = await res.text();
   console.error("Erreur détaillée:", errorText);
   throw new Error(
     `Erreur lors de la suppression: ${res.status} ${res.statusText}`
   );
 }

 return res.json();
}