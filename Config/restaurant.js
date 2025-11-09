/**
 * Configuration centralisée du restaurant
 * Utilisé pour les appels aux fournisseurs et autres communications
 */

export const restaurantConfig = {
  nom: "Restaurant Handle Home",
  telephone: process.env.RESTAURANT_PHONE || "+33123456789",
  email: process.env.RESTAURANT_EMAIL || "contact@handlehome.com",
  adresse: {
    rue: "123 Rue de la Gastronomie",
    ville: "Paris",
    codePostal: "75001",
    pays: "France"
  },
  horaires: {
    lundi: { ouvert: true, debut: "09:00", fin: "18:00" },
    mardi: { ouvert: true, debut: "09:00", fin: "18:00" },
    mercredi: { ouvert: true, debut: "09:00", fin: "18:00" },
    jeudi: { ouvert: true, debut: "09:00", fin: "18:00" },
    vendredi: { ouvert: true, debut: "09:00", fin: "18:00" },
    samedi: { ouvert: false },
    dimanche: { ouvert: false }
  },
  delaiLivraisonStandard: "24h"
};

export default restaurantConfig;
