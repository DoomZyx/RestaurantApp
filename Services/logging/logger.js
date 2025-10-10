import winston from "winston";
import path from "path";

// Configuration des formats de log
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuration des transports
const transports = [
  // Console avec couleurs
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const emoji = {
          error: "❌",
          warn: "⚠️",
          info: "ℹ️",
          debug: "🔍",
          call: "📞",
          success: "✅",
          api: "🌐",
        };

        return `${timestamp} ${
          emoji[level] || "📝"
        } [${level.toUpperCase()}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
        }`;
      })
    ),
  }),

  // Fichier pour les erreurs
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "error.log"),
    level: "error",
    format: logFormat,
  }),

  // Fichier pour tous les logs
  new winston.transports.File({
    filename: path.join(process.cwd(), "logs", "combined.log"),
    format: logFormat,
  }),
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports,
  exitOnError: false,
});

// Méthodes spécialisées pour les appels
export const callLogger = {
  // Méthode générique info
  info: (streamSid, message, meta = {}) => {
    logger.info(message, {
      streamSid,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  // Méthode générique debug
  debug: (streamSid, message, meta = {}) => {
    logger.debug(message, {
      streamSid,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  },

  // Début d'appel
  callStarted: (streamSid, callerInfo = {}) => {
    logger.info("📞 Appel démarré", {
      streamSid,
      callerInfo,
      event: "call_started",
      timestamp: new Date().toISOString(),
    });
  },

  // Transcription reçue
  transcriptionReceived: (streamSid, transcriptionLength) => {
    logger.info("🎤 Transcription reçue", {
      streamSid,
      transcriptionLength,
      event: "transcription_received",
      timestamp: new Date().toISOString(),
    });
  },

  // Extraction GPT-4
  extractionStarted: (streamSid) => {
    logger.info("🔍 Extraction GPT-4 démarrée", {
      streamSid,
      event: "extraction_started",
      timestamp: new Date().toISOString(),
    });
  },

  extractionCompleted: (streamSid, extractedData) => {
    logger.info("✅ Extraction GPT-4 terminée", {
      streamSid,
      extractedData,
      event: "extraction_completed",
      timestamp: new Date().toISOString(),
    });
  },

  // Sauvegarde API
  apiCallStarted: (streamSid, endpoint) => {
    logger.info("🌐 Appel API démarré", {
      streamSid,
      endpoint,
      event: "api_call_started",
      timestamp: new Date().toISOString(),
    });
  },

  apiCallCompleted: (streamSid, response) => {
    logger.info("✅ Appel API terminé", {
      streamSid,
      responseStatus: response.status,
      event: "api_call_completed",
      timestamp: new Date().toISOString(),
    });
  },

  // Erreurs
  error: (streamSid, error, context = {}) => {
    logger.error("❌ Erreur détectée", {
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
    logger.info("⏱️ Performance", {
      streamSid,
      operation,
      duration: `${duration}ms`,
      event: "performance",
      timestamp: new Date().toISOString(),
    });
  },

  // Appel terminé
  callCompleted: (streamSid, totalDuration) => {
    logger.info("🎉 Appel terminé avec succès", {
      streamSid,
      totalDuration: `${totalDuration}ms`,
      event: "call_completed",
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
