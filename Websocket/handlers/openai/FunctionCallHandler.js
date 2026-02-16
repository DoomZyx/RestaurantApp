import { FunctionCallService } from "../../services/FunctionCallService.js";

/**
 * Gestionnaire de function calls OpenAI
 * Gère les événements de function calls (response.function_call_arguments.delta, done)
 */
export class FunctionCallHandler {
  constructor(streamSid, callLogger, openAiWs, state) {
    this.streamSid = streamSid;
    this.callLogger = callLogger;
    this.openAiWs = openAiWs;
    this.state = state; // Référence à l'état partagé
  }

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
        context: "function_call_execution",
      });
    }
  }
}

