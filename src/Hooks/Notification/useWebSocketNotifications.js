import { useEffect, useRef, useCallback } from "react";
import notificationService from "../../Services/notificationService";

/**
 * Hook pour écouter les notifications WebSocket en temps réel
 * @param {Function} onNewCall - Callback appelé quand un nouvel appel arrive
 * @param {Function} onNewOrder - Callback appelé quand une nouvelle commande arrive
 */
export function useWebSocketNotifications(onNewCall, onNewOrder) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    try {
      // URL du WebSocket depuis les variables d'environnement
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws/notifications";
      
      console.log("🔌 Tentative de connexion au WebSocket:", wsUrl);
      console.log("📋 Variables d'environnement:", import.meta.env);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connecté");
        reconnectAttemptsRef.current = 0;
        
        // Connexion au service de notification
        notificationService.connectToWebSocket(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Message WebSocket reçu:", data);

          if (data.type === "notification") {
            const { notificationType, data: notificationData } = data;

            // Déclencher la notification système (son + desktop)
            await notificationService.triggerSystemNotification(notificationData);

            // Appeler les callbacks selon le type de notification
            switch (notificationType) {
              case "call_completed":
                console.log("📞 Nouvel appel détecté, rafraîchissement...");
                if (onNewCall) {
                  onNewCall(notificationData);
                }
                if (notificationData.hasOrder && onNewOrder) {
                  onNewOrder(notificationData);
                }
                break;

              case "status_update":
                console.log("🔄 Statut mis à jour, rafraîchissement...");
                if (onNewCall) {
                  onNewCall(notificationData);
                }
                break;

              case "new_client":
                console.log("👤 Nouveau client détecté");
                break;

              default:
                console.log("🔔 Notification reçue:", notificationType);
            }
          }

          if (data.type === "connected") {
            console.log("✅ Confirmation connexion WebSocket");
          }

          if (data.type === "pong") {
            // Réponse au ping (heartbeat)
          }
        } catch (error) {
          console.error("❌ Erreur traitement message WebSocket:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket:", error);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket déconnecté");
        wsRef.current = null;

        // Tentative de reconnexion
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnexion dans ${delay}ms... (tentative ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else {
          console.error("❌ Nombre maximum de tentatives de reconnexion atteint");
        }
      };

      // Envoyer un ping toutes les 30 secondes pour maintenir la connexion
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      // Stocker l'interval pour le nettoyage
      ws.pingInterval = pingInterval;

    } catch (error) {
      console.error("❌ Erreur connexion WebSocket:", error);
    }
  }, [onNewCall, onNewOrder]);

  useEffect(() => {
    // Initialiser le service de notification
    notificationService.initialize();

    // Connecter au WebSocket
    connectWebSocket();

    // Cleanup
    return () => {
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connectWebSocket,
  };
}

