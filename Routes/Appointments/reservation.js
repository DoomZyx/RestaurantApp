import {
  createReservation,
  getReservations,
  getTodayReservations,
  getReservationById,
  updateReservation,
  updateReservationStatus,
  deleteReservation,
  checkAvailability as checkReservationAvailability,
  getAvailableSlots as getReservationAvailableSlots,
  createReservationFromAI,
} from "../../Controller/reservationController.js";

export default async function reservationRoutes(fastify, options) {
  fastify.post("/reservations", {
    schema: {
      body: {
        type: "object",
        required: ["date", "heure"],
        properties: {
          nom: { type: "string" },
          telephone: { type: "string" },
          date: { type: "string", format: "date" },
          heure: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          description: { type: "string", maxLength: 500 },
          nombrePersonnes: { type: "integer", minimum: 1, maximum: 100 },
          notes_internes: { type: "string", maxLength: 1000 },
          statut: {
            type: "string",
            enum: ["planifie", "confirme", "en_cours", "termine", "annule", "reporte"],
          },
          createdBy: { type: "string", enum: ["manual", "calendly", "system"] },
        },
      },
    },
    handler: createReservation,
  });

  fastify.get("/reservations", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          date: { type: "string", format: "date" },
          statut: {
            type: "string",
            enum: ["planifie", "confirme", "en_cours", "termine", "annule", "reporte"],
          },
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
    handler: getReservations,
  });

  fastify.get("/reservations/today", getTodayReservations);

  fastify.get("/reservations/availability", {
    schema: {
      querystring: {
        type: "object",
        required: ["date", "heure", "duree"],
        properties: {
          date: { type: "string", format: "date" },
          heure: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          duree: { type: "integer", minimum: 30, maximum: 180 },
        },
      },
    },
    handler: checkReservationAvailability,
  });

  fastify.get("/reservations/ai/available-slots", {
    schema: {
      querystring: {
        type: "object",
        required: ["date"],
        properties: {
          date: { type: "string", format: "date" },
        },
      },
    },
    handler: getReservationAvailableSlots,
  });

  fastify.get("/reservations/:id", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
    },
    handler: getReservationById,
  });

  fastify.put("/reservations/:id", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          nom: { type: "string" },
          telephone: { type: "string" },
          date: { type: "string", format: "date" },
          heure: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          description: { type: "string", maxLength: 500 },
          nombrePersonnes: { type: "integer", minimum: 1, maximum: 100 },
          notes_internes: { type: "string", maxLength: 1000 },
          statut: {
            type: "string",
            enum: ["planifie", "confirme", "en_cours", "termine", "annule", "reporte"],
          },
        },
      },
    },
    handler: updateReservation,
  });

  fastify.patch("/reservations/:id/status", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          statut: {
            type: "string",
            enum: ["planifie", "confirme", "en_cours", "termine", "annule", "reporte"],
          },
        },
        required: ["statut"],
      },
    },
    handler: updateReservationStatus,
  });

  fastify.delete("/reservations/:id", deleteReservation);

  fastify.post("/reservations/ai/create", {
    schema: {
      body: {
        type: "object",
        required: ["telephone", "date", "time"],
        properties: {
          telephone: { type: "string", minLength: 1 },
          date: { type: "string", minLength: 1 },
          time: { type: "string", minLength: 1 },
          name: { type: "string" },
          description: { type: "string", maxLength: 500 },
          nombrePersonnes: { type: "integer", minimum: 1, maximum: 100 },
          notes_internes: { type: "string", maxLength: 1000 },
        },
      },
    },
    handler: createReservationFromAI,
  });
}
