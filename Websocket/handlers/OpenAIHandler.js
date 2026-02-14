import { FunctionCallService } from "../services/FunctionCallService.js";

/** Timestamp ISO pour logs barge-in (diagnostic temps réel) */
const ts = () => new Date().toISOString();

/**
 * Gestionnaire des messages OpenAI
 * Traite tous les événements du WebSocket OpenAI :
 * - Session (configuration)
 * - Réponses (audio, transcription, texte)
 * - Interactions utilisateur (speech, transcription)
 * - Function calls (disponibilités, rendez-vous)
 */
export class OpenAIHandler {
  constructor(streamSid, connection, callLogger, openAiWs) {
    this.streamSid = streamSid;
    this.connection = connection;
    this.callLogger = callLogger;
    this.openAiWs = openAiWs;
    this.transcription = `Appel démarré - StreamSid: ${streamSid}\n`;
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
    /** True après une interruption (barge-in) : on ne renvoie plus l'audio vers Twilio jusqu'à response.done/cancelled */
    this.isInterrupted = false;
    this.currentResponseText = "";
    this.initialGreetingSent = false;
  }

  /**
   * Point d'entrée pour tous les messages OpenAI
   * @param {Object} data - Message reçu d'OpenAI
   */
  handleMessage(data) {
    switch (data.type) {
      case "session.updated":
        this.handleSessionUpdated(data);
        break;
      case "response.created":
        this.handleResponseCreated(data);
        break;
      case "response.audio.delta":
        this.handleAudioDelta(data);
        break;
      case "response.done":
        this.handleResponseCompleted(data);
        break;
      case "response.cancelled":
        this.handleResponseCancelled();
        break;
      case "response.audio_transcript.delta":
        this.handleAudioTranscriptDelta(data);
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
      case "error":
        this.handleError(data);
        break;
      default:
        this.callLogger.debug(this.streamSid, `Message OpenAI: ${data.type}`, {
          messageType: data.type,
          hasTranscript: !!data.transcript,
        });
    }
  }

  // ==========================================
  // GESTION DE SESSION
  // ==========================================

  /**
   * Gère la mise à jour de session (déclenche la salutation initiale)
   */
  handleSessionUpdated(data) {
    if (!this.initialGreetingSent && this.openAiWs && this.openAiWs.readyState === 1) {
      this.initialGreetingSent = true;
      
      this.callLogger.info(this.streamSid, "🎤 Envoi de la salutation automatique");
      
      // Forcer une réponse de l'assistant sans attendre l'utilisateur
      this.openAiWs.send(JSON.stringify({
        type: "response.create"
      }));
    }
  }

  // ==========================================
  // GESTION DES RÉPONSES ASSISTANT
  // ==========================================

  /**
   * Début d'une nouvelle réponse de l'assistant.
   * Si shouldCancel est vrai (speech_started était arrivé avant), on cancel tout de suite.
   */
  handleResponseCreated(data) {
    this.currentResponseId = data.response?.id ?? null;
    this.isAssistantSpeaking = true;
    this._audioDeltaLogged = false;
    this.currentResponseText = "";
    console.log(ts(), "[OPENAI] response.created", this.currentResponseId);

    if (this.shouldCancel && this.currentResponseId && this.openAiWs?.readyState === 1) {
      console.log(ts(), "[OPENAI] Cancelling response after delayed speech_started", this.currentResponseId);
      this.openAiWs.send(JSON.stringify({
        type: "response.cancel",
        response_id: this.currentResponseId
      }));
      this.currentResponseId = null;
      this.isAssistantSpeaking = false;
      this.isInterrupted = true;
      this.shouldCancel = false;
      return;
    }

    this.callLogger.debug(this.streamSid, "Réponse assistant démarrée", {
      responseId: this.currentResponseId
    });
  }

  /**
   * Fin de la réponse de l'assistant
   */
  async handleResponseCompleted(data) {
    const remainingText = this.currentResponseText.trim();
    
    this.callLogger.extractionCompleted(this.streamSid, {
      output_text: remainingText ? remainingText.substring(0, 100) + "..." : "Déjà streamé",
    });

    console.log(ts(), "[OPENAI] response.done", this.currentResponseId);
    this.isAssistantSpeaking = false;
    this.isInterrupted = false;
    this.currentResponseId = null;
    this.shouldCancel = false;
    this._audioDeltaLogged = false;
    this.currentResponseText = "";
  }

  // ==========================================
  // GESTION AUDIO
  // ==========================================

  /**
   * Réception d'audio delta depuis OpenAI
   */
  handleAudioDelta(data) {
    if (this.isInterrupted) {
      console.log(ts(), "[TWILIO] audio suppressed (isInterrupted)");
      return;
    }
    if (data.delta) {
      if (!this._audioDeltaLogged) {
        this._audioDeltaLogged = true;
        console.log(ts(), "[OPENAI] response.audio.delta (streaming)");
      }
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

  // ==========================================
  // GESTION TRANSCRIPTION
  // ==========================================

  /**
   * Réception d'un delta de transcription audio (assistant)
   */
  async handleAudioTranscriptDelta(data) {
    if (data.delta) {
      this.currentResponseText += data.delta;
    }
  }

  /**
   * Réception de transcription utilisateur
   */
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
      
      // Avec server_vad activé, OpenAI déclenche automatiquement une réponse
    }
  }

  /**
   * Réception de delta de texte (mode text, non audio)
   */
  handleTextDelta(data) {
    if (!this.isAssistantSpeaking) {
      this.transcription += "\nAssistant: ";
      this.isAssistantSpeaking = true;
    }
    this.transcription += data.delta;
  }

  /**
   * Fin de texte
   */
  handleTextCompleted() {
    this.isAssistantSpeaking = false;
    this.transcription += "\n";
  }

  // ==========================================
  // GESTION INTERRUPTION
  // ==========================================

  /**
   * Barge-in : l'utilisateur commence à parler.
   * Ordre critique : isInterrupted = true AVANT cancel/clear pour que les audio.delta
   * qui arrivent en parallèle ne partent pas vers Twilio.
   */
  handleUserSpeechStarted() {
    console.log(ts(), "[VAD] speech_started");
    if (!this.openAiWs || this.openAiWs.readyState !== 1) return;

    if (this.isAssistantSpeaking && this.currentResponseId) {
      console.log(ts(), "[OPENAI] Barge-in: cancelling response immediately", this.currentResponseId);
      this.openAiWs.send(JSON.stringify({
        type: "response.cancel",
        response_id: this.currentResponseId
      }));
      this.currentResponseId = null;
      this.isAssistantSpeaking = false;
      this.isInterrupted = true;
      this.callLogger.debug(this.streamSid, "Client commence a parler (barge-in)");
      return;
    }

    this.shouldCancel = true;
    console.log(ts(), "[OPENAI] Speech started before response.created, will cancel when response created");
  }

  /**
   * Réponse annulée par le serveur (après notre response.cancel).
   * On ne remet pas isInterrupted = false ici (seul response.done le fait).
   */
  handleResponseCancelled() {
    console.log(ts(), "[OPENAI] response.cancelled");
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
    this.shouldCancel = false;
    this._audioDeltaLogged = false;
    this.callLogger.debug(this.streamSid, "Réponse assistant annulée (barge-in)");
  }

  // ==========================================
  // GESTION FUNCTION CALLS
  // ==========================================

  /**
   * Réception de delta d'arguments de function call
   */
  async handleFunctionCallDelta(data) {
    this.callLogger.debug(this.streamSid, "Function call delta received", {
      name: data.name,
      arguments: data.arguments,
    });
  }

  /**
   * Function call complété - Exécuter l'appel
   */
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
          result = await FunctionCallService.checkAvailability(args.date);
          break;
        case "create_appointment":
          result = await FunctionCallService.createAppointment(args);
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

  // ==========================================
  // GESTION ERREURS
  // ==========================================

  /**
   * Gère les erreurs OpenAI
   */
  handleError(data) {
    console.error("ERREUR OPENAI:", JSON.stringify(data, null, 2));
    this.callLogger.error(this.streamSid, new Error(`OpenAI Error: ${data.error?.message || 'Unknown'}`), {
      errorType: data.error?.type,
      errorCode: data.error?.code,
      errorDetails: data.error
    });
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Récupère la transcription complète
   * @returns {string} Transcription de l'appel
   */
  getTranscription() {
    return this.transcription;
  }
}

