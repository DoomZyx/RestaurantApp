import { FunctionCallService } from "../services/FunctionCallService.js";

/** Timestamp ISO pour logs barge-in (diagnostic temps réel) */
const ts = () => new Date().toISOString();

/** Délai (ms) sans envoi d'audio après response.created pour laisser arriver speech_started. */
const AUDIO_HOLD_MS = 500;
/** Délai (ms) avant d'envoyer chaque chunk audio vers Twilio. Mettre à 50 pour tester si réponses plus lentes améliorent le barge-in. 0 = pas de délai. */
const STREAM_DELAY_MS = 0;

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
    this.shouldCancel = false;
    this._audioDeltaLogged = false;
    /** True après input_audio_buffer.committed : le serveur va envoyer response.created */
    this.awaitingResponse = false;
    /** True après speech_started (avant response.created) ; false après speech_stopped. Annuler la réponse seulement si encore true à response.created */
    this.userStillSpeaking = false;
    this.currentResponseText = "";
    this.initialGreetingSent = false;
    this._suppressLogged = false;
    /** Timestamp jusqu'auquel on ne transmet pas l'audio (fenêtre barge-in juste après response.created) */
    this._audioHoldUntil = 0;
  }

  /** Met à jour le streamSid (appelé au premier event "start" Twilio) */
  setStreamSid(streamSid) {
    this.streamSid = streamSid;
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
      case "response.output_item.added":
      case "response.output_item.created":
        this.handleOutputItemAdded(data);
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
      case "input_audio_buffer.committed":
        this.awaitingResponse = true;
        this.handleInputCommitted();
        break;
      case "input_audio_buffer.speech_stopped":
        this.userStillSpeaking = false;
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
   * Tour utilisateur terminé (input_audio_buffer.committed).
   * Avec create_response: false, on envoie response.create nous-mêmes pour déclencher la réponse.
   */
  handleInputCommitted() {
    if (this.openAiWs && this.openAiWs.readyState === 1) {
      this.openAiWs.send(JSON.stringify({ type: "response.create" }));
      this.callLogger.debug(this.streamSid, "response.create envoye (tour utilisateur committe)");
    }
  }

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
   * Si shouldCancel est vrai (speech_started était arrivé avant), on cancel immédiatement avant tout stream.
   * Sinon, on retient l'audio 300 ms pour laisser le temps au speech_started d'arriver (barge-in).
   * Limitation : l'audio deja envoye a Twilio ne peut pas etre annule (buffer cote Twilio).
   */
  handleResponseCreated(data) {
    this.currentResponseId = data.response.id;
    this.isAssistantSpeaking = true;
  
    if (this.shouldCancel) {
      this.openAiWs.send(JSON.stringify({
        type: "response.cancel",
        response_id: this.currentResponseId
      }));
  
      this.shouldCancel = false;
      this.isAssistantSpeaking = false;
      this.currentResponseId = null;
    }
  }

  /**
   * Fin de la réponse de l'assistant
   */
  async handleResponseCompleted(data) {
    const remainingText = this.currentResponseText.trim();
    
    this.callLogger.extractionCompleted(this.streamSid, {
      output_text: remainingText ? remainingText.substring(0, 100) + "..." : "Déjà streamé",
    });

    const doneId = data.response?.id ?? this.currentResponseId;
    console.log(ts(), "[OPENAI] response.done", doneId);
    this.isAssistantSpeaking = false;
    this.isInterrupted = false;
    this.currentResponseId = null;
    this.shouldCancel = false;
    this.awaitingResponse = false;
    this.userStillSpeaking = false;
    this._audioDeltaLogged = false;
    this._suppressLogged = false;
    this.currentResponseText = "";
  }

  // ==========================================
  // GESTION AUDIO
  // ==========================================

  /**
   * Réception d'audio delta depuis OpenAI
   */
  async handleAudioDelta(data) {
    if (this.isInterrupted) {
      if (!this._suppressLogged) {
        this._suppressLogged = true;
        console.log(ts(), "[TWILIO] audio suppressed (barge-in)");
      }
      return;
    }
    if (this._audioHoldUntil && Date.now() < this._audioHoldUntil) {
      return;
    }
    this._audioHoldUntil = 0;
    this._suppressLogged = false;
    if (data.delta && this.streamSid) {
      if (STREAM_DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, STREAM_DELAY_MS));
      }
      if (this.isInterrupted) return;
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
   * Item de conversation ajouté (fallback pour item_id si output_item n'a pas la bonne structure)
   */
  handleConversationItemAdded(data) {
    if (!this.isAssistantSpeaking) return;
    const item = data.item ?? data;
    const itemId = item?.id ?? item?.item_id;
    if (itemId && (item?.role === "assistant" || item?.type === "message")) {
      this.currentOutputItemId = itemId;
      this.callLogger.debug(this.streamSid, "conversation.item id capture (assistant)", { itemId });
    }
  }

  /**
   * Item de sortie ajouté (pour truncate sur interruption)
   * Structure possible: data.item.id, data.item_id, data.output_item.id
   */
  handleOutputItemAdded(data) {
    const itemId = data.item?.id ?? data.output_item?.id ?? data.item_id ?? data.item?.item_id;
    if (itemId) {
      this.currentOutputItemId = itemId;
      this.callLogger.debug(this.streamSid, "output_item id capture", { itemId });
    } else {
      this.callLogger.debug(this.streamSid, "output_item structure (item_id manquant)", {
        keys: Object.keys(data),
        item: data.item ? JSON.stringify(data.item).substring(0, 200) : null,
      });
    }
  }

  /**
   * Barge-in : l'utilisateur commence à parler.
   * Doc: stopper lecture immédiatement, envoyer response.cancel, puis conversation.item.truncate.
   */
  handleUserSpeechStarted() {
    console.log(
      ts(),
      "[VAD] speech_started",
      "isAssistantSpeaking=" + this.isAssistantSpeaking,
      "currentResponseId=" + (this.currentResponseId || "null")
    );
  
    if (!this.openAiWs || this.openAiWs.readyState !== 1) return;
  
    // Cas 1 : le bot parle → interruption immédiate
    if (this.isAssistantSpeaking && this.currentResponseId) {
      const responseId = this.currentResponseId;
  
      this.isInterrupted = true;
      this.isAssistantSpeaking = false;
      this.currentResponseId = null;
  
      this.openAiWs.send(JSON.stringify({
        type: "response.cancel",
        response_id: responseId
      }));
  
      console.log(ts(), "[OPENAI] response.cancel envoyé", responseId);
      return;
    }
  
    // Cas 2 : réponse pas encore créée → cancel différé
    this.shouldCancel = true;
  }

  /**
   * Réponse annulée (après notre response.cancel).
   * Réinitialiser l'état pour la prochaine réponse.
   */
  handleResponseCancelled() {
    console.log(ts(), "[OPENAI] response.cancelled");
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
    this.isInterrupted = false;
    this.shouldCancel = false;
    this.awaitingResponse = false;
    this.userStillSpeaking = false;
    this._audioDeltaLogged = false;
    this._audioHoldUntil = 0;
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

      // Envoyer le résultat à OpenAI (openAiWs, pas connection Twilio)
      if (this.openAiWs && this.openAiWs.readyState === 1) {
        this.openAiWs.send(
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
        source: "OpenAIHandler.js",
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
    const code = data.error?.code;
    if (code === "response_cancel_not_active") {
      this.callLogger.debug(this.streamSid, "response.cancel ignoré (réponse déjà terminée)", { code });
      this.isInterrupted = false;
      this.isAssistantSpeaking = false;
      this.currentResponseId = null;
      this._suppressLogged = false;
      this._audioHoldUntil = 0;
      return;
    }
    this.callLogger.error(this.streamSid, new Error(`OpenAI API: ${data.error?.message || 'Unknown'}`), {
      source: "OpenAIHandler.js",
      context: "handleError",
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

