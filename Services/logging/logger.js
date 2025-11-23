import winston from "winston";
import path from "path";

// ========================================
// FORMATS DE LOG
// ========================================

/**
 * Format lisible pour les fichiers de log
 * Affiche: [TIMESTAMP] [LEVEL] Message - Détails
 */
const readableFormat = winston.format.printf(({ timestamp, level, message, streamSid, event, ...meta }) => {
  let log = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // Ajouter le streamSid si présent
  if (streamSid) {
    log += ` [${streamSid.substring(0, 8)}...]`;
  }
  
  // Ajouter le type d'événement si présent
  if (event) {
    log += ` [${event.toUpperCase()}]`;
  }
  
  log += ` ${message}`;
  
  // Ajouter les métadonnées si présentes (sauf timestamp/event déjà affichés)
  const filteredMeta = { ...meta };
  delete filteredMeta.timestamp;
  delete filteredMeta.event;
  delete filteredMeta.streamSid;
  
  if (Object.keys(filteredMeta).length > 0) {
    log += `\n   ${JSON.stringify(filteredMeta, null, 3)}`;
  }
  
  return log;
});

/**
 * Format pour les logs généraux (lisible)
 */
const generalLogFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  readableFormat
);

/**
 * Format pour la console (avec couleurs)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}] ${message} ${
      Object.keys(meta).length && meta.streamSid ? `[${meta.streamSid.substring(0, 8)}...]` : ""
    }`;
  })
);

// ========================================
// CONFIGURATION DES TRANSPORTS
// ========================================

const transports = [
  // Console avec couleurs et emojis
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Fichier pour TOUTES les erreurs
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "error.log"),
    level: "error",
    format: generalLogFormat,
  }),

  // Fichier pour TOUS les appels (call lifecycle)
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "calls.log"),
    level: "info",
    format: generalLogFormat,
  }),

  // Fichier pour ElevenLabs uniquement
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "elevenlabs.log"),
    level: "debug",
    format: generalLogFormat,
  }),

  // Fichier pour OpenAI uniquement
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "openai.log"),
    level: "debug",
    format: generalLogFormat,
  }),
];

// ========================================
// CRÉATION DU LOGGER PRINCIPAL
// ========================================

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: generalLogFormat,
  transports,
  exitOnError: false,
});

// ========================================
// LOGGERS SPÉCIALISÉS PAR SERVICE
// ========================================

/**
 * Logger spécifique pour ElevenLabs
 * Écrit dans elevenlabs.log
 */
const elevenLabsLogger = winston.createLogger({
  level: "debug",
  format: generalLogFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "elevenlabs.log"),
      format: generalLogFormat,
    }),
  ],
  exitOnError: false,
});

/**
 * Logger spécifique pour OpenAI
 * Écrit dans openai.log
 */
const openAiLogger = winston.createLogger({
  level: "debug",
  format: generalLogFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "openai.log"),
      format: generalLogFormat,
    }),
  ],
  exitOnError: false,
});

// ========================================
// MÉTHODES SPÉCIALISÉES POUR LES APPELS
// ========================================

export const callLogger = {
  /**
   * Log d'information générique
   */
  info: (streamSid, message, meta = {}) => {
    logger.info(message, {
      streamSid,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de debug générique
   */
  debug: (streamSid, message, meta = {}) => {
    logger.debug(message, {
      streamSid,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log de warning générique
   */
  warn: (streamSid, message, meta = {}) => {
    logger.warn(message, {
      streamSid,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Logs spécifiques pour ElevenLabs TTS
   */
  elevenLabs: {
    info: (streamSid, message, meta = {}) => {
      elevenLabsLogger.info(message, {
        streamSid,
        service: "elevenlabs",
        ...meta,
        timestamp: new Date().toISOString(),
      });
    },
    debug: (streamSid, message, meta = {}) => {
      elevenLabsLogger.debug(message, {
        streamSid,
        service: "elevenlabs",
        ...meta,
        timestamp: new Date().toISOString(),
      });
    },
    error: (streamSid, error, context = {}) => {
      elevenLabsLogger.error("Erreur ElevenLabs", {
        streamSid,
        service: "elevenlabs",
        error: error.message,
        stack: error.stack,
        context,
        event: "elevenlabs_error",
        timestamp: new Date().toISOString(),
      });
    },
  },

  /**
   * Logs spécifiques pour OpenAI Realtime
   */
  openAi: {
    info: (streamSid, message, meta = {}) => {
      openAiLogger.info(message, {
        streamSid,
        service: "openai",
        ...meta,
        timestamp: new Date().toISOString(),
      });
    },
    debug: (streamSid, message, meta = {}) => {
      openAiLogger.debug(message, {
        streamSid,
        service: "openai",
        ...meta,
        timestamp: new Date().toISOString(),
      });
    },
    error: (streamSid, error, context = {}) => {
      openAiLogger.error("Erreur OpenAI", {
        streamSid,
        service: "openai",
        error: error.message,
        stack: error.stack,
        context,
        event: "openai_error",
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Début d'appel
  callStarted: (streamSid, callerInfo = {}) => {
    logger.info("Appel demarre", {
      streamSid,
      callerInfo,
      event: "call_started",
      timestamp: new Date().toISOString(),
    });
  },

  // Transcription reçue
  transcriptionReceived: (streamSid, transcriptionLength) => {
    logger.info("Transcription recue", {
      streamSid,
      transcriptionLength,
      event: "transcription_received",
      timestamp: new Date().toISOString(),
    });
  },

  // Extraction GPT-4
  extractionStarted: (streamSid) => {
    logger.info("Extraction GPT-4 demarree", {
      streamSid,
      event: "extraction_started",
      timestamp: new Date().toISOString(),
    });
  },

  extractionCompleted: (streamSid, extractedData) => {
    logger.info("Extraction GPT-4 terminee", {
      streamSid,
      extractedData,
      event: "extraction_completed",
      timestamp: new Date().toISOString(),
    });
  },

  // Sauvegarde API
  apiCallStarted: (streamSid, endpoint) => {
    logger.info("Appel API demarre", {
      streamSid,
      endpoint,
      event: "api_call_started",
      timestamp: new Date().toISOString(),
    });
  },

  apiCallCompleted: (streamSid, response) => {
    logger.info("Appel API termine", {
      streamSid,
      responseStatus: response.status,
      event: "api_call_completed",
      timestamp: new Date().toISOString(),
    });
  },

  // Erreurs
  error: (streamSid, error, context = {}) => {
    logger.error("Erreur detectee", {
      streamSid,
      error: error.message,
      stack: error.stack,
      context,
      event: "error",
      timestamp: new Date().toISOString(),
    });
  },

  // Performance
  performance: (streamSid, operation, duration) => {
    logger.info("Performance", {
      streamSid,
      operation,
      duration: `${duration}ms`,
      event: "performance",
      timestamp: new Date().toISOString(),
    });
  },

  // Appel terminé
  callCompleted: (streamSid, totalDuration) => {
    logger.info("Appel termine avec succes", {
      streamSid,
      totalDuration: `${totalDuration}ms`,
      event: "call_completed",
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
