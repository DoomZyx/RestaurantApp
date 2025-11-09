import WebSocket from "ws";
import SupplierOrderModel from "../models/supplierOrder.js";
import { extractSupplierResponse } from "../Services/gptServices/extractSupplierData.js";
import restaurantConfig from "../Config/restaurant.js";

// Configuration OpenAI Realtime API
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

/**
 * Gère la connexion WebSocket pour un appel fournisseur
 * @param {WebSocket} twilioWs - WebSocket de Twilio
 * @param {string} orderId - ID de la commande
 */
export async function handleSupplierCallConnection(twilioWs, orderId) {
  console.log(`📞 Nouvelle connexion WebSocket fournisseur - Commande: ${orderId}`);

  try {
    // Récupérer la commande
    const order = await SupplierOrderModel.findById(orderId);
    if (!order) {
      console.error("❌ Commande introuvable:", orderId);
      twilioWs.close();
      return;
    }

    // Mettre à jour le statut
    order.statut = "appel_en_cours";
    await order.save();

    // Variables pour stocker la transcription
    let fullTranscription = "";
    let conversationStarted = false;

    // Connexion à OpenAI Realtime API
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    // Configuration de la session OpenAI
    openaiWs.on("open", () => {
      console.log("✅ Connecté à OpenAI Realtime API");

      const ingredientsList = order.getIngredientsText();

      // Configurer la session
      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: `Tu es un assistant qui appelle un fournisseur pour passer une commande au nom du restaurant "${restaurantConfig.nom}".

CONTEXTE :
- Tu représentes le restaurant "${restaurantConfig.nom}"
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
            silence_duration_ms: 500
          },
          temperature: 0.7
        }
      };

      openaiWs.send(JSON.stringify(sessionConfig));
      console.log("🎙️ Session OpenAI configurée");
    });

    // Gestion des messages OpenAI
    openaiWs.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "session.created":
            console.log("✅ Session OpenAI créée");
            break;

          case "session.updated":
            console.log("✅ Session OpenAI mise à jour");
            conversationStarted = true;
            break;

          case "response.audio.delta":
            // Transférer l'audio à Twilio
            if (message.delta && twilioWs.readyState === WebSocket.OPEN) {
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
                    console.log(`${role}: ${text}`);
                  }
                });
              }
            }
            break;

          case "input_audio_buffer.speech_started":
            console.log("🎤 Le fournisseur parle...");
            break;

          case "input_audio_buffer.speech_stopped":
            console.log("⏸️ Le fournisseur a fini de parler");
            break;

          case "error":
            console.error("❌ Erreur OpenAI:", message.error);
            break;
        }
      } catch (error) {
        console.error("❌ Erreur traitement message OpenAI:", error);
      }
    });

    // Transférer l'audio de Twilio vers OpenAI
    twilioWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case "start":
            console.log("🎙️ Stream Twilio démarré:", message.start.streamSid);
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
            console.log("⏹️ Stream Twilio arrêté");
            openaiWs.close();
            break;
        }
      } catch (error) {
        console.error("❌ Erreur traitement message Twilio:", error);
      }
    });

    // Nettoyage à la fin de l'appel
    twilioWs.on("close", async () => {
      console.log("📴 WebSocket Twilio fermé");
      openaiWs.close();

      try {
        // Extraire les données avec GPT
        if (fullTranscription.trim()) {
          console.log("📝 Transcription complète:", fullTranscription);
          
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
        console.log("✅ Commande mise à jour:", order._id);

      } catch (error) {
        console.error("❌ Erreur mise à jour commande:", error);
        order.statut = "erreur";
        await order.save();
      }
    });

    openaiWs.on("error", (error) => {
      console.error("❌ Erreur WebSocket OpenAI:", error);
    });

    openaiWs.on("close", () => {
      console.log("📴 WebSocket OpenAI fermé");
    });

  } catch (error) {
    console.error("❌ Erreur handleSupplierCallConnection:", error);
    twilioWs.close();
  }
}

export default handleSupplierCallConnection;






