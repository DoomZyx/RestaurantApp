/**
 * Transformateur de données de tarification
 * Formate les réponses API
 */
export class PricingTransformer {
  /**
   * Formate une réponse de succès
   * @param {*} data - Données à renvoyer
   * @param {string} message - Message optionnel
   * @returns {Object}
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
   * @param {*} details - Détails optionnels
   * @returns {Object}
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
}

