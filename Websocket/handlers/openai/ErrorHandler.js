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
   */
  handleError(data) {
    console.error("ERREUR OPENAI:", JSON.stringify(data, null, 2));
    this.callLogger.error(this.streamSid, new Error(`OpenAI Error: ${data.error?.message || 'Unknown'}`), {
      errorType: data.error?.type,
      errorCode: data.error?.code,
      errorDetails: data.error
    });
  }
}

