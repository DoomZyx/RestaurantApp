import PricingModel from "../../models/pricing.js";
import { getDefaultPricingConfig } from "../../Config/defaults/pricingDefaults.js";

const DEFAULT_INSTANCE_ID = "inst_default";

function resolveInstanceId(instanceId) {
  return instanceId != null && String(instanceId).trim() !== "" ? String(instanceId).trim() : DEFAULT_INSTANCE_ID;
}

/**
 * Service de gestion de la configuration des tarifs (multi-tenant par instanceId)
 */
export class PricingService {
  /**
   * Récupère la configuration des tarifs pour une instance
   * @param {string} [instanceId] - ID instance (défaut: inst_default)
   * @returns {Promise<Object>} Configuration des tarifs
   */
  static async getPricing(instanceId) {
    const id = resolveInstanceId(instanceId);
    let pricing = await PricingModel.findOne({ instanceId: id });

    if (!pricing) {
      const defaultConfig = getDefaultPricingConfig();
      pricing = await PricingModel.create({ ...defaultConfig, instanceId: id });
    }

    return pricing.toObject();
  }

  /**
   * Crée ou met à jour la configuration des tarifs pour une instance
   * @param {Object} pricingData - Nouvelles données de tarification (peut contenir instanceId)
   * @param {string} [instanceId] - ID instance si non fourni dans pricingData
   * @returns {Promise<Object>} Configuration mise à jour
   */
  static async createOrUpdatePricing(pricingData, instanceId) {
    const id = resolveInstanceId(pricingData?.instanceId ?? instanceId);
    let pricing = await PricingModel.findOne({ instanceId: id });

    if (pricing) {
      const dataToAssign = { ...pricingData, instanceId: id };
      if (dataToAssign.restaurantInfo && typeof dataToAssign.restaurantInfo === "object") {
        dataToAssign.restaurantInfo = {
          ...(pricing.restaurantInfo?.toObject ? pricing.restaurantInfo.toObject() : pricing.restaurantInfo || {}),
          ...dataToAssign.restaurantInfo,
        };
      }
      Object.assign(pricing, dataToAssign);
      pricing.markModified("menuPricing");
      pricing.markModified("restaurantInfo");
      pricing.markModified("restaurantInfo.horairesOuverture");
      if (pricing.deliveryPricing) pricing.markModified("deliveryPricing");
      pricing.derniereModification = new Date();
      await pricing.save();
    } else {
      pricing = await PricingModel.create({ ...pricingData, instanceId: id });
    }

    const updated = await PricingModel.findOne({ instanceId: id });
    if (!updated) throw new Error("Configuration non trouvée après sauvegarde");
    return updated.toObject();
  }

  /**
   * Crée ou met à jour la config pricing pour une instance (utilisé par provisioning)
   */
  static async createOrUpdatePricingForInstance(instanceId, defaultConfig) {
    const id = resolveInstanceId(instanceId);
    let pricing = await PricingModel.findOne({ instanceId: id });
    if (pricing) {
      Object.assign(pricing, defaultConfig);
      pricing.markModified("menuPricing");
      pricing.markModified("restaurantInfo");
      pricing.derniereModification = new Date();
      await pricing.save();
    } else {
      pricing = await PricingModel.create({ ...defaultConfig, instanceId: id });
    }
    return pricing.toObject();
  }

  /**
   * Vérifie la disponibilité du restaurant pour une instance
   * @param {string} [instanceId]
   * @returns {Promise<Object>} { disponible, horaires, restaurantInfo }
   */
  static async checkAvailability(instanceId) {
    const id = resolveInstanceId(instanceId);
    const pricing = await PricingModel.findOne({ instanceId: id });
    if (!pricing) throw new Error("Configuration des tarifs non trouvée");
    const disponible = pricing.verifierDisponibilite();
    return {
      disponible,
      horaires: pricing.restaurantInfo.horairesOuverture,
      restaurantInfo: pricing.restaurantInfo
    };
  }

  /**
   * Récupère les produits disponibles d'une catégorie pour une instance
   */
  static async getAvailableProducts(category, instanceId) {
    const id = resolveInstanceId(instanceId);
    const pricing = await PricingModel.findOne({ instanceId: id });
    if (!pricing) throw new Error("Configuration des tarifs non trouvée");
    const produits = pricing.obtenirProduitsDisponibles(category);
    return { categorie: category, produits };
  }

  /**
   * Récupère la configuration formatée pour GPT pour une instance
   */
  static async getPricingForGPT(instanceId) {
    const id = resolveInstanceId(instanceId);
    const pricing = await PricingModel.findOne({ instanceId: id });
    if (!pricing) throw new Error("Configuration des tarifs non trouvée");
    const gptData = {
      restaurantInfo: pricing.restaurantInfo,
      menu: {},
      availability: pricing.verifierDisponibilite()
    };
    Object.keys(pricing.menuPricing || {}).forEach((categorie) => {
      gptData.menu[categorie] = {
        nom: pricing.menuPricing[categorie].nom,
        produits: (pricing.menuPricing[categorie].produits || [])
          .filter((p) => p.disponible)
          .map((p) => ({ nom: p.nom, description: p.description, prix: p.prixBase }))
      };
    });
    return gptData;
  }

  /**
   * Récupère l'état de la ligne téléphonique pour une instance
   */
  static async getPhoneLineEnabled(instanceId) {
    const id = resolveInstanceId(instanceId);
    const pricing = await PricingModel.findOne({ instanceId: id });
    if (!pricing) return true;
    return pricing.phoneLineEnabled !== false;
  }

  /**
   * Met à jour l'état de la ligne téléphonique pour une instance
   */
  static async updatePhoneLineEnabled(enabled, instanceId) {
    const id = resolveInstanceId(instanceId);
    let pricing = await PricingModel.findOne({ instanceId: id });
    if (!pricing) {
      const defaultConfig = getDefaultPricingConfig();
      pricing = await PricingModel.create({ ...defaultConfig, instanceId: id, phoneLineEnabled: !!enabled });
    } else {
      pricing.phoneLineEnabled = !!enabled;
      pricing.derniereModification = new Date();
      await pricing.save();
    }
    const updated = await PricingModel.findOne({ instanceId: id });
    return updated.toObject();
  }
}

