// Services/notificationService.js
import { callLogger } from "./logging/logger.js";

class NotificationService {
  constructor() {
    this.connections = new Set();
  }

  // Ajouter une connexion WebSocket
  addConnection(connection) {
    this.connections.add(connection);
    callLogger.info(null, "Nouvelle connexion notification ajoutée", {
      totalConnections: this.connections.size,
      connectionId: connection.id || "unknown",
    });
  }

  // Supprimer une connexion WebSocket
  removeConnection(connection) {
    this.connections.delete(connection);
    callLogger.info(null, "Connexion notification supprimée", {
      totalConnections: this.connections.size,
    });
  }

  // Envoyer une notification à tous les clients connectés
  sendNotification(type, data) {
    const notification = {
      type: "notification",
      notificationType: type,
      data: data,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    this.connections.forEach((connection) => {
      try {
        if (connection.readyState === 1) {
          // WebSocket.OPEN
          connection.send(JSON.stringify(notification));
          sentCount++;
        }
      } catch (error) {
        callLogger.error(null, "Erreur envoi notification", {
          error: error.message,
          connectionId: connection.id,
        });
      }
    });

    callLogger.info(null, "Notification envoyée", {
      type,
      sentCount,
      totalConnections: this.connections.size,
      notificationData: data,
    });

    return sentCount;
  }

  // Notification de fin d'appel IA
  notifyCallCompleted(callData) {
    const notificationData = {
      title: "🎉 Appel IA terminé",
      message: `Appel traité avec succès pour ${callData.nom || "Client"}`,
      details: {
        client: callData.nom || "Client inconnu",
        telephone: callData.telephone || "Non spécifié",
        type_demande: callData.type_demande || "Non spécifié",
        services: callData.services || "Non spécifié",
        description: callData.description || "Aucune description",
        duration: callData.duration || "N/A",
      },
      priority: "success",
    };

    return this.sendNotification("call_completed", notificationData);
  }

  // Notification d'erreur d'appel
  notifyCallError(error, callData = {}) {
    const notificationData = {
      title: "❌ Erreur appel IA",
      message: "Erreur lors du traitement de l'appel",
      details: {
        error: error.message || "Erreur inconnue",
        client: callData.nom || "Client inconnu",
        telephone: callData.telephone || "Non spécifié",
        timestamp: new Date().toISOString(),
      },
      priority: "error",
    };

    return this.sendNotification("call_error", notificationData);
  }

  // Notification de nouveau client
  notifyNewClient(clientData) {
    const notificationData = {
      title: "👤 Nouveau client",
      message: `Nouveau client ajouté : ${clientData.nom}`,
      details: {
        nom: clientData.nom,
        telephone: clientData.telephone,
        timestamp: new Date().toISOString(),
      },
      priority: "info",
    };

    return this.sendNotification("new_client", notificationData);
  }

  // Notification de statut mis à jour
  notifyStatusUpdate(callData) {
    const notificationData = {
      title: "🔄 Statut mis à jour",
      message: `Statut mis à jour pour ${callData.client?.nom || "Client"}`,
      details: {
        client: callData.client?.nom || "Client inconnu",
        oldStatus: callData.oldStatus,
        newStatus: callData.statut,
        timestamp: new Date().toISOString(),
      },
      priority: "info",
    };

    return this.sendNotification("status_update", notificationData);
  }

  // Notification d'appel en cours (quand quelqu'un téléphone)
  notifyCallInProgress(callData) {
    const notificationData = {
      title: "📞 Appel en cours",
      message: `Appel entrant de ${callData.caller || "Numéro inconnu"}`,
      details: {
        caller: callData.caller,
        timestamp: callData.timestamp || new Date().toISOString(),
        duration: callData.duration || "En cours...",
      },
      priority: "high",
    };

    return this.sendNotification("call_in_progress", notificationData);
  }

  // Nettoyer les connexions fermées
  cleanupConnections() {
    const initialCount = this.connections.size;
    this.connections.forEach((connection) => {
      if (connection.readyState !== 1) {
        // Pas WebSocket.OPEN
        this.connections.delete(connection);
      }
    });

    const removedCount = initialCount - this.connections.size;
    if (removedCount > 0) {
      callLogger.info(null, "Connexions notification nettoyées", {
        removedCount,
        remainingCount: this.connections.size,
      });
    }
  }
}

// Instance singleton
const notificationService = new NotificationService();

export default notificationService;
