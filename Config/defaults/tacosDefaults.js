/**
 * Configuration par défaut des tacos et leurs ingrédients personnalisables
 */

export const ingredientsDisponibles = {
  viandes: [
    { nom: "Poulet", prix: 0, parDefaut: true },
    { nom: "Boeuf haché", prix: 0, parDefaut: false },
    { nom: "Merguez", prix: 0.50, parDefaut: false },
    { nom: "Cordon bleu", prix: 0.50, parDefaut: false },
    { nom: "Nuggets", prix: 0, parDefaut: false },
  ],
  bases: [
    { nom: "Galette", prix: 0, parDefaut: true },
    { nom: "Tacos XL (2 galettes)", prix: 2, parDefaut: false },
  ],
  sauces: [
    { nom: "Sauce Blanche", prix: 0, parDefaut: true },
    { nom: "Sauce Algérienne", prix: 0, parDefaut: false },
    { nom: "Sauce Samouraï", prix: 0, parDefaut: false },
    { nom: "Sauce Harissa", prix: 0, parDefaut: false },
    { nom: "Sauce Ketchup", prix: 0, parDefaut: false },
    { nom: "Sauce Mayonnaise", prix: 0, parDefaut: false },
  ],
  legumes: [
    { nom: "Salade", prix: 0, parDefaut: true },
    { nom: "Tomates", prix: 0, parDefaut: true },
    { nom: "Oignons", prix: 0, parDefaut: true },
    { nom: "Cornichons", prix: 0, parDefaut: false },
  ],
  fromages: [
    { nom: "Fromage cheddar", prix: 0, parDefaut: true },
    { nom: "Fromage râpé", prix: 0, parDefaut: false },
  ],
  extras: [
    { nom: "Frites", prix: 0, parDefaut: true },
    { nom: "Supplément viande", prix: 2, parDefaut: false },
    { nom: "Supplément fromage", prix: 1, parDefaut: false },
  ],
};

export const tacosDefaults = [
  {
    nom: "Tacos Simple (1 viande)",
    description: "Un tacos avec 1 viande au choix, frites, fromage et crudités",
    prixBase: 7.50,
    disponible: true,
    personnalisable: true,
    maxViandes: 1,
    ingredientsInclus: {
      viandes: ["Poulet"], // 1 viande par défaut
      bases: ["Galette"],
      sauces: ["Sauce Blanche"],
      legumes: ["Salade", "Tomates", "Oignons"],
      fromages: ["Fromage cheddar"],
      extras: ["Frites"],
    },
    ingredientsDisponibles: ingredientsDisponibles,
  },
  {
    nom: "Tacos Double (2 viandes)",
    description: "Un tacos avec 2 viandes au choix, frites, fromage et crudités",
    prixBase: 9.50,
    disponible: true,
    personnalisable: true,
    maxViandes: 2,
    ingredientsInclus: {
      viandes: ["Poulet", "Boeuf haché"], // 2 viandes par défaut
      bases: ["Galette"],
      sauces: ["Sauce Blanche"],
      legumes: ["Salade", "Tomates", "Oignons"],
      fromages: ["Fromage cheddar"],
      extras: ["Frites"],
    },
    ingredientsDisponibles: ingredientsDisponibles,
  },
  {
    nom: "Tacos Triple (3 viandes)",
    description: "Un tacos avec 3 viandes au choix, frites, fromage et crudités",
    prixBase: 11.50,
    disponible: true,
    personnalisable: true,
    maxViandes: 3,
    ingredientsInclus: {
      viandes: ["Poulet", "Boeuf haché", "Merguez"], // 3 viandes par défaut
      bases: ["Galette"],
      sauces: ["Sauce Blanche"],
      legumes: ["Salade", "Tomates", "Oignons"],
      fromages: ["Fromage cheddar"],
      extras: ["Frites"],
    },
    ingredientsDisponibles: ingredientsDisponibles,
  },
];

