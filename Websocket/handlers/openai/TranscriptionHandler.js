/**
 * Gestionnaire de transcription OpenAI
 * Gère les événements de transcription (response.audio_transcript.delta, response.text.delta, conversation.item.input_audio_transcription.completed)
 */
export class TranscriptionHandler {
  constructor(streamSid, callLogger, state) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.state = state; // Référence à l'état partagé
    this.speedManager = null; // Sera défini par OpenAIHandler
  }

  /**
   * Définit le gestionnaire de vitesse TTS
   * @param {TTSSpeedManager} speedManager - Gestionnaire de vitesse TTS
   */
  setSpeedManager(speedManager) {
    this.speedManager = speedManager;
  }

  /**
   * Réception d'un delta de transcription audio (assistant)
   */
  async handleAudioTranscriptDelta(data) {
    if (data.delta) {
      this.state.currentResponseText += data.delta;
      
      // Mettre à jour la transcription complète si nécessaire
      if (!this.state.isAssistantSpeaking) {
        this.state.transcription += "\nAssistant: ";
        this.state.isAssistantSpeaking = true;
      }
      this.state.transcription += data.delta;
      
      // Mettre à jour le gestionnaire de vitesse avec le dernier texte
      if (this.speedManager) {
        this.speedManager.updateLastAssistantText(this.state.currentResponseText);
      }
    }
  }

  /**
   * Réception de transcription utilisateur
   * NOTE : Cette transcription n'est plus utilisée pour l'extraction
   * On utilise uniquement la transcription de ce que GPT répète (response.audio_transcript.delta)
   * pour éviter les erreurs de transcription directe du client
   */
  handleUserTranscription(data) {
    if (data.transcript) {
      // NE PAS ajouter la transcription utilisateur à la transcription finale
      // On utilise uniquement ce que GPT répète pour l'extraction
      
      this.callLogger.info(
        this.streamSid,
        "Transcription client reçue d'OpenAI (non utilisée pour extraction)",
        {
          transcript: data.transcript.substring(0, 50) + "...",
          note: "Seule la transcription de GPT (répétition) sera utilisée pour l'extraction"
        }
      );
      
      // Avec server_vad activé, OpenAI déclenche automatiquement une réponse
    }
  }

  /**
   * Réception de delta de texte (mode text, non audio)
   */
  handleTextDelta(data) {
    if (!this.state.isAssistantSpeaking) {
      this.state.transcription += "\nAssistant: ";
      this.state.isAssistantSpeaking = true;
    }
    this.state.transcription += data.delta;
    
    // Mettre à jour le gestionnaire de vitesse avec le dernier texte
    if (this.speedManager && data.delta) {
      this.speedManager.updateLastAssistantText(this.state.currentResponseText + data.delta);
    }
  }

  /**
   * Fin de texte
   */
  handleTextCompleted() {
    this.state.isAssistantSpeaking = false;
    this.state.transcription += "\n";
    
    // Mettre à jour le dernier texte de l'assistant dans le gestionnaire de vitesse
    if (this.speedManager) {
      this.speedManager.updateLastAssistantText(this.state.currentResponseText);
    }
  }
}

