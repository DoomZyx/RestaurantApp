export default async function pingRoutes(fastify, options) {
  // Route simple pour garder le backend actif
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

  // Route health check pour Render
  fastify.get("/health", {
    handler: async (request, reply) => {
      return reply.code(200).send({
        status: "healthy",
        service: "RestaurantApp Backend",
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Route status avec plus de détails
  fastify.get("/status", {
    handler: async (request, reply) => {
      return reply.code(200).send({
        success: true,
        status: "running",
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

