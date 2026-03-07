import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import notificationService from "../Services/notificationService.js";

console.log("[WS] Module WebSocketContext charge");
const WebSocketContext = createContext(null);

const PING_INTERVAL_MS = 25000;

/**
 * Construit l'URL WebSocket : utilise VITE_WS_URL ou déduit ws/wss depuis VITE_API_URL.
 */
function getWebSocketUrl() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit && typeof explicit === "string" && explicit.trim()) {
    return explicit.trim();
  }
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/";
  const base = apiUrl.replace(/\/$/, "");
  if (base.startsWith("https://")) {
    return base.replace(/^https:\/\//, "wss://") + "/ws/notifications";
  }
  return base.replace(/^http:\/\//, "ws://") + "/ws/notifications";
}

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastOrderNotificationAt, setLastOrderNotificationAt] = useState(null);
  const wsRef = useRef(null);
  const hasLoggedMount = useRef(false);
  if (!hasLoggedMount.current) {
    hasLoggedMount.current = true;
    console.log("[WS] WebSocketProvider monte");
  }
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const pingIntervalRef = useRef(null);
  const callbacksRef = useRef({
    onNewCall: [],
    onNewOrder: [],
  });

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current) {
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    setLastError(null);

    try {
      isConnectingRef.current = true;
      const wsUrl = getWebSocketUrl();
      console.log("[WS] Connexion:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connecte");
        setIsConnected(true);
        setLastError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        notificationService.connectToWebSocket(ws);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = async (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data?.toString?.();
          if (!raw) return;
          const data = JSON.parse(raw);

          if (data.type === "connected") {
            console.log("[WS] Message serveur: connected");
            return;
          }

          if (data.type === "notification") {
            const notificationType = data.notificationType ?? data.type;
            const notificationData = data.data != null ? data.data : data;
            console.log("[WS] Notification recue:", notificationType, notificationData?.title ?? "(sans titre)");

            // 1. Toujours afficher la notif dans la cloche, peu importe la page
            const enrichedNotificationData = {
              ...notificationData,
              notificationType,
            };
            await notificationService.triggerSystemNotification(enrichedNotificationData);

            // 2. Declencher refetch listes (commandes / reservations) si nouvelle commande ou resa
            const hasOrderOrResa = notificationData.hasOrder === true || (notificationData.details?.orderId != null);
            const onCallCount = callbacksRef.current.onNewCall.length;
            const onOrderCount = callbacksRef.current.onNewOrder.length;
            console.log("[WS] Callbacks: onNewCall=" + onCallCount + ", onNewOrder=" + onOrderCount);

            if (notificationType === "call_completed" && hasOrderOrResa) {
              setLastOrderNotificationAt(Date.now());
            } else if (notificationType === "new_order" || notificationType === "new_reservation") {
              setLastOrderNotificationAt(Date.now());
            }

            switch (notificationType) {
              case "call_completed":
                callbacksRef.current.onNewCall.forEach(cb => cb(notificationData));
                if (hasOrderOrResa) {
                  callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                }
                break;
              case "new_order":
              case "new_reservation":
                callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                break;
              default:
                break;
            }
          }
        } catch (error) {
          setLastError(error.message || "Erreur traitement message");
          console.warn("[WS] onmessage parse error:", error);
        }
      };

      ws.onerror = () => {
        console.warn("[WS] Erreur connexion");
        setIsConnected(false);
        isConnectingRef.current = false;
        setLastError("Erreur de connexion WebSocket");
      };

      ws.onclose = (event) => {
        console.log("[WS] Ferme code=" + event.code + " wasClean=" + event.wasClean);
        setIsConnected(false);
        isConnectingRef.current = false;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (event.code !== 1000 && !event.wasClean) {
          setLastError(`Connexion fermée (code ${event.code})`);
        }

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      };
    } catch (error) {
      setIsConnected(false);
      isConnectingRef.current = false;
      setLastError(error.message || "Impossible de se connecter");
      console.warn("[WS] connect error:", error);
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setLastError(null);
    connectWebSocket();
  }, [connectWebSocket]);

  useEffect(() => {
    console.log("[WS] useEffect connectWebSocket");
    connectWebSocket();
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  const subscribe = useCallback((type, callback) => {
    if (type === "call" && !callbacksRef.current.onNewCall.includes(callback)) {
      callbacksRef.current.onNewCall.push(callback);
    } else if (type === "order" && !callbacksRef.current.onNewOrder.includes(callback)) {
      callbacksRef.current.onNewOrder.push(callback);
    }
    return () => {
      if (type === "call") {
        callbacksRef.current.onNewCall = callbacksRef.current.onNewCall.filter(cb => cb !== callback);
      } else if (type === "order") {
        callbacksRef.current.onNewOrder = callbacksRef.current.onNewOrder.filter(cb => cb !== callback);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastError, subscribe, reconnect, lastOrderNotificationAt }}>
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
