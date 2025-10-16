const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;

// Connexion utilisateur
export async function loginUser(email, password) {
  const res = await fetch(`${VITE_API_URL}api/auth/login`, {
    method: "POST",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur de connexion");
  }

  const data = await res.json();

  // Sauvegarder le token dans localStorage
  if (data.data?.token) {
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));
  }

  return data;
}

// Déconnexion utilisateur
export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Obtenir le token stocké
export function getToken() {
  return localStorage.getItem("token");
}

// Obtenir l'utilisateur connecté
export function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Vérifier si l'utilisateur est connecté
export function isAuthenticated() {
  const token = getToken();
  const user = getCurrentUser();
  
  // Vérifier que le token et l'utilisateur existent et ne sont pas vides
  if (!token || token === "null" || token === "undefined") {
    // Nettoyer le localStorage si token invalide
    logoutUser();
    return false;
  }
  
  if (!user || !user.email) {
    // Nettoyer si user invalide
    logoutUser();
    return false;
  }
  
  return true;
}

// Vérifier si l'utilisateur est admin
export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === "admin";
}

// Obtenir le profil utilisateur
export async function getProfile() {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/profile`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur lors de la récupération du profil");
  }

  return res.json();
}

// Mettre à jour le profil utilisateur
export async function updateUserProfile(profileData) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/profile`, {
    method: "PUT",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur lors de la mise à jour du profil");
  }

  return res.json();
}

// Uploader l'avatar utilisateur
export async function uploadAvatar(file) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${VITE_API_URL}api/auth/profile/avatar`, {
    method: "POST",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
      // Ne pas spécifier Content-Type, le navigateur le fera automatiquement avec le boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur lors de l'upload de l'avatar");
  }

  return res.json();
}

// Créer un nouvel utilisateur (admin seulement)
export async function createUser(userData) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/register`, {
    method: "POST",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Erreur lors de la création de l'utilisateur"
    );
  }

  return res.json();
}

// Lister tous les utilisateurs (admin seulement)
export async function getAllUsers() {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/users`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Erreur lors de la récupération des utilisateurs"
    );
  }

  return res.json();
}

// Modifier un utilisateur (admin seulement)
export async function updateUser(id, userData) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/users/${id}`, {
    method: "PUT",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Erreur lors de la mise à jour de l'utilisateur"
    );
  }

  return res.json();
}

// Supprimer un utilisateur (admin seulement)
export async function deleteUser(id) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/users/${id}`, {
    method: "DELETE",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Erreur lors de la suppression de l'utilisateur"
    );
  }

  return res.json();
}

// Récupérer les statistiques système (admin seulement)
export async function getSystemStats() {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/stats`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || "Erreur lors de la récupération des statistiques"
    );
  }

  return res.json();
}

// Récupérer les logs système (admin seulement)
export async function getSystemLogs(type = "all", limit = 50) {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const params = new URLSearchParams();
  if (type !== "all") params.append("type", type);
  params.append("limit", limit);

  const res = await fetch(`${VITE_API_URL}api/auth/logs?${params}`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur lors de la récupération des logs");
  }

  return res.json();
}

// Récupérer les statistiques de maintenance (admin seulement)
export async function getMaintenanceStats() {
  const token = getToken();
  if (!token) {
    throw new Error("Non authentifié");
  }

  const res = await fetch(`${VITE_API_URL}api/auth/maintenance/stats`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur lors de la récupération des statistiques de maintenance");
  }

  return res.json();
}
