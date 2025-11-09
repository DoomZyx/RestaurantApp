import WebSocket from "ws";
import { getSystemMessage } from "../../Config/prompts.js";
import { generateEnrichedPrompt } from "./pricingService.js";

export function createOpenAiSession(apiKey, voice = "ballad", instructions, options = {}) {
  const { useElevenLabs = false } = options;
  
  console.log("🤖 Tentative de connexion à OpenAI Realtime...");
  console.log("   - API Key présente:", apiKey ? "✓" : "✗");
  console.log("   - Voice:", voice);
  console.log("   - TTS:", useElevenLabs ? "ElevenLabs (audio OpenAI ignoré)" : "OpenAI natif");
  
  const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", async () => {
    console.log("✅ OpenAI WebSocket CONNECTÉ !");
    console.log("   - Timestamp:", new Date().toISOString());
    // Générer le prompt enrichi avec les tarifs ET la date actuelle
    const enrichedInstructions = await generateEnrichedPrompt(getSystemMessage());
    
    const sessionUpdate = {
      type: "session.update",
      session: {
        turn_detection: { 
          type: "server_vad",
          threshold: 0.6,              // ✅ Plus sensible pour détecter les interruptions (0.5-0.6 = optimal)
          prefix_padding_ms: 300,      // ✅ Réduit à 300ms pour réagir VITE aux interruptions
          silence_duration_ms: 800,    // ✅ Réduit à 500ms pour une détection rapide de la fin de parole
          create_response: true        // ✅ Permet à l'IA de répondre automatiquement
        },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        voice: voice,
        instructions: enrichedInstructions,
        modalities: ["text", "audio"],
        temperature: 0.6, // ✅ Minimum requis par gpt-4o-mini-realtime-preview
        max_response_output_tokens: 4096, // ✅ Limite pour éviter les réponses trop longues
        input_audio_transcription: {
          model: "whisper-1",
        },
        tools: [
          {
            type: "function",
            name: "check_availability",
            description:
              "Vérifier les créneaux disponibles pour une date donnée",
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
            description: "Créer un rendez-vous pour un client",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Nom complet du client",
                },
                clientPhone: {
                  type: "string",
                  description: "Numéro de téléphone du client",
                },
                date: {
                  type: "string",
                  format: "date",
                  description: "Date du rendez-vous au format YYYY-MM-DD",
                },
                time: {
                  type: "string",
                  pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
                  description: "Heure du rendez-vous au format HH:MM",
                },
                duration: {
                  type: "integer",
                  default: 60,
                  description: "Durée en minutes (30, 60, 90, 120)",
                },
                type: {
                  type: "string",
                  enum: [
                    "Consultation initiale",
                    "Présentation de devis",
                    "Maintenance/Support",
                    "Réunion projet",
                    "Livraison/Présentation",
                  ],
                  default: "Consultation initiale",
                  description: "Type de rendez-vous",
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
    console.log("✅ Session OpenAI configurée avec succès");
  });

  ws.on("error", (error) => {
    console.error("❌ ERREUR OpenAI WebSocket:", error);
    console.error("   - Message:", error.message);
    console.error("   - Code:", error.code);
  });

  ws.on("close", (code, reason) => {
    console.log("🔴 OpenAI WebSocket FERMÉ");
    console.log("   - Code:", code);
    console.log("   - Reason:", reason?.toString());
  });

  return ws;
}
