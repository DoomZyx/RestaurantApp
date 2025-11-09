// @ts-nocheck
import Fastify from "fastify";
import wsRoutes from "./ws.js";

jest.mock("../../Websocket/connection.js", () => ({
  handleWebSocketConnection: jest.fn(),
}));

describe("Route /media-stream", () => {
  const fastify = Fastify();
  beforeAll(async () => {
    await fastify.register(import("@fastify/websocket"));
    await fastify.register(wsRoutes);
  });

  it("devrait exposer la route WebSocket", async () => {
    const routes = fastify.printRoutes();
    expect(routes).toContain("media-stream");
  });
});
