import mongoose from "mongoose";
import PricingModel from "../models/pricing.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurantapp";

async function resetPricing() {
  try {
    console.log("🔌 Connexion à MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connecté à MongoDB");

    // Supprimer toute configuration existante
    console.log("🗑️  Suppression de l'ancienne configuration...");
    await PricingModel.deleteMany({});
    console.log("✅ Configuration supprimée");

    // Créer une nouvelle configuration avec des données par défaut
    console.log("📝 Création de la nouvelle configuration...");
    const pricing = await PricingModel.create({
      restaurantInfo: {
        nom: "Mon Restaurant",
        adresse: "123 Rue de la Pizza, 75001 Paris",
        telephone: "01 23 45 67 89",
        email: "contact@monrestaurant.fr",
        horairesOuverture: {
          lundi: { ouvert: false, ouverture: "09:00", fermeture: "18:00" },
          mardi: { ouvert: true, ouverture: "11:00", fermeture: "22:00" },
          mercredi: { ouvert: true, ouverture: "11:00", fermeture: "22:00" },
          jeudi: { ouvert: true, ouverture: "11:00", fermeture: "22:00" },
          vendredi: { ouvert: true, ouverture: "11:00", fermeture: "23:00" },
          samedi: { ouvert: true, ouverture: "11:00", fermeture: "23:00" },
          dimanche: { ouvert: true, ouverture: "12:00", fermeture: "21:00" }
        }
      },
      menuPricing: {
        pizzas: {
          nom: "Pizzas",
          produits: [
            { nom: "Margherita", description: "Tomate, mozzarella, basilic", prixBase: 12.50, taille: "Moyenne", disponible: true },
            { nom: "Pepperoni", description: "Tomate, mozzarella, pepperoni", prixBase: 14.50, taille: "Moyenne", disponible: true },
            { nom: "Quatre Fromages", description: "Mozzarella, gorgonzola, parmesan, chèvre", prixBase: 16.50, taille: "Moyenne", disponible: true },
            { nom: "Reine", description: "Tomate, mozzarella, jambon, champignons", prixBase: 14.00, taille: "Moyenne", disponible: true },
            { nom: "Végétarienne", description: "Tomate, mozzarella, légumes grillés", prixBase: 13.50, taille: "Moyenne", disponible: true }
          ]
        },
        burgers: {
          nom: "Burgers",
          produits: [
            { nom: "Cheeseburger", description: "Steak, cheddar, salade, tomate, oignons", prixBase: 11.50, disponible: true },
            { nom: "Bacon Burger", description: "Steak, bacon, cheddar, oignons caramélisés", prixBase: 13.50, disponible: true },
            { nom: "Chicken Burger", description: "Poulet pané, salade, tomate, sauce curry", prixBase: 12.50, disponible: true },
            { nom: "Veggie Burger", description: "Steak végétal, cheddar, avocat", prixBase: 12.00, disponible: true }
          ]
        },
        salades: {
          nom: "Salades",
          produits: [
            { nom: "Salade César", description: "Salade romaine, poulet grillé, parmesan, croûtons, sauce césar", prixBase: 9.50, disponible: true },
            { nom: "Salade Grecque", description: "Salade, tomates, concombre, olives, feta, oignons rouges", prixBase: 8.50, disponible: true },
            { nom: "Salade Chèvre Chaud", description: "Salade, chèvre chaud, tomates, noix, miel", prixBase: 10.50, disponible: true }
          ]
        },
        boissons: {
          nom: "Boissons",
          produits: [
            { nom: "Coca-Cola", description: "Boisson gazeuse", prixBase: 2.50, taille: "33cl", disponible: true },
            { nom: "Coca-Cola Zero", description: "Boisson gazeuse sans sucre", prixBase: 2.50, taille: "33cl", disponible: true },
            { nom: "Eau Minérale", description: "Eau plate", prixBase: 2.00, taille: "50cl", disponible: true },
            { nom: "Eau Pétillante", description: "Eau gazeuse", prixBase: 2.00, taille: "50cl", disponible: true },
            { nom: "Jus d'Orange", description: "100% pur jus", prixBase: 3.00, taille: "33cl", disponible: true },
            { nom: "Ice Tea", description: "Thé glacé pêche", prixBase: 2.80, taille: "33cl", disponible: true }
          ]
        },
        desserts: {
          nom: "Desserts",
          produits: [
            { nom: "Tiramisu", description: "Dessert italien traditionnel", prixBase: 4.50, disponible: true },
            { nom: "Tarte aux Pommes", description: "Tarte maison servie tiède", prixBase: 3.50, disponible: true },
            { nom: "Fondant au Chocolat", description: "Coulant au chocolat, glace vanille", prixBase: 5.00, disponible: true },
            { nom: "Panna Cotta", description: "Crème italienne, coulis de fruits rouges", prixBase: 4.00, disponible: true }
          ]
        }
      },
      deliveryPricing: {
        activerLivraison: true,
        fraisBase: 2.50,
        prixParKm: 0.80,
        distanceMaximale: 10,
        montantMinimumCommande: 15,
        delaiPreparation: 30
      },
      taxes: {
        tva: 20,
        serviceCharge: 0,
        applicableServiceCharge: false
      },
      promotions: []
    });

    console.log("✅ Configuration créée avec succès !");
    console.log(`\n📊 Résumé de la configuration :`);
    console.log(`   - Restaurant: ${pricing.restaurantInfo.nom}`);
    console.log(`   - Pizzas: ${pricing.menuPricing.pizzas.produits.length} produits`);
    console.log(`   - Burgers: ${pricing.menuPricing.burgers.produits.length} produits`);
    console.log(`   - Salades: ${pricing.menuPricing.salades.produits.length} produits`);
    console.log(`   - Boissons: ${pricing.menuPricing.boissons.produits.length} produits`);
    console.log(`   - Desserts: ${pricing.menuPricing.desserts.produits.length} produits`);
    console.log(`   - Livraison activée: ${pricing.deliveryPricing.activerLivraison ? 'Oui' : 'Non'}`);
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Déconnexion de MongoDB");
    process.exit(0);
  }
}

console.log("🍕 Script de réinitialisation de la configuration Restaurant\n");
resetPricing();
