import { createOpenAiSession } from "../Services/gptServices/gptServices.js";
import WebSocket from "ws";
import dotenv from "dotenv";
import { callLogger } from "../Services/logging/logger.js";
import { registerStream, unregisterStream } from "../Services/streamRegistry.js";
import { OpenAIHandler } from "./handlers/OpenAIHandler.js";
import { TwilioHandler } from "./handlers/TwilioHandler.js";
import { TranscriptionHandler } from "./handlers/TranscriptionHandler.js";
import { cleanAudio, checkRNNoiseAvailability } from "../Services/audioProcessing/audioCleaningService.js";

dotenv.config();

/**
 * Gestionnaire principal de la connexion WebSocket
 * Orchestre la communication entre Twilio et OpenAI
 * 
 * @param {WebSocket} connection - Connexion WebSocket Twilio
 * @param {Object} request - Requête HTTP initiale
 */
export async function handleWebSocketConnection(connection, request) {
  try {
    
    callLogger.callStarted(null, { event: "client_connected" });

    // ==========================================
    // INITIALISATION DES VARIABLES
    // ==========================================
    let streamSid = null;
    let closeTimeout = null;
    const callStartTime = Date.now();
    let openAIHandler = null;
    let twilioHandler = null;
    let transcriptionHandler = null;
    
    // ElevenLabs désactivé pour éviter tout coût
    const useElevenLabs = false;
    
    // Vérifier disponibilité RNNoise (une seule fois au début)
    const rnnoiseAvailable = await checkRNNoiseAvailability();
    if (rnnoiseAvailable) {
      callLogger.info(null, "🎙️ RNNoise activé - Réduction de bruit en temps réel");
    } else {
      callLogger.warn(null, "⚠️ RNNoise non disponible - Audio non filtré");
    }

    // 🎤 Configuration TTS

    // ==========================================
    // CRÉATION SESSION OPENAI
    // ==========================================
    const openAiWs = createOpenAiSession(
      process.env.OPENAI_API_KEY, 
      "ballad",
      null,
      { useElevenLabs: useElevenLabs }
    );

    // ==========================================
    // HANDLER MESSAGES TWILIO
    // ==========================================
    connection.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Événement START : Initialiser tous les gestionnaires
        if (data.event === "start") {
          streamSid = data.start.streamSid;

          // Initialisation des gestionnaires avec streamSid
          openAIHandler = new OpenAIHandler(
            streamSid,
            connection,
            callLogger,
            openAiWs,
            useElevenLabs
          );

          twilioHandler = new TwilioHandler(
            streamSid,
            callLogger,
            async () => {
              if (transcriptionHandler && openAIHandler) {
                await transcriptionHandler.process(openAIHandler.getTranscription());
              }
            }
          );

          transcriptionHandler = new TranscriptionHandler(
            streamSid,
            callLogger
          );

          // Enregistrer le stream actif
          const callSid = data.start?.callSid || null;
          registerStream(streamSid, connection, callSid);
        }

        // Événement MEDIA : Nettoyer et transférer l'audio à OpenAI
        if (data.event === "media" && openAiWs && openAiWs.readyState === WebSocket.OPEN) {
          // Nettoyer l'audio avec RNNoise si disponible
          const audioPayload = rnnoiseAvailable 
            ? await cleanAudio(data.media.payload)
            : data.media.payload;
          
          openAiWs.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: audioPayload,
            })
          );
        } else if (twilioHandler) {
          // Autres événements Twilio
          twilioHandler.handleMessage(data);
        }
      } catch (err) {
        callLogger.error(streamSid, err, { context: "twilio_message_parse" });
      }
    });

    // ==========================================
    // HEARTBEAT (KEEPALIVE)
    // ==========================================
    const heartbeatInterval = setInterval(() => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.ping();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Ping toutes les 30 secondes

    connection.on("pong", () => {
      // Heartbeat OK - connexion active
    });

    // ==========================================
    // HANDLER MESSAGES OPENAI
    // ==========================================
    openAiWs.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (openAIHandler) {
          openAIHandler.handleMessage(data);
        }
      } catch (err) {
        callLogger.error(streamSid, err, { context: "openai_message_parse" });
      }
    });

    // ==========================================
    // GESTION ERREURS & FERMETURE
    // ==========================================
    
    connection.on("error", (error) => {
      console.error("ERREUR WebSocket Twilio:", error);
      console.error("   - StreamSid:", streamSid);
      console.error("   - Message:", error.message);
      callLogger.error(streamSid, error, { context: "twilio_websocket_error" });
    });

    connection.on("close", (code, reason) => {
      
      // Désenregistrer le stream
      if (streamSid) {
        unregisterStream(streamSid);
      }
      
      // Nettoyer le heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      const totalDuration = Date.now() - callStartTime;
      callLogger.callCompleted(streamSid, totalDuration);

      // Fermer proprement la connexion OpenAI
      if (openAiWs.readyState === WebSocket.OPEN) {
        closeTimeout = setTimeout(() => {
          if (openAiWs.readyState === WebSocket.OPEN) {
            callLogger.info(streamSid, "Timeout écoulé, fermeture WS OpenAI");
            openAiWs.close();
          }
        }, 1000);
      }
    });

    openAiWs.on("error", (err) => {
      callLogger.error(streamSid, err, { context: "openai_websocket_error" });
    });

    openAiWs.on("close", () => {
      callLogger.info(streamSid, "Connexion OpenAI fermée");
    });
    
  } catch (error) {
    console.error("ERREUR FATALE dans handleWebSocketConnection:");
    console.error("   - Message:", error.message);
    console.error("   - Stack:", error.stack);
    
    // Fermer proprement la connexion en cas d'erreur
    try {
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.close(1011, "Erreur interne du serveur");
      }
    } catch (closeError) {
      console.error("Impossible de fermer la connexion:", closeError.message);
    }
  }
}

