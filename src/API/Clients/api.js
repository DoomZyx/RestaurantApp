const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;


// Récupérer tous les clients
export async function fetchClients() {
 const res = await fetch(`${VITE_API_URL}api/clients`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

// Récupérer l'historique d'un client
export async function fetchClientHistory(clientId) {
 if (!clientId) throw new Error("ID client manquant");
 
 const res = await fetch(`${VITE_API_URL}api/clients/${clientId}/history`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur lors de la récupération de l'historique");
 return res.json();
}

// Créer un nouveau client
export async function createClient(clientData) {
 if (!clientData) throw new Error("Données client manquantes");
 
 const res = await fetch(`${VITE_API_URL}api/clients`, {
   method: "POST",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify(clientData),
 });
 if (!res.ok) {
   const errorData = await res.json();
   throw new Error(errorData.error || "Erreur lors de la création du client");
 }
 return res.json();
}

// Mettre à jour les informations d'un client
export async function updateClient(id, clientData) {
 if (!id) throw new Error("ID manquant pour la mise à jour");
 if (!clientData) throw new Error("Données client manquantes");

 const res = await fetch(`${VITE_API_URL}api/calls/${id}/client`, {
   method: "PUT",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify(clientData),
 });
 if (!res.ok) throw new Error("Erreur lors de la mise à jour du client");
 return res.json();
}

// Supprimer un client/fournisseur
export async function deleteClient(id) {
 if (!id) throw new Error("ID manquant pour la suppression");

 const res = await fetch(`${VITE_API_URL}api/clients/${id}`, {
   method: "DELETE",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) {
   const errorData = await res.json();
   throw new Error(errorData.error || "Erreur lors de la suppression du contact");
 }
 return res.json();
}

