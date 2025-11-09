import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

/**
 * Service de gestion des function calls OpenAI
 * Gère les appels aux APIs (disponibilités, création de rendez-vous, etc.)
 */
export class FunctionCallService {
  /**
   * Vérifie les disponibilités pour une date donnée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<Object>} Résultat avec les créneaux disponibles
   */
  static async checkAvailability(date) {
    try {
      const response = await fetch(
        `http://localhost:${
          process.env.PORT || 8080
        }/api/orders/ai/available-slots?date=${date}`,
        {
          headers: {
            "x-api-key": process.env.X_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        date,
        slots: data.availableSlots || [],
        message: data.message || "Disponibilités récupérées",
      };
    } catch (error) {
      return {
        success: false,
        error: `Impossible de vérifier les disponibilités: ${error.message}`,
      };
    }
  }

  /**
   * Crée un rendez-vous avec les informations fournies
   * @param {Object} args - Arguments du rendez-vous (date, time, name, etc.)
   * @returns {Promise<Object>} Résultat de la création
   */
  static async createAppointment(args) {
    try {
      const response = await fetch(
        `http://localhost:${
          process.env.PORT || 8080
        }/api/orders/ai/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.X_API_KEY,
          },
          body: JSON.stringify(args),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        appointment: data?.appointment || null,
        message: data?.message || "Rendez-vous créé",
      };
    } catch (error) {
      return {
        success: false,
        error: `Impossible de créer le rendez-vous: ${error.message}`,
      };
    }
  }
}

