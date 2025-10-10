import {
  saveCallData,
  getCalls,
  getCallsByDate,
  getCallById,
  getCallsByExactDate,
  updateClient,
  updateCallStatus,
  deleteCall,
  getClients,
  getClientHistory,
  createClient,
  unifiedSearch,
} from "../../Controller/callData.js";

// Récupere les données d'un appel
export default async function callDataRoutes(fastify, options) {
  fastify.post("/callsdata", async (request, reply) => {
    try {
      const saved = await saveCallData(request.body);
      return reply.code(201).send({ success: true, data: saved });
    } catch (err) {
      console.error("Erreur sauvegarde appel:", err);
      return reply
        .code(500)
        .send({ error: "Erreur interne lors de la sauvegarde" });
    }
  });
  // Renvoie la liste des tous les appels
  fastify.get("/calls", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 1000 },
        },
      },
    },
    handler: getCalls,
  });

  // Liste des dates avec nombre d'appels
  fastify.get("/calls/dates", getCallsByDate);

  // Liste la liste des appels pour une date précise
  fastify.get("/calls/dates/:dates", getCallsByExactDate);

  // Récupérer tous les clients
  fastify.get("/clients", getClients);

  // Créer un nouveau client
  fastify.post("/clients", {
    schema: {
      body: {
        type: "object",
        properties: {
          prenom: { type: "string", minLength: 1 },
          nom: { type: "string", minLength: 1 },
          telephone: { type: "string", minLength: 10 },
          email: { type: "string", format: "email" },
          adresse: { type: "string" },
          entrepriseName: { type: "string" },
        },
        required: ["prenom", "nom", "telephone"],
      },
    },
    handler: createClient,
  });

  // Récupérer l'historique d'un client
  fastify.get("/clients/:id/history", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
    },
    handler: getClientHistory,
  });

  // Supprimer un appel (doit être avant les routes avec :id pour éviter les conflits)
  fastify.delete("/calls/:id", deleteCall);

  // Mise à jour du statut d'un appel
  fastify.patch("/calls/:id/status", {
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
            enum: ["nouveau", "en_cours", "termine", "annule"],
          },
        },
        required: ["statut"],
      },
    },
    handler: updateCallStatus,
  });

  // Détail d'un appel par ID (doit être en dernier)
  fastify.get("/calls/:id", {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 24, maxLength: 24 },
        },
        required: ["id"],
      },
    },
    handler: getCallById,
  });

  // Mettre à jour les informations d'un client via l'ID de l'appel
  fastify.put("/calls/:id/client", {
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
          email: { type: "string" },
          adresse: { type: "string" },
          entrepriseName: { type: "string" },
          type_demande: {
            type: "string",
            enum: [
              "Support technique",
              "Information produit",
              "Réclamation",
              "Commande",
              "Facturation",
              "Devis",
              "Autre",
            ],
          },
          services: {
            type: "string",
            enum: [
              "Site web",
              "Logo",
              "Design graphique",
              "Marketing digital",
              "Maintenance",
              "Formation",
              "Consultation",
              "Autre",
            ],
          },
          description: { type: "string" },
        },
      },
    },
    handler: updateClient,
  });

  // Route de recherche unifiée
  fastify.get("/search", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2 },
        },
        required: ["query"],
      },
    },
    handler: unifiedSearch,
  });
}
