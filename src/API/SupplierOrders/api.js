const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_KEY = import.meta.env.VITE_API_KEY;

/**
 * Créer une commande et initier l'appel au fournisseur
 */
export async function createSupplierOrder(orderData) {
  try {
    const response = await fetch(`${API_URL}/api/supplier-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erreur lors de la création de la commande");
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur API createSupplierOrder:", error);
    throw error;
  }
}

/**
 * Récupérer l'historique des commandes d'un fournisseur
 */
export async function getSupplierOrders(fournisseurId) {
  try {
    const response = await fetch(
      `${API_URL}/api/supplier-orders/fournisseur/${fournisseurId}`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des commandes");
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error("Erreur API getSupplierOrders:", error);
    throw error;
  }
}

/**
 * Récupérer une commande spécifique
 */
export async function getSupplierOrder(orderId) {
  try {
    const response = await fetch(
      `${API_URL}/api/supplier-orders/${orderId}`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération de la commande");
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error("Erreur API getSupplierOrder:", error);
    throw error;
  }
}

/**
 * Récupérer toutes les commandes (avec filtres optionnels)
 */
export async function getAllSupplierOrders(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/api/supplier-orders?${params}`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des commandes");
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error("Erreur API getAllSupplierOrders:", error);
    throw error;
  }
}

/**
 * Polling pour vérifier le statut d'une commande
 * Utile pour mettre à jour l'UI quand l'appel est terminé
 */
export async function pollOrderStatus(orderId, onUpdate, maxAttempts = 60) {
  let attempts = 0;
  
  const poll = async () => {
    try {
      const order = await getSupplierOrder(orderId);
      
      onUpdate(order);
      
      // Arrêter le polling si la commande est dans un état final
      if (
        order.statut === "confirmee" ||
        order.statut === "refusee" ||
        order.statut === "erreur"
      ) {
        return order;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Timeout: l'appel prend trop de temps");
      }
      
      // Attendre 2 secondes avant le prochain poll
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await poll();
      
    } catch (error) {
      console.error("Erreur polling:", error);
      throw error;
    }
  };
  
  return await poll();
}

