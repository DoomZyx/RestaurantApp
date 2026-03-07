import { OrderService } from "./OrderService.js";
import { CallValidator } from "../validators/CallValidator.js";
import notificationService from "../../Services/notificationService.js";

/**
 * Service de traitement des transcriptions d'appels (secteur restaurant).
 * Crée uniquement réservation et/ou commande à emporter, sans persister d'entité "appel".
 */
export class ProcessCallService {
  /**
   * Traite les données extraites d'une transcription : crée résa et/ou commande, envoie la notification.
   * @param {Object} extractedData - Données extraites par extractCallData (nom, telephone, reservation?, order?, ...)
   * @returns {Promise<Object>} { reservation, order }
   */
  static async process(extractedData) {
    const {
      nom,
      telephone,
      type_demande,
      services,
      description,
      reservation,
      order,
    } = extractedData;

    let createdReservation = null;
    let createdOrder = null;

    if (reservation && CallValidator.validateAppointment(reservation)) {
      try {
        createdReservation = await OrderService.createReservationFromData(reservation, {
          callId: null,
        });
      } catch (err) {
        console.error("Erreur création réservation (processCall):", err);
      }
    }

    if (order && CallValidator.validateAppointment(order)) {
      try {
        createdOrder = await OrderService.createOrderFromAppointment(order, {
          client: null,
          callId: null,
          nom: nom || "Client inconnu",
          telephone: telephone && telephone !== "Non fourni" ? telephone : null,
        });
      } catch (err) {
        console.error("Erreur création commande (processCall):", err);
      }
    }

    try {
      const notificationData = {
        callId: null,
        orderId: createdOrder?._id?.toString() ?? createdReservation?._id?.toString(),
        nom: nom || "Client inconnu",
        telephone: telephone || "Non fourni",
        type_demande: type_demande || "Non spécifié",
        services: services || "",
        description: description || "",
      };
      notificationService.notifyCallCompleted(notificationData);
    } catch (notifError) {
      console.error("Erreur envoi notification WebSocket:", notifError);
    }

    return { reservation: createdReservation, order: createdOrder };
  }
}
