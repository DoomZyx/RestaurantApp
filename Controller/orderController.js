import OrderModel from "../models/order.js";
import Client from "../models/client.js";

// Créer une nouvelle commande
export async function createOrder(request, reply) {
  try {
    const orderData = request.body;

    // Vérifier que le client existe
    const client = await Client.findById(orderData.client);
    if (!client) {
      return reply.code(404).send({
        error: "Client non trouvé",
      });
    }

    // Créer la commande
    const order = await OrderModel.create(orderData);

    // Populer les données du client pour la réponse
    await order.populate("client", "prenom nom telephone email");

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
    const { page = 1, limit = 10, status, type, date } = request.query;

    // Construire le filtre
    const filter = {};
    if (status) filter.statut = status;
    if (type) filter.type = type;
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
      .populate("client", "prenom nom telephone email")
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
      .populate("client", "prenom nom telephone email")
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
      .populate("client", "prenom nom telephone email");

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
    ).populate("client", "prenom nom telephone email");

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
    ).populate("client", "prenom nom telephone email");

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
    
    // Générer les créneaux de 30 min de 9h à 18h
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
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

// Créer une commande depuis l'IA
export async function createOrderFromAI(request, reply) {
  try {
    const orderData = request.body;

    // Trouver ou créer le client
    let client = await Client.findOne({ telephone: orderData.telephone });
    if (!client) {
      client = await Client.create({
        prenom: orderData.prenom || "Client",
        nom: orderData.nom || "",
        telephone: orderData.telephone,
      });
    }

    // Créer la commande
    const order = await OrderModel.create({
      client: client._id,
      date: new Date(orderData.date),
      heure: orderData.heure,
      duree: orderData.duree || 60,
      type: orderData.type,
      modalite: orderData.modalite,
      description: orderData.description,
      statut: "confirme",
      createdBy: "system",
    });

    // Populer les données du client
    await order.populate("client", "prenom nom telephone email");

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