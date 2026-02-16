/** Timestamp ISO pour logs barge-in (diagnostic temps réel) */
const ts = () => new Date().toISOString();

/**
 * Gestionnaire audio OpenAI
 * Gère les événements audio (response.audio.delta)
 */
export class AudioHandler {
  constructor(streamSid, connection, state) {
    this.streamSid = streamSid;
    this.connection = connection;
    this.state = state; // Référence à l'état partagé
  }

  /**
   * Réception d'audio delta depuis OpenAI
   * AUDIO GATE : Si isInterrupted = true, on bloque tous les chunks audio
   */
  handleAudioDelta(data) {
    if (this.state.isInterrupted) {
      // Audio bloqué par barge-in - ne pas envoyer à Twilio
      if (!this.state._audioSuppressedLogged) {
        this.state._audioSuppressedLogged = true;
        console.log(ts(), "🚫 [TWILIO] audio suppressed (isInterrupted) - barge-in actif");
      }
      return;
    }
    
    if (data.delta) {
      // Marquer le timestamp du dernier audio pour le fallback barge-in
      this.state._lastAudioDeltaTime = Date.now();
      
      if (!this.state._audioDeltaLogged) {
        this.state._audioDeltaLogged = true;
        console.log(ts(), "🔊 [OPENAI] response.audio.delta (streaming) - premier chunk", {
          isAssistantSpeaking: this.state.isAssistantSpeaking,
          currentResponseId: this.state.currentResponseId,
          note: "Audio streaming - isAssistantSpeaking doit être true pour barge-in"
        });
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
}

