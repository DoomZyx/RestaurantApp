import PricingModel from "../../models/pricing.js";
import { PricingValidator } from "../validators/PricingValidator.js";

/**
 * Service de gestion des livraisons
 */
export class DeliveryService {
  /**
   * Calcule les frais de livraison en fonction de la distance
   * @param {number} distance - Distance en km
   * @returns {Promise<Object>} Détails des frais de livraison
   */
  static async calculateDeliveryFees(distance) {
    // Validation
    if (!PricingValidator.validateDistance(distance)) {
      throw new Error("Distance invalide");
    }

    const pricing = await PricingModel.findOne();
    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    const fraisLivraison = pricing.calculerFraisLivraison(parseFloat(distance));

    if (fraisLivraison === null) {
      return {
        disponible: false,
        message: `Livraison non disponible au-delà de ${pricing.deliveryPricing.distanceMaximale}km`
      };
    }

    return {
      disponible: true,
      fraisLivraison,
      distance: parseFloat(distance),
      fraisBase: pricing.deliveryPricing.fraisBase,
      prixParKm: pricing.deliveryPricing.prixParKm,
      montantMinimum: pricing.deliveryPricing.montantMinimumCommande
    };
  }
}

