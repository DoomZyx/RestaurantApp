/**
 * Transformateur de données pour les appels
 * Formate les données avant envoi au client
 */
export class CallTransformer {
  /**
   * Transforme un appel pour la réponse API
   * @param {Object} call - Appel à transformer
   * @returns {Object} Appel formaté
   */
  static transformCall(call) {
    if (!call) return null;

    return {
      id: call._id,
      type_demande: call.type_demande,
      services: call.services,
      description: call.description,
      date: call.date,
      statut: call.statut,
      client: call.client ? this.transformClient(call.client) : null,
      related_order: call.related_order,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt
    };
  }

  /**
   * Transforme un client pour la réponse API
   * @param {Object} client - Client à transformer
   * @returns {Object} Client formaté
   */
  static transformClient(client) {
    if (!client) return null;

    return {
      id: client._id,
      prenom: client.prenom,
      nom: client.nom,
      telephone: client.telephone,
      email: client.email,
      adresse: client.adresse,
      entrepriseName: client.entrepriseName,
      createdAt: client.createdAt
    };
  }

  /**
   * Transforme une commande pour la réponse API
   * @param {Object} order - Commande à transformer
   * @returns {Object} Commande formatée
   */
  static transformOrder(order) {
    if (!order) return null;

    return {
      id: order._id,
      client: order.client ? this.transformClient(order.client) : null,
      nom: order.nom,
      date: order.date,
      heure: order.heure,
      duree: order.duree,
      type: order.type,
      modalite: order.modalite,
      nombrePersonnes: order.nombrePersonnes,
      description: order.description,
      commandes: order.commandes,
      statut: order.statut,
      createdBy: order.createdBy,
      related_call: order.related_call,
      createdAt: order.createdAt
    };
  }

  /**
   * Transforme une liste d'appels
   * @param {Array} calls - Liste d'appels
   * @returns {Array} Appels formatés
   */
  static transformCallList(calls) {
    return calls.map(call => this.transformCall(call));
  }

  /**
   * Transforme les résultats de recherche unifiée
   * @param {Object} results - Résultats bruts
   * @returns {Object} Résultats formatés
   */
  static transformSearchResults(results) {
    return {
      clients: results.clients.map(client => ({
        ...this.transformClient(client),
        type: 'client'
      })),
      calls: results.calls.map(call => ({
        ...this.transformCall(call),
        type: 'call'
      })),
      orders: results.orders.map(order => ({
        ...this.transformOrder(order),
        type: 'order'
      })),
      totalResults: results.totalResults
    };
  }

  /**
   * Formate une réponse de succès
   * @param {*} data - Données à envoyer
   * @param {string} message - Message optionnel
   * @returns {Object} Réponse formatée
   */
  static successResponse(data, message = null) {
    const response = {
      success: true,
      data
    };

    if (message) {
      response.message = message;
    }

    return response;
  }

  /**
   * Formate une réponse d'erreur
   * @param {string} error - Message d'erreur
   * @param {Object} details - Détails optionnels
   * @returns {Object} Réponse d'erreur formatée
   */
  static errorResponse(error, details = null) {
    const response = {
      success: false,
      error
    };

    if (details) {
      response.details = details;
    }

    return response;
  }

  /**
   * Formate une réponse paginée
   * @param {Array} data - Données paginées
   * @param {number} page - Numéro de page
   * @param {number} total - Total d'éléments
   * @returns {Object} Réponse paginée
   */
  static paginatedResponse(data, page, total) {
    return {
      success: true,
      page: parseInt(page),
      total,
      data
    };
  }
}

