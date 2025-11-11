// @ts-nocheck
const Fastify = require("fastify");
const callRoutes = require("./callData.js"); // ta route
import * as callController from "../../Controller/callData.js";

describe("Route POST /api/callsData", () => {
  let fastify;

  beforeAll(() => {
    fastify = Fastify();
    fastify.log = { error: jest.fn() };
    fastify.register(callRoutes, { prefix: "/api/callsData" });
  });

  afterAll(() => fastify.close());

  it("doit sauvegarder un appel et retourner 201", async () => {
    const fakeSavedCall = {
      nom: "Dupont",
      telephone: "0606060606",
      type_demande: "Devis",
      description: "Besoin d’un devis pour un site e-commerce",
      date: new Date(),
      _id: "123abc",
    };
    jest.spyOn(callController, "saveCallData").mockResolvedValue(fakeSavedCall);

    const response = await fastify.inject({
      method: "POST",
      url: "/api/callsData/",
      payload: {
        nom: "Dupont",
        telephone: "0606060606",
        type_demande: "Devis",
        description: "Besoin d’un devis pour un site e-commerce",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.statusCode).toBe(201);
    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      nom: "Dupont",
      telephone: "0606060606",
      type_demande: "Devis",
      description: "Besoin d’un devis pour un site e-commerce",
    });
  });

  it("doit retourner une erreur 500 si saveCallData échoue", async () => {
    jest
      .spyOn(callController, "saveCallData")
      .mockRejectedValue(new Error("fail"));

    const response = await fastify.inject({
      method: "POST",
      url: "/api/callsData",
      payload: {
        nom: "Dupont",
        type_demande: "Devis",
      },
    });

    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.payload);
    expect(payload.error).toBe("Erreur interne lors de la sauvegarde");
  });

  it("doit retourner une erreur 400 si validation échoue", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/api/callsData/",
      payload: {
        telephone: "0606060606",
        type_demande: "Devis",
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("Route GET /api/callsData", () => {
  let fastify;

  beforeAll(() => {
    fastify = Fastify();
    // Mock logger minimal pour éviter erreurs
    fastify.log = { error: jest.fn() };
    fastify.register(callRoutes, { prefix: "/api/callsData" });
  });

  afterAll(() => fastify.close());

  it("doit retourner la liste des appels avec succès", async () => {
    const fakeCalls = [{ nom: "Dupont" }, { nom: "Durand" }];
    jest.spyOn(callController, "getAllCalls").mockResolvedValue(fakeCalls);

    const response = await fastify.inject({
      method: "GET",
      url: "/api/callsData/",
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual(fakeCalls);
  });

  it("doit gérer une erreur interne et retourner 500", async () => {
    jest
      .spyOn(callController, "getAllCalls")
      .mockRejectedValue(new Error("fail"));

    const response = await fastify.inject({
      method: "GET",
      url: "/api/callsData",
    });

    expect(response.statusCode).toBe(500);
    const payload = JSON.parse(response.payload);
    expect(payload.error).toBe("Erreur lors de la récupération des appels");
  });
});
