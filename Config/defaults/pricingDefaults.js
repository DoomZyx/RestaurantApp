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
    produits: [
      { 
        nom: "Margherita", 
        description: "Tomate, mozzarella, basilic", 
        prixBase: 12.50, 
        taille: "Moyenne", 
        disponible: true 
      },
      { 
        nom: "Pepperoni", 
        description: "Tomate, mozzarella, pepperoni", 
        prixBase: 14.50, 
        taille: "Moyenne", 
        disponible: true 
      },
      { 
        nom: "Quatre Fromages", 
        description: "Mozzarella, gorgonzola, parmesan, chèvre", 
        prixBase: 16.50, 
        taille: "Moyenne", 
        disponible: true 
      }
    ]
  },
  burgers: {
    nom: "Burgers",
    produits: [
      { 
        nom: "Cheeseburger", 
        description: "Steak, cheddar, salade, tomate", 
        prixBase: 11.50, 
        disponible: true 
      },
      { 
        nom: "Bacon Burger", 
        description: "Steak, bacon, cheddar, oignons", 
        prixBase: 13.50, 
        disponible: true 
      },
      { 
        nom: "Chicken Burger", 
        description: "Poulet pané, salade, tomate", 
        prixBase: 12.50, 
        disponible: true 
      }
    ]
  },
  salades: {
    nom: "Salades",
    produits: [
      { 
        nom: "Salade César", 
        description: "Salade, poulet, parmesan, croûtons", 
        prixBase: 9.50, 
        disponible: true 
      },
      { 
        nom: "Salade Grecque", 
        description: "Salade, tomates, olives, feta", 
        prixBase: 8.50, 
        disponible: true 
      }
    ]
  },
  boissons: {
    nom: "Boissons",
    produits: [
      { 
        nom: "Coca-Cola", 
        description: "Boisson gazeuse", 
        prixBase: 2.50, 
        taille: "33cl", 
        disponible: true 
      },
      { 
        nom: "Eau", 
        description: "Eau plate", 
        prixBase: 2.00, 
        taille: "33cl", 
        disponible: true 
      },
      { 
        nom: "Jus d'orange", 
        description: "Jus de fruits", 
        prixBase: 3.00, 
        taille: "33cl", 
        disponible: true 
      }
    ]
  },
  desserts: {
    nom: "Desserts",
    produits: [
      { 
        nom: "Tiramisu", 
        description: "Dessert italien", 
        prixBase: 4.50, 
        disponible: true 
      },
      { 
        nom: "Tarte aux pommes", 
        description: "Tarte traditionnelle", 
        prixBase: 3.50, 
        disponible: true 
      }
    ]
  }
};

export const DEFAULT_DELIVERY_PRICING = {
  activerLivraison: true,
  fraisBase: 2.50,
  prixParKm: 0.80,
  distanceMaximale: 10,
  montantMinimumCommande: 15,
  delaiPreparation: 30
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
    menuPricing: DEFAULT_MENU,
    deliveryPricing: DEFAULT_DELIVERY_PRICING
  };
}

