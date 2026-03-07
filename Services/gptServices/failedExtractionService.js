import FailedExtractionModel from "../../models/failedExtraction.js";
import { callLogger } from "../logging/logger.js";

/**
 * Service pour gérer les extractions échouées
 * Sauvegarde les transcriptions dont l'extraction a échoué pour traitement manuel
 */
export class FailedExtractionService {
  /**
   * Sauvegarde une transcription dont l'extraction a échoué
   * @param {string} streamSid - ID du stream
   * @param {string} transcription - Transcription brute
   * @param {Error} error - Erreur rencontrée
   * @param {number} tentatives - Nombre de tentatives effectuées
   * @returns {Promise<Object>} - Document sauvegardé
   */
  static async saveFailedExtraction(streamSid, transcription, error, tentatives = 0) {
    try {
      const errorData = {
        message: error.message || "Erreur inconnue",
        stack: error.stack,
        status: error.status || (error.response && error.response.status),
        code: error.code,
      };

      const failedExtraction = await FailedExtractionModel.create({
        streamSid,
        transcription,
        error: errorData,
        statut: "extraction_echouee",
        tentatives_extraction: tentatives,
      });

      callLogger.info(streamSid, "Transcription brute sauvegardée pour traitement manuel", {
        failedExtractionId: failedExtraction._id,
        error: errorData.message,
        tentatives,
        event: "failed_extraction_saved",
      });

      return failedExtraction;
    } catch (saveError) {
      // Si la sauvegarde échoue, logger l'erreur mais ne pas throw
      // pour éviter de masquer l'erreur originale
      callLogger.error(streamSid, saveError, {
        source: "FailedExtractionService",
        context: "save_failed_extraction",
        originalError: error.message,
      });
      return null;
    }
  }

  /**
   * Récupère les extractions échouées en attente de traitement
   * @param {Object} options - Options de recherche
   * @param {number} options.limit - Nombre de résultats (défaut: 50)
   * @param {number} options.skip - Nombre de résultats à sauter
   * @returns {Promise<Array>} - Liste des extractions échouées
   */
  static async getPendingExtractions(options = {}) {
    const { limit = 50, skip = 0 } = options;

    return FailedExtractionModel.find({
      statut: { $in: ["extraction_echouee", "en_attente_traitement"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Marque une extraction comme traitée
   * @param {string} id - ID de l'extraction
   * @returns {Promise<Object>} - Document mis à jour
   */
  static async markAsProcessed(id) {
    return FailedExtractionModel.findByIdAndUpdate(
      id,
      {
        statut: "traite",
        traiteAt: new Date(),
      },
      { new: true }
    );
  }
}




