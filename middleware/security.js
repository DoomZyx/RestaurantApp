import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { callLogger } from '../Services/logging/logger.js';

/**
 * Middleware de sécurité avancé pour HandleHome
 * Protège contre les attaques courantes et améliore la sécurité
 */

// Configuration du rate limiting
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Trop de requêtes, veuillez réessayer plus tard',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      callLogger.warn(null, 'Rate limit dépassé', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiter spécifique pour l'authentification
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: {
    error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    callLogger.warn(null, 'Tentatives de connexion excessives', {
      ip: req.ip,
      email: req.body?.email
    });
    res.status(429).json({
      error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
    });
  }
});

// Middleware de validation des entrées
export const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      callLogger.warn(null, 'Validation d\'entrée échouée', {
        path: req.path,
        errors: error.details
      });
      return res.status(400).json({
        error: 'Données invalides',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Middleware de protection contre les injections
export const sanitizeInput = (req, res, next) => {
  // Nettoyer les entrées utilisateur
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Supprimer les caractères dangereux
        sanitized[key] = value
          .replace(/[<>]/g, '') // Supprimer < et >
          .replace(/javascript:/gi, '') // Supprimer javascript:
          .replace(/on\w+=/gi, '') // Supprimer les événements inline
          .trim();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// Middleware de logging de sécurité
export const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log des requêtes suspectes
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS
    /union\s+select/i, // SQL injection
    /javascript:/i, // XSS
    /on\w+\s*=/i // XSS events
  ];

  const url = req.url.toLowerCase();
  const userAgent = req.get('User-Agent') || '';
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent)
  );

  if (isSuspicious) {
    callLogger.warn(null, 'Requête suspecte détectée', {
      ip: req.ip,
      url: req.url,
      userAgent,
      method: req.method,
      headers: req.headers
    });
  }

  // Log de la requête
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    callLogger[logLevel](null, `${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
};

// Middleware de protection contre les attaques par force brute
export const bruteForceProtection = (req, res, next) => {
  const ip = req.ip;
  const key = `brute_force:${ip}`;
  
  // Simuler un système de comptage (en production, utilisez Redis)
  const attempts = req.session?.bruteForceAttempts || 0;
  
  if (attempts > 10) {
    callLogger.warn(null, 'Protection force brute activée', { ip });
    return res.status(429).json({
      error: 'Trop de tentatives, veuillez réessayer plus tard'
    });
  }

  // Incrémenter le compteur pour les échecs
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    req.session = req.session || {};
    req.session.bruteForceAttempts = attempts;
  }

  next();
};

// Middleware de validation des tokens CSRF
export const csrfProtection = (req, res, next) => {
  // Vérifier le token CSRF pour les méthodes non-GET
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const csrfToken = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;
    
    if (!csrfToken || csrfToken !== sessionToken) {
      callLogger.warn(null, 'Token CSRF invalide', {
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({
        error: 'Token CSRF invalide'
      });
    }
  }
  
  next();
};

// Middleware de protection contre les attaques par déni de service
export const dosProtection = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  // Simuler un système de détection DoS
  const requestCount = req.session?.requestCount || 0;
  const lastRequest = req.session?.lastRequest || 0;
  
  // Réinitialiser le compteur si plus de 1 seconde s'est écoulée
  if (now - lastRequest > 1000) {
    req.session.requestCount = 1;
  } else {
    req.session.requestCount = requestCount + 1;
  }
  
  req.session.lastRequest = now;
  
  // Bloquer si plus de 100 requêtes par seconde
  if (req.session.requestCount > 100) {
    callLogger.warn(null, 'Attaque DoS détectée', { ip });
    return res.status(429).json({
      error: 'Trop de requêtes, veuillez ralentir'
    });
  }
  
  next();
};

// Middleware de validation des headers de sécurité
export const securityHeaders = (req, res, next) => {
  // Headers de sécurité recommandés
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Middleware de validation des paramètres d'URL
export const validateUrlParams = (req, res, next) => {
  const url = req.url;
  
  // Vérifier les paramètres suspects
  const suspiciousParams = [
    /\.\./, // Path traversal
    /<script/i, // XSS
    /javascript:/i, // XSS
    /on\w+\s*=/i // XSS events
  ];
  
  const hasSuspiciousParams = suspiciousParams.some(pattern => 
    pattern.test(url)
  );
  
  if (hasSuspiciousParams) {
    callLogger.warn(null, 'Paramètres URL suspects détectés', {
      ip: req.ip,
      url,
      userAgent: req.get('User-Agent')
    });
    return res.status(400).json({
      error: 'Paramètres invalides'
    });
  }
  
  next();
};

// Middleware de validation de la taille des requêtes
export const validateRequestSize = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    callLogger.warn(null, 'Requête trop volumineuse', {
      ip: req.ip,
      size: contentLength,
      maxSize
    });
    return res.status(413).json({
      error: 'Requête trop volumineuse'
    });
  }
  
  next();
};

// Middleware de protection contre les attaques par timing
export const timingAttackProtection = (req, res, next) => {
  // Ajouter un délai aléatoire pour les échecs d'authentification
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    const randomDelay = Math.random() * 100; // 0-100ms
    setTimeout(() => {
      next();
    }, randomDelay);
  } else {
    next();
  }
};

// Configuration complète de sécurité
export const securityConfig = {
  // Rate limiting
  rateLimit: createRateLimiter(),
  authRateLimit: authRateLimiter,
  
  // Middlewares de sécurité
  sanitizeInput,
  securityLogger,
  bruteForceProtection,
  csrfProtection,
  dosProtection,
  securityHeaders,
  validateUrlParams,
  validateRequestSize,
  timingAttackProtection
};

export default securityConfig; 