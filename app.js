import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyFormBody from "@fastify/formbody";
import fastifyWs from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import path from "path";
import { fileURLToPath } from "url";
import callRoutes from "./Routes/Calls/call.js";
import wsRoutes from "./Routes/Ws/ws.js";
import callDataRoutes from "./Routes/CallData/callData.js";
import processCallRoutes from "./Routes/CallData/processCall.js";
import authRoutes from "./Routes/Auth/auth.js";
import statsRoutes from "./Routes/Auth/stats.js";
import logsRoutes from "./Routes/Auth/logs.js";
import maintenanceRoutes from "./Routes/Auth/maintenance.js";
import notificationRoutes from "./Routes/Ws/notifications.js";
import orderRoutes from "./Routes/Appointments/appointments.js";
import pricingRoutes from "./Routes/Pricing/pricing.js";
import { supplierOrderPublicRoutes, supplierOrderProtectedRoutes } from "./Routes/SupplierOrders/supplierOrders.js";
import { AuthService } from "./Business/services/AuthService.js";
import audioCacheService from "./Services/audioCacheService.js";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function connectDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI manquant dans le fichier .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connecté avec succès");
  } catch (err) {
    console.error("Erreur de connexion MongoDB :", err);
    process.exit(1);
  }
}
await connectDB();

// Créer l'utilisateur admin par défaut
await AuthService.createDefaultAdmin();

// Initialiser le cache audio ElevenLabs
console.log("🎵 Initialisation du cache audio ElevenLabs...");
await audioCacheService.initialize();
console.log("✅ Cache audio prêt");

const fastify = Fastify();

await fastify.register(cors, {
  origin: true, // Accepter toutes les origines (important pour WebSocket Twilio)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "x-api-key",
    "Sec-WebSocket-Extensions",
    "Sec-WebSocket-Key",
    "Sec-WebSocket-Version"
  ],
});

fastify.register(fastifyFormBody);

// Configuration multipart pour les uploads de fichiers
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

// Servir les fichiers statiques (avatars, uploads)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "uploads"),
  prefix: "/uploads/",
  decorateReply: false,
});

console.log("📁 Dossier uploads servi sur /uploads/");

// Configuration WebSocket avec options pour maintenir les connexions actives
fastify.register(fastifyWs, {
  options: {
    perMessageDeflate: false, // Désactiver la compression pour les appels en temps réel
    clientTracking: true, // Garder trace des clients
    maxPayload: 100 * 1024 * 1024, // 100 MB pour les gros flux audio
    verifyClient: (info, callback) => {
      console.log("🔍 Vérification client WebSocket:", info.origin);
      callback(true); // Accepter toutes les connexions
    }
  }
});

fastify.register(callRoutes);
fastify.register(wsRoutes);
fastify.register(notificationRoutes);

// Routes orders publiques (système custom)
fastify.register(orderRoutes, { prefix: "/api" });

// Routes pricing publiques (système custom)
fastify.register(pricingRoutes, { prefix: "/api" });

// Routes publiques pour webhooks Twilio (supplier orders)
// Les webhooks /supplier-call et /supplier-stream doivent être publics
fastify.register(supplierOrderPublicRoutes);

fastify.register(async (instance) => {
  instance.addHook("onRequest", async (request, reply) => {
    const apiKey = String(request.headers["x-api-key"] ?? "").trim();
    if (!apiKey) {
      return reply.code(401).send({ error: "Clé API manquante" });
    }
    if (apiKey !== process.env.X_API_KEY) {
      return reply.code(401).send({ error: "Clé API invalide" });
    }
  });

  instance.register(callDataRoutes, { prefix: "/api" });
  instance.register(processCallRoutes, { prefix: "/api" });
  instance.register(authRoutes, { prefix: "/api/auth" });
  instance.register(statsRoutes, { prefix: "/api/auth" });
  instance.register(logsRoutes, { prefix: "/api/auth" });
  instance.register(maintenanceRoutes, { prefix: "/api/auth" });
  instance.register(supplierOrderProtectedRoutes, { prefix: "/api" });
});

// Gestion globale des erreurs
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error); // log complet côté serveur
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: true,
    message: error.message || "Erreur interne du serveur",
  });
});

export default fastify;