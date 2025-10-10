// Routes/Ws/notifications.js
import notificationService from "../../Services/notificationService.js";
import { callLogger } from "../../Services/logging/logger.js";

export default async function notificationRoutes(fastify, options) {
  fastify.get("/ws/notifications", { websocket: true }, (connection, req) => {
    // Ajouter la connexion au service de notification
    notificationService.addConnection(connection);

    // Gérer les messages reçus (optionnel, pour les commandes)
    connection.socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "ping") {
          connection.socket.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        callLogger.error(null, "Erreur parsing message notification", {
          error: error.message,
        });
      }
    });

    // Gérer la fermeture de connexion
    connection.socket.on("close", () => {
      notificationService.removeConnection(connection);
    });

    // Envoyer un message de confirmation
    connection.socket.send(
      JSON.stringify({
        type: "connected",
        message: "Connexion notification établie",
        timestamp: new Date().toISOString(),
      })
    );

    callLogger.info(null, "Connexion notification WebSocket établie", {
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
  });

  // Route pour envoyer une notification de test (admin seulement)
  fastify.post("/api/notifications/test", async (request, reply) => {
    try {
      const { type = "call_completed", data = {} } = request.body;

      let sentCount = 0;
      switch (type) {
        case "call_completed":
          sentCount = notificationService.notifyCallCompleted(data);
          break;
        case "call_error":
          sentCount = notificationService.notifyCallError(
            new Error(data.error || "Erreur de test"),
            data
          );
          break;
        case "new_client":
          sentCount = notificationService.notifyNewClient(data);
          break;
        case "status_update":
          sentCount = notificationService.notifyStatusUpdate(data);
          break;
        default:
          sentCount = notificationService.sendNotification(type, data);
      }

      return reply.send({
        success: true,
        message: "Notification de test envoyée",
        sentCount,
        type,
      });
    } catch (error) {
      callLogger.error(null, "Erreur envoi notification test", {
        error: error.message,
      });

      return reply.code(500).send({
        success: false,
        error: "Erreur lors de l'envoi de la notification",
        details: error.message,
      });
    }
  });

  // Route simple pour tester les connexions
  fastify.get("/api/notifications/status", async (request, reply) => {
    return reply.send({
      success: true,
      connections: notificationService.connections.size,
      message: `Connexions actives: ${notificationService.connections.size}`,
    });
  });
}
