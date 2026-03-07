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
    // getSystemMessage accepte null/undefined et gère le fallback en interne
    // @ts-ignore - TypeScript infère incorrectement le type, mais le code fonctionne correctement
    const enrichedInstructions = await generateEnrichedPrompt(getSystemMessage(restaurantInfo));
    
    const sessionUpdate = {
      type: "session.update",
      session: {
        // Configuration VAD robuste avec tolérance au bruit
        // Threshold réduit pour détection plus précoce et robuste au bruit
        turn_detection: {
          type: "server_vad",
          threshold: 0.4, // Réduit de 0.5 à 0.4 pour VAD plus robuste et tolérant au bruit
          prefix_padding_ms: 200, // Augmenté pour mieux capturer le début des phrases avec bruit
          // Silence duration augmenté pour tolérer les pauses naturelles et le bruit ambiant
          silence_duration_ms: 400, // Augmenté pour VAD robuste avec tolérance au bruit
          // DÉSACTIVATION génération automatique - gestion manuelle uniquement
          // Les réponses seront créées manuellement via response.create après input_audio_buffer.committed
          create_response: false,
          interrupt_response: true, // Permet toujours l'interruption si réponse en cours
        },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        voice: voice,
        // Vitesse TTS initiale : 1.3 (prise de commande rapide mais claire)
        // La vitesse sera ajustée dynamiquement selon le contexte (numéros, confirmations, etc.)
        speed: 1.3,
        instructions: enrichedInstructions,
        modalities: ["text", "audio"],
        temperature: 0.8,
        max_response_output_tokens: 812,
        input_audio_transcription: {
          model: "whisper-1",
          language: "fr",
          prompt: (() => {
            const fullPrompt =
              "Transcription d'appels téléphoniques pour restaurant/fast-food en français - MODE HAUTE PRÉCISION.\n\n" +
              "PRIORITÉ - CHIFFRES : Transcris TOUS les chiffres en numérique (0-9), jamais en lettres. Ex: 'deux' → '2', 'trois' → '3'.\n\n" +
              "PRIORITÉ - HEURES : Format HHh ou HHhMM (ex: '18h', '19h30'). Ne JAMAIS transcrire en lettres. 'midi' → '12h', 'minuit' → '00h', 'huit heures' → '8h' (matin) ou '20h' (soir).\n\n" +
              "PRIORITÉ - TÉLÉPHONE : Format XX XX XX XX XX (10 chiffres avec espaces). Ex: 'zéro six soixante-douze...' → '06 72 88 62 55'. Transcris chaque chiffre en numérique.\n\n" +
              "VOCABULAIRE MENU : 'Coca-Cola' (majuscules et tiret), 'burger', 'frites', 'tacos', 'pizza', 'margherita' (avec 'h'), 'sauce Algérienne' (majuscule), 'sauce Samouraï'.\n\n" +
              "RÈGLES HAUTE PRÉCISION : Privilégie justesse chiffres/horaires même avec bruit. Si incertain, transcris quand même. Garde ponctuation naturelle. Respecte majuscules noms propres et produits. Mode haute précision activé.";
            
            // Tronquer à 1024 caractères maximum (limite OpenAI)
            return fullPrompt.length > 1024 ? fullPrompt.substring(0, 1024) : fullPrompt;
          })()
        },
        // Désactivation des résumés automatiques en cours d'appel
        // Le contexte conversationnel complet sera maintenu jusqu'à call_end
        // Aucun JSON ne sera généré automatiquement pendant l'appel
        // La génération finale sera déclenchée uniquement à la détection de call_end
        // Note: L'API Realtime ne génère pas de résumés automatiques par défaut,
        // mais cette configuration garantit que le contexte reste complet
        tools: [
          {
            type: "function",
            name: "check_availability",
            description:
              "Vérifier les créneaux disponibles pour une date donnée. La réponse peut contenir remainingCoversMidi et remainingCoversSoir (nombre de places restantes par service). Utilise ces infos pour les réservations : indique au client combien de places restent pour le midi et le soir. IMPORTANT: Il existe 2 services - SERVICE MIDI (11h-15h) et SERVICE SOIR (18h-00h). Chaque commande/réservation appartient à UN seul service.",
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
            description: "Créer un rendez-vous pour un client. IMPORTANT: Il existe 2 services - SERVICE MIDI (11h-15h) et SERVICE SOIR (18h-00h). Choisis l'heure en fonction du service demandé. Deux structures distinctes : (1) Réservation de table = même base que le modèle Reservation : nombrePersonnes obligatoire, commandes = [] ; (2) Commande à emporter = même base que le modèle Order : commandes = liste des plats.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Nom complet du client",
                },
                telephone: {
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
                  description: "Type : commande à emporter ou réservation de table. DOIT être explicitement spécifié.",
                },
                modalite: {
                  type: "string",
                  enum: ["À emporter", "Sur place", "Livraison"],
                  description: "Modalite: À emporter si type est Commande à emporter, Sur place si type est Réservation de table, ou Livraison pour livraison"
                },
                description: {
                  type: "string",
                  description: "Description du rendez-vous",
                },
                nombrePersonnes: {
                  type: "integer",
                  minimum: 1,
                  description: "OBLIGATOIRE pour Réservation de table (nombre de couverts). Ne pas remplir pour Commande à emporter.",
                },
                commandes: {
                  type: "array",
                  description: "Réservation : laisser [] (structure Reservation = pas de plats). Commande à emporter : liste des plats (structure Order), chaque élément au minimum 'nom' et 'quantite'.",
                  items: {
                    type: "object",
                    properties: {
                      produitId: {
                        type: "string",
                        description: "ID du produit si disponible",
                      },
                      nom: {
                        type: "string",
                        description: "Nom du plat (ex: 'Burger', 'Pizza Margherita', 'Tacos')",
                      },
                      categorie: {
                        type: "string",
                        description: "Catégorie du plat (ex: 'Burgers', 'Pizzas', 'Tacos')",
                      },
                      quantite: {
                        type: "integer",
                        minimum: 1,
                        description: "Quantité commandée",
                      },
                      prixUnitaire: {
                        type: "number",
                        description: "Prix unitaire du plat",
                      },
                      composition: {
                        type: "string",
                        description: "Composition ou modifications (ex: 'Sans oignons', 'Extra sauce')",
                      },
                      options: {
                        type: "object",
                        description: "Options supplémentaires du plat",
                      },
                    },
                    required: ["nom", "quantite"],
                  },
                },
              },
              required: ["name", "telephone", "date", "time", "type"],
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
