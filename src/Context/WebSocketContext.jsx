import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import notificationService from "../Services/notificationService.js";

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
  const wsRef = useRef(null);
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
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
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
          const data = JSON.parse(event.data);

          if (data.type === "notification") {
            const { notificationType, data: notificationData } = data;
            const enrichedNotificationData = {
              ...notificationData,
              notificationType: notificationType
            };
            await notificationService.triggerSystemNotification(enrichedNotificationData);

            switch (notificationType) {
              case "call_completed":
                callbacksRef.current.onNewCall.forEach(cb => cb(notificationData));
                if (notificationData.hasOrder) {
                  callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                }
                break;
              case "new_order":
                callbacksRef.current.onNewOrder.forEach(cb => cb(notificationData));
                break;
              default:
                break;
            }
          }
        } catch (error) {
          setLastError(error.message || "Erreur traitement message");
          if (import.meta.env.DEV) {
            console.warn("[WebSocket] onmessage parse error:", error);
          }
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        isConnectingRef.current = false;
        setLastError("Erreur de connexion WebSocket");
        if (import.meta.env.DEV) {
          console.warn("[WebSocket] connection error");
        }
      };

      ws.onclose = (event) => {
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
      if (import.meta.env.DEV) {
        console.warn("[WebSocket] connect error:", error);
      }
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

  const subscribe = (type, callback) => {
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
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastError, subscribe, reconnect }}>
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
