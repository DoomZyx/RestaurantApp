import { CallMinutesController } from "../../API/controllers/CallMinutesController.js";

export default async function callMinutesRoutes(fastify) {
  fastify.get("/call-minutes/active", {
    schema: {
      tags: ["CallMinutes"],
      summary: "Appel en cours avec compteur temps réel (secondes, minutes)",
      querystring: {
        type: "object",
        properties: { clientId: { type: "string" } }
      },
      response: {
        200: {
          type: "object",
          properties: {
            active: { type: "boolean" },
            callSid: { type: "string" },
            startedAt: { type: "string" },
            elapsedSeconds: { type: "number" },
            elapsedMinutes: { type: "number" },
            callerNumber: { type: ["string", "null"] },
            calls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  callSid: { type: "string" },
                  startedAt: { type: "string" },
                  elapsedSeconds: { type: "number" },
                  elapsedMinutes: { type: "number" },
                  callerNumber: { type: ["string", "null"] }
                }
              }
            }
          }
        }
      }
    }
  }, CallMinutesController.getActiveWithElapsed);

  fastify.get("/call-minutes/quota", {
    schema: {
      tags: ["CallMinutes"],
      summary: "Quota du client (abonnement, minutes utilisées, max)",
      querystring: {
        type: "object",
        properties: { clientId: { type: "string" } }
      },
      response: { 200: { type: "object" } }
    }
  }, CallMinutesController.getQuota);

  fastify.get("/call-minutes/monitoring", {
    schema: {
      tags: ["CallMinutes"],
      summary: "Liste des appels (monitoring : durée, numéro appelant)",
      querystring: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          limit: { type: "integer" },
          skip: { type: "integer" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            calls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  clientId: { type: "string" },
                  callSid: { type: "string" },
                  callerNumber: { type: ["string", "null"] },
                  startedAt: { type: "string" },
                  endedAt: { type: ["string", "null"] },
                  durationSeconds: { type: ["number", "null"] }
                }
              }
            }
          }
        }
      }
    }
  }, CallMinutesController.getMonitoring);
}
