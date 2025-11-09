import mongoose from "mongoose";
import dotenv from "dotenv";
import PricingModel from "../models/pricing.js";

dotenv.config();

// Suppléments disponibles
const SUPPLEMENTS_BURGERS = [
  { nom: "Bacon", prixBase: 1.50 },
  { nom: "Cheddar", prixBase: 1.00 },
  { nom: "Fromage supplément", prixBase: 1.00 },
  { nom: "Avocat", prixBase: 1.50 },
  { nom: "Œuf", prixBase: 1.00 },
  { nom: "Steak supplémentaire", prixBase: 2.50 },
  { nom: "Oignons frits", prixBase: 1.00 },
  { nom: "Champignons", prixBase: 1.00 },
  { nom: "Sauce supplémentaire", prixBase: 0.50 }
];

// Menu complet avec beaucoup de produits
const MENU_DATA = {
  pizzas: {
    nom: "Pizzas",
    produits: [
      { nom: "Margherita", prixBase: 9.50, description: "Tomate, mozzarella, basilic", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Reine", prixBase: 11.50, description: "Tomate, mozzarella, jambon, champignons", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "4 Fromages", prixBase: 12.50, description: "Mozzarella, gorgonzola, chèvre, parmesan", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Pepperoni", prixBase: 11.90, description: "Tomate, mozzarella, pepperoni", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Calzone", prixBase: 13.50, description: "Tomate, mozzarella, jambon, champignons, œuf", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Végétarienne", prixBase: 11.00, description: "Tomate, mozzarella, légumes grillés", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Orientale", prixBase: 12.90, description: "Tomate, mozzarella, merguez, poivrons, oignons", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Saumon", prixBase: 14.50, description: "Crème, mozzarella, saumon fumé, aneth", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Chorizo", prixBase: 12.50, description: "Tomate, mozzarella, chorizo, poivrons", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Campagnarde", prixBase: 13.00, description: "Tomate, mozzarella, lardons, pommes de terre, reblochon", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Fruits de mer", prixBase: 15.50, description: "Tomate, mozzarella, fruits de mer, persillade", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Napolitaine", prixBase: 12.00, description: "Tomate, mozzarella, anchois, câpres, olives", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "3 Viandes", prixBase: 13.90, description: "Tomate, mozzarella, jambon, merguez, poulet", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Chèvre miel", prixBase: 13.50, description: "Crème, mozzarella, fromage de chèvre, miel, noix", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] },
      { nom: "Savoyarde", prixBase: 14.00, description: "Crème, mozzarella, lardons, reblochon, pommes de terre", disponible: true, tailles: ["Petite", "Moyenne", "Grande"] }
    ]
  },
  burgers: {
    nom: "Burgers",
    supplements: SUPPLEMENTS_BURGERS,
    produits: [
      { 
        nom: "Classic Burger", 
        prix: 9.90, 
        description: "Steak, salade, tomate, oignons, sauce burger", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Cheeseburger", 
        prix: 10.50, 
        description: "Steak, cheddar, salade, tomate, oignons, sauce burger", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Bacon Burger", 
        prix: 11.50, 
        description: "Steak, bacon, cheddar, salade, tomate, sauce BBQ", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Double Cheese", 
        prix: 13.50, 
        description: "2 steaks, double cheddar, salade, oignons, sauce burger", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Chicken Burger", 
        prix: 10.90, 
        description: "Poulet pané, salade, tomate, sauce curry", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Fish Burger", 
        prix: 11.90, 
        description: "Poisson pané, salade, tomate, sauce tartare", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Veggie Burger", 
        prix: 10.50, 
        description: "Steak végétal, salade, tomate, avocat, sauce végé", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Raclette Burger", 
        prix: 12.90, 
        description: "Steak, raclette, pommes de terre, lardons", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Savoyard Burger", 
        prix: 13.50, 
        description: "Steak, reblochon, lardons, oignons confits", 
        disponible: true,
        supplementsPossibles: true
      },
      { 
        nom: "Burger du Chef", 
        prix: 14.90, 
        description: "Steak Angus, foie gras, confit d'oignons, roquette", 
        disponible: true,
        supplementsPossibles: true
      }
    ]
  },
  tacos: {
    nom: "Tacos",
    description: "Tacos personnalisables - Le client choisit: taille, viandes, sauces, ingrédients",
    tailles: [
      { nom: "M (1 viande)", prix: 6.50 },
      { nom: "L (2 viandes)", prix: 8.50 },
      { nom: "XL (3 viandes)", prix: 10.50 }
    ],
    viandes: [
      { nom: "Poulet", disponible: true },
      { nom: "Viande hachée", disponible: true },
      { nom: "Merguez", disponible: true },
      { nom: "Cordon bleu", disponible: true },
      { nom: "Nuggets", disponible: true },
      { nom: "Kebab", disponible: true },
      { nom: "Steak haché", disponible: true },
      { nom: "Tenders", disponible: true }
    ],
    sauces: [
      { nom: "Blanche", disponible: true },
      { nom: "Algérienne", disponible: true },
      { nom: "Samouraï", disponible: true },
      { nom: "Harissa", disponible: true },
      { nom: "Ketchup", disponible: true },
      { nom: "Mayonnaise", disponible: true },
      { nom: "BBQ", disponible: true },
      { nom: "Biggy", disponible: true }
    ],
    ingredients: [
      { nom: "Frites", inclus: true },
      { nom: "Salade", inclus: true },
      { nom: "Tomates", inclus: true },
      { nom: "Oignons", inclus: true },
      { nom: "Fromage", inclus: true }
    ],
    instructions: "Le client précise: la taille (M/L/XL), le(s) viande(s), la/les sauce(s), et les ingrédients qu'il souhaite ou ne souhaite pas."
  },
  salades: {
    nom: "Salades",
    produits: [
      { nom: "Salade César", prixBase: 9.50, description: "Salade romaine, poulet, parmesan, croûtons, sauce césar", disponible: true },
      { nom: "Salade Grecque", prixBase: 8.90, description: "Tomates, concombre, feta, olives, oignon rouge", disponible: true },
      { nom: "Salade Niçoise", prixBase: 10.50, description: "Salade, thon, œuf, tomate, anchois, olives", disponible: true },
      { nom: "Salade Chèvre chaud", prixBase: 10.90, description: "Salade, toast de chèvre, lardons, tomates cerises", disponible: true },
      { nom: "Salade du Chef", prixBase: 11.50, description: "Salade, saumon fumé, avocat, tomates cerises", disponible: true },
      { nom: "Salade Poulet curry", prixBase: 10.50, description: "Salade, poulet curry, maïs, tomates, sauce curry", disponible: true },
      { nom: "Salade Végétarienne", prixBase: 9.00, description: "Salade, légumes grillés, quinoa, avocat", disponible: true },
      { nom: "Salade Italienne", prixBase: 10.00, description: "Salade, mozzarella, tomates, basilic, huile d'olive", disponible: true }
    ]
  },
  desserts: {
    nom: "Desserts",
    produits: [
      { nom: "Tiramisu", prixBase: 4.50, description: "Tiramisu maison", disponible: true },
      { nom: "Panna Cotta", prixBase: 4.00, description: "Panna cotta au coulis de fruits rouges", disponible: true },
      { nom: "Fondant au chocolat", prixBase: 5.00, description: "Fondant au chocolat coulant", disponible: true },
      { nom: "Tarte aux pommes", prixBase: 4.50, description: "Tarte aux pommes maison", disponible: true },
      { nom: "Crème brûlée", prixBase: 4.50, description: "Crème brûlée à la vanille", disponible: true },
      { nom: "Mousse au chocolat", prixBase: 3.90, description: "Mousse au chocolat maison", disponible: true },
      { nom: "Cheesecake", prixBase: 5.50, description: "Cheesecake new-yorkais", disponible: true },
      { nom: "Profiteroles", prixBase: 5.90, description: "Profiteroles au chocolat", disponible: true },
      { nom: "Tarte citron meringuée", prixBase: 5.00, description: "Tarte au citron avec meringue", disponible: true },
      { nom: "Brownie", prixBase: 4.50, description: "Brownie au chocolat et noix de pécan", disponible: true },
      { nom: "Café gourmand", prixBase: 6.50, description: "Café accompagné de 3 mini desserts", disponible: true },
      { nom: "Salade de fruits", prixBase: 4.00, description: "Salade de fruits frais de saison", disponible: true }
    ]
  },
  boissons: {
    nom: "Boissons",
    produits: [
      { nom: "Coca-Cola", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Coca-Cola Zero", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Sprite", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Fanta Orange", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Ice Tea Pêche", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Perrier", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Eau plate", prixBase: 2.00, description: "50cl", disponible: true },
      { nom: "Eau gazeuse", prixBase: 2.00, description: "50cl", disponible: true },
      { nom: "Jus d'orange", prixBase: 3.00, description: "25cl", disponible: true },
      { nom: "Jus de pomme", prixBase: 3.00, description: "25cl", disponible: true },
      { nom: "Jus multivitaminé", prixBase: 3.00, description: "25cl", disponible: true },
      { nom: "Diabolo menthe", prixBase: 3.50, description: "33cl", disponible: true },
      { nom: "Diabolo fraise", prixBase: 3.50, description: "33cl", disponible: true },
      { nom: "Orangina", prixBase: 2.80, description: "33cl", disponible: true },
      { nom: "Limonade", prixBase: 2.50, description: "33cl", disponible: true },
      { nom: "Schweppes", prixBase: 2.80, description: "33cl", disponible: true },
      { nom: "Café", prixBase: 1.50, description: "Expresso", disponible: true },
      { nom: "Café allongé", prixBase: 1.80, description: "Allongé", disponible: true },
      { nom: "Cappuccino", prixBase: 2.50, description: "Cappuccino", disponible: true },
      { nom: "Thé", prixBase: 2.00, description: "Thé au choix", disponible: true }
    ]
  },
  entrees: {
    nom: "Entrées",
    produits: [
      { nom: "Bruschetta", prixBase: 5.50, description: "Bruschetta tomate basilic", disponible: true },
      { nom: "Antipasti", prixBase: 7.90, description: "Assortiment de charcuterie italienne", disponible: true },
      { nom: "Soupe du jour", prixBase: 4.50, description: "Soupe maison", disponible: true },
      { nom: "Carpaccio de bœuf", prixBase: 8.90, description: "Carpaccio, roquette, parmesan", disponible: true },
      { nom: "Burrata", prixBase: 8.50, description: "Burrata, tomates cerises, basilic", disponible: true },
      { nom: "Croquettes de fromage", prixBase: 6.50, description: "6 croquettes croustillantes", disponible: true },
      { nom: "Calamars frits", prixBase: 7.50, description: "Calamars panés", disponible: true },
      { nom: "Escargots", prixBase: 7.90, description: "6 escargots au beurre persillé", disponible: true }
    ]
  },
  accompagnements: {
    nom: "Accompagnements",
    produits: [
      { nom: "Frites", prixBase: 3.50, description: "Portion de frites maison", disponible: true },
      { nom: "Frites de patate douce", prixBase: 4.50, description: "Portion de frites de patate douce", disponible: true },
      { nom: "Potatoes", prixBase: 4.00, description: "Potatoes épicées", disponible: true },
      { nom: "Onion rings", prixBase: 4.50, description: "Rondelles d'oignons panées", disponible: true },
      { nom: "Légumes grillés", prixBase: 4.00, description: "Assortiment de légumes", disponible: true },
      { nom: "Riz", prixBase: 3.00, description: "Riz basmati", disponible: true },
      { nom: "Salade verte", prixBase: 2.50, description: "Salade d'accompagnement", disponible: true }
    ]
  }
};

/**
 * Connecte à MongoDB
 */
async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI manquant dans le fichier .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ Erreur connexion MongoDB:", err);
    process.exit(1);
  }
}

/**
 * Remplit le menu avec tous les produits
 */
async function fillMenu() {
  console.log("\n🍕 Remplissage du menu...");

  try {
    // Vérifier s'il existe déjà une config de pricing
    let pricing = await PricingModel.findOne();

    if (!pricing) {
      // Créer une nouvelle config
      pricing = new PricingModel({
        restaurantInfo: {
          nom: "AirFood Restaurant",
          adresse: "123 Rue de la Gastronomie, 75001 Paris",
          telephone: "01 23 45 67 89",
          email: "contact@airfood.fr",
          nombreCouverts: 50
        },
        menuPricing: MENU_DATA
      });
      await pricing.save();
      console.log("   ✅ Configuration créée avec le menu complet");
    } else {
      // Mettre à jour le menu existant
      pricing.menuPricing = MENU_DATA;
      pricing.derniereModification = new Date();
      await pricing.save();
      console.log("   ✅ Menu mis à jour avec tous les produits");
    }

    // Afficher le résumé
    console.log("\n📊 Résumé du menu :");
    for (const [categorie, data] of Object.entries(MENU_DATA)) {
      if (categorie === 'tacos') {
        console.log(`   - ${data.nom}: Système personnalisable (${data.tailles.length} tailles, ${data.viandes.length} viandes, ${data.sauces.length} sauces)`);
      } else if (categorie === 'burgers') {
        console.log(`   - ${data.nom}: ${data.produits.length} produits + ${data.supplements.length} suppléments`);
      } else if (data.produits) {
        console.log(`   - ${data.nom}: ${data.produits.length} produits`);
      }
    }

    return pricing;
  } catch (error) {
    console.error("❌ Erreur lors du remplissage du menu:", error);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log("\n🚀 Démarrage du script de remplissage du menu");
  console.log("=" .repeat(70));

  try {
    // Connexion à MongoDB
    await connectDB();

    // Remplir le menu
    const pricing = await fillMenu();

    // Compter le total de produits
    let totalProduits = 0;
    for (const categorie of Object.values(MENU_DATA)) {
      totalProduits += categorie.produits.length;
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ MENU REMPLI AVEC SUCCÈS !");
    console.log("=" .repeat(70));
    console.log(`📊 Total: ${totalProduits} produits ajoutés`);
    console.log(`📂 ${Object.keys(MENU_DATA).length} catégories`);
    console.log("\n📸 Ton menu est prêt pour les captures d'écran !");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  }
}

// Exécuter le script
main();

