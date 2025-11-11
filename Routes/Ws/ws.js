import { handleWebSocketConnection } from "../../Websocket/connection.js";

export default async function wsRoutes(fastify) {
  fastify.get("/media-stream", { websocket: true }, (connection, request) => {
    handleWebSocketConnection(connection);
  });
}
