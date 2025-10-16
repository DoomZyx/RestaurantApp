import { createContext, useContext, useEffect, useRef, useState } from "react";
import notificationService from "../Services/notificationService.js";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const callbacksRef = useRef({
    onNewCall: [],
    onNewOrder: [],
  });

  const connectWebSocket = () => {
    // Éviter les connexions multiples simultanées
    if (isConnectingRef.current) {
      console.log("⚠️ Connexion déjà en cours, abandon");
      return;
    }

    // Vérifier si une connexion existe déjà
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log("⚠️ WebSocket déjà connecté ou en cours de connexion");
      return;
    }

    try {
      isConnectingRef.current = true;
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws/notifications";
      
      console.log("🔌 Connexion au WebSocket centralisé:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connecté (centralisé)");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        notificationService.connectToWebSocket(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Message WebSocket reçu (centralisé):", data);

          if (data.type === "notification") {
            const { notificationType, data: notificationData } = data;

            // Ajouter le notificationType dans les données de notification
            const enrichedNotificationData = {
              ...notificationData,
              notificationType: notificationType
            };

            // Déclencher la notification système (son + desktop + UI)
            await notificationService.triggerSystemNotification(enrichedNotificationData);

            // Appeler les callbacks enregistrés
            switch (notificationType) {
              case "call_completed":
                console.log("📞 Nouvel appel détecté");
                callbacksRef.current.onNewCall.forEach(cb => cb(notificationData));
                if (notificationData.hasOrder) {
                  callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                }
                break;

              case "new_order":
                console.log("📋 Nouvelle commande détectée");
                callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                break;

              default:
                console.log("🔔 Notification reçue:", notificationType);
            }
          }

          if (data.type === "connected") {
            console.log("✅ Confirmation connexion WebSocket");
          }
        } catch (error) {
          console.error("❌ Erreur traitement message WebSocket:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket:", error);
        setIsConnected(false);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket déconnecté:", event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnexion dans ${delay / 1000}s... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        } else {
          console.error("❌ Nombre maximal de tentatives de reconnexion atteint");
        }
      };
    } catch (error) {
      console.error("❌ Erreur connexion WebSocket:", error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Fonction pour enregistrer un callback
  const subscribe = (type, callback) => {
    if (type === "call" && !callbacksRef.current.onNewCall.includes(callback)) {
      callbacksRef.current.onNewCall.push(callback);
    } else if (type === "order" && !callbacksRef.current.onNewOrder.includes(callback)) {
      callbacksRef.current.onNewOrder.push(callback);
    }

    // Retourner une fonction de désinscription
    return () => {
      if (type === "call") {
        callbacksRef.current.onNewCall = callbacksRef.current.onNewCall.filter(cb => cb !== callback);
      } else if (type === "order") {
        callbacksRef.current.onNewOrder = callbacksRef.current.onNewOrder.filter(cb => cb !== callback);
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket doit être utilisé dans un WebSocketProvider");
  }
  return context;
}

