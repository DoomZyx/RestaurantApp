import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../models/client.js";
import OrderModel from "../models/order.js";
import CallModel from "../models/callData.js";

dotenv.config();

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
 * Supprime toutes les données de démonstration
 */
async function cleanDemoData() {
  console.log("\n🧹 Nettoyage des données de démonstration...");
  
  try {
    // Supprimer les commandes créées par les scripts (marquées [DEMO] ou [DEMO_WEEK] dans notes_internes)
    const ordersDeleted = await OrderModel.deleteMany({ 
      notes_internes: { $regex: /\[(DEMO|DEMO_WEEK)\]/ }
    });
    console.log(`   ✅ ${ordersDeleted.deletedCount} commandes supprimées`);
    
    // Supprimer les appels associés aux commandes de démo
    // (Tous les appels terminés liés aux commandes et réservations de novembre)
    const startNovember = new Date(2025, 10, 1); // 1er novembre 2025
    const endNovember = new Date(2025, 10, 8);   // 8 novembre 2025
    const callsDeleted = await CallModel.deleteMany({ 
      statut: "termine",
      type_demande: { $in: ["Commande à emporter", "Réservation de table"] },
      date: { $gte: startNovember, $lt: endNovember }
    });
    console.log(`   ✅ ${callsDeleted.deletedCount} appels supprimés`);
    
    // Optionnel: Supprimer les clients de démonstration
    // (Commenté par défaut pour ne pas supprimer les vrais clients)
    // const clientsDeleted = await Client.deleteMany({ 
    //   email: { $regex: /@email\.fr$/ } 
    // });
    // console.log(`   ✅ ${clientsDeleted.deletedCount} clients supprimés`);
    
    console.log("\n✅ NETTOYAGE TERMINÉ !");
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log("\n🚀 Démarrage du script de nettoyage");
  console.log("=" .repeat(70));
  
  try {
    await connectDB();
    await cleanDemoData();
    
    console.log("\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  }
}

// Exécuter le script
main();

