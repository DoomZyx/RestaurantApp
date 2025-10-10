// @ts-nocheck
import { createOpenAiSession } from "./gptServices.js";
import WebSocket from "ws";

//Vérifies que la fonction createOpenAiSession() crée bien une connexion WebSocket avec OpenAI et envoie les bons headers.

jest.mock("ws");

describe("gptService", () => {
  beforeEach(() => {
    WebSocket.mockClear();
  });

  it("devrait créer une connexion WebSocket avec les bons headers", () => {
    createOpenAiSession("fake-api-key", "alloy");

    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining("wss://api.openai.com/v1/realtime"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fake-api-key",
          "OpenAI-Beta": "realtime=v1",
        }),
      })
    );
  });
});
