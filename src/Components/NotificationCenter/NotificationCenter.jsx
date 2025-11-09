import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import notificationService from "../../Services/notificationService.js";
import EmojiText from "../Common/EmojiText";
import "./NotificationCenter.scss";

const NotificationCenter = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  
  // Utiliser isConnected depuis le localStorage ou un state global si disponible
  // Pour l'instant on suppose que c'est connecté si on a des notifications
  const isConnected = true; // Simplifié pour l'instant

  // Gérer le clic sur une notification
  const handleNotificationClick = (notification) => {
    // Marquer comme lue
    notificationService.markAsRead(notification.id);
    
    console.log("🔔 Clic sur notification:", notification);
    
    // Naviguer selon le type de notification
    if (notification.notificationType === "call_completed") {
      // Si on a un ID de commande, aller vers les rendez-vous avec l'ID
      if (notification.details?.orderId) {
        navigate(`/appointments?orderid=${notification.details.orderId}`);
        console.log("→ Navigation vers /appointments avec orderid:", notification.details.orderId);
      } else {
        // Sinon aller vers les appels (la route s'appelle /calls-list)
        navigate("/calls-list");
        console.log("→ Navigation vers /calls-list");
      }
    } else if (notification.notificationType === "new_order") {
      // Aller à la page des rendez-vous avec l'ID si disponible
      if (notification.details?.orderId) {
        navigate(`/appointments?orderid=${notification.details.orderId}`);
        console.log("→ Navigation vers /appointments avec orderid:", notification.details.orderId);
      } else {
        navigate("/appointments");
        console.log("→ Navigation vers /appointments");
      }
    }
    
    // Fermer le panneau
    setShowNotifications(false);
  };

  // Supprimer une notification
  const removeNotification = (id, event) => {
    // Empêcher la propagation pour ne pas déclencher handleNotificationClick
    if (event) {
      event.stopPropagation();
    }
    notificationService.removeNotification(id);
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
    // S'abonner aux notifications du service
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    // Charger les notifications initiales
    setNotifications(notificationService.notifications);

    // Se désabonner au démontage
    return () => {
      unsubscribe();
    };
  }, []);

  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-center">
      {/* Bouton de notification */}
      <button
        className="notification-toggle"
        onClick={() => setShowNotifications(!showNotifications)}
        title={
          isConnected ? t('notificationCenter.activeNotifications') : t('notificationCenter.disconnectedNotifications')
        }
      >
        <i
          className={`bi ${isConnected ? "bi-bell-fill" : "bi-bell-slash"}`}
        ></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {/* Panneau de notifications */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>{t('notifications.title')}</h3>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <i className="bi bi-bell-slash"></i>
                <p>{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationClass(
                    notification.priority
                  )} ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ cursor: 'pointer' }}
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
                    
                    <small className="notification-hint">
                      {notification.read ? '' : <><EmojiText>👆</EmojiText> {t('notificationCenter.clickToSeeDetails')}</>}
                    </small>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={(e) => removeNotification(notification.id, e)}
                    title={t('notificationCenter.deleteNotification')}
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
                onClick={() => notificationService.clearAllNotifications()}
              >
                {t('notificationCenter.clearAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
