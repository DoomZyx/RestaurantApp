/**
 * Gestionnaire des messages Twilio
 * Traite les événements du WebSocket Twilio (start, stop, media, mark)
 */
export class TwilioHandler {
  constructor(streamSid, callLogger, onTranscriptionComplete) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.onTranscriptionComplete = onTranscriptionComplete;
  }

  /**
   * Point d'entrée pour tous les messages Twilio
   * @param {Object} data - Message reçu de Twilio
   */
  handleMessage(data) {
    switch (data.event) {
      case "media":
        // Géré dans la fonction principale (connection.js)
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

  /**
   * Gère l'événement START (début de l'appel)
   * @param {Object} data - Données de l'événement start
   */
  handleStart(data) {
    this.streamSid = data.start.streamSid;
    this.callLogger.callStarted(this.streamSid, {
      callerInfo: data.start,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Gère l'événement MARK (marqueurs personnalisés)
   * @param {Object} data - Données de l'événement mark
   */
  handleMark(data) {
    if (data.mark.name === "end_call") {
      this.onTranscriptionComplete();
    }
  }

  /**
   * Gère l'événement STOP (fin de l'appel)
   */
  handleStop() {
    this.callLogger.info(
      this.streamSid,
      "Événement stop détecté - fin d'appel"
    );
    this.onTranscriptionComplete();
  }
}

