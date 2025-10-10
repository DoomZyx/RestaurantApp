import fastify from "./app.js";
import { config } from "./Config/env.js";



fastify.listen({ 
  port: config.PORT,
  host: '0.0.0.0' // Écouter sur toutes les interfaces (important pour ngrok)
}, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${config.PORT}/media-stream`);
});