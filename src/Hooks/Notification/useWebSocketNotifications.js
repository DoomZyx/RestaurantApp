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
      
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        
        // Connexion au service de notification
        notificationService.connectToWebSocket(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "notification") {
            const { notificationType, data: notificationData } = data;

            // Déclencher la notification système (son + desktop)
            await notificationService.triggerSystemNotification(notificationData);

            // Appeler les callbacks selon le type de notification
            switch (notificationType) {
              case "call_completed":
                if (onNewCall) {
                  onNewCall(notificationData);
                }
                if (notificationData.hasOrder && onNewOrder) {
                  onNewOrder(notificationData);
                }
                break;

              case "status_update":
                if (onNewCall) {
                  onNewCall(notificationData);
                }
                break;

              case "new_client":
                break;

              default:
            }
          }

          if (data.type === "connected") {
          }

          if (data.type === "pong") {
            // Réponse au ping (heartbeat)
          }
        } catch (error) {
        }
      };

      ws.onerror = (error) => {
      };

      ws.onclose = () => {
        wsRef.current = null;

        // Tentative de reconnexion
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, delay);
        } else {
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

