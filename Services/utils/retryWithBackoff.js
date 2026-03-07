/**
 * Utilitaire de retry avec backoff exponentiel
 * Gère les retry avec délais exponentiels et jitter pour éviter les collisions
 */

/**
 * Détermine si une erreur est retryable
 * @param {Error} error - Erreur à vérifier
 * @returns {boolean} - True si l'erreur est retryable
 */
function isRetryableError(error) {
  // Erreurs réseau/timeout
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Erreurs HTTP retryables
  if (error.status) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // Erreurs OpenAI spécifiques
  if (error.response) {
    const status = error.response.status;
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(status);
  }

  // Timeout
  if (error.message && error.message.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Calcule le délai de backoff avec jitter
 * @param {number} attempt - Numéro de la tentative (0-based)
 * @param {number} baseDelay - Délai de base en ms (défaut: 1000)
 * @returns {number} - Délai en ms
 */
function calculateBackoffDelay(attempt, baseDelay = 1000) {
  // Backoff exponentiel : baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Ajouter jitter aléatoire (0-30% du délai) pour éviter les collisions
  const jitter = Math.random() * 0.3 * exponentialDelay;
  
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Extrait le délai Retry-After depuis les headers d'une erreur
 * @param {Error} error - Erreur avec response
 * @returns {number|null} - Délai en ms ou null
 */
function getRetryAfterDelay(error) {
  if (error.response && error.response.headers) {
    const retryAfter = error.response.headers['retry-after'];
    if (retryAfter) {
      // Retry-After peut être en secondes (nombre) ou date (RFC 7231)
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000; // Convertir en ms
      }
    }
  }
  return null;
}

/**
 * Retry une fonction avec backoff exponentiel
 * @param {Function} fn - Fonction async à retry
 * @param {Object} options - Options de retry
 * @param {number} options.maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param {number} options.baseDelay - Délai de base en ms (défaut: 1000)
 * @param {Function} options.onRetry - Callback appelé à chaque retry (attempt, error, delay)
 * @param {Function} options.shouldRetry - Fonction personnalisée pour déterminer si retry (défaut: isRetryableError)
 * @returns {Promise<any>} - Résultat de la fonction
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRetry = null,
    shouldRetry = isRetryableError,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si c'est la dernière tentative ou l'erreur n'est pas retryable, throw
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculer le délai
      let delay = calculateBackoffDelay(attempt, baseDelay);

      // Si erreur 429, utiliser Retry-After si disponible
      if (error.status === 429 || (error.response && error.response.status === 429)) {
        const retryAfter = getRetryAfterDelay(error);
        if (retryAfter) {
          delay = retryAfter;
        }
      }

      // Callback onRetry si fourni
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Attendre avant le prochain retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Ne devrait jamais arriver ici, mais au cas où
  throw lastError;
}

/**
 * Wrapper spécifique pour les appels API fetch
 * @param {Function} fetchFn - Fonction fetch à retry
 * @param {Object} options - Options de retry
 * @returns {Promise<Response>} - Réponse fetch
 */
export async function retryFetch(fetchFn, options = {}) {
  return retryWithBackoff(async () => {
    const response = await fetchFn();
    
    // Si la réponse n'est pas OK, créer une erreur pour le retry
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    return response;
  }, options);
}




