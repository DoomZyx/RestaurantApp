/**
 * Service d'alertes pour erreurs critiques
 * Détecte les problèmes et envoie des alertes (email, Slack, webhook)
 */

import { getAllMetrics, getErrorRates } from "../monitoring/extractionMetrics.js";
import { callLogger } from "../logging/logger.js";
import circuitBreaker from "../gptServices/circuitBreaker.js";

/**
 * Configuration des seuils d'alerte
 */
const ALERT_THRESHOLDS = {
  errorRate: 5.0, // % d'erreur maximum acceptable
  consecutiveFailures: 10, // Nombre d'échecs consécutifs
  circuitBreakerOpen: true, // Alerter si circuit breaker ouvert
};

/**
 * Cooldown pour éviter spam d'alertes (en ms)
 */
const ALERT_COOLDOWN = {
  errorRate: 300000, // 5 minutes
  circuitBreaker: 600000, // 10 minutes
  consecutiveFailures: 300000, // 5 minutes
};

// Timestamps des dernières alertes
const lastAlerts = {
  errorRate: 0,
  circuitBreaker: 0,
  consecutiveFailures: 0,
};

/**
 * Vérifie si une alerte peut être envoyée (cooldown)
 * @param {string} alertType - Type d'alerte
 * @returns {boolean} - True si alerte peut être envoyée
 */
function canSendAlert(alertType) {
  const now = Date.now();
  const lastAlert = lastAlerts[alertType] || 0;
  const cooldown = ALERT_COOLDOWN[alertType] || 300000;

  if (now - lastAlert < cooldown) {
    return false;
  }

  lastAlerts[alertType] = now;
  return true;
}

/**
 * Envoie une alerte (pour l'instant, logging uniquement)
 * En production, intégrer email/Slack/webhook
 * @param {string} type - Type d'alerte
 * @param {string} message - Message d'alerte
 * @param {Object} details - Détails supplémentaires
 */
async function sendAlert(type, message, details = {}) {
  // Logging de l'alerte
  callLogger.error("SYSTEM", new Error(`ALERTE: ${message}`), {
    source: "alertService",
    alertType: type,
    ...details,
    event: "critical_alert",
  });

  // TODO: En production, ajouter :
  // - Envoi email via nodemailer
  // - Envoi Slack via webhook
  // - Envoi webhook personnalisé
  // - Notification dans dashboard

  console.error(`🚨 ALERTE [${type}]: ${message}`, details);
}

/**
 * Vérifie le taux d'erreur et envoie une alerte si nécessaire
 */
export async function checkErrorRate() {
  const rates = getErrorRates();
  const errorRate = parseFloat(rates.successRate.replace('%', ''));

  // Calculer taux d'erreur (100 - taux de succès)
  const actualErrorRate = 100 - errorRate;

  if (actualErrorRate > ALERT_THRESHOLDS.errorRate) {
    if (canSendAlert('errorRate')) {
      await sendAlert(
        'errorRate',
        `Taux d'erreur élevé: ${actualErrorRate.toFixed(2)}% (seuil: ${ALERT_THRESHOLDS.errorRate}%)`,
        {
          errorRate: actualErrorRate,
          threshold: ALERT_THRESHOLDS.errorRate,
          metrics: rates,
        }
      );
    }
  }
}

/**
 * Vérifie l'état du circuit breaker et envoie une alerte si ouvert
 */
export async function checkCircuitBreaker() {
  const state = circuitBreaker.getState();

  if (state.state === 'OPEN') {
    if (canSendAlert('circuitBreaker')) {
      await sendAlert(
        'circuitBreaker',
        'Circuit breaker ouvert - OpenAI semble indisponible',
        {
          circuitState: state,
          failures: state.failures,
          nextAttempt: state.nextAttempt,
        }
      );
    }
  }
}

/**
 * Vérifie les échecs consécutifs et envoie une alerte si nécessaire
 */
export async function checkConsecutiveFailures() {
  const metrics = getAllMetrics();
  const totalCalls = metrics.totalCalls || 0;
  const successfulExtractions = metrics.successfulExtractions || 0;
  const failures = totalCalls - successfulExtractions;

  // Si beaucoup plus d'échecs que de succès récents
  if (failures > ALERT_THRESHOLDS.consecutiveFailures && totalCalls > 0) {
    if (canSendAlert('consecutiveFailures')) {
      await sendAlert(
        'consecutiveFailures',
        `Nombre élevé d'échecs consécutifs: ${failures} sur ${totalCalls} appels`,
        {
          failures,
          totalCalls,
          successRate: ((successfulExtractions / totalCalls) * 100).toFixed(2) + '%',
        }
      );
    }
  }
}

/**
 * Vérifie toutes les conditions d'alerte
 * À appeler périodiquement (ex: toutes les minutes)
 */
export async function checkAllAlerts() {
  try {
    await Promise.all([
      checkErrorRate(),
      checkCircuitBreaker(),
      checkConsecutiveFailures(),
    ]);
  } catch (error) {
    callLogger.error("SYSTEM", error, {
      source: "alertService",
      context: "check_all_alerts",
    });
  }
}

/**
 * Démarre le monitoring périodique des alertes
 * @param {number} interval - Intervalle en ms (défaut: 60000 = 1 minute)
 */
export function startAlertMonitoring(interval = 60000) {
  // Vérifier immédiatement
  checkAllAlerts();

  // Puis vérifier périodiquement
  setInterval(() => {
    checkAllAlerts();
  }, interval);

  callLogger.info("SYSTEM", "Monitoring d'alertes démarré", {
    interval: `${interval}ms`,
    event: "alert_monitoring_started",
  });
}

