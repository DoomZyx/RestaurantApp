import { handleWebSocketConnection } from "../../Websocket/connection.js";

function getInstanceIdFromEnv() {
  const fromEnv = process.env.INSTANCE_ID != null ? String(process.env.INSTANCE_ID).trim() : "";
  return fromEnv || "inst_default";
}

export default async function wsRoutes(fastify) {
  fastify.get("/media-stream", { websocket: true }, (connection, request) => {
    handleWebSocketConnection(connection, request, getInstanceIdFromEnv());
  });
}
