/**
 * Configuration par défaut pour les tarifs et le menu du restaurant
 * Ces données sont utilisées lors de la première initialisation
 */

export const DEFAULT_RESTAURANT_INFO = {
  nom: "Mon Restaurant",
  adresse: "",
  telephone: "",
  email: "",
  horairesOuverture: {
    lundi: { ouvert: false, ouverture: "09:00", fermeture: "18:00" },
    mardi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
    mercredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
    jeudi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
    vendredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
    samedi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
    dimanche: { ouvert: false, ouverture: "09:00", fermeture: "18:00" }
  }
};

export const DEFAULT_MENU = {
  pizzas: {
    nom: "Pizzas",
    produits: []
  },
  burgers: {
    nom: "Burgers",
    produits: []
  },
  salades: {
    nom: "Salades",
    produits: []
  },
  boissons: {
    nom: "Boissons",
    produits: []
  },
  desserts: {
    nom: "Desserts",
    produits: []
  },
  tacos: {
    nom: "Tacos",
    produits: []
  },
  menus: {
    nom: "Menus",
    produits: []
  }
};

export const VALID_SIZES = {
  pizzas: ["Petite", "Moyenne", "Grande"],
  boissons: ["33cl", "50cl", "1L"]
};

/**
 * Génère la configuration complète par défaut
 * @returns {Object} Configuration complète
 */
export function getDefaultPricingConfig() {
  return {
    restaurantInfo: DEFAULT_RESTAURANT_INFO,
    menuPricing: DEFAULT_MENU
  };
}

