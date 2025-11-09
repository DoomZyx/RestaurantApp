import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../models/client.js";
import OrderModel from "../models/order.js";
import CallModel from "../models/callData.js";

dotenv.config();

// Données de démonstration
const DEMO_CLIENTS = [
  { prenom: "Marie", nom: "Dubois", telephone: "0612345678", email: "marie.dubois@email.fr" },
  { prenom: "Pierre", nom: "Martin", telephone: "0623456789", email: "pierre.martin@email.fr" },
  { prenom: "Sophie", nom: "Bernard", telephone: "0634567890", email: "sophie.bernard@email.fr" },
  { prenom: "Lucas", nom: "Petit", telephone: "0645678901", email: "lucas.petit@email.fr" },
  { prenom: "Emma", nom: "Durand", telephone: "0656789012", email: "emma.durand@email.fr" },
  { prenom: "Thomas", nom: "Leroy", telephone: "0667890123", email: "thomas.leroy@email.fr" },
  { prenom: "Chloé", nom: "Moreau", telephone: "0678901234", email: "chloe.moreau@email.fr" },
  { prenom: "Antoine", nom: "Simon", telephone: "0689012345", email: "antoine.simon@email.fr" },
  { prenom: "Julie", nom: "Laurent", telephone: "0690123456", email: "julie.laurent@email.fr" },
  { prenom: "Maxime", nom: "Lefebvre", telephone: "0601234567", email: "maxime.lefebvre@email.fr" }
];

const COMMANDES_EXEMPLES = [
  {
    description: "2 Pizzas Margherita, 1 Coca-Cola",
    commandes: [
      { nom: "Pizza Margherita", quantite: 2, prix: 12.50 },
      { nom: "Coca-Cola", quantite: 1, prix: 2.50 }
    ]
  },
  {
    description: "1 Pizza Pepperoni, 1 Salade César, 2 Eaux",
    commandes: [
      { nom: "Pizza Pepperoni", quantite: 1, prix: 14.50 },
      { nom: "Salade César", quantite: 1, prix: 9.50 },
      { nom: "Eau", quantite: 2, prix: 2.00 }
    ]
  },
  {
    description: "3 Burgers Bacon, 3 Frites, 3 Coca",
    commandes: [
      { nom: "Bacon Burger", quantite: 3, prix: 13.50 },
      { nom: "Frites", quantite: 3, prix: 3.50 },
      { nom: "Coca-Cola", quantite: 3, prix: 2.50 }
    ]
  },
  {
    description: "1 Pizza Quatre Fromages, 1 Tiramisu, 1 Jus d'orange",
    commandes: [
      { nom: "Pizza Quatre Fromages", quantite: 1, prix: 16.50 },
      { nom: "Tiramisu", quantite: 1, prix: 4.50 },
      { nom: "Jus d'orange", quantite: 1, prix: 3.00 }
    ]
  },
  {
    description: "2 Cheeseburgers, 2 Frites, 2 Eaux",
    commandes: [
      { nom: "Cheeseburger", quantite: 2, prix: 11.50 },
      { nom: "Frites", quantite: 2, prix: 3.50 },
      { nom: "Eau", quantite: 2, prix: 2.00 }
    ]
  },
  {
    description: "1 Salade Grecque, 1 Pizza Margherita, 1 Tarte aux pommes",
    commandes: [
      { nom: "Salade Grecque", quantite: 1, prix: 8.50 },
      { nom: "Pizza Margherita", quantite: 1, prix: 12.50 },
      { nom: "Tarte aux pommes", quantite: 1, prix: 3.50 }
    ]
  },
  {
    description: "4 Pizzas Pepperoni, 4 Coca-Cola, 2 Tiramisu",
    commandes: [
      { nom: "Pizza Pepperoni", quantite: 4, prix: 14.50 },
      { nom: "Coca-Cola", quantite: 4, prix: 2.50 },
      { nom: "Tiramisu", quantite: 2, prix: 4.50 }
    ]
  }
];

const TYPES_COMMANDE = ["Commande à emporter", "Réservation table", "Livraison"];
const MODALITES = ["À emporter", "Sur place", "Livraison"];

/**
 * Génère une heure aléatoire pour ce soir (18h-22h)
 */
function genererHeureAleatoire() {
  const heures = [18, 19, 20, 21, 22];
  const minutes = ["00", "15", "30", "45"];
  
  const heure = heures[Math.floor(Math.random() * heures.length)];
  const minute = minutes[Math.floor(Math.random() * minutes.length)];
  
  return `${String(heure).padStart(2, '0')}:${minute}`;
}

/**
 * Génère le nombre de personnes (1-6)
 */
function genererNombrePersonnes() {
  return Math.floor(Math.random() * 6) + 1;
}

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
 * Crée ou récupère les clients de démonstration
 */
async function createDemoClients() {
  console.log("\n📝 Création des clients de démonstration...");
  
  const clients = [];
  
  for (const clientData of DEMO_CLIENTS) {
    // Vérifier si le client existe déjà
    let client = await Client.findOne({ telephone: clientData.telephone });
    
    if (!client) {
      client = await Client.create(clientData);
      console.log(`   ✅ Client créé: ${client.prenom} ${client.nom}`);
    } else {
      console.log(`   ℹ️  Client existant: ${client.prenom} ${client.nom}`);
    }
    
    clients.push(client);
  }
  
  return clients;
}

/**
 * Crée des commandes à emporter pour ce soir
 */
async function createTakeawayOrders(clients) {
  console.log("\n🍕 Création des commandes à emporter...");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const orders = [];
  
  // Créer 5 commandes à emporter
  for (let i = 0; i < 5; i++) {
    const client = clients[i];
    const commandeData = COMMANDES_EXEMPLES[i];
    const heure = genererHeureAleatoire();
    
    const order = await OrderModel.create({
      client: client._id,
      date: today,
      heure: heure,
      duree: 30,
      type: "Commande à emporter",
      modalite: "À emporter",
      nombrePersonnes: 1,
      description: commandeData.description,
      commandes: commandeData.commandes,
      statut: "confirme",
      createdBy: "system",
      notes_internes: "[DEMO] Données de démonstration"
    });
    
    // Créer l'appel associé
    await CallModel.create({
      client: client._id,
      type_demande: "Commande à emporter",
      services: "Pizzas",
      description: commandeData.description,
      date: new Date(),
      statut: "termine",
      related_order: order._id
    });
    
    console.log(`   ✅ Commande créée: ${client.prenom} ${client.nom} - ${heure} - ${commandeData.description}`);
    orders.push(order);
  }
  
  return orders;
}

/**
 * Crée des réservations de table pour ce soir
 */
async function createTableReservations(clients) {
  console.log("\n🍽️  Création des réservations de table...");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const orders = [];
  
  // Créer 5 réservations de table
  for (let i = 5; i < 10; i++) {
    const client = clients[i];
    const commandeData = COMMANDES_EXEMPLES[i % COMMANDES_EXEMPLES.length];
    const heure = genererHeureAleatoire();
    const nombrePersonnes = genererNombrePersonnes();
    
    const order = await OrderModel.create({
      client: client._id,
      date: today,
      heure: heure,
      duree: 90, // 1h30 pour une réservation
      type: "Réservation de table",
      modalite: "Sur place",
      nombrePersonnes: nombrePersonnes,
      description: `Table pour ${nombrePersonnes} personne(s)`,
      commandes: commandeData.commandes,
      statut: "confirme",
      createdBy: "system",
      notes_internes: "[DEMO] Données de démonstration"
    });
    
    // Créer l'appel associé
    await CallModel.create({
      client: client._id,
      type_demande: "Réservation de table",
      services: "Autre",
      description: `Table pour ${nombrePersonnes} personne(s) à ${heure}`,
      date: new Date(),
      statut: "termine",
      related_order: order._id
    });
    
    console.log(`   ✅ Réservation créée: ${client.prenom} ${client.nom} - ${heure} - ${nombrePersonnes} pers.`);
    orders.push(order);
  }
  
  return orders;
}

/**
 * Fonction principale
 */
async function main() {
  console.log("\n🚀 Démarrage du script de remplissage de données de démonstration");
  console.log("=" .repeat(70));
  
  try {
    // Connexion à MongoDB
    await connectDB();
    
    // Créer les clients
    const clients = await createDemoClients();
    
    // Créer les commandes à emporter
    const takeawayOrders = await createTakeawayOrders(clients);
    
    // Créer les réservations
    const reservations = await createTableReservations(clients);
    
    console.log("\n" + "=".repeat(70));
    console.log("✅ DONNÉES DE DÉMONSTRATION CRÉÉES AVEC SUCCÈS !");
    console.log("=" .repeat(70));
    console.log(`📊 Résumé:`);
    console.log(`   - ${clients.length} clients créés`);
    console.log(`   - ${takeawayOrders.length} commandes à emporter`);
    console.log(`   - ${reservations.length} réservations de table`);
    console.log(`   - Total: ${takeawayOrders.length + reservations.length} commandes pour ce soir`);
    console.log("\n📸 Ton application est prête pour les captures d'écran !");
    console.log("\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  }
}

// Exécuter le script
main();

