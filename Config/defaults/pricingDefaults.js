/**
 * Configuration par défaut pour le modèle Pricing (création instance / premier accès).
 * instanceId est ajouté par l'appelant.
 */

/** Tailles autorisées par catégorie (validation des produits). */
export const VALID_SIZES = {
  pizzas: ["S", "M", "L", "XL"],
  boissons: ["25cl", "33cl", "50cl", "1L"],
};

const defaultHorairesDay = () => ({
  midi: { ouverture: "11:00", fermeture: "15:00" },
  soir: { ouverture: "18:00", fermeture: "23:00" },
  ouvert: true,
});

export function getDefaultPricingConfig() {
  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const horairesOuverture = {};
  for (const j of jours) {
    horairesOuverture[j] = j === "dimanche" ? { ...defaultHorairesDay(), ouvert: false } : defaultHorairesDay();
  }
  return {
    restaurantInfo: {
      nom: "Mon Restaurant",
      adresse: "",
      telephone: "",
      email: "",
      nombreCouverts: 0,
      horairesOuverture,
    },
    menuPricing: {
      pizzas: { nom: "Pizzas", produits: [] },
      burgers: { nom: "Burgers", produits: [] },
      salades: { nom: "Salades", produits: [] },
      boissons: { nom: "Boissons", produits: [] },
      desserts: { nom: "Desserts", produits: [] },
    },
    phoneLineEnabled: true,
    version: "1.0",
    modifiePar: "system",
  };
}
