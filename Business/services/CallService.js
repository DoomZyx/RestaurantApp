import CallModel from "../../models/callData.js";
import notificationService from "../../Services/notificationService.js";
import { ClientService } from "./ClientService.js";
import { OrderService } from "./OrderService.js";
import { CallValidator } from "../validators/CallValidator.js";

/**
 * Service de gestion des appels
 * Logique métier principale pour les appels téléphoniques
 */
export class CallService {
  /**
   * Sauvegarde un nouvel appel avec client et commande optionnels
   * @param {Object} data - Données de l'appel
   * @returns {Promise<Object>} { call, order }
   */
  static async saveCall(data) {
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

    // Validation des données
    const validation = CallValidator.validateCallData(data);
    if (!validation.isValid) {
      throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
    }

    // 1. Rechercher le client existant
    let client = null;
    if (telephone && telephone !== "Non fourni") {
      client = await ClientService.findClientByPhone(telephone);
    }

    if (appointment && !client) {
    }

    // 2. Créer l'appel
    const callData = {
      type_demande,
      services,
      description,
      date,
      statut,
    };

    if (client) {
      callData.client = client._id;
    }

    const call = await CallModel.create(callData);

    // 3. Créer la commande si présente
    let createdOrder = null;
    if (CallValidator.validateAppointment(appointment)) {
      try {
        createdOrder = await OrderService.createOrderFromAppointment(appointment, {
          client,
          callId: call._id,
          nom,
          description
        });

        // Lier la commande à l'appel
        call.related_order = createdOrder._id;
        await call.save();
      } catch (orderError) {
        console.error("❌ Erreur lors de la création de la commande:", orderError);
      }
    }

    // 4. Envoyer notification WebSocket
    try {
      const notificationData = this._prepareNotificationData(
        call, 
        createdOrder, 
        client, 
        { nom, telephone, type_demande, services, description }
      );
      
      notificationService.notifyCallCompleted(notificationData);
    } catch (notifError) {
      console.error("⚠️ Erreur envoi notification WebSocket:", notifError);
    }

    return { call, order: createdOrder };
  }

  /**
   * Récupère les appels avec pagination et filtres
   * @param {Object} params - Paramètres de recherche
   * @returns {Promise<Object>} { calls, total, page }
   */
  static async getCalls(params) {
    const { date, page = 1, limit = 10, nom, telephone } = params;

    const skip = (page - 1) * limit;
    const filters = {};

    // Filtre par date
    if (date) {
      filters.date = {
        $gte: new Date(date),
        $lt: new Date(`${date}T23:59:59Z`),
      };
    }

    // Recherche avec filtres client (agrégation)
    if (nom || telephone) {
      const calls = await this._getCallsWithClientFilters(
        filters, 
        { nom, telephone }, 
        skip, 
        limit
      );

      const total = await this._countCallsWithClientFilters(filters, { nom, telephone });

      return {
        calls,
        total: total[0]?.total || 0,
        page: parseInt(page)
      };
    }

    // Cas simple : populate normal
    const calls = await CallModel.find(filters)
      .populate("client")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CallModel.countDocuments(filters);

    return {
      calls,
      total,
      page: parseInt(page)
    };
  }

  /**
   * Récupère les appels agrégés par date et statut
   * @returns {Promise<Array>} Agrégation des appels
   */
  static async getCallsByDate() {
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

    return aggregation.map((item) => ({
      date: item._id.date,
      statut: item._id.statut,
      count: item.count,
    }));
  }

  /**
   * Récupère les appels d'une date exacte
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<Array>} Appels de la journée
   */
  static async getCallsByExactDate(date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const calls = await CallModel.find({
      date: {
        $gte: start,
        $lte: end,
      },
    }).populate("client");

    return calls;
  }

  /**
   * Récupère un appel par ID
   * @param {string} callId - ID de l'appel
   * @returns {Promise<Object>} Appel trouvé
   */
  static async getCallById(callId) {
    if (!CallValidator.validateMongoId(callId)) {
      throw new Error("ID d'appel invalide");
    }

    const call = await CallModel.findById(callId).populate("client");

    if (!call) {
      throw new Error("Appel introuvable");
    }

    return call;
  }

  /**
   * Met à jour le statut d'un appel
   * @param {string} callId - ID de l'appel
   * @param {string} newStatus - Nouveau statut
   * @returns {Promise<Object>} Appel mis à jour
   */
  static async updateCallStatus(callId, newStatus) {
    if (!CallValidator.validateMongoId(callId)) {
      throw new Error("ID d'appel invalide");
    }

    if (!CallValidator.validateStatus(newStatus)) {
      throw new Error("Statut invalide. Valeurs acceptées: nouveau, en_cours, termine, annule");
    }

    const call = await CallModel.findById(callId);

    if (!call) {
      throw new Error("Appel introuvable");
    }


    call.statut = newStatus;
    await call.save();

    const updatedCall = await CallModel.findById(callId).populate("client");

    return updatedCall;
  }

  /**
   * Met à jour le client et l'appel associé
   * @param {string} callId - ID de l'appel
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<Object>} { client, call }
   */
  static async updateCallAndClient(callId, updates) {
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
    } = updates;

    // Récupérer l'appel
    const call = await CallModel.findById(callId).populate("client");
    if (!call) {
      throw new Error("Appel introuvable");
    }

    if (!call.client) {
      throw new Error("Cet appel n'a pas de client/fournisseur associé");
    }

    // Mettre à jour le client
    const clientUpdates = {
      prenom,
      nom,
      telephone,
      email,
      adresse,
      entrepriseName
    };

    const updatedClient = await ClientService.updateClient(
      call.client._id, 
      clientUpdates
    );

    // Mettre à jour l'appel si nécessaire
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

    return { client: updatedClient, call };
  }

  /**
   * Supprime un appel
   * @param {string} callId - ID de l'appel
   */
  static async deleteCall(callId) {
    if (!CallValidator.validateMongoId(callId)) {
      throw new Error("ID d'appel invalide");
    }

    const call = await CallModel.findById(callId);

    if (!call) {
      throw new Error("Appel non trouvé");
    }

    await CallModel.findByIdAndDelete(callId);
  }

  /**
   * Recherche unifiée dans appels, clients et commandes
   * @param {string} query - Terme de recherche
   * @returns {Promise<Object>} Résultats (clients, calls, orders)
   */
  static async unifiedSearch(query) {
    const validation = CallValidator.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const searchTerm = query.trim();
    const isDateSearch = /^\d{4}-\d{2}-\d{2}$/.test(searchTerm);
    const isPhoneSearch = /^[\d\s\+\-\(\)]{8,}$/.test(searchTerm);

    // Recherche clients
    const clients = await ClientService.searchClients({ searchTerm, isPhoneSearch });

    // Recherche appels
    const calls = await this._searchCalls({ searchTerm, isDateSearch, clients });

    // Recherche commandes
    const clientIds = clients.map(client => client._id);
    const orders = await OrderService.searchOrders({ 
      searchTerm, 
      isDateSearch, 
      clientIds 
    });

    return {
      clients: clients.map(client => ({ ...client.toObject(), type: 'client' })),
      calls: calls.map(call => ({ ...call.toObject(), type: 'call' })),
      orders: orders.map(order => ({ ...order.toObject(), type: 'order' })),
      totalResults: clients.length + calls.length + orders.length
    };
  }

  // ==========================================
  // MÉTHODES PRIVÉES
  // ==========================================

  /**
   * Récupère les appels avec filtres client (agrégation)
   * @private
   */
  static async _getCallsWithClientFilters(filters, clientFilters, skip, limit) {
    const { nom, telephone } = clientFilters;
    const clientMatch = {};

    if (nom) {
      clientMatch["client.nom"] = { $regex: nom, $options: "i" };
    }

    if (telephone) {
      clientMatch["client.telephone"] = { $regex: telephone, $options: "i" };
    }

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
      { $match: { ...filters, ...clientMatch } },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    return calls;
  }

  /**
   * Compte les appels avec filtres client
   * @private
   */
  static async _countCallsWithClientFilters(filters, clientFilters) {
    const { nom, telephone } = clientFilters;
    const clientMatch = {};

    if (nom) {
      clientMatch["client.nom"] = { $regex: nom, $options: "i" };
    }

    if (telephone) {
      clientMatch["client.telephone"] = { $regex: telephone, $options: "i" };
    }

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
      { $match: { ...filters, ...clientMatch } },
      { $count: "total" },
    ]);

    return total;
  }

  /**
   * Recherche dans les appels
   * @private
   */
  static async _searchCalls({ searchTerm, isDateSearch, clients }) {
    let filters = {};

    if (isDateSearch) {
      filters.date = {
        $gte: new Date(searchTerm),
        $lt: new Date(`${searchTerm}T23:59:59Z`)
      };
    } else {
      const clientIds = clients.map(client => client._id);
      filters.$or = [
        { client: { $in: clientIds } },
        { type_demande: { $regex: searchTerm, $options: 'i' } },
        { services: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const calls = await CallModel.find(filters)
      .populate('client')
      .sort({ date: -1 })
      .limit(10);

    return calls;
  }

  /**
   * Prépare les données de notification
   * @private
   */
  static _prepareNotificationData(call, order, client, originalData) {
    return {
      callId: call._id.toString(),
      orderId: order?._id?.toString(),
      nom: client ? `${client.prenom} ${client.nom}` : originalData.nom,
      telephone: originalData.telephone || "Non fourni",
      type_demande: originalData.type_demande,
      services: originalData.services,
      description: originalData.description,
      hasOrder: !!order,
      orderType: order?.type,
      nombrePersonnes: order?.nombrePersonnes
    };
  }
}

