import CallModel from "../models/callData.js";
import Client from "../models/client.js";
import OrderModel from "../models/order.js";
import mongoose from "mongoose";
import notificationService from "../Services/notificationService.js";

export async function saveCallData(data) {
  try {
    const {
      prenom,
      nom,
      telephone,
      type_demande,
      services,
      description,
      date,
      statut,
      appointment,
    } = data;

    let client = null;
    
    // Chercher un client existant UNIQUEMENT si on a un vrai numéro de téléphone
    if (telephone && telephone !== "Non fourni") {
      client = await Client.findOne({ telephone });
      console.log("🔍 Recherche client avec téléphone:", telephone, "→", client ? "Trouvé" : "Non trouvé");
    }

    // Pas besoin de créer un client, on stockera le nom directement dans la commande
    if (appointment && !client) {
      console.log("ℹ️ Commande sans client associé - le nom sera stocké dans la commande");
    }
    
    const callData = {
      type_demande,
      services,
      description,
      date,
      statut,
    };

    // Associer le client s'il existe
    if (client) {
      callData.client = client._id;
    }

    const call = await CallModel.create(callData);

    // Créer une commande si présente dans les données extraites (pas besoin de client)
    let createdOrder = null;
    if (appointment && typeof appointment === 'object' && appointment.date && appointment.heure) {
      try {
        console.log("📅 Création d'une commande depuis la transcription:", appointment);
        if (appointment.nombrePersonnes) {
          console.log("👥 Nombre de personnes détecté:", appointment.nombrePersonnes);
        }
        
        // Gérer les valeurs "ASAP" pour date/heure
        let orderDate = new Date();
        let orderHeure = appointment.heure;
        
        if (appointment.date === "ASAP") {
          // Utiliser la date actuelle
          orderDate = new Date();
          console.log("⏰ Date ASAP détectée → date actuelle:", orderDate.toISOString().split('T')[0]);
        } else {
          orderDate = new Date(appointment.date);
        }
        
        if (appointment.heure === "ASAP") {
          // Utiliser l'heure actuelle + délai de préparation (ex: 30 min)
          const now = new Date();
          now.setMinutes(now.getMinutes() + 30); // +30 min de préparation
          orderHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          console.log("⏰ Heure ASAP détectée → heure actuelle + 30min:", orderHeure);
        }
        
        createdOrder = await OrderModel.create({
          client: client?._id || null, // Client optionnel
          nom: !client ? nom : null, // Stocker le nom si pas de client associé
          date: orderDate,
          heure: orderHeure,
          duree: appointment.duree || 60,
          type: appointment.type || "Commande à emporter",
          modalite: appointment.modalite || "Sur place",
          nombrePersonnes: appointment.nombrePersonnes,
          description: appointment.description || description,
          statut: "confirme",
          createdBy: "system",
          related_call: call._id
        });

        // Lier la commande à l'appel
        call.related_order = createdOrder._id;
        await call.save();

        console.log("✅ Commande créée avec succès:", createdOrder._id);
        if (client) {
          console.log("   - Client associé:", client._id);
        } else {
          console.log("   - Aucun client associé (peut être ajouté ultérieurement)");
        }
      } catch (orderError) {
        console.error("❌ Erreur lors de la création de la commande:", orderError);
        // On continue même si la commande échoue
      }
    }

    // Envoyer une notification WebSocket après la création de l'appel
    try {
      const callDataForNotification = {
        callId: call._id.toString(), // ID de l'appel
        orderId: createdOrder?._id?.toString(), // ID de la commande si elle existe
        nom: client ? `${client.prenom} ${client.nom}` : nom,
        telephone: telephone || "Non fourni",
        type_demande,
        services,
        description,
        hasOrder: !!createdOrder,
        orderType: createdOrder?.type,
        nombrePersonnes: createdOrder?.nombrePersonnes
      };
      
      notificationService.notifyCallCompleted(callDataForNotification);
      console.log("📢 Notification WebSocket envoyée pour le nouvel appel");
    } catch (notifError) {
      console.error("⚠️ Erreur envoi notification WebSocket:", notifError);
      // On continue même si la notification échoue
    }

    return { call, order: createdOrder };
  } catch (err) {
    console.error(err);
    throw err; // remonte l'erreur pour que la route la gère
  }
}

export async function getCalls(request, reply) {
  try {
    const { date, page = 1, limit = 10, nom, telephone } = request.query;

    const skip = (page - 1) * limit;
    const filters = {};

    // Filtre par date
    if (date) {
      filters.date = {
        $gte: new Date(date),
        $lt: new Date(`${date}T23:59:59Z`),
      };
    }

    // Préparation de l'agrégation avec jointure sur Client
    const matchStages = [filters];

    // Si on veut filtrer par nom ou téléphone (barre de recherche côté client)
    if (nom || telephone) {
      const clientFilters = {};

      if (nom) {
        clientFilters["client.nom"] = { $regex: nom, $options: "i" };
      }

      if (telephone) {
        clientFilters["client.telephone"] = {
          $regex: telephone,
          $options: "i",
        };
      }

      // Ajout d'un $lookup et $match dans l'agrégation pour filtrer côté client
      const calls = await CallModel.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        { $match: { ...filters, ...clientFilters } },
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);

      const total = await CallModel.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        { $match: { ...filters, ...clientFilters } },
        { $count: "total" },
      ]);

      return reply.code(200).send({
        success: true,
        page: parseInt(page),
        total: total[0]?.total || 0,
        data: calls,
      });
    }

    // Cas simple : pas de filtre nom/téléphone -> on fait un populate normal
    const calls = await CallModel.find(filters)
      .populate("client")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CallModel.countDocuments(filters);

    return reply.code(200).send({
      success: true,
      page: parseInt(page),
      total,
      data: calls,
    });
  } catch (error) {
    console.error("Erreur getCalls:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function getCallsByDate(request, reply) {
  try {
    const aggregation = await CallModel.aggregate([
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            statut: "$statut",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": -1 } },
    ]);

    return reply.code(200).send({
      success: true,
      data: aggregation.map((item) => ({
        date: item._id.date,
        statut: item._id.statut,
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Erreur getCallsByDate:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function getCallsByExactDate(request, reply) {
  try {
    const { date } = request.query;

    if (!date) {
      return reply.code(400).send({ error: "Paramètre 'date' manquant" });
    }

    // On prend la date en ISO et on filtre la journée entière
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const calls = await CallModel.find({
      date: {
        $gte: start,
        $lte: end,
      },
    }).populate("client"); // Ajout important

    return reply.code(200).send({
      success: true,
      data: calls,
    });
  } catch (error) {
    console.error("Erreur getCallsByExactDate:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function getCallById(request, reply) {
  try {
    const { id } = request.params;

    const call = await CallModel.findById(id).populate("client"); // ← ICI

    if (!call) {
      return reply.code(404).send({ error: "Appel introuvable" });
    }

    return reply.code(200).send({ success: true, data: call });
  } catch (error) {
    console.error("Erreur getCallById:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function updateCallStatus(request, reply) {
  try {
    const { id } = request.params;
    const { statut } = request.body;

    console.log("Tentative de mise à jour du statut:", { id, statut });

    // Validation du statut
    const validStatuses = ["nouveau", "en_cours", "termine", "annule"];
    if (!validStatuses.includes(statut)) {
      console.log("Statut invalide:", statut);
      return reply.code(400).send({
        error:
          "Statut invalide. Valeurs acceptées: " + validStatuses.join(", "),
      });
    }

    const call = await CallModel.findById(id);

    if (!call) {
      console.log("Appel non trouvé:", id);
      return reply.code(404).send({ error: "Appel introuvable" });
    }

    console.log("Appel trouvé, mise à jour du statut...");
    // Mise à jour du statut
    call.statut = statut;
    await call.save();

    // Retourner l'appel mis à jour avec les informations client
    const updatedCall = await CallModel.findById(id).populate("client");

    console.log("Statut mis à jour avec succès");
    return reply.code(200).send({
      success: true,
      data: updatedCall,
      message: `Statut mis à jour vers "${statut}"`,
    });
  } catch (error) {
    console.error("Erreur mise à jour statut:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function updateClient(request, reply) {
  try {
    const { id } = request.params;
    const {
      prenom,
      nom,
      telephone,
      email,
      adresse,
      entrepriseName,
      type_demande,
      services,
      description,
    } = request.body;

    // D'abord trouver l'appel pour récupérer l'ID du client
    const call = await CallModel.findById(id).populate("client");
    if (!call) {
      return reply.code(404).send({ error: "Appel introuvable" });
    }

    // Vérifier que l'appel a un client associé
    if (!call.client) {
      return reply.code(400).send({ 
        error: "Cet appel n'a pas de client/fournisseur associé. Impossible de mettre à jour." 
      });
    }

    // Mettre à jour le client
    const client = await Client.findById(call.client._id);
    if (!client) {
      return reply.code(404).send({ error: "Client/Fournisseur introuvable" });
    }

    if (prenom !== undefined) client.prenom = prenom;
    if (nom !== undefined) client.nom = nom;
    if (telephone !== undefined) client.telephone = telephone;
    if (email !== undefined) client.email = email;
    if (adresse !== undefined) client.adresse = adresse;
    if (entrepriseName !== undefined) client.entrepriseName = entrepriseName;

    await client.save();

    // Mettre à jour l'appel si type_demande, services ou description fournis
    let callUpdated = false;
    if (type_demande !== undefined) {
      call.type_demande = type_demande;
      callUpdated = true;
    }
    if (services !== undefined) {
      call.services = services;
      callUpdated = true;
    }
    if (description !== undefined) {
      call.description = description;
      callUpdated = true;
    }

    if (callUpdated) {
      await call.save();
    }

    return reply.code(200).send({
      success: true,
      data: { client, call },
      message: "Données mises à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur mise à jour client:", error);
    return reply.code(500).send({ error: "Erreur interne serveur" });
  }
}

export async function deleteCall(request, reply) {
  try {
    const { id } = request.params;
    console.log("Tentative de suppression de l'appel:", id);

    // Validation basique de l'ID
    if (!id || id.length !== 24) {
      console.log("ID invalide:", id);
      return reply.code(400).send({ error: "ID d'appel invalide" });
    }

    const call = await CallModel.findById(id);

    if (!call) {
      console.log("Appel non trouvé:", id);
      return reply.code(404).send({ error: "Appel non trouvé" });
    }

    console.log("Appel trouvé, suppression en cours...");
    // Supprimer l'appel
    await CallModel.findByIdAndDelete(id);

    console.log("Appel supprimé avec succès");
    return reply.code(200).send({
      success: true,
      message: "Appel supprimé avec succès",
    });
  } catch (err) {
    console.error("Erreur suppression appel:", err);
    return reply.code(500).send({ error: "Erreur lors de la suppression" });
  }
}

// Récupérer tous les clients
export async function getClients(request, reply) {
  try {
    const clients = await Client.find({})
      .sort({ nom: 1, prenom: 1 })
      .select("prenom nom telephone email adresse entrepriseName createdAt");

    return reply.code(200).send({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Erreur récupération clients:", error);
    return reply.code(500).send({
      error: "Erreur interne lors de la récupération des clients",
    });
  }
}

// Récupérer l'historique d'un client
export async function getClientHistory(request, reply) {
  try {
    const { id } = request.params;

    // Vérifier que le client existe
    const client = await Client.findById(id);
    if (!client) {
      return reply.code(404).send({ error: "Client introuvable" });
    }

    // Récupérer tous les appels du client
    const calls = await CallModel.find({ client: id })
      .sort({ date: -1 })
      .populate("related_appointment");

    // Récupérer les rendez-vous du client directement depuis la collection Appointment
    const orders = await OrderModel.find({ client: id })
      .sort({ date: -1, heure: -1 })
      .populate("client");

    return reply.code(200).send({
      success: true,
      data: {
        client,
        calls,
        orders,
      },
    });
  } catch (error) {
    console.error("Erreur récupération historique client:", error);
    return reply.code(500).send({
      error: "Erreur interne lors de la récupération de l'historique",
    });
  }
}

// Créer un nouveau client
export async function createClient(request, reply) {
  try {
    const { prenom, nom, telephone, email, adresse, entrepriseName } =
      request.body;

    // Vérifier si le client existe déjà
    const existingClient = await Client.findOne({ telephone });
    if (existingClient) {
      return reply.code(400).send({
        error: "Un client avec ce numéro de téléphone existe déjà",
      });
    }

    // Créer le nouveau client
    const newClient = await Client.create({
      prenom,
      nom,
      telephone,
      email,
      adresse,
      entrepriseName,
    });

    return reply.code(201).send({
      success: true,
      data: newClient,
      message: "Client créé avec succès",
    });
  } catch (error) {
    console.error("Erreur création client:", error);

    // Gérer les erreurs de validation MongoDB
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return reply.code(400).send({
        error: "Erreur de validation: " + messages.join(", "),
      });
    }

    // Gérer l'erreur de duplication (téléphone unique)
    if (error.code === 11000) {
      return reply.code(400).send({
        error: "Un client avec ce numéro de téléphone existe déjà",
      });
    }

    return reply.code(500).send({
      error: "Erreur interne lors de la création du client",
    });
  }
}

// Recherche unifiée dans appels, clients et rendez-vous
export async function unifiedSearch(request, reply) {
  try {
    const { query } = request.query;
    
    if (!query || query.trim().length < 2) {
      return reply.code(400).send({ 
        error: "Le terme de recherche doit contenir au moins 2 caractères" 
      });
    }

    const searchTerm = query.trim();
    const isDateSearch = /^\d{4}-\d{2}-\d{2}$/.test(searchTerm);
    const isPhoneSearch = /^[\d\s\+\-\(\)]{8,}$/.test(searchTerm);

    // Recherche dans les clients
    let clientFilters = {};
    if (isPhoneSearch) {
      clientFilters.telephone = { $regex: searchTerm.replace(/\s/g, ''), $options: 'i' };
    } else {
      clientFilters.$or = [
        { prenom: { $regex: searchTerm, $options: 'i' } },
        { nom: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { entrepriseName: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const clients = await Client.find(clientFilters).limit(10);

    // Recherche dans les appels
    let callFilters = {};
    if (isDateSearch) {
      callFilters.date = {
        $gte: new Date(searchTerm),
        $lt: new Date(`${searchTerm}T23:59:59Z`)
      };
    } else {
      // Recherche par client
      const clientIds = clients.map(client => client._id);
      callFilters.$or = [
        { client: { $in: clientIds } },
        { type_demande: { $regex: searchTerm, $options: 'i' } },
        { services: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const calls = await CallModel.find(callFilters)
      .populate('client')
      .sort({ date: -1 })
      .limit(10);

    // Recherche dans les rendez-vous
    let appointmentFilters = {};
    if (isDateSearch) {
      appointmentFilters.date = {
        $gte: new Date(searchTerm),
        $lt: new Date(`${searchTerm}T23:59:59Z`)
      };
    } else {
      const clientIds = clients.map(client => client._id);
      appointmentFilters.$or = [
        { client: { $in: clientIds } },
        { type: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { notes_internes: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const orders = await OrderModel.find(appointmentFilters)
      .populate('client')
      .sort({ date: -1, heure: -1 })
      .limit(10);

    return reply.code(200).send({
      success: true,
      data: {
        clients: clients.map(client => ({ ...client.toObject(), type: 'client' })),
        calls: calls.map(call => ({ ...call.toObject(), type: 'call' })),
        orders: orders.map(order => ({ ...order.toObject(), type: 'order' })),
        totalResults: clients.length + calls.length + orders.length
      }
    });

  } catch (error) {
    console.error("Erreur recherche unifiée:", error);
    return reply.code(500).send({
      error: "Erreur interne lors de la recherche"
    });
  }
}

