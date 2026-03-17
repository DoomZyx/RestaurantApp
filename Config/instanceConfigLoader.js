/**
 * Chargeur de configuration par instance (multi-tenant).
 * Agrège Instance + Pricing + Prompts + options RNNoise pour les workers et le Gateway.
 */

import { InstanceModel } from "../storage/models/Instance.js";
import PricingModel from "../models/pricing.js";
import { decrypt } from "../utils/encryption.js";
import { getSystemMessage } from "./prompts.js";
import {
  buildGptPricingFromDoc,
  generateEnrichedPromptWithPricing
} from "../Services/gptServices/pricingService.js";
import { getSessionUpdatePayload } from "../Services/gptServices/gptServices.js";
import { callLogger } from "../Services/logging/logger.js";

const DEFAULT_INSTANCE_ID = "inst_default";
const TTL_MS = 60_000;

function resolveInstanceId(instanceId) {
  return instanceId != null && String(instanceId).trim() !== ""
    ? String(instanceId).trim()
    : DEFAULT_INSTANCE_ID;
}

class InstanceConfigLoader {
  constructor() {
    this.cache = new Map();
    this.ttlMs = TTL_MS;
  }

  _cacheKey(instanceId) {
    return resolveInstanceId(instanceId);
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.config;
    if (entry) this.cache.delete(key);
    return null;
  }

  _setCache(key, config) {
    this.cache.set(key, {
      config,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Récupère la configuration runtime complète pour une instance (OpenAI, audio, prompts).
   * @param {string} instanceId
   * @returns {Promise<Object>} { instance, pricing, restaurantInfo, openAi, audio, callLogger }
   */
  async getConfigByInstanceId(instanceId) {
    const id = this._cacheKey(instanceId);
    const cached = this._getCached(id);
    if (cached) return cached;

    const instance = await InstanceModel.findOne({ instanceId: id, status: "active" }).lean();
    if (!instance) {
      throw new Error(`Instance non trouvée ou inactive: ${id}`);
    }

    const pricingDoc = await PricingModel.findOne({ instanceId: id });
    const pricing = pricingDoc ? pricingDoc.toObject ? pricingDoc.toObject() : pricingDoc : null;
    const restaurantInfo = pricing?.restaurantInfo || null;

    const basePrompt = getSystemMessage(restaurantInfo);
    const gptPricing = buildGptPricingFromDoc(pricingDoc);
    const enrichedInstructions = generateEnrichedPromptWithPricing(basePrompt, gptPricing);

    const voice = instance.openAi?.voice || "ballad";
    const sessionUpdatePayload = {
      type: "session.update",
      session: getSessionUpdatePayload(voice, enrichedInstructions)
    };

    const storedKey = instance.openAi?.apiKey && String(instance.openAi.apiKey).trim() !== "" ? instance.openAi.apiKey : null;
    const apiKey = storedKey ? decrypt(storedKey) : process.env.OPENAI_API_KEY;

    const config = {
      instance,
      pricing,
      restaurantInfo,
      openAi: {
        apiKey,
        model: instance.openAi?.model,
        voice,
        sessionUpdatePayload
      },
      audio: {
        enableNoiseReduction: instance.audio?.enableNoiseReduction !== false
      },
      callLogger
    };

    this._setCache(id, config);
    return config;
  }

  /**
   * Résout une clé API brute vers instanceId et instance (pour Gateway / auth).
   * @param {string} rawKey
   * @returns {Promise<{ instanceId: string, instance: Object } | null>}
   */
  async getInstanceByApiKey(rawKey) {
    const { ApiKeyService } = await import("../API/services/ApiKeyService.js");
    const validated = await ApiKeyService.validate(rawKey);
    if (!validated) return null;
    const instance = await InstanceModel.findOne({ instanceId: validated.instanceId, status: "active" }).lean();
    if (!instance) return null;
    return { instanceId: validated.instanceId, instance };
  }

  /**
   * Invalide le cache pour une instance. À appeler après toute modification
   * de l'Instance (openAi, audio) ou du Pricing (menu, horaires, restaurantInfo).
   */
  invalidate(instanceId) {
    this.cache.delete(this._cacheKey(instanceId));
  }
}

export const instanceConfigLoader = new InstanceConfigLoader();
