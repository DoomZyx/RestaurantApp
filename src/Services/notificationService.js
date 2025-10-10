/**
 * Service de gestion des notifications
 * Gère les notifications email, sonores et desktop
 */

class NotificationService {
  constructor() {
    this.audioContext = null;
    this.notificationSound = null;
    this.isInitialized = false;
  }

  /**
   * Initialise le service de notification
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Demander la permission pour les notifications desktop
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
      }

      // Initialiser le contexte audio pour les sons
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Erreur initialisation notifications:", error);
    }
  }

  /**
   * Connecte le service au WebSocket pour les notifications système
   * @param {WebSocket} wsConnection - Connexion WebSocket
   */
  connectToWebSocket(wsConnection) {
    this.wsConnection = wsConnection;
  }

  /**
   * Déclenche une notification système basée sur les données WebSocket
   * @param {Object} notificationData - Données de notification du WebSocket
   */
  async triggerSystemNotification(notificationData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { title, message, priority, details } = notificationData;

      // Jouer un son selon la priorité
      const soundType =
        priority === "error"
          ? "urgent"
          : priority === "success"
          ? "success"
          : "normal";
      await this.playNotificationSound(soundType);

      // Afficher une notification desktop
      await this.showDesktopNotification(title, message, {
        urgent: priority === "error",
        body: message,
        data: details,
      });

      console.log("🔔 Notification système déclenchée:", title);
    } catch (error) {
      console.error("❌ Erreur notification système:", error);
    }
  }

  /**
   * Joue un son de notification
   * @param {string} type - Type de son ('urgent', 'normal', 'success')
   */
  async playNotificationSound(type = "normal") {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const frequencies = {
        urgent: [800, 600, 800, 600, 800],
        normal: [440, 660],
        success: [523, 659, 784],
      };

      const freq = frequencies[type] || frequencies.normal;

      for (let i = 0; i < freq.length; i++) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(
          freq[i],
          this.audioContext.currentTime
        );
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          this.audioContext.currentTime + 0.3
        );

        oscillator.start(this.audioContext.currentTime + i * 0.2);
        oscillator.stop(this.audioContext.currentTime + i * 0.2 + 0.3);
      }
    } catch (error) {
      console.error("❌ Erreur lecture son notification:", error);
    }
  }

  /**
   * Affiche une notification desktop
   * @param {string} title - Titre de la notification
   * @param {string} message - Message de la notification
   * @param {Object} options - Options de la notification
   */
  async showDesktopNotification(title, message, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, {
          icon: "/vite.svg",
          badge: "/vite.svg",
          tag: "handlehome-notification",
          requireInteraction: options.urgent || false,
          ...options,
        });

        // Gérer les clics sur la notification
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-fermeture après 5 secondes (sauf si urgent)
        if (!options.urgent) {
          setTimeout(() => notification.close(), 5000);
        }

        return notification;
      }
    } catch (error) {
      console.error("❌ Erreur notification desktop:", error);
    }
  }

  /**
   * Envoie une notification email (simulation)
   * @param {string} to - Destinataire
   * @param {string} subject - Sujet
   * @param {string} message - Message
   */
  async sendEmailNotification(to, subject, message) {
    try {
      // Simulation d'envoi d'email
      console.log("📧 Envoi email notification:", { to, subject, message });

      // Ici vous pourriez appeler votre API backend pour envoyer l'email
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify({ to, subject, message }),
      });

      if (!response.ok) {
        throw new Error("Erreur envoi email");
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Erreur envoi email notification:", error);
      throw error;
    }
  }

  /**
   * Notifie un nouvel appel
   * @param {Object} callData - Données de l'appel
   * @param {Object} settings - Paramètres de notification
   */
  async notifyNewCall(callData, settings) {
    const { nom, telephone, type_demande, statut } = callData;

    try {
      // Notification sonore si activée
      if (settings.notificationsSonores) {
        const soundType = statut === "urgent" ? "urgent" : "normal";
        await this.playNotificationSound(soundType);
      }

      // Notification desktop si activée
      if (settings.notificationsDesktop) {
        const title = `📞 Nouvel appel - ${nom}`;
        const message = `${type_demande} - ${telephone}`;

        await this.showDesktopNotification(title, message, {
          urgent: settings.notificationsUrgentes,
          data: callData,
        });
      }

      // Notification email si activée
      if (settings.emailNotifications) {
        const subject = `Nouvel appel reçu - ${nom}`;
        const message = `
          Nouvel appel reçu :
          - Nom: ${nom}
          - Téléphone: ${telephone}
          - Type: ${type_demande}
          - Statut: ${statut}
        `;

        await this.sendEmailNotification(
          "admin@handlehome.com",
          subject,
          message
        );
      }

      console.log("✅ Notification nouvel appel envoyée");
    } catch (error) {
      console.error("❌ Erreur notification nouvel appel:", error);
    }
  }

  /**
   * Notifie un changement de statut
   * @param {Object} callData - Données de l'appel
   * @param {string} oldStatus - Ancien statut
   * @param {string} newStatus - Nouveau statut
   * @param {Object} settings - Paramètres de notification
   */
  async notifyStatusChange(callData, oldStatus, newStatus, settings) {
    const { nom, type_demande } = callData;

    try {
      // Notification sonore si activée
      if (settings.notificationsSonores) {
        await this.playNotificationSound("success");
      }

      // Notification desktop si activée
      if (settings.notificationsDesktop) {
        const title = `🔄 Statut mis à jour - ${nom}`;
        const message = `${type_demande}: ${oldStatus} → ${newStatus}`;

        await this.showDesktopNotification(title, message, {
          urgent: false,
          data: { callData, oldStatus, newStatus },
        });
      }

      console.log("✅ Notification changement statut envoyée");
    } catch (error) {
      console.error("❌ Erreur notification changement statut:", error);
    }
  }

  /**
   * Nettoie les ressources
   */
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

// Instance singleton
const notificationService = new NotificationService();

export default notificationService;
