/**
 * Circuit Breaker pour détecter si OpenAI est complètement indisponible
 * Permet de basculer automatiquement sur extracteur rule-based
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // Nombre d'échecs avant ouverture
    this.resetTimeout = options.resetTimeout || 60000; // 60s avant tentative de reset
    this.monitoringWindow = options.monitoringWindow || 300000; // 5 minutes de fenêtre
    
    this.failures = [];
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
  }

  /**
   * Enregistre un succès
   */
  recordSuccess() {
    this.failures = [];
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.nextAttempt = null;
    }
  }

  /**
   * Enregistre un échec
   */
  recordFailure() {
    const now = Date.now();
    
    // Nettoyer les échecs anciens
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.monitoringWindow
    );
    
    // Ajouter le nouvel échec
    this.failures.push(now);
    
    // Si trop d'échecs, ouvrir le circuit
    if (this.failures.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = now + this.resetTimeout;
    }
  }

  /**
   * Vérifie si le circuit est ouvert (OpenAI down)
   */
  isOpen() {
    const now = Date.now();
    
    if (this.state === 'OPEN') {
      // Vérifier si on peut tenter de rétablir (half-open)
      if (now >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.nextAttempt = null;
        return false; // Permettre une tentative
      }
      return true; // Circuit ouvert, utiliser fallback
    }
    
    return false; // Circuit fermé ou half-open, utiliser GPT
  }

  /**
   * Réinitialise le circuit breaker
   */
  reset() {
    this.failures = [];
    this.state = 'CLOSED';
    this.nextAttempt = null;
  }

  /**
   * Récupère l'état actuel
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures.length,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt) : null,
    };
  }
}

// Instance singleton
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringWindow: 300000, // 5 minutes
});

export default circuitBreaker;




