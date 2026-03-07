const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;

// Mettre à jour les informations d'un client (lié à un appel)
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
