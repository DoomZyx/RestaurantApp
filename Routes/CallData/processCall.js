import { extractCallData } from "../../Services/gptServices/extractCallData.js";
import fetch from "node-fetch";
import { callLogger } from "../../Services/logging/logger.js";
import { retryFetch } from "../../Services/utils/retryWithBackoff.js";

export default async function processCallRoutes(fastify, options) {
  // Route pour traiter un appel terminé
  fastify.post("/process-call", async (request, reply) => {
    const startTime = Date.now();
    const streamSid = request.headers["x-stream-sid"] || "unknown";

    try {
      const { transcription } = request.body;

      if (!transcription) {
        callLogger.error(streamSid, new Error("Transcription manquante"), {
          context: "validation",
        });
        return reply.code(400).send({
          error: "Transcription manquante",
        });
      }

      callLogger.info(streamSid, "Traitement de la transcription", {
        transcriptionLength: transcription.length,
        preview: transcription.substring(0, 100) + "...",
      });

      // Extraire les données avec GPT-4
      const extractedData = await extractCallData(transcription, streamSid);

      callLogger.extractionCompleted(streamSid, extractedData);

      // Validation : données exploitables si au moins une résa ou une commande
      const hasReservationOrOrder = (extractedData.reservation && extractedData.reservation !== null) || (extractedData.order && extractedData.order !== null);
      const isUseless =
        !hasReservationOrOrder &&
        (extractedData.nom === "Client inconnu") &&
        (extractedData.telephone === "Non fourni") &&
        (extractedData.type_demande === "Information menu" || extractedData.type_demande === "Autre");

      if (isUseless) {
        callLogger.info(
          streamSid,
          "Appel ignoré : Aucune information utile extraite (pas de nom, pas de téléphone, pas de résa ni commande)",
          {
            extractedData: {
              nom: extractedData.nom,
              telephone: extractedData.telephone,
              type_demande: extractedData.type_demande,
              reservation: !!extractedData.reservation,
              order: !!extractedData.order,
            },
          }
        );
        return reply.code(200).send({
          success: true,
          ignored: true,
          message: "Appel ignoré - Aucune information utile",
          reason: "Pas de nom, pas de téléphone, pas de réservation ni commande",
        });
      }

      // Appeler votre API POST /api/callsdata avec retry
      const apiStartTime = Date.now();
      const apiUrl = `http://localhost:${
        process.env.PORT || 8080
      }/api/callsdata`;

      callLogger.apiCallStarted(streamSid, apiUrl);

      // Retry avec backoff exponentiel pour la sauvegarde
      const apiResponse = await retryFetch(
        () => fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.X_API_KEY,
          },
          body: JSON.stringify(extractedData),
        }),
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error, delay) => {
            callLogger.warn(streamSid, `Tentative ${attempt}/3 de sauvegarde après erreur`, {
              error: error.message,
              status: error.status,
              delay: `${delay}ms`,
              event: "api_save_retry",
            });
          },
        }
      );

      const apiDuration = Date.now() - apiStartTime;
      callLogger.performance(streamSid, "api_save", apiDuration);

      const savedCall = await apiResponse.json();
      callLogger.apiCallCompleted(streamSid, apiResponse);

      const totalDuration = Date.now() - startTime;
      callLogger.performance(streamSid, "total_processing", totalDuration);

      return reply.code(201).send({
        success: true,
        message: "Appel traité et sauvegardé avec succès via API",
        data: savedCall.data,
      });
    } catch (error) {
      callLogger.error(streamSid, error, {
        context: "process_call",
        totalDuration: Date.now() - startTime,
      });

      return reply.code(500).send({
        error: "Erreur lors du traitement de l'appel",
        details: error.message,
      });
    }
  });
}
