import { CallService } from "../../Business/services/CallService.js";
import { ClientService } from "../../Business/services/ClientService.js";
import { CallTransformer } from "../../Business/transformers/CallTransformer.js";

/**
 * Controller pour les appels
 * Responsabilité : Validation basique + Délégation aux services + Formatage réponses
 */
export class CallController {
  /**
   * Sauvegarde un nouvel appel (depuis processCall)
   * @param {Object} data - Données de l'appel
   * @returns {Promise<Object>} Résultat de la sauvegarde
   */
  static async saveCallData(data) {
    try {
      const { call, order } = await CallService.saveCall(data);
      return { call, order };
    } catch (error) {
      console.error("❌ Erreur saveCallData:", error);
      throw error;
    }
  }

  /**
   * Récupère les appels avec pagination
   * GET /api/calls
   */
  static async getCalls(request, reply) {
    try {
      const result = await CallService.getCalls(request.query);

      return reply.code(200).send(
        CallTransformer.paginatedResponse(
          result.calls,
          result.page,
          result.total
        )
      );
    } catch (error) {
      console.error("❌ Erreur getCalls:", error);
      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Récupère les appels agrégés par date
   * GET /api/calls/by-date
   */
  static async getCallsByDate(request, reply) {
    try {
      const data = await CallService.getCallsByDate();

      return reply.code(200).send(
        CallTransformer.successResponse(data)
      );
    } catch (error) {
      console.error("❌ Erreur getCallsByDate:", error);
      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Récupère les appels d'une date exacte
   * GET /api/calls/exact-date?date=YYYY-MM-DD
   */
  static async getCallsByExactDate(request, reply) {
    try {
      const { date } = request.query;

      if (!date) {
        return reply.code(400).send(
          CallTransformer.errorResponse("Paramètre 'date' manquant")
        );
      }

      const calls = await CallService.getCallsByExactDate(date);

      return reply.code(200).send(
        CallTransformer.successResponse(calls)
      );
    } catch (error) {
      console.error("❌ Erreur getCallsByExactDate:", error);
      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Récupère un appel par ID
   * GET /api/calls/:id
   */
  static async getCallById(request, reply) {
    try {
      const { id } = request.params;
      const call = await CallService.getCallById(id);

      return reply.code(200).send(
        CallTransformer.successResponse(call)
      );
    } catch (error) {
      console.error("❌ Erreur getCallById:", error);
      
      if (error.message === "Appel introuvable" || error.message === "ID d'appel invalide") {
        return reply.code(404).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Met à jour le statut d'un appel
   * PATCH /api/calls/:id/status
   */
  static async updateCallStatus(request, reply) {
    try {
      const { id } = request.params;
      const { statut } = request.body;

      const updatedCall = await CallService.updateCallStatus(id, statut);

      return reply.code(200).send(
        CallTransformer.successResponse(
          updatedCall,
          `Statut mis à jour vers "${statut}"`
        )
      );
    } catch (error) {
      console.error("❌ Erreur updateCallStatus:", error);

      if (error.message.includes("invalide") || error.message === "Appel introuvable") {
        return reply.code(400).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Met à jour le client associé à un appel
   * PUT /api/calls/:id/client
   */
  static async updateClient(request, reply) {
    try {
      const { id } = request.params;
      const updates = request.body;

      const result = await CallService.updateCallAndClient(id, updates);

      return reply.code(200).send(
        CallTransformer.successResponse(
          result,
          "Données mises à jour avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur updateClient:", error);

      if (error.message.includes("introuvable") || error.message.includes("associé")) {
        return reply.code(404).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur interne serveur")
      );
    }
  }

  /**
   * Supprime un appel
   * DELETE /api/calls/:id
   */
  static async deleteCall(request, reply) {
    try {
      const { id } = request.params;
      await CallService.deleteCall(id);

      return reply.code(200).send(
        CallTransformer.successResponse(
          null,
          "Appel supprimé avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur deleteCall:", error);

      if (error.message.includes("invalide") || error.message === "Appel non trouvé") {
        return reply.code(404).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse("Erreur lors de la suppression")
      );
    }
  }

  /**
   * Récupère tous les clients
   * GET /api/clients
   */
  static async getClients(request, reply) {
    try {
      const clients = await ClientService.getAllClients();

      return reply.code(200).send(
        CallTransformer.successResponse(clients)
      );
    } catch (error) {
      console.error("❌ Erreur getClients:", error);
      return reply.code(500).send(
        CallTransformer.errorResponse(
          "Erreur interne lors de la récupération des clients"
        )
      );
    }
  }

  /**
   * Récupère l'historique d'un client
   * GET /api/clients/:id/history
   */
  static async getClientHistory(request, reply) {
    try {
      const { id } = request.params;
      const history = await ClientService.getClientHistory(id);

      return reply.code(200).send(
        CallTransformer.successResponse(history)
      );
    } catch (error) {
      console.error("❌ Erreur getClientHistory:", error);

      if (error.message === "Client introuvable") {
        return reply.code(404).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse(
          "Erreur interne lors de la récupération de l'historique"
        )
      );
    }
  }

  /**
   * Crée un nouveau client
   * POST /api/clients
   */
  static async createClient(request, reply) {
    try {
      const clientData = request.body;
      const newClient = await ClientService.createClient(clientData);

      return reply.code(201).send(
        CallTransformer.successResponse(
          newClient,
          "Client créé avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur createClient:", error);

      // Erreurs de validation
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        return reply.code(400).send(
          CallTransformer.errorResponse(
            "Erreur de validation: " + messages.join(", ")
          )
        );
      }

      // Duplication de téléphone
      if (error.code === 11000 || error.message.includes("existe déjà")) {
        return reply.code(400).send(
          CallTransformer.errorResponse(
            "Un client avec ce numéro de téléphone existe déjà"
          )
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse(
          "Erreur interne lors de la création du client"
        )
      );
    }
  }

  /**
   * Supprime un client/fournisseur
   * DELETE /api/clients/:id
   */
  static async deleteClient(request, reply) {
    try {
      const { id } = request.params;
      await ClientService.deleteClient(id);

      return reply.code(200).send(
        CallTransformer.successResponse(
          null,
          "Contact supprimé avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur deleteClient:", error);

      if (error.message === "Client introuvable") {
        return reply.code(404).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse(
          "Erreur interne lors de la suppression"
        )
      );
    }
  }

  /**
   * Recherche unifiée (clients, appels, commandes)
   * GET /api/search?query=...
   */
  static async unifiedSearch(request, reply) {
    try {
      const { query } = request.query;
      const results = await CallService.unifiedSearch(query);

      return reply.code(200).send(
        CallTransformer.successResponse(
          CallTransformer.transformSearchResults(results)
        )
      );
    } catch (error) {
      console.error("❌ Erreur unifiedSearch:", error);

      if (error.message.includes("caractères")) {
        return reply.code(400).send(
          CallTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        CallTransformer.errorResponse(
          "Erreur interne lors de la recherche"
        )
      );
    }
  }
}

