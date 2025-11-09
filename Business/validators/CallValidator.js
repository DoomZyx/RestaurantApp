/**
 * Validation des données d'appels
 * Valide les données entrantes avant traitement
 */
export class CallValidator {
  /**
   * Valide les données d'un nouvel appel
   * @param {Object} data - Données à valider
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateCallData(data) {
    const errors = [];

    // Vérifier les champs obligatoires
    if (!data.type_demande) {
      errors.push("Le type de demande est requis");
    }

    if (!data.date) {
      errors.push("La date est requise");
    }

    // Valider le format de la date si présente
    if (data.date && isNaN(new Date(data.date).getTime())) {
      errors.push("Format de date invalide");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide les données de rendez-vous
   * @param {Object} appointment - Données de rendez-vous
   * @returns {boolean}
   */
  static validateAppointment(appointment) {
    if (!appointment || typeof appointment !== 'object') {
      return false;
    }

    return appointment.date && appointment.heure;
  }

  /**
   * Valide un statut d'appel
   * @param {string} statut - Statut à valider
   * @returns {boolean}
   */
  static validateStatus(statut) {
    const validStatuses = ["nouveau", "en_cours", "termine", "annule"];
    return validStatuses.includes(statut);
  }

  /**
   * Valide un ID MongoDB
   * @param {string} id - ID à valider
   * @returns {boolean}
   */
  static validateMongoId(id) {
    return id && typeof id === 'string' && id.length === 24;
  }

  /**
   * Valide un numéro de téléphone
   * @param {string} telephone - Téléphone à valider
   * @returns {boolean}
   */
  static validatePhoneNumber(telephone) {
    if (!telephone || telephone === "Non fourni") {
      return false;
    }

    // Au moins 8 chiffres (format flexible)
    const phoneRegex = /[\d]{8,}/;
    return phoneRegex.test(telephone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Valide les paramètres de recherche unifiée
   * @param {string} query - Terme de recherche
   * @returns {Object} { isValid: boolean, error: string }
   */
  static validateSearchQuery(query) {
    if (!query || query.trim().length < 2) {
      return {
        isValid: false,
        error: "Le terme de recherche doit contenir au moins 2 caractères"
      };
    }

    return { isValid: true };
  }
}

