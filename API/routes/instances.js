import { InstanceModel } from "../../storage/models/Instance.js";
import { ApiKeyService } from "../services/ApiKeyService.js";
import {
  createInstance,
  updateInstance,
  getInstanceReport,
} from "../../Business/services/InstanceAgentService.js";
import { provisionTwilioForInstance } from "../../Business/services/TwilioProvisioningService.js";
import { createProjectAndServiceAccount } from "../../Business/services/OpenAITenantProvisioningService.js";
import { AuthService } from "../../Business/services/AuthService.js";
import { encrypt, isEncryptionAvailable } from "../../utils/encryption.js";

export default async function instanceRoutes(fastify) {
  fastify.get("/api/instances", {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            instances: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instanceId: { type: "string" },
                  name: { type: "string" },
                  slug: { type: "string" },
                  plan: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    // audit-fix: filtrer par tenant (éviter fuite inter-tenant); clé serveur (inst_default) => liste vide
    const instanceId = request.instanceId;
    if (instanceId === "inst_default") {
      return reply.send({ instances: [] });
    }
    const list = await InstanceModel.find({ instanceId })
      .select("instanceId name slug plan status createdAt")
      .lean();
    return reply.send({ instances: list });
  });

  fastify.get("/api/instances/:instanceId", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const { instanceId: paramId } = request.params;
    // audit-fix: un tenant ne peut accéder qu'à sa propre instance (sauf clé serveur inst_default)
    const tenantInstanceId = request.instanceId;
    if (tenantInstanceId !== "inst_default" && tenantInstanceId !== paramId) {
      return reply.code(403).send({ error: "Accès non autorisé à cette instance" });
    }
    const instance = await InstanceModel.findOne({ instanceId: paramId })
      .select("-openAi.apiKey -twilioAuthToken")
      .lean();
    if (!instance) return reply.code(404).send({ error: "Instance non trouvée" });
    return reply.send(instance);
  });

  /** Rapport agent (JSON standard : status, instanceId, twilioNumber, openAiKey, notes) */
  fastify.get("/api/instances/:instanceId/report", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
    },
  }, async (request, reply) => {
    const { instanceId } = request.params;
    const report = await getInstanceReport(instanceId);
    if (report.status === "error") return reply.code(404).send(report);
    return reply.send(report);
  });

  fastify.post("/api/instances", {
    schema: {
      body: {
        type: "object",
        required: ["plan"],
        properties: {
          clientId: { type: "string" },
          name: { type: "string" },
          plan: { type: "string" },
          slug: { type: "string" },
          /** Pays de résidence du client : FR, BE ou LU (obligatoire pour achat numéro cohérent). */
          countryCode: { type: "string", enum: ["FR", "BE", "LU"] },
          twilioNumbers: { type: "array", items: { type: "string" } },
          openAi: {
            type: "object",
            properties: {
              apiKey: { type: "string" },
              model: { type: "string" },
              voice: { type: "string" },
            },
          },
          audio: {
            type: "object",
            properties: {
              enableNoiseReduction: { type: "boolean" },
            },
          },
          provisionOpenAi: { type: "boolean" },
          provisionTwilio: { type: "boolean" },
          provisionTwilioSubaccount: { type: "boolean" },
          buyOnMainAccount: { type: "boolean" },
          twilioCountryCode: { type: "string" },
          twilioAreaCode: { type: "string" },
          /** Email + mot de passe pour créer le premier utilisateur (connexion à l'app après paiement). */
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          username: { type: "string", minLength: 3, maxLength: 30 },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body || {};
    const provisionOpenAi = body.provisionOpenAi === true;

    if (provisionOpenAi) {
      const clientId = body.clientId != null ? String(body.clientId).trim() : "";
      if (!clientId) {
        return reply.code(400).send({
          status: "error",
          instanceId: null,
          twilioNumber: null,
          openAiKey: null,
          notes: "provisionOpenAi exige clientId",
        });
      }
      if (!isEncryptionAvailable()) {
        return reply.code(500).send({
          status: "error",
          instanceId: null,
          twilioNumber: null,
          openAiKey: null,
          notes: "OPENAI_KEY_ENCRYPTION_SECRET requis pour provisionner une clé OpenAI",
        });
      }

      const openAiProvision = await createProjectAndServiceAccount(clientId);
      if (!openAiProvision.success) {
        return reply.code(502).send({
          status: "error",
          instanceId: null,
          twilioNumber: null,
          openAiKey: null,
          notes: openAiProvision.error || "Échec provision OpenAI",
        });
      }

      const slugBase = `tenant-${clientId.replace(/[^a-z0-9-_]/gi, "-")}`.replace(/-+/g, "-") || "tenant";
      const openAiPayload = {
        apiKey: encrypt(openAiProvision.apiKey),
        projectId: openAiProvision.projectId,
        model: body.openAi?.model || "gpt-4o-realtime-mini",
        voice: body.openAi?.voice || "ballad",
      };

      const result = await createInstance({
        name: body.name || clientId,
        plan: body.plan,
        slug: body.slug || slugBase,
        countryCode: body.countryCode,
        twilioNumbers: body.twilioNumbers || [],
        openAi: openAiPayload,
        audio: body.audio,
      });

      if (result.status === "error" && result.notes?.includes("Slug déjà utilisé")) {
        return reply.code(409).send(result);
      }

      const { apiKey } = await ApiKeyService.createForInstance(result.instanceId, {
        label: "primary",
        scopes: ["voice:connect", "api:write"],
      });
      const payload = { ...result, apiKey };
      payload.openAiKey = "[SET]";
      const notesParts = ["Projet OpenAI créé, clé stockée (chiffrée)"];
      if (body.email) {
        try {
          await AuthService.createUserForInstance(result.instanceId, {
            email: body.email,
            password: body.password || undefined,
            username: body.username,
            role: "admin",
          });
          notesParts.push("Utilisateur admin créé (connexion app ou via session site)");
        } catch (err) {
          return reply.code(409).send({
            status: "error",
            instanceId: result.instanceId,
            twilioNumber: result.twilioNumber,
            openAiKey: "[SET]",
            notes: err.message || "Création utilisateur impossible",
          });
        }
      }
      if (body.provisionTwilio) {
        const twilioResult = await provisionTwilioForInstance(result.instanceId, {
          provisionSubaccount: body.provisionTwilioSubaccount,
          buyOnMainAccount: body.buyOnMainAccount,
          countryCode: body.twilioCountryCode ?? body.countryCode,
          areaCode: body.twilioAreaCode,
        });
        payload.twilioNumber = twilioResult.twilioNumber ?? result.twilioNumber;
        notesParts.push(twilioResult.notes || "Twilio provisionné");
      } else {
        notesParts.push(result.notes);
      }
      payload.notes = notesParts.filter(Boolean).join(" ; ");
      return reply.code(201).send(payload);
    }

    const name = body.name != null ? String(body.name).trim() : "";
    if (!name) {
      return reply.code(400).send({
        status: "error",
        instanceId: null,
        twilioNumber: null,
        openAiKey: null,
        notes: "name requis (ou clientId + provisionOpenAi)",
      });
    }

    const result = await createInstance({
      name: body.name,
      plan: body.plan,
      slug: body.slug,
      countryCode: body.countryCode,
      twilioNumbers: body.twilioNumbers,
      openAi: body.openAi,
      audio: body.audio,
    });
    if (result.status === "error" && result.notes?.includes("Slug déjà utilisé")) {
      return reply.code(409).send(result);
    }
    const { apiKey } = await ApiKeyService.createForInstance(result.instanceId, {
      label: "primary",
      scopes: ["voice:connect", "api:write"],
    });
    const payload = { ...result, apiKey };
    if (body.email) {
      try {
        await AuthService.createUserForInstance(result.instanceId, {
          email: body.email,
          password: body.password || undefined,
          username: body.username,
          role: "admin",
        });
      } catch (err) {
        return reply.code(409).send({
          status: "error",
          instanceId: result.instanceId,
          twilioNumber: result.twilioNumber,
          openAiKey: result.openAiKey,
          notes: err.message || "Création utilisateur impossible",
        });
      }
    }
    if (body.provisionTwilio) {
      const twilioResult = await provisionTwilioForInstance(result.instanceId, {
        provisionSubaccount: body.provisionTwilioSubaccount,
        buyOnMainAccount: body.buyOnMainAccount,
        countryCode: body.twilioCountryCode ?? body.countryCode,
        areaCode: body.twilioAreaCode,
      });
      payload.twilioNumber = twilioResult.twilioNumber ?? result.twilioNumber;
      payload.notes = [result.notes, twilioResult.notes].filter(Boolean).join(" ; ");
    } else {
      const slug =
        (body.slug || body.name || "instance").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "instance";
      payload.twilioWebhookUrl = `https://${process.env.VOICE_GATEWAY_PUBLIC_HOST || process.env.PUBLIC_HOST || "localhost:3001"}/twilio/${slug}/incoming-call`;
    }
    return reply.code(201).send(payload);
  });

  fastify.patch("/api/instances/:instanceId", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          plan: { type: "string" },
          status: { type: "string", enum: ["active", "suspended", "closed"] },
          countryCode: { type: "string", enum: ["FR", "BE", "LU"] },
          twilioNumbers: { type: "array", items: { type: "string" } },
          openAi: {
            type: "object",
            properties: {
              apiKey: { type: "string" },
              model: { type: "string" },
              voice: { type: "string" },
            },
          },
          audio: {
            type: "object",
            properties: {
              enableNoiseReduction: { type: "boolean" },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { instanceId } = request.params;
    const result = await updateInstance(instanceId, request.body || {});
    if (result.status === "error") return reply.code(404).send(result);
    return reply.send(result);
  });

  /** Provisioning Twilio : webhook sur numéro existant, achat sur compte principal ou subaccount */
  fastify.post("/api/instances/:instanceId/provision-twilio", {
    schema: {
      params: {
        type: "object",
        required: ["instanceId"],
        properties: { instanceId: { type: "string" } },
      },
      body: {
        type: "object",
        properties: {
          provisionSubaccount: { type: "boolean" },
          buyOnMainAccount: { type: "boolean" },
          countryCode: { type: "string", enum: ["FR", "BE", "LU"] },
          areaCode: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { instanceId } = request.params;
    const body = request.body || {};
    const result = await provisionTwilioForInstance(instanceId, {
      provisionSubaccount: body.provisionSubaccount,
      buyOnMainAccount: body.buyOnMainAccount,
      countryCode: body.countryCode != null && body.countryCode !== "" ? body.countryCode : undefined,
      areaCode: body.areaCode,
    });
    if (result.status === "error") return reply.code(400).send(result);
    return reply.send(result);
  });
}
