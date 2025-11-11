import { extractCallData } from "../../Services/gptServices/extractCallData.js";
import fetch from "node-fetch";
import { callLogger } from "../../Services/logging/logger.js";

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
      const extractionStartTime = Date.now();
      const extractedData = await extractCallData(transcription);
      const extractionDuration = Date.now() - extractionStartTime;

      callLogger.extractionCompleted(streamSid, extractedData);
      callLogger.performance(streamSid, "gpt4_extraction", extractionDuration);

      // ✅ VALIDATION SUPPLÉMENTAIRE : Vérifier si les données extraites sont exploitables
      const isUseless = 
        (!extractedData.order || extractedData.order === null) && // Pas de commande
        (extractedData.nom === "Client inconnu") && // Pas de nom
        (extractedData.telephone === "Non fourni") && // Pas de téléphone
        (extractedData.type_demande === "Information menu" || extractedData.type_demande === "Autre"); // Juste des infos
      
      if (isUseless) {
        callLogger.info(
          streamSid,
          "⏭️ Appel ignoré : Aucune information utile extraite (pas de nom, pas de commande, pas de téléphone)",
          {
            extractedData: {
              nom: extractedData.nom,
              telephone: extractedData.telephone,
              type_demande: extractedData.type_demande,
              order: extractedData.order,
            },
          }
        );
        
        
        // Ne pas sauvegarder ni notifier
        return reply.code(200).send({
          success: true,
          ignored: true,
          message: "Appel ignoré - Aucune information utile",
          reason: "Pas de nom, pas de téléphone, pas de commande",
        });
      }

      // Appeler votre API POST /api/callsdata
      const apiStartTime = Date.now();
      const apiUrl = `http://localhost:${
        process.env.PORT || 8080
      }/api/callsdata`;

      callLogger.apiCallStarted(streamSid, apiUrl);

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.X_API_KEY,
        },
        body: JSON.stringify(extractedData),
      });

      const apiDuration = Date.now() - apiStartTime;
      callLogger.performance(streamSid, "api_save", apiDuration);

      if (!apiResponse.ok) {
        const error = new Error(
          `Erreur API: ${apiResponse.status} ${apiResponse.statusText}`
        );
        callLogger.error(streamSid, error, {
          context: "api_call",
          status: apiResponse.status,
          statusText: apiResponse.statusText,
        });
        throw error;
      }

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
