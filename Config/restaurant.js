/**
 * Configuration centralisée du restaurant (LEGACY - FALLBACK UNIQUEMENT)
 * 
 * ⚠️ IMPORTANT : Ce fichier sert UNIQUEMENT de fallback si la BDD est vide
 * 
 * Les vraies informations du restaurant doivent être configurées dans :
 * - Frontend : Page Configuration > Infos Restaurant
 * - Backend : Base de données (PricingModel.restaurantInfo)
 * 
 * Le GPT utilise TOUJOURS les infos dynamiques de la BDD, pas ce fichier statique
 */

export const restaurantConfig = {
  nom: process.env.RESTAURANT_NAME || "TastyFood",
  telephone: process.env.RESTAURANT_PHONE || "+33123456789",
  email: process.env.RESTAURANT_EMAIL || "contact@tastyfood.com",
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
