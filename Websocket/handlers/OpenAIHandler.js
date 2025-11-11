import { AudioService } from "../services/AudioService.js";
import { FunctionCallService } from "../services/FunctionCallService.js";

/**
 * Gestionnaire des messages OpenAI
 * Traite tous les événements du WebSocket OpenAI :
 * - Session (configuration)
 * - Réponses (audio, transcription, texte)
 * - Interactions utilisateur (speech, transcription)
 * - Function calls (disponibilités, rendez-vous)
 */
export class OpenAIHandler {
  constructor(streamSid, connection, callLogger, openAiWs, useElevenLabs = false) {
    this.streamSid = streamSid;
    this.connection = connection;
    this.callLogger = callLogger;
    this.openAiWs = openAiWs;
    this.transcription = `Appel démarré - StreamSid: ${streamSid}\n`;
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
    this.useElevenLabs = useElevenLabs;
    this.currentResponseText = "";
    this.initialGreetingSent = false;
    this.audioQueue = [];
    this.isProcessingAudio = false;
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
   * Début d'une nouvelle réponse de l'assistant
   */
  handleResponseCreated(data) {
    this.currentResponseId = data.response?.id;
    this.isAssistantSpeaking = true;
    this.currentResponseText = "";
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

    // Si ElevenLabs est activé et qu'il reste du texte non streamé
    if (this.useElevenLabs && remainingText.length > 0) {
      this.audioQueue.push(remainingText);
      this.processAudioQueue();
      this.transcription += `\nAssistant: ${remainingText}`;
    }

    // Réinitialiser l'état
    this.isAssistantSpeaking = false;
    this.currentResponseId = null;
    this.currentResponseText = "";
  }

  // ==========================================
  // GESTION AUDIO
  // ==========================================

  /**
   * Réception d'audio delta depuis OpenAI
   */
  handleAudioDelta(data) {
    // Si ElevenLabs est activé, ignorer l'audio d'OpenAI
    if (this.useElevenLabs) {
      return;
    }
    
    // Sinon, utiliser l'audio d'OpenAI
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

  /**
   * Traite la queue d'audio de manière séquentielle
   */
  async processAudioQueue() {
    if (this.isProcessingAudio || this.audioQueue.length === 0) {
      return;
    }
    
    this.isProcessingAudio = true;
    
    try {
      while (this.audioQueue.length > 0) {
        const text = this.audioQueue.shift();
        await AudioService.generateAndStreamAudio(
          text, 
          this.streamSid, 
          this.connection, 
          this.callLogger
        );
      }
    } catch (error) {
      this.callLogger.error(this.streamSid, error, {
        context: "audio_queue_processing"
      });
    } finally {
      this.isProcessingAudio = false;
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
      
      // STREAMING EN TEMPS RÉEL avec ElevenLabs
      if (this.useElevenLabs) {
        const lastChar = data.delta.trim().slice(-1);
        if (['.', '!', '?'].includes(lastChar)) {
          const sentenceToStream = this.currentResponseText.trim();
          if (sentenceToStream.length > 0) {
            if (!this.transcription.includes("\nAssistant:")) {
              this.transcription += "\nAssistant: ";
            }
            this.transcription += sentenceToStream + " ";
            
            this.audioQueue.push(sentenceToStream);
            this.processAudioQueue();
            
            this.currentResponseText = "";
          }
        }
      }
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
   * L'utilisateur commence à parler
   */
  handleUserSpeechStarted() {
    if (this.isAssistantSpeaking && this.currentResponseId) {
      this.callLogger.info(this.streamSid, "🛑 INTERRUPTION DÉTECTÉE - Client parle, annulation de l'IA");
      
      if (this.openAiWs && this.openAiWs.readyState === 1) {
        this.openAiWs.send(JSON.stringify({
          type: "response.cancel"
        }));
        
        
        this.isAssistantSpeaking = false;
        this.currentResponseId = null;
      }
    } else {
      this.callLogger.debug(this.streamSid, "🎤 Client commence à parler");
    }
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
    console.error("❌ ERREUR OPENAI:", JSON.stringify(data, null, 2));
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

