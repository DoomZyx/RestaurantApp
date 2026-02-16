/**
 * Gestionnaire de transcription OpenAI
 * Gère les événements de transcription (response.audio_transcript.delta, response.text.delta, conversation.item.input_audio_transcription.completed)
 */
export class TranscriptionHandler {
  constructor(streamSid, callLogger, state) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.state = state; // Référence à l'état partagé
  }

  /**
   * Réception d'un delta de transcription audio (assistant)
   */
  async handleAudioTranscriptDelta(data) {
    if (data.delta) {
      this.state.currentResponseText += data.delta;
    }
  }

  /**
   * Réception de transcription utilisateur
   */
  handleUserTranscription(data) {
    if (data.transcript) {
      this.state.transcription += `\nClient: ${data.transcript}`;
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
    if (!this.state.isAssistantSpeaking) {
      this.state.transcription += "\nAssistant: ";
      this.state.isAssistantSpeaking = true;
    }
    this.state.transcription += data.delta;
  }

  /**
   * Fin de texte
   */
  handleTextCompleted() {
    this.state.isAssistantSpeaking = false;
    this.state.transcription += "\n";
  }
}

