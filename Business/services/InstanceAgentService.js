/**
 * Agent de gestion des instances vocales multi-tenant.
 * Crée/met à jour les instances, optionnellement configure Twilio.
 * Réponses au format JSON : { status, instanceId, twilioNumber, openAiKey, notes }.
 * Ne jamais logger les secrets (apiKey, twilioAuthToken).
 */

import crypto from "crypto";
import {
  InstanceModel,
  RESIDENCE_COUNTRIES,
} from "../../storage/models/Instance.js";
import { getDefaultPricingConfig } from "../../Config/defaults/pricingDefaults.js";
import { instanceConfigLoader } from "../../Config/instanceConfigLoader.js";
import PricingModel from "../../models/pricing.js";
import { encrypt, isEncryptionAvailable } from "../../utils/encryption.js";

const DEFAULT_INSTANCE_ID = "inst_default";

function maskOpenAiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return "[FALLBACK]";
  const t = apiKey.trim();
  if (t.length <= 8 || t.startsWith("enc:")) return "[SET]";
  return `${t.slice(0, 6)}***${t.slice(-4)}`;
}

/**
 * Crée ou récupère le pricing pour une instance.
 */
async function ensurePricingForInstance(instanceId, defaultConfig) {
  let pricing = await PricingModel.findOne({ instanceId });
  if (pricing) return pricing;
  return PricingModel.create({ ...defaultConfig, instanceId });
}

/**
 * Normalise le pays de résidence (FR, BE, LU).
 * @param {string} [code]
 * @returns {string}
 */
function normalizeCountryCode(code) {
  const c = code != null ? String(code).trim().toUpperCase() : "";
  return RESIDENCE_COUNTRIES.includes(c) ? c : "FR";
}

/**
 * Crée une instance (MongoDB) avec options complètes.
 * @param {Object} input - { name, plan, slug?, countryCode?, openAi?, audio?, twilioNumbers? }
 * @returns {Promise<Object>} { status, instanceId, twilioNumber, openAiKey, notes }
 */
export async function createInstance(input) {
  const {
    name,
    plan,
    slug,
    countryCode,
    openAi = {},
    audio = {},
    twilioNumbers = [],
  } = input;
  const instanceId = `inst_${crypto.randomBytes(10).toString("hex")}`;
  const finalSlug =
    (slug || name || "instance")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "instance";

  const existing = await InstanceModel.findOne({ slug: finalSlug });
  if (existing) {
    return {
      status: "error",
      instanceId: existing.instanceId,
      twilioNumber:
        (existing.twilioNumbers && existing.twilioNumbers[0]) || null,
      openAiKey: "[CONFLICT]",
      notes: `Slug déjà utilisé: ${finalSlug}`,
    };
  }

  const rawApiKey =
    openAi.apiKey && String(openAi.apiKey).trim()
      ? openAi.apiKey.trim()
      : undefined;
  const storedApiKey =
    rawApiKey && isEncryptionAvailable() && !rawApiKey.startsWith("enc:")
      ? encrypt(rawApiKey)
      : rawApiKey;

  const instance = await InstanceModel.create({
    instanceId,
    name: name || "Instance",
    slug: finalSlug,
    plan: plan || "echauffement",
    status: "active",
    countryCode: normalizeCountryCode(countryCode),
    twilioNumbers: Array.isArray(twilioNumbers) ? twilioNumbers : [],
    openAi: {
      apiKey: storedApiKey,
      projectId:
        openAi.projectId && String(openAi.projectId).trim()
          ? openAi.projectId.trim()
          : undefined,
      model: openAi.model || "gpt-realtime-mini-2025-12-15",
      voice: openAi.voice || "ballad",
    },
    audio: {
      enableNoiseReduction: audio.enableNoiseReduction !== false,
    },
  });

  await ensurePricingForInstance(instanceId, getDefaultPricingConfig());

  const storedOpenAiKey = instance.openAi?.apiKey;
  const twilioNumber =
    (instance.twilioNumbers && instance.twilioNumbers[0]) || null;

  return {
    status: "created",
    instanceId,
    twilioNumber,
    openAiKey: storedOpenAiKey ? maskOpenAiKey(storedOpenAiKey) : "[FALLBACK]",
    notes: `Instance créée ; webhook: POST /twilio/${finalSlug}/incoming-call`,
  };
}

/**
 * Met à jour une instance existante (openAi, audio, twilioNumbers, status).
 * Invalide le cache instanceConfigLoader.
 * @param {string} instanceId
 * @param {Object} input - { openAi?, audio?, twilioNumbers?, status?, name?, plan? }
 * @returns {Promise<Object>} { status, instanceId, twilioNumber, openAiKey, notes }
 */
export async function updateInstance(instanceId, input) {
  const instance = await InstanceModel.findOne({ instanceId }).lean();
  if (!instance) {
    return {
      status: "error",
      instanceId,
      twilioNumber: null,
      openAiKey: null,
      notes: "Instance non trouvée",
    };
  }

  const update = { updatedAt: new Date() };
  if (input.name != null) update.name = input.name;
  if (input.plan != null) update.plan = input.plan;
  if (
    input.status != null &&
    ["active", "suspended", "closed"].includes(input.status)
  )
    update.status = input.status;
  if (input.countryCode !== undefined)
    update.countryCode = normalizeCountryCode(input.countryCode);
  if (Array.isArray(input.twilioNumbers))
    update.twilioNumbers = input.twilioNumbers;

  if (input.openAi && typeof input.openAi === "object") {
    update.openAi = { ...instance.openAi, ...input.openAi };
    if (input.openAi.apiKey !== undefined) {
      const raw =
        input.openAi.apiKey && String(input.openAi.apiKey).trim()
          ? input.openAi.apiKey.trim()
          : undefined;
      update.openAi.apiKey =
        raw && isEncryptionAvailable() && !raw.startsWith("enc:")
          ? encrypt(raw)
          : raw;
    }
    if (input.openAi.projectId !== undefined) {
      update.openAi.projectId =
        input.openAi.projectId && String(input.openAi.projectId).trim()
          ? input.openAi.projectId.trim()
          : undefined;
    }
  }

  if (input.audio && typeof input.audio === "object") {
    update.audio = {
      ...instance.audio,
      enableNoiseReduction: input.audio.enableNoiseReduction !== false,
    };
  }

  await InstanceModel.updateOne({ instanceId }, { $set: update });
  instanceConfigLoader.invalidate(instanceId);

  const updated = await InstanceModel.findOne({ instanceId }).lean();
  const twilioNumber =
    (updated.twilioNumbers && updated.twilioNumbers[0]) || null;
  const storedOpenAiKey = updated.openAi?.apiKey;

  return {
    status: "updated",
    instanceId,
    twilioNumber,
    openAiKey: storedOpenAiKey ? maskOpenAiKey(storedOpenAiKey) : "[FALLBACK]",
    notes: "Instance mise à jour ; cache config invalidé",
  };
}

/**
 * Réponse standard pour l'agent (lecture seule).
 */
export async function getInstanceReport(instanceId) {
  const instance = await InstanceModel.findOne({ instanceId }).lean();
  if (!instance) {
    return {
      status: "error",
      instanceId,
      twilioNumber: null,
      openAiKey: null,
      notes: "Instance non trouvée",
    };
  }
  const hasKey = !!(
    instance.openAi && String(instance.openAi.apiKey || "").trim()
  );
  return {
    status: "ok",
    instanceId: instance.instanceId,
    twilioNumber: (instance.twilioNumbers && instance.twilioNumbers[0]) || null,
    openAiKey: hasKey ? "[SET]" : "[FALLBACK]",
    notes: `slug=${instance.slug} plan=${instance.plan} voice=${instance.openAi?.voice || "ballad"}`,
  };
}
