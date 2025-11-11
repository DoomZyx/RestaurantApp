import { PricingService } from "../../Business/services/PricingService.js";
import { ProductService } from "../../Business/services/ProductService.js";
import { DeliveryService } from "../../Business/services/DeliveryService.js";
import { PricingTransformer } from "../../Business/transformers/PricingTransformer.js";

/**
 * Controller de gestion des tarifs et du menu
 */
export class PricingController {
  /**
   * Récupère la configuration des tarifs
   * GET /api/pricing
   */
  static async getPricing(request, reply) {
    try {
      const pricing = await PricingService.getPricing();

      return reply.send(
        PricingTransformer.successResponse(pricing)
      );
    } catch (error) {
      console.error("❌ Erreur getPricing:", error);

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Crée ou met à jour la configuration des tarifs
   * POST/PUT /api/pricing
   */
  static async createOrUpdatePricing(request, reply) {
    try {
      const pricing = await PricingService.createOrUpdatePricing(request.body);

      return reply.send(
        PricingTransformer.successResponse(
          pricing,
          "Configuration des tarifs mise à jour avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur createOrUpdatePricing:", error);

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Calcule les frais de livraison
   * GET /api/pricing/delivery/calculate?distance=X
   */
  static async calculateDeliveryFees(request, reply) {
    try {
      const { distance } = request.query;
      const fees = await DeliveryService.calculateDeliveryFees(distance);

      return reply.send(
        PricingTransformer.successResponse(fees)
      );
    } catch (error) {
      console.error("❌ Erreur calculateDeliveryFees:", error);

      if (error.message.includes("non trouvée")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      if (error.message.includes("invalide")) {
        return reply.code(400).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Récupère les produits disponibles d'une catégorie
   * GET /api/pricing/products/:categorie
   */
  static async getAvailableProducts(request, reply) {
    try {
      const { categorie } = request.params;
      const products = await PricingService.getAvailableProducts(categorie);

      return reply.send(
        PricingTransformer.successResponse(products)
      );
    } catch (error) {
      console.error("❌ Erreur getAvailableProducts:", error);

      if (error.message.includes("non trouvée")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Vérifie la disponibilité du restaurant
   * GET /api/pricing/availability
   */
  static async checkRestaurantAvailability(request, reply) {
    try {
      const availability = await PricingService.checkAvailability();

      return reply.send(
        PricingTransformer.successResponse(availability)
      );
    } catch (error) {
      console.error("❌ Erreur checkRestaurantAvailability:", error);

      if (error.message.includes("non trouvée")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Ajoute un nouveau produit
   * POST /api/pricing/products
   */
  static async addProduct(request, reply) {
    try {
      const { categorie, produit } = request.body;
      const product = await ProductService.addProduct(categorie, produit);

      return reply.send(
        PricingTransformer.successResponse(
          { product },
          "Produit ajouté avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur addProduct:", error);

      if (error.message.includes("non trouvée")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      if (error.message.includes("obligatoire") || 
          error.message.includes("invalide") ||
          error.message.includes("supérieur")) {
        return reply.code(400).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Met à jour un produit existant
   * PUT /api/pricing/products
   */
  static async updateProduct(request, reply) {
    try {
      const { categorie, produitId, produitData } = request.body;
      console.log('📥 Backend reçoit updateProduct:', { categorie, produitId, produitData });
      
      const product = await ProductService.updateProduct(categorie, produitId, produitData);

      return reply.send(
        PricingTransformer.successResponse(
          product,
          "Produit mis à jour avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur updateProduct:", error);
      console.error("❌ Message d'erreur:", error.message);

      if (error.message.includes("non trouvé")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      if (error.message.includes("invalide")) {
        return reply.code(400).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Supprime un produit
   * DELETE /api/pricing/products/:categorie/:produitId
   */
  static async deleteProduct(request, reply) {
    try {
      const { categorie, produitId } = request.params;
      await ProductService.deleteProduct(categorie, produitId);

      return reply.send(
        PricingTransformer.successResponse(
          null,
          "Produit supprimé avec succès"
        )
      );
    } catch (error) {
      console.error("❌ Erreur deleteProduct:", error);

      if (error.message.includes("non trouvé")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }

  /**
   * Récupère la configuration pour GPT
   * GET /api/pricing/gpt
   */
  static async getPricingForGPT(request, reply) {
    try {
      const gptData = await PricingService.getPricingForGPT();

      return reply.send(
        PricingTransformer.successResponse(gptData)
      );
    } catch (error) {
      console.error("❌ Erreur getPricingForGPT:", error);

      if (error.message.includes("non trouvée")) {
        return reply.code(404).send(
          PricingTransformer.errorResponse(error.message)
        );
      }

      return reply.code(500).send(
        PricingTransformer.errorResponse(
          "Erreur interne du serveur",
          error.message
        )
      );
    }
  }
}

