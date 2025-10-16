const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;


// Récupérer tous les rendez-vous avec filtres
export async function fetchAppointments(page = 1, limit = 50, filters = {}) {
 const params = new URLSearchParams();
 params.append("page", page.toString());
 params.append("limit", limit.toString());

 if (filters.date) params.append("date", filters.date);
 if (filters.statut) params.append("statut", filters.statut);
 if (filters.type) params.append("type", filters.type);
 if (filters.modalite) params.append("modalite", filters.modalite);

 const res = await fetch(`${VITE_API_URL}api/orders?${params.toString()}`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

// Récupérer les rendez-vous du jour
export async function fetchTodayAppointments() {
 const res = await fetch(`${VITE_API_URL}api/orders/today`, {
   headers: {
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

// Récupérer un rendez-vous par ID
export async function fetchAppointment(id) {
 if (!id) throw new Error("ID manquant pour la requête");

 const res = await fetch(`${VITE_API_URL}api/orders/${id}`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur API");
 return res.json();
}

// Créer un nouveau rendez-vous
export async function createAppointment(appointmentData) {
 const res = await fetch(`${VITE_API_URL}api/orders`, {
   method: "POST",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify(appointmentData),
 });
 if (!res.ok) throw new Error("Erreur lors de la création du rendez-vous");
 return res.json();
}

// Mettre à jour un rendez-vous
export async function updateAppointment(id, appointmentData) {
 const res = await fetch(`${VITE_API_URL}api/orders/${id}`, {
   method: "PUT",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify(appointmentData),
 });
 if (!res.ok) throw new Error("Erreur lors de la mise à jour du rendez-vous");
 return res.json();
}

// Mettre à jour le statut d'un rendez-vous
export async function updateAppointmentStatus(id, statut) {
 const res = await fetch(`${VITE_API_URL}api/orders/${id}/status`, {
   method: "PATCH",
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
   body: JSON.stringify({ statut }),
 });
 if (!res.ok) throw new Error("Erreur lors de la mise à jour du statut");
 return res.json();
}

// Supprimer un rendez-vous
export async function deleteAppointment(id) {
 const res = await fetch(`${VITE_API_URL}api/orders/${id}`, {
   method: "DELETE",
 });
 
 if (!res.ok) throw new Error("Erreur lors de la suppression du rendez-vous");
 return res.json();
}

// Vérifier la disponibilité d'un créneau
export async function checkAvailability(date, heure, duree) {
 const params = new URLSearchParams({
   date,
   heure,
   duree: duree.toString()
 });

 const res = await fetch(`${VITE_API_URL}api/orders/availability?${params.toString()}`, {
   headers: {
     "x-api-key": `${VITE_API_KEY}`,
     "Content-Type": "application/json",
   },
 });
 if (!res.ok) throw new Error("Erreur lors de la vérification de disponibilité");
 return res.json();
}