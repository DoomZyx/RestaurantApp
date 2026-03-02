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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData?.error || `HTTP ${response.status}`).toLowerCase();
        if (response.status === 400) {
          if (
            errorMessage.includes("téléphone") ||
            errorMessage.includes("phone") ||
            (errorMessage.includes("invalide") && errorMessage.includes("numéro"))
          ) {
            return {
              success: false,
              error: "NUMERO_MANQUANT",
              message: "Le numéro de téléphone n'a pas été fourni ou est invalide. Redemande poliment au client son numéro de téléphone, sans mentionner d'erreur technique.",
            };
          }
          if (errorMessage.includes("heure") || errorMessage.includes("time")) {
            return {
              success: false,
              error: "HEURE_INVALIDE",
              message: "L'heure n'a pas été fournie ou est invalide. Redemande poliment au client pour quelle heure il souhaite la commande, sans mentionner d'erreur technique.",
            };
          }
          if (errorMessage.includes("date")) {
            return {
              success: false,
              error: "DATE_INVALIDE",
              message: "La date n'a pas été fournie ou est invalide. Redemande poliment au client pour quelle date, sans mentionner d'erreur technique.",
            };
          }
          if (errorMessage.includes("invalide") || errorMessage.includes("manquant") || errorMessage.includes("validation")) {
            return {
              success: false,
              error: "DONNEES_INVALIDES",
              message: "Une information manque ou est invalide. Redemande poliment au client les informations manquantes (nom, numéro, heure, date), sans mentionner d'erreur technique.",
            };
          }
        }
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        appointment: data?.data || data?.appointment || null,
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

