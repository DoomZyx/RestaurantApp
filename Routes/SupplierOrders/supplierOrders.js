import {
  createSupplierOrder,
  getSupplierOrder,
  getSupplierOrders,
  getAllSupplierOrders,
  updateSupplierOrder,
  deleteSupplierOrder
} from "../../Controller/supplierOrderController.js";
import { generateTwiML, updateCallStatus } from "../../Services/supplierCallService.js";
import { handleSupplierCallConnection } from "../../Connection/supplierCallConnection.js";

/**
 * Routes publiques pour webhooks Twilio et WebSocket
 * @param {FastifyInstance} fastify
 */
export async function supplierOrderPublicRoutes(fastify) {
  
  // ============= WEBHOOKS TWILIO (PUBLICS) =============

  /**
   * POST /supplier-call/:orderId
   * Webhook Twilio pour fournir le TwiML qui connecte au WebSocket
   */
  fastify.post("/supplier-call/:orderId", async (request, reply) => {
    const { orderId } = request.params;
    const publicHost = process.env.PUBLIC_HOST || request.headers.host;


    const twiml = generateTwiML(orderId, publicHost);

    reply
      .type("text/xml")
      .send(twiml);
  });

  /**
   * GET /supplier-call/:orderId
   * Même chose en GET (Twilio peut parfois utiliser GET)
   */
  fastify.get("/supplier-call/:orderId", async (request, reply) => {
    const { orderId } = request.params;
    const publicHost = process.env.PUBLIC_HOST || request.headers.host;


    const twiml = generateTwiML(orderId, publicHost);

    reply
      .type("text/xml")
      .send(twiml);
  });

  /**
   * POST /supplier-call-status/:orderId
   * Webhook pour recevoir les mises à jour de statut de l'appel
   */
  fastify.post("/supplier-call-status/:orderId", async (request, reply) => {
    const { orderId } = request.params;
    const callStatus = request.body;


    await updateCallStatus(orderId, callStatus);

    reply.send({ success: true });
  });

  // ============= WEBSOCKET POUR STREAM AUDIO =============

  /**
   * WebSocket /supplier-stream/:orderId
   * Stream audio bidirectionnel entre Twilio et OpenAI
   */
  fastify.get("/supplier-stream/:orderId", { websocket: true }, (connection, request) => {
    const { orderId } = request.params;

    handleSupplierCallConnection(connection, orderId);
  });
}

/**
 * Routes API protégées pour les commandes fournisseurs
 * @param {FastifyInstance} fastify
 */
export async function supplierOrderProtectedRoutes(fastify) {
  
  // ============= ROUTES API PROTÉGÉES =============
  
  /**
   * POST /api/supplier-orders
   * Créer une commande et initier l'appel au fournisseur
   */
  fastify.post("/supplier-orders", {
    schema: {
      body: {
        type: "object",
        required: ["fournisseur", "ingredients"],
        properties: {
          fournisseur: {
            type: "object",
            required: ["id", "nom", "telephone"],
            properties: {
              id: { type: "string" },
              nom: { type: "string" },
              telephone: { type: "string" },
              email: { type: "string" }
            }
          },
          ingredients: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["nom", "quantite", "unite"],
              properties: {
                nom: { type: "string" },
                quantite: { type: "number" },
                unite: { type: "string" }
              }
            }
          }
        }
      }
    }
  }, createSupplierOrder);

  /**
   * GET /api/supplier-orders/:orderId
   * Récupérer une commande spécifique
   */
  fastify.get("/supplier-orders/:orderId", getSupplierOrder);

  /**
   * GET /api/supplier-orders/fournisseur/:fournisseurId
   * Récupérer toutes les commandes d'un fournisseur
   */
  fastify.get("/supplier-orders/fournisseur/:fournisseurId", getSupplierOrders);

  /**
   * GET /api/supplier-orders
   * Récupérer toutes les commandes (avec filtres)
   */
  fastify.get("/supplier-orders", getAllSupplierOrders);

  /**
   * PUT /api/supplier-orders/:orderId
   * Mettre à jour une commande
   */
  fastify.put("/supplier-orders/:orderId", updateSupplierOrder);

  /**
   * DELETE /api/supplier-orders/:orderId
   * Supprimer une commande
   */
  fastify.delete("/supplier-orders/:orderId", deleteSupplierOrder);
}

// Export par défaut de la fonction publique pour la rétrocompatibilité
export default supplierOrderPublicRoutes;

