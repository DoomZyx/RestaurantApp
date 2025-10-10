// Configuration du restaurant
export const restaurantConfig = {
  nom: "HandleHome",
  telephone: process.env.RESTAURANT_PHONE || "+33XXXXXXXXX",
  adresse: "123 Rue de la Paix, 75001 Paris",
  email: "contact@handlehome.fr",
  
  // Horaires d'ouverture
  horaires: {
    midi: { debut: "11:00", fin: "14:00" },
    soir: { debut: "18:00", fin: "22:00" }
  }
};

