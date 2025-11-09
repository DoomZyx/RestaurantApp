import {
  createOrder,
  getOrders,
  getTodayOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  checkAvailability,
  getAvailableSlots,
  createOrderFromAI,
} from "../../Controller/orderController.js";

export default async function orderRoutes(fastify, options) {
  // Créer un nouveau rendez-vous
  fastify.post("/orders", {
    schema: {
      body: {
        type: "object",
        required: ["date", "heure", "type"],
        properties: {
          // Client optionnel: soit client (ObjectId), soit nom (String)
          client: { type: "string", minLength: 24, maxLength: 24 },
          nom: { type: "string", minLength: 1, maxLength: 120 },
          date: { type: "string", format: "date" },
          heure: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          duree: { type: "integer", minimum: 30, maximum: 180 },
          type: {
            type: "string",
            enum: [
              "Commande à emporter",
              "Livraison à domicile",
              "Réservation de table",
              "Dégustation",
              "Événement privé"
            ],
          },
          modalite: {
            type: "string",
            enum: ["Sur place", "À emporter", "Livraison"],
          },
          nombrePersonnes: { type: "integer", minimum: 1, maximum: 100 },
          description: { type: "string", maxLength: 500 },
          notes_internes: { type: "string", maxLength: 1000 },
          related_call: { type: "string", minLength: 24, maxLength: 24 },
          // Commandes (pour les commandes à emporter)
          commandes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                produitId: { type: "string" },
                nom: { type: "string" },
                categorie: { type: "string" },
                quantite: { type: "integer", minimum: 1 },
                prixUnitaire: { type: "number" },
                supplements: { type: "string", maxLength: 200 }
              }
            }
          }
        },
      },
    },
    handler: createOrder,
  });

  // Récupérer tous les rendez-vous avec filtres et pagination
  fastify.get("/orders", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          date: { type: "string", format: "date" },
          statut: {
            type: "string",
            enum: [
              "planifie",
              "confirme",
              "en_cours",
              "termine",
              "annule",
              "reporte",
            ],
          },
          type: {
            type: "string",
            enum: [
              "Commande à emporter",
              "Livraison à domicile",
              "Réservation de table",
              "Dégustation",
              "Événement privé"
            ],
          },
          modalite: {
            type: "string",
            enum: ["Sur place", "À emporter", "Livraison"],
          },
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
    handler: getOrders,
  });

  // Récupérer les rendez-vous du jour (pour le widget homepage)
  fastify.get("/orders/today", getTodayOrders);

  // Vérifier la disponibilité d'un créneau
  fastify.get("/orders/availability", {
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
    handler: checkAvailability,
  });

  // Récupérer un rendez-vous par ID (doit être après les routes spécifiques)
  fastify.get("/orders/:id", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
    },
    handler: getOrderById,
  });

  // Mettre à jour un rendez-vous complet
  fastify.put("/orders/:id", {
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
          date: { type: "string", format: "date" },
          heure: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          duree: { type: "integer", minimum: 30, maximum: 180 },
          type: {
            type: "string",
            enum: [
              "Commande à emporter",
              "Livraison à domicile",
              "Réservation de table",
              "Dégustation",
              "Événement privé"
            ],
          },
          modalite: {
            type: "string",
            enum: ["Sur place", "À emporter", "Livraison"],
          },
          nombrePersonnes: { type: "integer", minimum: 1, maximum: 100 },
          description: { type: "string", maxLength: 500 },
          notes_internes: { type: "string", maxLength: 1000 },
          statut: {
            type: "string",
            enum: [
              "planifie",
              "confirme",
              "en_cours",
              "termine",
              "annule",
              "reporte",
            ],
          },
        },
      },
    },
    handler: updateOrder,
  });

  // Mettre à jour seulement le statut d'un rendez-vous
  fastify.patch("/orders/:id/status", {
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
            enum: [
              "planifie",
              "confirme",
              "en_cours",
              "termine",
              "annule",
              "reporte",
            ],
          },
        },
        required: ["statut"],
      },
    },
    handler: updateOrderStatus,
  });

  // Supprimer un rendez-vous
  fastify.delete("/orders/:id", deleteOrder);

  // Routes spéciales pour l'IA

  // Récupérer les créneaux disponibles (pour l'IA)
  fastify.get("/orders/ai/available-slots", {
    schema: {
      querystring: {
        type: "object",
        required: ["date"],
        properties: {
          date: { type: "string", format: "date" },
        },
      },
    },
    handler: getAvailableSlots,
  });

  // Créer un rendez-vous depuis l'IA
  fastify.post("/orders/ai/create", {
    schema: {
      body: {
        type: "object",
        required: ["clientPhone", "date", "time"],
        properties: {
          clientPhone: { type: "string", minLength: 10 },
          date: { type: "string", format: "date" },
          time: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          },
          duration: { type: "integer", minimum: 30, maximum: 180 },
          type: {
            type: "string",
            enum: [
              "Commande à emporter",
              "Livraison à domicile",
              "Réservation de table",
              "Dégustation",
              "Événement privé"
            ],
          },
          description: { type: "string", maxLength: 500 },
        },
      },
    },
    handler: createOrderFromAI,
  });
}
