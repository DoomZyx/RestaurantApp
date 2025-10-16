import { createOpenAiSession } from "../Services/gptServices/gptServices.js";
import WebSocket from "ws";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { callLogger } from "../Services/logging/logger.js";
import notificationService from "../Services/notificationService.js";

dotenv.config();

// Gestionnaire pour les messages OpenAI
class OpenAIMessageHandler {
  constructor(streamSid, connection, callLogger, openAiWs) {
    this.streamSid = streamSid;
    this.connection = connection;
    this.callLogger = callLogger;
    this.openAiWs = openAiWs;
    this.transcription = `Appel démarré - StreamSid: ${streamSid}\n`;
    this.isAssistantSpeaking = false;
    this.currentResponseId = null; // Tracker la réponse en cours
  }

  handleMessage(data) {
    switch (data.type) {
      case "response.created":
        this.handleResponseCreated(data);
        break;
      case "response.audio.delta":
        this.handleAudioDelta(data);
        break;
      case "response.completed":
        this.handleResponseCompleted(data);
        break;
      case "response.text.delta":
        this.handleTextDelta(data);
        break;
      case "response.text.completed":
        this.handleTextCompleted();
        break;
      case "input_audio_buffer.speech_started":
        this.handleUserSpeechStarted();
        break;
      case "conversation.item.input_audio_transcription.completed":
        this.handleUserTranscription(data);
        break;
      case "response.function_call_arguments.delta":
        this.handleFunctionCallDelta(data);
        break;
      case "response.function_call_arguments.done":
        this.handleFunctionCallCompleted(data);
        break;
      default:
        this.callLogger.debug(this.streamSid, `Message OpenAI: ${data.type}`, {
          messageType: data.type,
          hasTranscript: !!data.transcript,
        });
    }
  }

  handleResponseCreated(data) {
    // Tracker l'ID de la réponse en cours
    this.currentResponseId = data.response?.id;
    this.isAssistantSpeaking = true;
    this.callLogger.debug(this.streamSid, "Réponse assistant démarrée", {
      responseId: this.currentResponseId
    });
  }

  handleUserSpeechStarted() {
    // Si l'assistant est en train de parler, l'interrompre
    if (this.isAssistantSpeaking && this.currentResponseId) {
      this.callLogger.info(this.streamSid, "🛑 Interruption détectée - Annulation de la réponse en cours");
      
      // Envoyer l'événement d'annulation à OpenAI
      if (this.openAiWs && this.openAiWs.readyState === 1) {
        this.openAiWs.send(JSON.stringify({
          type: "response.cancel"
        }));
        
        // Réinitialiser l'état
        this.isAssistantSpeaking = false;
        this.currentResponseId = null;
      }
    }
  }

  handleAudioDelta(data) {
    if (data.delta) {
      const audioDelta = {
        event: "media",
        streamSid: this.streamSid,
        media: {
          payload: Buffer.from(data.delta, "base64").toString("base64"),
        },
      };
      this.connection.send(JSON.stringify(audioDelta));
    }
  }

  handleResponseCompleted(data) {
    this.callLogger.extractionCompleted(this.streamSid, {
      output_text: data.response.output_text?.substring(0, 100) + "...",
    });

    if (data.response.output_text) {
      this.transcription += `\nAssistant: ${data.response.output_text}`;
    }

    // Réinitialiser l'état après la fin de la réponse
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
  }

  handleTextDelta(data) {
    if (!this.isAssistantSpeaking) {
      this.transcription += "\nAssistant: ";
      this.isAssistantSpeaking = true;
    }
    this.transcription += data.delta;
  }

  handleTextCompleted() {
    this.isAssistantSpeaking = false;
    this.transcription += "\n";
  }

  handleUserTranscription(data) {
    if (data.transcript) {
      this.transcription += `\nClient: ${data.transcript}`;
      this.callLogger.info(
        this.streamSid,
        "Transcription client reçue d'OpenAI",
        {
          transcript: data.transcript.substring(0, 50) + "...",
        }
      );
      
      // Note : Avec server_vad activé, OpenAI déclenche automatiquement une réponse
      // Pas besoin d'envoyer response.create manuellement
    }
  }

  getTranscription() {
    return this.transcription;
  }

  async handleFunctionCallDelta(data) {
    // Accumuler les arguments de la fonction
    this.callLogger.debug(this.streamSid, "Function call delta received", {
      name: data.name,
      arguments: data.arguments,
    });
  }

  async handleFunctionCallCompleted(data) {
    try {
      this.callLogger.info(this.streamSid, "Function call completed", {
        name: data.name,
        arguments: data.arguments,
      });

      const functionName = data.name;
      const args = JSON.parse(data.arguments || "{}");

      let result;

      switch (functionName) {
        case "check_availability":
          result = await this.checkAvailability(args.date);
          break;
        case "create_appointment":
          result = await this.createAppointment(args);
          break;
        default:
          result = { error: `Fonction inconnue: ${functionName}` };
      }

      // Envoyer le résultat à OpenAI
      if (this.connection && this.connection.readyState === 1) {
        this.connection.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: data.call_id,
              output: JSON.stringify(result),
            },
          })
        );
      }
    } catch (error) {
      this.callLogger.error(this.streamSid, error, {
        context: "function_call_execution",
      });
    }
  }

  async checkAvailability(date) {
    try {
      const response = await fetch(
        `http://localhost:${
          process.env.PORT || 8080
        }/api/orders/ai/available-slots?date=${date}`,
        {
          headers: {
            "x-api-key": process.env.X_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        date,
        slots: data.availableSlots || [],
        message: data.message || "Disponibilités récupérées",
      };
    } catch (error) {
      return {
        success: false,
        error: `Impossible de vérifier les disponibilités: ${error.message}`,
      };
    }
  }

  async createAppointment(args) {
    try {
      const response = await fetch(
        `http://localhost:${
          process.env.PORT || 8080
        }/api/orders/ai/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.X_API_KEY,
          },
          body: JSON.stringify(args),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        appointment: data?.appointment || null,
        message: data?.message || "Rendez-vous créé",
      };
    } catch (error) {
      return {
        success: false,
        error: `Impossible de créer le rendez-vous: ${error.message}`,
      };
    }
  }
}

// Gestionnaire pour les messages Twilio
class TwilioMessageHandler {
  constructor(streamSid, callLogger, processTranscription) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.processTranscription = processTranscription;
  }

  handleMessage(data) {
    switch (data.event) {
      case "media":
        // Géré dans la fonction principale
        break;
      case "start":
        this.handleStart(data);
        break;
      case "mark":
        this.handleMark(data);
        break;
      case "stop":
        this.handleStop();
        break;
      default:
        this.callLogger.info(
          this.streamSid,
          `Événement Twilio: ${data.event}`,
          {
            eventData: JSON.stringify(data).substring(0, 200) + "...",
          }
        );
    }
  }

  handleStart(data) {
    this.streamSid = data.start.streamSid;
    this.callLogger.callStarted(this.streamSid, {
      callerInfo: data.start,
      timestamp: new Date().toISOString(),
    });
  }

  handleMark(data) {
    if (data.mark.name === "end_call") {
      this.processTranscription();
    }
  }

  handleStop() {
    this.callLogger.info(
      this.streamSid,
      "Événement stop détecté - fin d'appel"
    );
    this.processTranscription();
  }
}

// Processeur de transcription
class TranscriptionProcessor {
  constructor(streamSid, callLogger) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
  }

  async process(transcription) {
    const startTime = Date.now();

    try {
      this.callLogger.extractionStarted(this.streamSid);
      this.callLogger.transcriptionReceived(
        this.streamSid,
        transcription.length
      );

      // Si la transcription est trop courte, essayer l'API Twilio (fallback)
      if (transcription.length < 100) {
        transcription = await this.tryTwilioTranscription(transcription);
      }

      await this.sendToProcessingAPI(transcription, startTime);
    } catch (error) {
      this.callLogger.error(this.streamSid, error, {
        context: "process_transcription",
      });
    }
  }

  async tryTwilioTranscription(originalTranscription) {
    // Fallback désactivé - on utilise maintenant OpenAI Whisper pour la transcription
    this.callLogger.info(
      this.streamSid,
      "Transcription courte détectée - utilisation de la transcription OpenAI"
    );
    return originalTranscription;
  }

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
      // try {
      //   const callData = result.data || {};
      //   callData.duration = `${apiDuration}ms`;
      //   notificationService.notifyCallCompleted(callData);
      // } catch (notificationError) {
      //   this.callLogger.error(this.streamSid, notificationError, {
      //     context: "notification_send",
      //   });
      // }
    } else {
      this.callLogger.error(
        this.streamSid,
        new Error(`Erreur API: ${response.status}`),
        {
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
          context: "notification_error_send",
        });
      }
    }
  }
}

export function handleWebSocketConnection(connection, request) {
  try {
    console.log("✅ WebSocket Twilio CONNECTÉ !");
    console.log("   - ReadyState:", connection.readyState);
    console.log("   - Timestamp:", new Date().toISOString());
    
    callLogger.callStarted(null, { event: "client_connected" });

  // Heartbeat pour garder la connexion active
  const heartbeatInterval = setInterval(() => {
    if (connection.readyState === WebSocket.OPEN) {
      connection.ping();
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Ping toutes les 30 secondes

  const openAiWs = createOpenAiSession(process.env.OPENAI_API_KEY, "ballad");
  let streamSid = null;
  let closeTimeout = null;
  const callStartTime = Date.now();

  // Initialisation des gestionnaires
  let openAIHandler = null;
  let twilioHandler = null;
  let transcriptionProcessor = null;

  // Fonction pour traiter la transcription
  const processTranscription = async () => {
    if (transcriptionProcessor && openAIHandler) {
      await transcriptionProcessor.process(openAIHandler.getTranscription());
    }
  };

  openAiWs.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("📩 Message OpenAI reçu:", data.type);
      if (openAIHandler) {
        openAIHandler.handleMessage(data);
      }
    } catch (err) {
      callLogger.error(streamSid, err, { context: "openai_message_parse" });
    }
  });

  connection.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("📨 Message Twilio reçu:", data.event || 'UNKNOWN');
      console.log("   - Données complètes:", JSON.stringify(data).substring(0, 200));

      if (data.event === "start") {
        streamSid = data.start.streamSid;
        console.log("🎬 Événement START reçu");
        console.log("   - StreamSid:", streamSid);
        console.log("   - CallSid:", data.start.callSid);

        // Notification d'appel entrant désactivée (on notifie uniquement à la fin)
        // notificationService.notifyCallInProgress({
        //   caller: data.start.callSid || "Numéro inconnu",
        //   streamSid: streamSid,
        //   timestamp: new Date().toISOString(),
        // });

        // Initialisation des gestionnaires avec streamSid
        openAIHandler = new OpenAIMessageHandler(
          streamSid,
          connection,
          callLogger,
          openAiWs
        );
        twilioHandler = new TwilioMessageHandler(
          streamSid,
          callLogger,
          processTranscription
        );
        transcriptionProcessor = new TranscriptionProcessor(
          streamSid,
          callLogger
        );
      }

      if (data.event === "media" && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: data.media.payload,
          })
        );
      } else if (twilioHandler) {
        twilioHandler.handleMessage(data);
      }
    } catch (err) {
      callLogger.error(streamSid, err, { context: "twilio_message_parse" });
    }
  });

  // Gérer le pong du heartbeat
  connection.on("pong", () => {
    console.log("💚 Pong reçu de Twilio - connexion active");
  });

  connection.on("error", (error) => {
    console.error("❌ ERREUR WebSocket Twilio:", error);
    console.error("   - StreamSid:", streamSid);
    console.error("   - Message:", error.message);
    callLogger.error(streamSid, error, { context: "twilio_websocket_error" });
  });

  connection.on("close", (code, reason) => {
    console.log("🔴 WebSocket Twilio FERMÉ");
    console.log("   - Code:", code);
    console.log("   - Reason:", reason?.toString());
    console.log("   - StreamSid:", streamSid);
    
    // Nettoyer le heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      console.log("💔 Heartbeat arrêté");
    }
    
    const totalDuration = Date.now() - callStartTime;
    callLogger.callCompleted(streamSid, totalDuration);

    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));

      closeTimeout = setTimeout(() => {
        if (openAiWs.readyState === WebSocket.OPEN) {
          callLogger.info(streamSid, "Timeout écoulé, fermeture WS OpenAI");
          openAiWs.close();
        }
      }, 5000);
    }
  });

  openAiWs.on("error", (err) => {
    callLogger.error(streamSid, err, { context: "openai_websocket_error" });
  });

  openAiWs.on("close", () => {
    console.log("🔴 OpenAI WebSocket FERMÉ");
    callLogger.info(streamSid, "Connexion OpenAI fermée");
  });
  
  } catch (error) {
    console.error("❌ ERREUR FATALE dans handleWebSocketConnection:");
    console.error("   - Message:", error.message);
    console.error("   - Stack:", error.stack);
    
    // Fermer proprement la connexion en cas d'erreur
    try {
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.close(1011, "Erreur interne du serveur");
      }
    } catch (closeError) {
      console.error("   ⚠️ Impossible de fermer la connexion:", closeError.message);
    }
  }
}

