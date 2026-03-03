import OrderModel from "../models/order.js";
import Client from "../models/client.js";

// Créer une nouvelle commande
export async function createOrder(request, reply) {
  try {
    const orderData = request.body;

    // Si un client est fourni, vérifier son existence. Sinon, accepter un nom libre
    let clientId = null;
    if (orderData.client) {
      const client = await Client.findById(orderData.client);
      if (!client) {
        return reply.code(404).send({ error: "Client non trouvé" });
      }
      clientId = client._id;
    }

    const order = await OrderModel.create({
      client: clientId,
      nom: !clientId ? orderData.nom || null : null,
      telephone: !clientId && orderData.telephone ? orderData.telephone : null,
      date: orderData.date,
      heure: orderData.heure,
      duree: orderData.duree,
      type: orderData.type,
      modalite: orderData.modalite,
      nombrePersonnes: orderData.nombrePersonnes,
      description: orderData.description,
      notes_internes: orderData.notes_internes,
      commandes: orderData.commandes || [], // Ajouter le champ commandes
      statut: orderData.statut || "confirme",
      createdBy: orderData.createdBy || "manual",
      related_call: orderData.related_call || null,
    });

    // Populer les données du client pour la réponse
    await order.populate("client");

    return reply.code(201).send({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la commande:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer toutes les commandes
export async function getOrders(request, reply) {
  try {
    const { page = 1, limit = 10, statut, type, date, modalite } = request.query;

    // Construire le filtre
    const filter = {};
    if (statut) filter.statut = statut;
    if (type) filter.type = type;
    if (modalite) filter.modalite = modalite;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    // Calculer la pagination
    const skip = (page - 1) * limit;

    // Récupérer les commandes avec pagination
    const orders = await OrderModel.find(filter)
      .populate("client")
      .sort({ date: -1, heure: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Compter le total pour la pagination
    const total = await OrderModel.countDocuments(filter);

    return reply.send({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer les commandes d'aujourd'hui
export async function getTodayOrders(request, reply) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await OrderModel.find({
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("client")
      .sort({ heure: 1 });

    return reply.send({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes du jour:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer une commande par ID
export async function getOrderById(request, reply) {
  try {
    const { id } = request.params;

    const order = await OrderModel.findById(id)
      .populate("client");

    if (!order) {
      return reply.code(404).send({
        error: "Commande non trouvée",
      });
    }

    return reply.send({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la commande:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Mettre à jour une commande
export async function updateOrder(request, reply) {
  try {
    const { id } = request.params;
    const updateData = request.body;

    const order = await OrderModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("client");

    if (!order) {
      return reply.code(404).send({
        error: "Commande non trouvée",
      });
    }

    return reply.send({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la commande:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Mettre à jour le statut d'une commande
export async function updateOrderStatus(request, reply) {
  try {
    const { id } = request.params;
    const { statut } = request.body;

    const order = await OrderModel.findByIdAndUpdate(
      id,
      { statut },
      { new: true, runValidators: true }
    ).populate("client");

    if (!order) {
      return reply.code(404).send({
        error: "Commande non trouvée",
      });
    }

    return reply.send({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Supprimer une commande
export async function deleteOrder(request, reply) {
  try {
    const { id } = request.params;

    const order = await OrderModel.findByIdAndDelete(id);

    if (!order) {
      return reply.code(404).send({
        error: "Commande non trouvée",
      });
    }

    return reply.send({
      success: true,
      message: "Commande supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la commande:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Vérifier la disponibilité d'un créneau
export async function checkAvailability(request, reply) {
  try {
    const { date, heure, duree } = request.query;

    const startTime = new Date(`${date}T${heure}:00`);
    const endTime = new Date(startTime.getTime() + parseInt(duree) * 60000);

    // Vérifier les conflits
    const conflicts = await OrderModel.find({
      date: { $gte: startTime, $lt: endTime },
      statut: { $nin: ["annule", "termine"] }
    });

    const isAvailable = conflicts.length === 0;

    return reply.send({
      success: true,
      available: isAvailable,
      conflicts: conflicts.length
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de disponibilité:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Obtenir les créneaux disponibles
export async function getAvailableSlots(request, reply) {
  try {
    const { date } = request.query;
    
    // Récupérer les horaires depuis la BDD (dynamique)
    const PricingModel = (await import("../models/pricing.js")).default;
    const pricing = await PricingModel.findOne();
    
    if (!pricing || !pricing.restaurantInfo?.horairesOuverture) {
      return reply.code(503).send({
        error: "Horaires non configurés",
        message: "Veuillez configurer les horaires d'ouverture dans la page Configuration"
      });
    }

    // Déterminer le jour de la semaine
    const requestDate = new Date(date);
    const joursFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const jour = joursFr[requestDate.getDay()];
    
    const horaire = pricing.restaurantInfo.horairesOuverture[jour];
    
    if (!horaire || !horaire.ouvert) {
      return reply.send({
        success: true,
        availableSlots: [],
        occupiedSlots: [],
        message: "Restaurant fermé ce jour-là"
      });
    }

    // Générer les créneaux de 30 min basés sur les horaires dynamiques
    const slots = [];
    
    // Ajouter les créneaux du midi
    if (horaire.midi?.ouverture && horaire.midi?.fermeture) {
      const [midiStartH, midiStartM] = horaire.midi.ouverture.split(':').map(Number);
      const [midiEndH, midiEndM] = horaire.midi.fermeture.split(':').map(Number);
      
      let currentMinutes = midiStartH * 60 + midiStartM;
      const midiEndMinutes = midiEndH * 60 + midiEndM;
      
      while (currentMinutes < midiEndMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        currentMinutes += 30; // Créneaux de 30 minutes
      }
    }
    
    // Ajouter les créneaux du soir
    if (horaire.soir?.ouverture && horaire.soir?.fermeture) {
      const [soirStartH, soirStartM] = horaire.soir.ouverture.split(':').map(Number);
      const [soirEndH, soirEndM] = horaire.soir.fermeture.split(':').map(Number);
      
      let currentMinutes = soirStartH * 60 + soirStartM;
      const soirEndMinutes = soirEndH * 60 + soirEndM;
      
      while (currentMinutes < soirEndMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        currentMinutes += 30; // Créneaux de 30 minutes
      }
    }

    // Récupérer les créneaux occupés
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const occupiedOrders = await OrderModel.find({
      date: { $gte: startDate, $lt: endDate },
      statut: { $nin: ["annule", "termine"] }
    });

    // Marquer les créneaux occupés
    const occupiedSlots = occupiedOrders.map(order => order.heure);
    const availableSlots = slots.filter(slot => !occupiedSlots.includes(slot));

    return reply.send({
      success: true,
      availableSlots,
      occupiedSlots
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Retourne les chiffres du numéro uniquement (pour recherche insensible au format)
function digitsOnly(phone) {
  if (phone == null || phone === "") return "";
  return String(phone).replace(/\D/g, "");
}

// Normalise l'heure en HH:MM (accepte 19h, 19h30, 19:00, 9h30, etc.)
function normalizeTime(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase();
  // Déjà au format HH:MM
  const matchColon = s.match(/^(\d{1,2}):(\d{2})$/);
  if (matchColon) {
    const h = parseInt(matchColon[1], 10);
    const m = parseInt(matchColon[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  // Format 19h, 19h30, 9h00
  const matchH = s.match(/^(\d{1,2})h(\d{0,2})?$/);
  if (matchH) {
    const h = parseInt(matchH[1], 10);
    const m = matchH[2] ? parseInt(matchH[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return null;
}

// Types acceptés par le schéma Order (valeurs envoyées par l'agent)
const ORDER_TYPE_VALID = new Set(["Commande à emporter", "Réservation de table"]);

// Créer une commande depuis l'IA
export async function createOrderFromAI(request, reply) {
  try {
    const orderData = request.body;

    // Logger les données reçues pour diagnostic
    console.log("[createOrderFromAI] Données reçues:", {
      orderData: JSON.stringify(orderData, null, 2),
      hasCommandes: Array.isArray(orderData.commandes),
      commandesCount: orderData.commandes ? orderData.commandes.length : 0,
      commandes: orderData.commandes ? JSON.stringify(orderData.commandes, null, 2) : "[]",
    });

    const rawPhone = String(orderData.clientPhone ?? orderData.telephone ?? "").trim();
    const phoneNormalized = digitsOnly(rawPhone);
    if (phoneNormalized.length < 10) {
      return reply.code(400).send({
        error: "Numéro de téléphone invalide ou manquant.",
      });
    }

    const rawTime = orderData.time ?? orderData.heure ?? "";
    const heureNormalized = normalizeTime(rawTime);
    if (!heureNormalized) {
      return reply.code(400).send({
        error: "Heure invalide ou manquante.",
      });
    }

    const rawDate = orderData.date;
    const orderDate = rawDate ? new Date(rawDate) : null;
    if (!orderDate || isNaN(orderDate.getTime())) {
      return reply.code(400).send({
        error: "Date invalide ou manquante.",
      });
    }

    // Recherche client existant par téléphone (pas de création de contact en restauration rapide)
    const client = await Client.findOne({
      $or: [
        { telephone: rawPhone.trim() },
        { telephone: phoneNormalized },
        { telephone: rawPhone.replace(/\s+/g, "").replace(/-/g, "") },
      ],
    });

    const rawType = orderData.type ?? null;
    const orderType = ORDER_TYPE_VALID.has(rawType) ? rawType : null;

    // Créer la commande : avec client si trouvé, sinon sans client (nom et téléphone uniquement)
    const orderToCreate = {
      client: client?._id ?? null,
      nom: client ? null : (orderData.name || "Client").trim() || null,
      telephone: !client && rawPhone ? rawPhone.trim() : null,
      date: orderDate,
      heure: heureNormalized,
      duree: orderData.duration ?? orderData.duree ?? 60,
      type: orderType,
      modalite: orderData.modalite ?? null,
      description: orderData.description ?? null,
      commandes: orderData.commandes || [],
      statut: "confirme",
      createdBy: "system",
    };

    // Logger la commande qui va être créée
    console.log("[createOrderFromAI] Commande à créer:", {
      orderToCreate: JSON.stringify(orderToCreate, null, 2),
      commandesCount: orderToCreate.commandes.length,
      commandes: JSON.stringify(orderToCreate.commandes, null, 2),
    });

    const order = await OrderModel.create(orderToCreate);

    if (order.client) {
      await order.populate("client");
    }

    // Logger la commande créée
    console.log("[createOrderFromAI] Commande créée avec succès:", {
      orderId: order._id,
      commandesCount: order.commandes ? order.commandes.length : 0,
      commandes: order.commandes ? JSON.stringify(order.commandes, null, 2) : "[]",
    });

    return reply.code(201).send({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur lors de la création de commande depuis l'IA:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}