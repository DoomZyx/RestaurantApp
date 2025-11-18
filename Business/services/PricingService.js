import PricingModel from "../../models/pricing.js";
import { getDefaultPricingConfig } from "../../Config/defaults/pricingDefaults.js";

/**
 * Service de gestion de la configuration des tarifs
 */
export class PricingService {
  /**
   * Récupère la configuration des tarifs
   * Crée une configuration par défaut si elle n'existe pas
   * @returns {Promise<Object>} Configuration des tarifs
   */
  static async getPricing() {
    let pricing = await PricingModel.findOne();

    if (!pricing) {
      // Créer une configuration par défaut
      const defaultConfig = getDefaultPricingConfig();
      pricing = await PricingModel.create(defaultConfig);
    }

    return pricing.toObject();
  }

  /**
   * Crée ou met à jour la configuration des tarifs
   * @param {Object} pricingData - Nouvelles données de tarification
   * @returns {Promise<Object>} Configuration mise à jour
   */
  static async createOrUpdatePricing(pricingData) {
    let pricing = await PricingModel.findOne();

    if (pricing) {
      // Mettre à jour la configuration existante
      Object.assign(pricing, pricingData);
      
      // IMPORTANT : Marquer TOUS les objets imbriqués comme modifiés pour Mongoose
      pricing.markModified('menuPricing');
      pricing.markModified('restaurantInfo');
      pricing.markModified('restaurantInfo.horairesOuverture');
      pricing.markModified('deliveryPricing');
      
      pricing.derniereModification = new Date();
      await pricing.save();
    } else {
      // Créer une nouvelle configuration
      pricing = await PricingModel.create(pricingData);
    }

    // Recharger pour retourner des données propres
    const updated = await PricingModel.findOne();
    return updated.toObject();
  }

  /**
   * Vérifie la disponibilité du restaurant
   * @returns {Promise<Object>} { disponible, horaires, restaurantInfo }
   */
  static async checkAvailability() {
    const pricing = await PricingModel.findOne();

    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    const disponible = pricing.verifierDisponibilite();

    return {
      disponible,
      horaires: pricing.restaurantInfo.horairesOuverture,
      restaurantInfo: pricing.restaurantInfo
    };
  }

  /**
   * Récupère les produits disponibles d'une catégorie
   * @param {string} category - Nom de la catégorie
   * @returns {Promise<Array>} Liste des produits disponibles
   */
  static async getAvailableProducts(category) {
    const pricing = await PricingModel.findOne();

    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    const produits = pricing.obtenirProduitsDisponibles(category);

    return {
      categorie: category,
      produits
    };
  }

  /**
   * Récupère la configuration formatée pour GPT
   * @returns {Promise<Object>} Configuration simplifiée
   */
  static async getPricingForGPT() {
    const pricing = await PricingModel.findOne();

    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    // Format simplifié pour GPT
    const gptData = {
      restaurantInfo: pricing.restaurantInfo,
      menu: {},
      availability: pricing.verifierDisponibilite()
    };

    // Simplifier le menu pour GPT
    Object.keys(pricing.menuPricing).forEach(categorie => {
      gptData.menu[categorie] = {
        nom: pricing.menuPricing[categorie].nom,
        produits: pricing.menuPricing[categorie].produits
          .filter(p => p.disponible)
          .map(p => ({
            nom: p.nom,
            description: p.description,
            prix: p.prixBase
          }))
      };
    });

    return gptData;
  }
}

