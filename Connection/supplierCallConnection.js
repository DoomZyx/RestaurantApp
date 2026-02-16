import WebSocket from "ws";
import SupplierOrderModel from "../models/supplierOrder.js";
import { extractSupplierResponse } from "../Services/gptServices/extractSupplierData.js";
import { getRestaurantInfo } from "../Services/gptServices/pricingService.js";
import { callLogger } from "../Services/logging/logger.js";

// Configuration OpenAI Realtime API
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

const ts = () => new Date().toISOString();

/**
 * Gère la connexion WebSocket pour un appel fournisseur
 * @param {WebSocket} twilioWs - WebSocket de Twilio
 * @param {string} orderId - ID de la commande
 */
export async function handleSupplierCallConnection(twilioWs, orderId) {

  try {
    // Récupérer la commande
    const order = await SupplierOrderModel.findById(orderId);
    if (!order) {
      console.error("❌ Commande introuvable:", orderId);
      twilioWs.close();
      return;
    }

    // Récupérer les infos du restaurant depuis la BDD (dynamique)
    const restaurantInfo = await getRestaurantInfo();
    const nomRestaurant = restaurantInfo?.nom || "Mon Restaurant";

    // Mettre à jour le statut
    order.statut = "appel_en_cours";
    await order.save();

    // Variables pour stocker la transcription
    let fullTranscription = "";
    let conversationStarted = false;
    // Barge-in : état de la réponse en cours pour interruption
    let currentResponseId = null;
    let isAssistantSpeaking = false;
    let isInterrupted = false;
    let shouldCancel = false;
    /** True après input_audio_buffer.committed : le serveur va envoyer response.created */
    let awaitingResponse = false;
    /** True après speech_started (avant response.created) ; false après speech_stopped. Annuler seulement si encore true à response.created */
    let userStillSpeaking = false;
    let audioDeltaLogged = false;

    // Connexion à OpenAI Realtime API
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    // Configuration de la session OpenAI
    openaiWs.on("open", () => {

      const ingredientsList = order.getIngredientsText();

      // Configurer la session
      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: `Tu es un assistant qui appelle un fournisseur pour passer une commande au nom du restaurant "${nomRestaurant}".

CONTEXTE :
- Tu représentes le restaurant "${nomRestaurant}"
- Tu appelles le fournisseur "${order.fournisseur.nom}"
- Tu dois commander : ${ingredientsList}

OBJECTIF :
1. Saluer poliment et te présenter
2. Expliquer ce que tu souhaites commander
3. Demander si la commande est possible
4. Obtenir la date et l'heure de livraison
5. Demander le prix total (optionnel)
6. Remercier et conclure l'appel

STYLE :
- Sois professionnel et courtois
- Va droit au but
- Reste concis
- Ne prolonge pas inutilement la conversation

IMPORTANT :
- Si le fournisseur accepte, demande impérativement la date et l'heure de livraison
- Si le fournisseur refuse, demande pourquoi et si c'est possible plus tard
- Note tous les détails importants`,
          voice: "alloy",
          input_audio_format: "g711_ulaw",
          output_audio_format: "g711_ulaw",
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 800,
            create_response: true,
            interrupt_response: true
          },
          temperature: 0.7
        }
      };

      openaiWs.send(JSON.stringify(sessionConfig));
    });

    // Gestion des messages OpenAI
    openaiWs.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "session.created":
            break;

          case "session.updated":
            conversationStarted = true;
            break;

          case "input_audio_buffer.committed":
            awaitingResponse = true;
            break;

          case "input_audio_buffer.speech_stopped":
            userStillSpeaking = false;
            break;

          case "response.created":
            awaitingResponse = false;
            currentResponseId = message.response?.id ?? null;
            isAssistantSpeaking = true;
            audioDeltaLogged = false;
            console.log(ts(), "[OPENAI] response.created", currentResponseId);

            if (shouldCancel && userStillSpeaking && currentResponseId && openaiWs.readyState === WebSocket.OPEN) {
              console.log(ts(), "[OPENAI] Cancelling response after delayed speech_started (user still speaking)", currentResponseId);
              openaiWs.send(JSON.stringify({
                type: "response.cancel",
                response_id: currentResponseId
              }));
              currentResponseId = null;
              isAssistantSpeaking = false;
              isInterrupted = true;
            } else {
              isInterrupted = false;
            }
            shouldCancel = false;
            userStillSpeaking = false;
            break;

          case "response.done":
            console.log(ts(), "[OPENAI] response.done", currentResponseId);
            isAssistantSpeaking = false;
            isInterrupted = false;
            currentResponseId = null;
            shouldCancel = false;
            awaitingResponse = false;
            userStillSpeaking = false;
            audioDeltaLogged = false;
            break;

          case "response.cancelled":
            console.log(ts(), "[OPENAI] response.cancelled");
            isAssistantSpeaking = false;
            currentResponseId = null;
            shouldCancel = false;
            awaitingResponse = false;
            userStillSpeaking = false;
            audioDeltaLogged = false;
            break;

          case "input_audio_buffer.speech_started":
            console.log(ts(), "[VAD] speech_started");
            if (isAssistantSpeaking && currentResponseId && openaiWs.readyState === WebSocket.OPEN) {
              const responseIdToCancel = currentResponseId;
              isInterrupted = true;
              isAssistantSpeaking = false;
              currentResponseId = null;
              openaiWs.send(JSON.stringify({
                type: "response.cancel",
                response_id: responseIdToCancel
              }));
              console.log(ts(), "[OPENAI] Barge-in: cancelling response immediately", responseIdToCancel);
            } else if (awaitingResponse) {
              shouldCancel = true;
              userStillSpeaking = true;
              console.log(ts(), "[OPENAI] Speech started before response.created, will cancel when response created if user still speaking");
            }
            break;

          case "response.audio.delta":
            if (isInterrupted) {
              console.log(ts(), "[TWILIO] audio suppressed (isInterrupted)");
              break;
            }
            if (message.delta && twilioWs.readyState === WebSocket.OPEN) {
              if (!audioDeltaLogged) {
                audioDeltaLogged = true;
                console.log(ts(), "[OPENAI] response.audio.delta (streaming)");
              }
              const audioData = {
                event: "media",
                streamSid: twilioWs.streamSid,
                media: {
                  payload: message.delta
                }
              };
              twilioWs.send(JSON.stringify(audioData));
            }
            break;

          case "conversation.item.created":
            // Capturer les messages pour la transcription
            if (message.item && message.item.content) {
              const content = message.item.content;
              if (Array.isArray(content)) {
                content.forEach(part => {
                  if (part.type === "input_text" || part.type === "text") {
                    const role = message.item.role === "user" ? "👤 Fournisseur" : "🤖 Assistant";
                    const text = part.text || part.transcript || "";
                    fullTranscription += `\n${role}: ${text}`;
                  }
                });
              }
            }
            break;

          case "input_audio_buffer.speech_stopped":
            break;

          case "error":
            callLogger.error(twilioWs.streamSid ?? null, new Error(message.error?.message || JSON.stringify(message.error)), {
              source: "supplierCallConnection.js",
              context: "openai_message_error",
              errorDetails: message.error,
            });
            break;
        }
      } catch (error) {
        callLogger.error(twilioWs.streamSid ?? null, error, {
          source: "supplierCallConnection.js",
          context: "openai_message_parse",
        });
      }
    });

    // Transférer l'audio de Twilio vers OpenAI
    twilioWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case "start":
            twilioWs.streamSid = message.start.streamSid;
            break;

          case "media":
            // Transférer l'audio à OpenAI
            if (conversationStarted && openaiWs.readyState === WebSocket.OPEN) {
              const audioAppend = {
                type: "input_audio_buffer.append",
                audio: message.media.payload
              };
              openaiWs.send(JSON.stringify(audioAppend));
            }
            break;

          case "stop":
            openaiWs.close();
            break;
        }
      } catch (error) {
        console.error("❌ Erreur traitement message Twilio:", error);
      }
    });

    // Nettoyage à la fin de l'appel
    twilioWs.on("close", async () => {
      openaiWs.close();

      try {
        // Extraire les données avec GPT
        if (fullTranscription.trim()) {
          
          const extractedData = await extractSupplierResponse(
            fullTranscription,
            order.ingredients
          );

          // Mettre à jour la commande
          order.appel.transcription = fullTranscription;
          order.reponse_fournisseur = {
            accepte: extractedData.accepte,
            prix_total: extractedData.prix_total,
            delai_livraison: extractedData.delai_livraison,
            commentaire: extractedData.commentaire
          };

          if (extractedData.date_livraison) {
            order.livraison.date = new Date(extractedData.date_livraison);
          }
          if (extractedData.heure_livraison) {
            order.livraison.heure = extractedData.heure_livraison;
          }
          if (extractedData.commentaire) {
            order.livraison.commentaire = extractedData.commentaire;
          }

          order.statut = extractedData.accepte ? "confirmee" : "refusee";
        } else {
          order.statut = "erreur";
        }

        await order.save();

      } catch (error) {
        callLogger.error(null, error, {
          source: "supplierCallConnection.js",
          context: "order_update_on_close",
        });
        order.statut = "erreur";
        await order.save();
      }
    });

    openaiWs.on("error", (error) => {
      console.error("❌ Erreur WebSocket OpenAI:", error);
    });

    openaiWs.on("close", () => {
    });

  } catch (error) {
    callLogger.error(null, error, {
      source: "supplierCallConnection.js",
      context: "handleSupplierCallConnection_init",
    });
    twilioWs.close();
  }
}

export default handleSupplierCallConnection;






