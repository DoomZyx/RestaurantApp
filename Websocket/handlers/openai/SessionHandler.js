/**
 * Gestionnaire de session OpenAI
 * Gère les événements liés à la session (session.updated)
 */
export class SessionHandler {
  constructor(streamSid, callLogger, openAiWs, state) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.openAiWs = openAiWs;
    this.state = state; // Référence à l'état partagé
  }

  /**
   * Gère la mise à jour de session (déclenche la salutation initiale)
   */
  handleSessionUpdated(data) {
    if (!this.state.initialGreetingSent && this.openAiWs && this.openAiWs.readyState === 1) {
      this.state.initialGreetingSent = true;
      
      this.callLogger.info(this.streamSid, "🎤 Envoi de la salutation automatique");
      
      // Forcer une réponse de l'assistant sans attendre l'utilisateur
      this.openAiWs.send(JSON.stringify({
        type: "response.create"
      }));
    }
  }
}

