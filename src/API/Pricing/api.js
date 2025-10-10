const VITE_API_KEY = import.meta.env.VITE_API_KEY;
const VITE_API_URL = import.meta.env.VITE_API_URL;

// Récupérer la configuration des tarifs
export async function fetchPricing() {
  const res = await fetch(`${VITE_API_URL}api/pricing`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erreur API");
  return res.json();
}

// Créer ou mettre à jour la configuration des tarifs
export async function updatePricing(pricingData) {
  const res = await fetch(`${VITE_API_URL}api/pricing`, {
    method: "PUT",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pricingData),
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour des tarifs");
  return res.json();
}

// Calculer les frais de livraison
export async function calculateDeliveryFees(distance) {
  const params = new URLSearchParams({ distance: distance.toString() });
  const res = await fetch(`${VITE_API_URL}api/pricing/delivery/calculate?${params}`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erreur lors du calcul des frais");
  return res.json();
}

// Récupérer les produits disponibles par catégorie
export async function fetchAvailableProducts(categorie) {
  const res = await fetch(`${VITE_API_URL}api/pricing/products/${categorie}`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erreur API");
  return res.json();
}

// Vérifier la disponibilité du restaurant
export async function checkRestaurantAvailability() {
  const res = await fetch(`${VITE_API_URL}api/pricing/availability`, {
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Erreur API");
  return res.json();
}

// Ajouter un nouveau produit
export async function addProduct(categorie, produit) {
  const res = await fetch(`${VITE_API_URL}api/pricing/products`, {
    method: "POST",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categorie, produit }),
  });
  if (!res.ok) throw new Error("Erreur lors de l'ajout du produit");
  return res.json();
}

// Mettre à jour un produit
export async function updateProduct(categorie, produitId, produitData) {
  const res = await fetch(`${VITE_API_URL}api/pricing/products`, {
    method: "PUT",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categorie, produitId, produitData }),
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du produit");
  return res.json();
}

// Supprimer un produit
export async function deleteProduct(categorie, produitId) {
  const res = await fetch(`${VITE_API_URL}api/pricing/products/${categorie}/${produitId}`, {
    method: "DELETE",
    headers: {
      "x-api-key": `${VITE_API_KEY}`,
    },
  });
  if (!res.ok) throw new Error("Erreur lors de la suppression du produit");
  return res.json();
}
