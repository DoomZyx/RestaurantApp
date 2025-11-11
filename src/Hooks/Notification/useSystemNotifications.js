import { useEffect } from "react";
import notificationService from "../../Services/notificationService.js";

/**
 * Hook pour gérer les notifications système
 * Initialise le service de notification et gère les permissions
 */
export function useSystemNotifications() {
  useEffect(() => {
    // Initialiser le service de notification au chargement de l'app
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
      } catch (error) {
      }
    };

    initializeNotifications();

    // Cleanup à la fermeture de l'app
    return () => {
      notificationService.cleanup();
    };
  }, []);

  return {
    // Méthodes pour déclencher des notifications manuellement si nécessaire
    playSound: (type) => notificationService.playNotificationSound(type),
    showNotification: (title, message, options) => 
      notificationService.showDesktopNotification(title, message, options),
  };
} 