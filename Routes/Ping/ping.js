import mongoose from "mongoose";
import logger from "#logger";

export default async function pingRoutes(fastify, options) {
  fastify.get("/ping", {
    handler: async (request, reply) => {
      return reply.code(200).send({
        success: true,
        message: "Backend actif",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    },
  });

  // Health check : vérifie MongoDB ; 503 si dépendance critique indisponible
  fastify.get("/health", {
    handler: async (request, reply) => {
      let db = "error";
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db.admin().command({ ping: 1 });
          db = "ok";
        }
      } catch (err) {
        logger.error({ err: err.message }, "Health check: MongoDB indisponible");
      }
      if (db !== "ok") {
        return reply.code(503).send({
          status: "degraded",
          service: "RestaurantApp Backend",
          db,
          timestamp: new Date().toISOString(),
        });
      }
      return reply.code(200).send({
        status: "healthy",
        service: "RestaurantApp Backend",
        db,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Route status avec plus de détails (inclut état DB)
  fastify.get("/status", {
    handler: async (request, reply) => {
      let db = "error";
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db.admin().command({ ping: 1 });
          db = "ok";
        }
      } catch {
        // déjà loggé par /health si besoin ; pas de 503 sur /status
      }
      return reply.code(200).send({
        success: true,
        status: "running",
        db,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB",
        },
      });
    },
  });
}

