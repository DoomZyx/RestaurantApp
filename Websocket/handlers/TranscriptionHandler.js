import fetch from "node-fetch";
import dotenv from "dotenv";
import notificationService from "../../Services/notificationService.js";
import { ValidationService } from "../services/ValidationService.js";

dotenv.config();

/**
 * Gestionnaire de traitement des transcriptions
 * Valide, traite et envoie les transcriptions à l'API de traitement
 */
export class TranscriptionHandler {
  constructor(streamSid, callLogger) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
  }

  setStreamSid(streamSid) {
    this.streamSid = streamSid;
  }

  /**
   * Traite une transcription complète
   * @param {string} transcription - Transcription de l'appel
   */
  async process(transcription) {
    const startTime = Date.now();

    try {
      this.callLogger.extractionStarted(this.streamSid);
      this.callLogger.transcriptionReceived(
        this.streamSid,
        transcription.length
      );

      // ✅ VALIDATION : Vérifier si la transcription est exploitable
      const validation = ValidationService.validateTranscription(transcription);
      
      if (validation !== true) {
        // ❌ Transcription invalide - Annuler le traitement
        this.callLogger.info(
          this.streamSid,
          `⏭️ Appel ignoré : ${validation}`,
          {
            transcriptionLength: transcription.length,
            transcriptionPreview: transcription.substring(0, 100),
          }
        );
        
        
        // Ne pas traiter ni notifier
        return;
      }

      // Si la transcription est trop courte, on la garde quand même (fallback désactivé)
      if (transcription.length < 100) {
        this.callLogger.info(
          this.streamSid,
          "Transcription courte détectée - utilisation de la transcription OpenAI"
        );
      }

      await this.sendToProcessingAPI(transcription, startTime);
    } catch (error) {
      this.callLogger.error(this.streamSid, error, {
        source: "TranscriptionHandler.js",
        context: "process_transcription",
      });
    }
  }

  /**
   * Envoie la transcription à l'API de traitement
   * @param {string} transcription - Transcription validée
   * @param {number} startTime - Timestamp de début (pour calcul durée)
   */
  async sendToProcessingAPI(transcription, startTime) {
    const apiUrl = `http://localhost:${
      process.env.PORT || 8080
    }/api/process-call`;
    this.callLogger.apiCallStarted(this.streamSid, apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.X_API_KEY,
      },
      body: JSON.stringify({ transcription }),
    });

    const apiDuration = Date.now() - startTime;
    this.callLogger.performance(this.streamSid, "api_call", apiDuration);

    if (response.ok) {
      const result = await response.json();
      this.callLogger.apiCallCompleted(this.streamSid, response);
      this.callLogger.info(this.streamSid, "Appel traité avec succès", {
        result,
      });

      // Notification déplacée dans callData.js pour avoir les IDs complets
      // (callId, orderId) après sauvegarde en base de données
    } else {
      this.callLogger.error(
        this.streamSid,
        new Error(`Erreur API: ${response.status}`),
        {
          source: "TranscriptionHandler.js",
          context: "sendToProcessingAPI",
          status: response.status,
          statusText: response.statusText,
        }
      );

      // Envoyer une notification d'erreur
      try {
        notificationService.notifyCallError(
          new Error(`Erreur API: ${response.status}`),
          { streamSid: this.streamSid }
        );
      } catch (notificationError) {
        this.callLogger.error(this.streamSid, notificationError, {
          source: "TranscriptionHandler.js",
          context: "notification_error_send",
        });
      }
    }
  }
}

