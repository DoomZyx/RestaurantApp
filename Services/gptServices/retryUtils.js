/**
 * Utilitaires pour retry avec backoff exponentiel
 */

/**
 * Retry une fonction avec backoff exponentiel
 * @param {Function} fn - Fonction à exécuter (doit retourner une Promise)
 * @param {Object} options - Options de retry
 * @param {number} options.maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param {number[]} options.delays - Tableau des délais en ms (défaut: [1000, 2000, 4000])
 * @param {Function} options.shouldRetry - Fonction pour déterminer si on doit retry (défaut: retry sur toutes les erreurs)
 * @returns {Promise<any>} - Résultat de la fonction
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    delays = [1000, 2000, 4000],
    shouldRetry = (error) => {
      // Retry sur rate limit, timeout, et erreurs 5xx
      if (error.response) {
        const status = error.response.status;
        return status === 429 || status >= 500;
      }
      // Retry sur timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return true;
      }
      // Retry sur erreurs réseau
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return true;
      }
      return false;
    }
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Si c'est la dernière tentative ou si on ne doit pas retry, throw
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Attendre avant le prochain retry
      const delay = delays[attempt] || delays[delays.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}




