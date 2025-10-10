/**
 * Service de sécurité pour le frontend HandleHome
 * Protège contre les attaques XSS, CSRF et autres vulnérabilités
 */

class SecurityService {
  constructor() {
    this.csrfToken = null;
    this.securityConfig = {
      maxPasswordLength: 128,
      minPasswordLength: 8,
      passwordRequirements: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        specialChars: true
      },
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000 // 15 minutes
    };
  }

  /**
   * Initialise le service de sécurité
   */
  initialize() {
    this.setupSessionMonitoring();
    this.setupCSRFProtection();
    this.setupXSSProtection();
    this.setupPasswordValidation();
    console.log('🔒 Service de sécurité initialisé');
  }

  /**
   * Génère un token CSRF
   */
  generateCSRFToken() {
    const token = this.generateRandomString(32);
    this.csrfToken = token;
    localStorage.setItem('csrf_token', token);
    return token;
  }

  /**
   * Récupère le token CSRF
   */
  getCSRFToken() {
    if (!this.csrfToken) {
      this.csrfToken = localStorage.getItem('csrf_token');
    }
    return this.csrfToken;
  }

  /**
   * Valide le token CSRF
   */
  validateCSRFToken(token) {
    return token === this.getCSRFToken();
  }

  /**
   * Nettoie les entrées utilisateur contre les attaques XSS
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/[<>]/g, '') // Supprimer < et >
      .replace(/javascript:/gi, '') // Supprimer javascript:
      .replace(/on\w+=/gi, '') // Supprimer les événements inline
      .replace(/data:/gi, '') // Supprimer data: URLs
      .replace(/vbscript:/gi, '') // Supprimer vbscript:
      .trim();
  }

  /**
   * Valide un mot de passe selon les critères de sécurité
   */
  validatePassword(password) {
    const errors = [];
    const requirements = this.securityConfig.passwordRequirements;

    if (password.length < this.securityConfig.minPasswordLength) {
      errors.push(`Le mot de passe doit contenir au moins ${this.securityConfig.minPasswordLength} caractères`);
    }

    if (password.length > this.securityConfig.maxPasswordLength) {
      errors.push(`Le mot de passe ne peut pas dépasser ${this.securityConfig.maxPasswordLength} caractères`);
    }

    if (requirements.uppercase && !/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
    }

    if (requirements.lowercase && !/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
    }

    if (requirements.numbers && !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }

    if (requirements.specialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    // Vérifier les mots de passe courants
    const commonPasswords = ['password', '123456', 'admin', 'qwerty', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Ce mot de passe est trop courant');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calcule la force d'un mot de passe
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Longueur
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexité
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    // Variété de caractères
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 1;
    
    if (score <= 2) return 'faible';
    if (score <= 4) return 'moyen';
    if (score <= 6) return 'fort';
    return 'très fort';
  }

  /**
   * Valide une adresse email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide un nom d'utilisateur
   */
  validateUsername(username) {
    const errors = [];
    
    if (username.length < 3) {
      errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    }
    
    if (username.length > 30) {
      errors.push('Le nom d\'utilisateur ne peut pas dépasser 30 caractères');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Surveille la session utilisateur
   */
  setupSessionMonitoring() {
    let lastActivity = Date.now();
    
    // Réinitialiser le timer d'activité
    const resetActivity = () => {
      lastActivity = Date.now();
    };
    
    // Événements pour détecter l'activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });
    
    // Vérifier l'inactivité toutes les minutes
    setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > this.securityConfig.sessionTimeout) {
        this.handleSessionTimeout();
      }
    }, 60000);
  }

  /**
   * Gère l'expiration de session
   */
  handleSessionTimeout() {
    console.log('🔒 Session expirée - déconnexion automatique');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('csrf_token');
    
    // Rediriger vers la page de connexion
    window.location.href = '/login?timeout=true';
  }

  /**
   * Configure la protection CSRF
   */
  setupCSRFProtection() {
    // Ajouter le token CSRF à toutes les requêtes
    const originalFetch = window.fetch;
    window.fetch = (url, options = {}) => {
      const token = this.getCSRFToken();
      if (token && options.method && options.method !== 'GET') {
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': token
        };
      }
      return originalFetch(url, options);
    };
  }

  /**
   * Configure la protection XSS
   */
  setupXSSProtection() {
    // Intercepter les modifications du DOM pour détecter les injections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanForXSS(node);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Scanne un élément pour détecter les attaques XSS
   */
  scanForXSS(element) {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];
    
    const scanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        dangerousPatterns.forEach(pattern => {
          if (pattern.test(text)) {
            console.warn('🔒 Contenu suspect détecté:', text);
            // Supprimer le contenu dangereux
            node.textContent = this.sanitizeInput(text);
          }
        });
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Vérifier les attributs dangereux
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover'];
        dangerousAttrs.forEach(attr => {
          if (node.hasAttribute(attr)) {
            console.warn('🔒 Attribut dangereux détecté:', attr);
            node.removeAttribute(attr);
          }
        });
        
        // Scanner les enfants
        Array.from(node.childNodes).forEach(scanNode);
      }
    };
    
    scanNode(element);
  }

  /**
   * Configure la validation des mots de passe
   */
  setupPasswordValidation() {
    // Intercepter les soumissions de formulaire avec des mots de passe
    document.addEventListener('submit', (event) => {
      const passwordInputs = event.target.querySelectorAll('input[type="password"]');
      passwordInputs.forEach(input => {
        const validation = this.validatePassword(input.value);
        if (!validation.isValid) {
          event.preventDefault();
          alert(`Erreur de validation du mot de passe:\n${validation.errors.join('\n')}`);
        }
      });
    });
  }

  /**
   * Gère les tentatives de connexion
   */
  handleLoginAttempt(email, success) {
    const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
    const now = Date.now();
    
    if (!success) {
      attempts[email] = attempts[email] || { count: 0, lastAttempt: 0 };
      attempts[email].count++;
      attempts[email].lastAttempt = now;
      
      // Vérifier si l'utilisateur doit être bloqué
      if (attempts[email].count >= this.securityConfig.maxLoginAttempts) {
        const lockoutUntil = attempts[email].lastAttempt + this.securityConfig.lockoutDuration;
        if (now < lockoutUntil) {
          const remainingTime = Math.ceil((lockoutUntil - now) / 1000 / 60);
          throw new Error(`Trop de tentatives. Réessayez dans ${remainingTime} minutes.`);
        } else {
          // Réinitialiser le compteur après la période de blocage
          attempts[email].count = 0;
        }
      }
    } else {
      // Réinitialiser le compteur en cas de succès
      if (attempts[email]) {
        attempts[email].count = 0;
      }
    }
    
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
  }

  /**
   * Génère une chaîne aléatoire sécurisée
   */
  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    return result;
  }

  /**
   * Chiffre une chaîne (simulation)
   */
  encryptString(text) {
    // En production, utilisez une vraie bibliothèque de chiffrement
    return btoa(text);
  }

  /**
   * Déchiffre une chaîne (simulation)
   */
  decryptString(encryptedText) {
    // En production, utilisez une vraie bibliothèque de chiffrement
    return atob(encryptedText);
  }

  /**
   * Valide une URL
   */
  validateURL(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Nettoie les ressources
   */
  cleanup() {
    // Nettoyer les tokens sensibles
    localStorage.removeItem('csrf_token');
    localStorage.removeItem('login_attempts');
    console.log('🔒 Service de sécurité nettoyé');
  }
}

// Instance singleton
const securityService = new SecurityService();

export default securityService; 