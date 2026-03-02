/**
 * Service de métriques pour le monitoring du pipeline STT + extraction
 * Suit les taux d'erreur et les performances
 */

// Compteurs en mémoire (en production, utiliser Redis ou une base de données)
const metrics = {
  totalCalls: 0,
  sttErrors: 0,
  parsingErrors: 0,
  invalidPhones: 0,
  invalidTimes: 0,
  successfulExtractions: 0,
};

/**
 * Enregistre une métrique
 * @param {string} metricName - Nom de la métrique
 * @param {number} value - Valeur à ajouter (défaut: 1)
 */
export function recordMetric(metricName, value = 1) {
  if (metrics.hasOwnProperty(metricName)) {
    metrics[metricName] += value;
  }
}

/**
 * Enregistre une erreur STT
 */
export function recordSTTError() {
  recordMetric("sttErrors");
  recordMetric("totalCalls");
}

/**
 * Enregistre une erreur de parsing JSON
 */
export function recordParsingError() {
  recordMetric("parsingErrors");
  recordMetric("totalCalls");
}

/**
 * Enregistre un numéro de téléphone invalide
 */
export function recordInvalidPhone() {
  recordMetric("invalidPhones");
}

/**
 * Enregistre une heure invalide
 */
export function recordInvalidTime() {
  recordMetric("invalidTimes");
}

/**
 * Enregistre une extraction réussie
 */
export function recordSuccessfulExtraction() {
  recordMetric("successfulExtractions");
  recordMetric("totalCalls");
}

/**
 * Calcule les taux d'erreur
 * @returns {Object} - Taux d'erreur calculés
 */
export function getErrorRates() {
  const total = metrics.totalCalls || 1; // Éviter division par zéro

  return {
    sttErrorRate: ((metrics.sttErrors / total) * 100).toFixed(2) + "%",
    parsingErrorRate: ((metrics.parsingErrors / total) * 100).toFixed(2) + "%",
    invalidPhoneRate: ((metrics.invalidPhones / total) * 100).toFixed(2) + "%",
    invalidTimeRate: ((metrics.invalidTimes / total) * 100).toFixed(2) + "%",
    successRate: ((metrics.successfulExtractions / total) * 100).toFixed(2) + "%",
    totalCalls: metrics.totalCalls,
  };
}

/**
 * Récupère toutes les métriques brutes
 * @returns {Object} - Toutes les métriques
 */
export function getAllMetrics() {
  return {
    ...metrics,
    rates: getErrorRates(),
  };
}

/**
 * Réinitialise les métriques (utile pour les tests)
 */
export function resetMetrics() {
  Object.keys(metrics).forEach((key) => {
    metrics[key] = 0;
  });
}

