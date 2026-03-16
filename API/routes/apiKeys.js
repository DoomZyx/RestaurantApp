import { ApiKeyService } from "../services/ApiKeyService.js";
import { ApiKeyModel } from "../../storage/models/ApiKey.js";
import { InstanceModel } from "../../storage/models/Instance.js";

export default async function apiKeyRoutes(fastify) {
  fastify.post("/api/instances/:instanceId/api-keys", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          label: { type: "string" },
          scopes: { type: "array", items: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const { instanceId } = request.params;
    const { label, scopes } = request.body || {};

    const inst = await InstanceModel.findOne({ instanceId }).lean();
    if (!inst) return reply.code(404).send({ error: "Instance non trouvée" });

    const { apiKey } = await ApiKeyService.createForInstance(instanceId, {
      label: label || "manual",
      scopes: Array.isArray(scopes) && scopes.length ? scopes : ["voice:connect", "api:write"],
    });

    return reply.code(201).send({ apiKey });
  });

  fastify.get("/api/instances/:instanceId/api-keys", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const { instanceId } = request.params;
    const inst = await InstanceModel.findOne({ instanceId }).lean();
    if (!inst) return reply.code(404).send({ error: "Instance non trouvée" });

    const keys = await ApiKeyModel.find({ instanceId, revokedAt: null })
      .select("label scopes createdAt lastUsedAt")
      .lean();
    return reply.send({ apiKeys: keys });
  });

  fastify.patch("/api/instances/:instanceId/api-keys/:keyId", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId", "keyId"],
        properties: { instanceId: { type: "string" }, keyId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: { revoked: { type: "boolean" } },
      },
    },
  }, async (request, reply) => {
    const { instanceId, keyId } = request.params;
    const { revoked } = request.body || {};

    const key = await ApiKeyModel.findOne({ _id: keyId, instanceId });
    if (!key) return reply.code(404).send({ error: "Clé non trouvée" });

    if (revoked) {
      key.revokedAt = new Date();
      await key.save();
      return reply.send({ revoked: true });
    }
    return reply.send(key.toObject());
  });
}
