import { useState, useEffect, useRef } from "react";
import notificationService from "../../Services/notificationService.js";
import "./NotificationCenter.scss";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Connexion WebSocket
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket("ws://localhost:8080/ws/notifications");
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        // Connecter le service de notification au WebSocket
        notificationService.connectToWebSocket(ws);

        // Test de connexion - envoyer un ping
        setTimeout(() => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "notification") {
            addNotification(data.data);

            // Déclencher aussi la notification système
            notificationService.triggerSystemNotification(data.data);
          } else if (data.type === "connected") {
          } else if (data.type === "pong") {
            // Ping/pong pour maintenir la connexion
          }
        } catch (error) {
          console.error("Erreur parsing notification:", error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Reconnexion automatique
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error("Erreur WebSocket notification:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Erreur connexion WebSocket:", error);
      setIsConnected(false);
    }
  };

  // Ajouter une notification
  const addNotification = (notificationData) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      ...notificationData,
      timestamp: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]); // Garder max 10 notifications

    // Auto-suppression après 10 secondes
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 10000);
  };

  // Supprimer une notification
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  // Obtenir l'icône selon le type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "call_completed":
        return "bi-telephone-check";
      case "call_error":
        return "bi-telephone-x";
      case "new_client":
        return "bi-person-plus";
      case "status_update":
        return "bi-arrow-repeat";
      default:
        return "bi-bell";
    }
  };

  // Obtenir la classe CSS selon la priorité
  const getNotificationClass = (priority) => {
    switch (priority) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  };

  // Formater la durée
  const formatDuration = (duration) => {
    if (!duration) return "";
    const match = duration.match(/(\d+)ms/);
    if (match) {
      const ms = parseInt(match[1]);
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return duration;
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

  return (
    <div className="notification-center">
      {/* Bouton de notification */}
      <button
        className="notification-toggle"
        onClick={() => setShowNotifications(!showNotifications)}
        title={
          isConnected ? "Notifications actives" : "Notifications déconnectées"
        }
      >
        <i
          className={`bi ${isConnected ? "bi-bell-fill" : "bi-bell-slash"}`}
        ></i>
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>

      {/* Panneau de notifications */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button
              className="close-btn"
              onClick={() => setShowNotifications(false)}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <i className="bi bi-bell-slash"></i>
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationClass(
                    notification.priority
                  )}`}
                >
                  <div className="notification-icon">
                    <i
                      className={`bi ${getNotificationIcon(
                        notification.notificationType
                      )}`}
                    ></i>
                  </div>

                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>

                    {notification.details && (
                      <div className="notification-details">
                        {notification.details.client && (
                          <span className="detail-item">
                            <i className="bi bi-person"></i>
                            {notification.details.client}
                          </span>
                        )}
                        {notification.details.telephone && (
                          <span className="detail-item">
                            <i className="bi bi-telephone"></i>
                            {notification.details.telephone}
                          </span>
                        )}
                        {notification.details.duration && (
                          <span className="detail-item">
                            <i className="bi bi-clock"></i>
                            {formatDuration(notification.details.duration)}
                          </span>
                        )}
                        {notification.details.type_demande && (
                          <span className="detail-item">
                            <i className="bi bi-tag"></i>
                            {notification.details.type_demande}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeNotification(notification.id)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="clear-all-btn"
                onClick={() => setNotifications([])}
              >
                Effacer tout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
