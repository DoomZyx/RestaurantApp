import WebSocket from "ws";
import { getSystemMessage } from "../../Config/prompts.js";
import { generateEnrichedPrompt } from "./pricingService.js";

export function createOpenAiSession(apiKey, voice = "ballad", instructions) {
  const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", async () => {
    // Récupérer les infos du restaurant depuis la BDD (dynamique)
    const { getRestaurantInfo } = await import("./pricingService.js");
    const restaurantInfo = await getRestaurantInfo();
    
    // Générer le prompt enrichi avec les tarifs ET la date actuelle
    const enrichedInstructions = await generateEnrichedPrompt(getSystemMessage(restaurantInfo ?? null));
    
    const sessionUpdate = {
      type: "session.update",
      session: {
        
        turn_detection: {
          type: "server_vad",
          threshold: 0.5, // Réduit de 0.6 à 0.5 pour détection plus précoce
          prefix_padding_ms: 150, // Augmenté de 80 à 150ms pour mieux capturer le début des phrases
          // Augmenté à 300ms pour éviter de couper les transcriptions lors de pauses naturelles
          // OpenAI nécessite au moins 100ms d'audio dans le buffer avant commit
          // Avec 300ms, on tolère les pauses naturelles (200-250ms) sans couper
          silence_duration_ms: 300, // Augmenté de 140 à 300ms pour éviter coupures transcription
          create_response: true,
          interrupt_response: true,
        },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        voice: voice,
        instructions: enrichedInstructions,
        modalities: ["text", "audio"],
        temperature: 0.8,
        max_response_output_tokens: 812,  // Limite les monologues pour que l'interruption soit prise en compte plus tôt
        // Configuration Whisper pour la transcription côté OpenAI Realtime
        // Attention : l'API ne supporte PAS le paramètre temperature ici
        // Limite : prompt max 1024 caractères
        input_audio_transcription: {
          model: "whisper-1",
          language: "fr",
          prompt: (() => {
            const fullPrompt =
              "Transcription d'appels téléphoniques pour restaurant/fast-food en français.\n\n" +
              "PRIORITÉ - CHIFFRES : Transcris TOUS les chiffres en numérique (0-9), jamais en lettres. Ex: 'deux' → '2', 'trois' → '3'.\n\n" +
              "PRIORITÉ - HEURES : Format HHh ou HHhMM (ex: '18h', '19h30'). Ne JAMAIS transcrire en lettres. 'midi' → '12h', 'minuit' → '00h', 'huit heures' → '8h' (matin) ou '20h' (soir).\n\n" +
              "PRIORITÉ - TÉLÉPHONE : Format XX XX XX XX XX (10 chiffres avec espaces). Ex: 'zéro six soixante-douze...' → '06 72 88 62 55'. Transcris chaque chiffre en numérique.\n\n" +
              "VOCABULAIRE MENU : 'Coca-Cola' (majuscules et tiret), 'burger', 'frites', 'tacos', 'pizza', 'margherita' (avec 'h'), 'sauce Algérienne' (majuscule), 'sauce Samouraï'.\n\n" +
              "RÈGLES : Privilégie justesse chiffres/horaires même avec bruit. Si incertain, transcris quand même. Garde ponctuation naturelle. Respecte majuscules noms propres et produits.";
            
            // Tronquer à 1024 caractères maximum (limite OpenAI)
            return fullPrompt.length > 1024 ? fullPrompt.substring(0, 1024) : fullPrompt;
          })()
        },
        tools: [
          {
            type: "function",
            name: "check_availability",
            description:
              "Vérifier les créneaux disponibles pour une date donnée. IMPORTANT: Il existe 2 services - SERVICE MIDI (11h-15h) et SERVICE SOIR (18h-00h). Chaque commande/réservation appartient à UN seul service.",
            parameters: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  format: "date",
                  description: "Date souhaitée au format YYYY-MM-DD",
                },
              },
              required: ["date"],
            },
          },
          {
            type: "function",
            name: "create_appointment",
            description: "Créer un rendez-vous pour un client. IMPORTANT: Il existe 2 services - SERVICE MIDI (11h-15h) et SERVICE SOIR (18h-00h). Choisis l'heure en fonction du service demandé par le client.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Nom complet du client",
                },
                clientPhone: {
                  type: "string",
                  description: "Numéro de téléphone au format avec espaces entre paires (ex: 07 86 87 67 89)",
                },
                date: {
                  type: "string",
                  format: "date",
                  description: "Date du rendez-vous au format YYYY-MM-DD",
                },
                time: {
                  type: "string",
                  pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
                  description: "Heure du rendez-vous au format HH:MM. SERVICE MIDI: 11h00-14h59, SERVICE SOIR: 18h00-23h59. Exemple: 12h30 pour midi, 19h00 pour soir.",
                },
                duration: {
                  type: "integer",
                  default: 60,
                  description: "Durée en minutes (30, 60, 90, 120)",
                },
                type: {
                  type: "string",
                  enum: ["Commande à emporter", "Réservation de table"],
                  default: "Commande à emporter",
                  description: "Type : commande à emporter ou réservation de table",
                },
                description: {
                  type: "string",
                  description: "Description du rendez-vous",
                },
              },
              required: ["name", "clientPhone", "date", "time"],
            },
          },
        ],
      },
    };
    
    ws.send(JSON.stringify(sessionUpdate));
  });

  ws.on("error", (error) => {
    console.error("ERREUR OpenAI WebSocket:", error);
    console.error("   - Message:", error.message);
    if ("code" in error) {
      console.error("   - Code:", error.code);
    }
  });

  ws.on("close", (code, reason) => {
  });

  return ws;
}
