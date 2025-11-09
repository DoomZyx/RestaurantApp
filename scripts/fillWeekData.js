import mongoose from "mongoose";
import dotenv from "dotenv";
import Client from "../models/client.js";
import OrderModel from "../models/order.js";
import CallModel from "../models/callData.js";

dotenv.config();

// Noms français pour générer beaucoup de clients
const PRENOMS = [
  "Marie", "Pierre", "Sophie", "Lucas", "Emma", "Thomas", "Chloé", "Antoine",
  "Julie", "Maxime", "Laura", "Alexandre", "Léa", "Nicolas", "Camille", "Hugo",
  "Sarah", "Mathieu", "Clara", "Julien", "Inès", "Romain", "Manon", "Guillaume",
  "Océane", "Florian", "Élise", "Benjamin", "Anaïs", "Adrien", "Valentine", "Clément"
];

const NOMS = [
  "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Richard", "Durand",
  "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David",
  "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Lefevre",
  "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Garnier"
];

// Commandes variées
const COMMANDES_EMPORTER = [
  {
    description: "2 Pizzas Margherita, 1 Coca-Cola",
    commandes: [
      { nom: "Pizza Margherita", quantite: 2, prixUnitaire: 12.50 },
      { nom: "Coca-Cola", quantite: 1, prixUnitaire: 2.50 }
    ]
  },
  {
    description: "1 Pizza Pepperoni, 1 Salade César, 2 Eaux",
    commandes: [
      { nom: "Pizza Pepperoni", quantite: 1, prixUnitaire: 14.50 },
      { nom: "Salade César", quantite: 1, prixUnitaire: 9.50 },
      { nom: "Eau", quantite: 2, prixUnitaire: 2.00 }
    ]
  },
  {
    description: "3 Burgers Bacon, 3 Frites, 3 Coca",
    commandes: [
      { nom: "Bacon Burger", quantite: 3, prixUnitaire: 13.50 },
      { nom: "Frites", quantite: 3, prixUnitaire: 3.50 },
      { nom: "Coca-Cola", quantite: 3, prixUnitaire: 2.50 }
    ]
  },
  {
    description: "1 Pizza Quatre Fromages, 1 Tiramisu",
    commandes: [
      { nom: "Pizza Quatre Fromages", quantite: 1, prixUnitaire: 16.50 },
      { nom: "Tiramisu", quantite: 1, prixUnitaire: 4.50 }
    ]
  },
  {
    description: "2 Cheeseburgers, 2 Frites, 2 Eaux",
    commandes: [
      { nom: "Cheeseburger", quantite: 2, prixUnitaire: 11.50 },
      { nom: "Frites", quantite: 2, prixUnitaire: 3.50 },
      { nom: "Eau", quantite: 2, prixUnitaire: 2.00 }
    ]
  },
  {
    description: "1 Salade Grecque, 1 Pizza Reine",
    commandes: [
      { nom: "Salade Grecque", quantite: 1, prixUnitaire: 8.50 },
      { nom: "Pizza Reine", quantite: 1, prixUnitaire: 13.50 }
    ]
  },
  {
    description: "4 Pizzas Pepperoni, 2 Tiramisu, 4 Coca",
    commandes: [
      { nom: "Pizza Pepperoni", quantite: 4, prixUnitaire: 14.50 },
      { nom: "Tiramisu", quantite: 2, prixUnitaire: 4.50 },
      { nom: "Coca-Cola", quantite: 4, prixUnitaire: 2.50 }
    ]
  },
  {
    description: "2 Pizzas Végétarienne, 2 Jus d'orange",
    commandes: [
      { nom: "Pizza Végétarienne", quantite: 2, prixUnitaire: 13.50 },
      { nom: "Jus d'orange", quantite: 2, prixUnitaire: 3.00 }
    ]
  },
  {
    description: "1 Menu Burger complet",
    commandes: [
      { nom: "Burger Menu", quantite: 1, prixUnitaire: 15.00 },
      { nom: "Frites", quantite: 1, prixUnitaire: 3.50 },
      { nom: "Coca-Cola", quantite: 1, prixUnitaire: 2.50 }
    ]
  },
  {
    description: "3 Pizzas Calzone, 3 Eaux",
    commandes: [
      { nom: "Pizza Calzone", quantite: 3, prixUnitaire: 15.50 },
      { nom: "Eau", quantite: 3, prixUnitaire: 2.00 }
    ]
  }
];

const HEURES_POSSIBLES = [
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30", "21:45",
  "22:00", "22:15", "22:30"
];

/**
 * Génère un nom de client aléatoire
 */
function genererNomClient() {
  const prenom = PRENOMS[Math.floor(Math.random() * PRENOMS.length)];
  const nom = NOMS[Math.floor(Math.random() * NOMS.length)];
  return { prenom, nom };
}

/**
 * Génère un téléphone unique
 */
function genererTelephone(index) {
  const base = 600000000 + index;
  return `0${base}`;
}

/**
 * Génère un email
 */
function genererEmail(prenom, nom, index) {
  return `${prenom.toLowerCase()}.${nom.toLowerCase()}${index}@email.fr`;
}

/**
 * Génère une heure aléatoire
 */
function genererHeureAleatoire() {
  return HEURES_POSSIBLES[Math.floor(Math.random() * HEURES_POSSIBLES.length)];
}

/**
 * Génère le nombre de personnes (1-8)
 */
function genererNombrePersonnes() {
  return Math.floor(Math.random() * 8) + 1;
}

/**
 * Sélectionne une commande aléatoire
 */
function selectionnerCommandeAleatoire() {
  return COMMANDES_EMPORTER[Math.floor(Math.random() * COMMANDES_EMPORTER.length)];
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
 * Crée beaucoup de clients
 */
async function createManyClients(count) {
  console.log(`\n📝 Création de ${count} clients...`);
  
  const clients = [];
  
  for (let i = 0; i < count; i++) {
    const { prenom, nom } = genererNomClient();
    const telephone = genererTelephone(i);
    const email = genererEmail(prenom, nom, i);
    
    // Vérifier si le client existe déjà
    let client = await Client.findOne({ telephone });
    
    if (!client) {
      client = await Client.create({ prenom, nom, telephone, email });
    }
    
    clients.push(client);
  }
  
  console.log(`   ✅ ${count} clients créés/récupérés`);
  return clients;
}

/**
 * Crée des commandes pour une date donnée
 */
async function createOrdersForDate(date, clients, commandesCount, reservationsCount) {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  
  const dateStr = dateObj.toLocaleDateString('fr-FR');
  
  console.log(`\n📅 ${dateStr}`);
  
  let orderCount = 0;
  
  // Créer les commandes à emporter
  console.log(`   🍕 Création de ${commandesCount} commandes à emporter...`);
  for (let i = 0; i < commandesCount; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const commandeData = selectionnerCommandeAleatoire();
    const heure = genererHeureAleatoire();
    
    const order = await OrderModel.create({
      client: client._id,
      date: dateObj,
      heure: heure,
      duree: 30,
      type: "Commande à emporter",
      modalite: "À emporter",
      nombrePersonnes: 1,
      description: commandeData.description,
      commandes: commandeData.commandes,
      statut: "confirme",
      createdBy: "system",
      notes_internes: "[DEMO_WEEK] Données de démonstration"
    });
    
    // Créer l'appel associé
    await CallModel.create({
      client: client._id,
      type_demande: "Commande à emporter",
      services: "Pizzas",
      description: commandeData.description,
      date: new Date(dateObj.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      statut: "termine",
      related_order: order._id
    });
    
    orderCount++;
  }
  
  // Créer les réservations de table
  console.log(`   🍽️  Création de ${reservationsCount} réservations...`);
  for (let i = 0; i < reservationsCount; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const commandeData = selectionnerCommandeAleatoire();
    const heure = genererHeureAleatoire();
    const nombrePersonnes = genererNombrePersonnes();
    
    const order = await OrderModel.create({
      client: client._id,
      date: dateObj,
      heure: heure,
      duree: 90,
      type: "Réservation de table",
      modalite: "Sur place",
      nombrePersonnes: nombrePersonnes,
      description: `Table pour ${nombrePersonnes} personne(s)`,
      commandes: commandeData.commandes,
      statut: "confirme",
      createdBy: "system",
      notes_internes: "[DEMO_WEEK] Données de démonstration"
    });
    
    // Créer l'appel associé
    await CallModel.create({
      client: client._id,
      type_demande: "Réservation de table",
      services: "Autre",
      description: `Table pour ${nombrePersonnes} personne(s) à ${heure}`,
      date: new Date(dateObj.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      statut: "termine",
      related_order: order._id
    });
    
    orderCount++;
  }
  
  console.log(`   ✅ ${orderCount} commandes créées pour le ${dateStr}`);
  return orderCount;
}

/**
 * Fonction principale
 */
async function main() {
  console.log("\n🚀 Démarrage du script de remplissage pour la semaine du 1er au 7 novembre");
  console.log("=" .repeat(80));
  
  try {
    // Connexion à MongoDB
    await connectDB();
    
    // Créer beaucoup de clients (50 clients)
    const clients = await createManyClients(50);
    
    // Définir les dates du 1er au 7 novembre 2025
    const dates = [
      new Date(2025, 10, 1),  // 1er novembre
      new Date(2025, 10, 2),  // 2 novembre
      new Date(2025, 10, 3),  // 3 novembre
      new Date(2025, 10, 4),  // 4 novembre
      new Date(2025, 10, 5),  // 5 novembre
      new Date(2025, 10, 6),  // 6 novembre
      new Date(2025, 10, 7)   // 7 novembre
    ];
    
    let totalOrders = 0;
    
    // Pour chaque jour, créer entre 8-15 commandes et 5-10 réservations
    for (const date of dates) {
      const commandesCount = Math.floor(Math.random() * 8) + 8;  // 8-15
      const reservationsCount = Math.floor(Math.random() * 6) + 5; // 5-10
      
      const count = await createOrdersForDate(date, clients, commandesCount, reservationsCount);
      totalOrders += count;
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ DONNÉES DE DÉMONSTRATION CRÉÉES AVEC SUCCÈS !");
    console.log("=" .repeat(80));
    console.log(`📊 Résumé:`);
    console.log(`   - ${clients.length} clients créés`);
    console.log(`   - ${totalOrders} commandes/réservations créées`);
    console.log(`   - Période: 1er au 7 novembre 2025`);
    console.log("\n📸 Ton application est remplie pour la semaine !");
    console.log("\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR:", error);
    process.exit(1);
  }
}

// Exécuter le script
main();

