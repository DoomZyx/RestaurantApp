/**
 * Gestionnaire d'erreurs OpenAI
 * Gère les erreurs (error)
 */
export class ErrorHandler {
  constructor(streamSid, callLogger) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
  }

  /**
   * Gère les erreurs OpenAI
   * response_cancel_not_active : bénin (cancel envoyé alors que la réponse était déjà terminée/annulée)
   */
  handleError(data) {
    const code = data.error?.code;
    if (code === "response_cancel_not_active") {
      this.callLogger.debug(this.streamSid, "OpenAI: cancel ignoré (pas de réponse active)", {
        reason: data.error?.message
      });
      return;
    }
    console.error("ERREUR OPENAI:", JSON.stringify(data, null, 2));
    this.callLogger.error(this.streamSid, new Error(`OpenAI Error: ${data.error?.message || 'Unknown'}`), {
      errorType: data.error?.type,
      errorCode: data.error?.code,
      errorDetails: data.error
    });
  }
}

