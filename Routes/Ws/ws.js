import { handleWebSocketConnection } from "../../Connection/connection.js";

export default async function wsRoutes(fastify) {
  fastify.get("/media-stream", { websocket: true }, (connection, request) => {
    console.log("🎯 Route /media-stream appelée");
    console.log("   - IP:", request.ip);
    console.log("   - Headers:", request.headers['user-agent']);
    handleWebSocketConnection(connection);
  });
}
