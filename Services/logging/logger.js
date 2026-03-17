import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// Répertoire des logs : LOG_PATH (défaut "logs") relatif à cwd
const logDir = path.join(process.cwd(), process.env.LOG_PATH || "logs");
const logRetention = process.env.LOG_RETENTION_DAYS || "7d";
const logMaxSize = process.env.LOG_MAX_SIZE || "100m";

function dailyTransport(options) {
  return new DailyRotateFile({
    dirname: logDir,
    ...options,
    maxSize: logMaxSize,
    maxFiles: logRetention,
    format: options.format || generalLogFormat,
  });
}

// ========================================
// FORMATS DE LOG
// ========================================

/**
 * Format lisible pour les fichiers de log
 * Affiche: [TIMESTAMP] [LEVEL] [SOURCE] Message - Détails
 */
const readableFormat = winston.format.printf(({ timestamp, level, message, streamSid, event, source, ...meta }) => {
  let log = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (source) {
    log += ` [${source}]`;
  }
  if (streamSid) {
    log += ` [${String(streamSid).substring(0, 8)}...]`;
  }
  if (event) {
    log += ` [${event.toUpperCase()}]`;
  }
  
  log += ` ${message}`;
  
  const filteredMeta = { ...meta };
  delete filteredMeta.timestamp;
  delete filteredMeta.event;
  delete filteredMeta.streamSid;
  delete filteredMeta.source;
  // Ne jamais logger de secrets (clés API, tokens Twilio/OpenAI, etc.)
  const sensitiveKeys = [
    "apiKey",
    "api_key",
    "authorization",
    "password",
    "token",
    "secret",
    "twilioAuthToken",
    "authToken",
  ];
  sensitiveKeys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(filteredMeta, k)) filteredMeta[k] = "[REDACTED]";
  });

  if (Object.keys(filteredMeta).length > 0) {
    const hasStack = filteredMeta.stack;
    if (hasStack) {
      log += `\n   Contexte: ${JSON.stringify({ ...filteredMeta, stack: undefined }, null, 2)}`;
      log += `\n   Stack: ${filteredMeta.stack}`;
    } else {
      log += `\n   ${JSON.stringify(filteredMeta, null, 2)}`;
    }
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
 * Pour les erreurs: affiche [source] et extrait du contexte
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, source, streamSid, ...meta }) => {
    let out = `${timestamp} [${level}]`;
    if (source) out += ` [${source}]`;
    if (streamSid) out += ` [${String(streamSid).substring(0, 8)}...]`;
    out += ` ${message}`;
    if (meta.stack) {
      out += `\n   ${String(meta.stack).split("\n").slice(0, 4).join("\n   ")}`;
    }
    return out;
  })
);

// ========================================
// CONFIGURATION DES TRANSPORTS
// ========================================

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  dailyTransport({
    filename: "error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "error",
  }),
  dailyTransport({
    filename: "calls-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "info",
  }),
  dailyTransport({
    filename: "openai-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "debug",
  }),
];

// ========================================
// CRÉATION DU LOGGER PRINCIPAL
// ========================================

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const logger = winston.createLogger({
  level: logLevel,
  format: generalLogFormat,
  transports,
  exitOnError: false,
});

// ========================================
// LOGGERS SPÉCIALISÉS PAR SERVICE
// ========================================

/**
 * Logger spécifique pour OpenAI (openai.log avec rotation)
 */
const openAiLogger = winston.createLogger({
  level: logLevel,
  format: generalLogFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    dailyTransport({
      filename: "openai-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "debug",
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

  // Erreurs - source: fichier ou module d'origine, context: description de l'action
  error: (streamSid, error, context = {}) => {
    const message = error?.message || (typeof error === "string" ? error : "Erreur inconnue");
    const { source, ...rest } = typeof context === "object" ? context : { context };
    logger.error(message, {
      streamSid,
      source: source || "app",
      error: error?.message,
      stack: error?.stack,
      ...rest,
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

  // Appel terminé (meta optionnel : instanceId pour diagnostic multi-tenant)
  callCompleted: (streamSid, totalDuration, meta = {}) => {
    const payload = {
      streamSid,
      totalDuration: `${totalDuration}ms`,
      event: "call_completed",
      timestamp: new Date().toISOString(),
    };
    if (typeof meta === "string") payload.instanceId = meta;
    else if (meta && typeof meta === "object") Object.assign(payload, meta);
    logger.info("Appel termine avec succes", payload);
  },
};

// ========================================
// NOTIFICATIONS DEBUG (remplace notifDebugLog.js fs.appendFileSync)
// Transport dédié avec rotation ; échec d'écriture remonté vers le logger principal
// ========================================

const notifRotateTransport = dailyTransport({
  filename: "notifications-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  level: "info",
});

const notifLogger = winston.createLogger({
  level: "info",
  format: generalLogFormat,
  transports: [notifRotateTransport],
  exitOnError: false,
});

notifRotateTransport.on("error", (err) => {
  logger.error("notifDebugLog: échec écriture fichier notifications", { err: err.message });
});

export function notifDebugLog(msg) {
  try {
    notifLogger.info("[NOTIF] " + msg);
  } catch (e) {
    logger.error("notifDebugLog: exception", { err: e?.message });
  }
}

export default logger;
