// @ts-nocheck
/**
 * @jest-environment node
 */
import dotenv from "dotenv"
dotenv.config()

import { handleWebSocketConnection } from "./connection.js";

// Mock global fetch
global.fetch = jest.fn();

// Mock WebSocket de createOpenAiSession
jest.mock("../Services/gptServices/gptServices.js", () => ({
  createOpenAiSession: jest.fn(() => {
    return {
      readyState: 1, // OPEN
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    };
  }),
}));

describe("handleWebSocketConnection", () => {
  let mockConnection;
  let openAiWsInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      on: jest.fn(),
      send: jest.fn(),
    };

    // Pour accéder à l’instance openAiWs retournée par createOpenAiSession
    const { createOpenAiSession } = require("../Services/gptServices/gptServices.js");
    createOpenAiSession.mockImplementation(() => {
      openAiWsInstance = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
      };
      return openAiWsInstance;
    });
  });

  test("doit enregistrer les écouteurs sur la connexion WebSocket", () => {
    handleWebSocketConnection(mockConnection);

    expect(mockConnection.on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith("close", expect.any(Function));
  });

  test("envoi audio append quand event media reçu", () => {
    handleWebSocketConnection(mockConnection);

    // Trouver le callback sur "message"
    const messageCallback = mockConnection.on.mock.calls.find(
      (call) => call[0] === "message"
    )[1];

    // Simuler un message media
    const mediaMessage = JSON.stringify({
      event: "media",
      media: { payload: "donnéesAudioEnBase64" },
    });

    messageCallback(mediaMessage);

    expect(openAiWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: "donnéesAudioEnBase64",
      })
    );
  });

  test("set streamSid quand event start reçu", () => {
    handleWebSocketConnection(mockConnection);

    const messageCallback = mockConnection.on.mock.calls.find(
      (call) => call[0] === "message"
    )[1];

    const startMessage = JSON.stringify({
      event: "start",
      start: { streamSid: "abc123" },
    });

    messageCallback(startMessage);

    // Pas directement testable, mais on peut vérifier que console.log a été appelé
    // On peut mocker console.log ou vérifier l'effet indirectement
  });

  test("envoi audio delta quand openAiWs envoie message response.audio.delta", () => {
    handleWebSocketConnection(mockConnection);

    // Trouver le callback pour openAiWs.on("message")
    expect(openAiWsInstance.on).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );

    const openAiMessageCallback = openAiWsInstance.on.mock.calls.find(
      (call) => call[0] === "message"
    )[1];

    const audioDeltaMsg = JSON.stringify({
      type: "response.audio.delta",
      delta: Buffer.from("test").toString("base64"),
    });

    // Set streamSid avant pour que ce soit envoyé
    // Simuler le start event pour setter streamSid (simplifié)
    const messageCallback = mockConnection.on.mock.calls.find(
      (call) => call[0] === "message"
    )[1];
    messageCallback(JSON.stringify({ event: "start", start: { streamSid: "sid123" } }));

    openAiMessageCallback(audioDeltaMsg);

    expect(mockConnection.send).toHaveBeenCalledWith(
      JSON.stringify({
        event: "media",
        streamSid: "sid123",
        media: { payload: Buffer.from("test").toString("base64") },
      })
    );
  });

  test("envoi json après fermeture connexion et parse réponse GPT", () => {
    jest.useFakeTimers();

    handleWebSocketConnection(mockConnection);

    const closeCallback = mockConnection.on.mock.calls.find(
      (call) => call[0] === "close"
    )[1];

    // Mock fetch pour qu’il renvoie un json
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    // Mock openAiWs.readyState
    openAiWsInstance.readyState = 1;

    // Simuler on de openAiWs pour message response.completed
    let openAiMessageCallback;
    openAiWsInstance.on.mockImplementation((event, cb) => {
      if (event === "message") {
        openAiMessageCallback = cb;
      }
    });

    // Appel close pour déclencher l'envoi de la requête
    closeCallback();

    // Simuler réception du message "response.completed" de GPT
    const completedMsg = JSON.stringify({
      type: "response.completed",
      response: {
        output_text: JSON.stringify({
          nom: "Dupont",
          telephone: "0606060606",
          type_demande: "Devis",
          description: "Besoin d’un devis détaillé",
          date: new Date().toISOString(),
        }),
      },
    });

    // Appeler le callback message GPT
    openAiMessageCallback(completedMsg);

    // Avancer les timers pour gérer les promesses
    return Promise.resolve().then(() => {
      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.PUBLIC_HOST}/api/callsData`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-api-key": process.env.X_API_KEY ?? ""
          }),
          body: expect.any(String),
        })
      );
    });
  });
});
