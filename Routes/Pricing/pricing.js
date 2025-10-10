import {
  createOrUpdatePricing,
  getPricing,
  calculateDeliveryFees,
  getAvailableProducts,
  checkRestaurantAvailability,
  addProduct,
  updateProduct,
  deleteProduct,
  getPricingForGPT
} from "../../Controller/pricingController.js";

export default async function pricingRoutes(fastify, options) {
  
  // Récupérer la configuration des tarifs
  fastify.get("/pricing", getPricing);

  // Créer ou mettre à jour la configuration des tarifs
  fastify.put("/pricing", {
    schema: {
      tags: ["Pricing"],
      summary: "Créer ou mettre à jour la configuration des tarifs",
      body: {
        type: "object",
        properties: {
          restaurantInfo: { type: "object" },
          menuPricing: { type: "object" },
          deliveryPricing: { type: "object" },
          promotions: { type: "array" },
          taxes: { type: "object" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            message: { type: "string" }
          }
        }
      }
    }
  }, createOrUpdatePricing);

  // Calculer les frais de livraison
  fastify.get("/pricing/delivery/calculate", {
    schema: {
      tags: ["Pricing"],
      summary: "Calculer les frais de livraison",
      querystring: {
        type: "object",
        properties: {
          distance: { type: "number" }
        },
        required: ["distance"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, calculateDeliveryFees);

  // Récupérer les produits disponibles par catégorie
  fastify.get("/pricing/products/:categorie", {
    schema: {
      tags: ["Pricing"],
      summary: "Récupérer les produits disponibles par catégorie",
      params: {
        type: "object",
        properties: {
          categorie: { type: "string" }
        },
        required: ["categorie"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, getAvailableProducts);

  // Vérifier la disponibilité du restaurant
  fastify.get("/pricing/availability", {
    schema: {
      tags: ["Pricing"],
      summary: "Vérifier la disponibilité du restaurant",
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" }
          }
        }
      }
    }
  }, checkRestaurantAvailability);

  // Ajouter un nouveau produit
  fastify.post("/pricing/products", {
    schema: {
      tags: ["Pricing"],
      summary: "Ajouter un nouveau produit",
      body: {
        type: "object",
        properties: {
          categorie: { type: "string" },
          produit: {
            type: "object",
            properties: {
              nom: { type: "string" },
              description: { type: "string" },
              prixBase: { type: "number" },
              taille: { type: "string" },
              disponible: { type: "boolean" }
            },
            required: ["nom", "prixBase"]
          }
        },
        required: ["categorie", "produit"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            message: { type: "string" }
          }
        }
      }
    }
  }, addProduct);

  // Mettre à jour un produit
  fastify.put("/pricing/products", {
    schema: {
      tags: ["Pricing"],
      summary: "Mettre à jour un produit",
      body: {
        type: "object",
        properties: {
          categorie: { type: "string" },
          produitId: { type: "string" },
          produitData: { type: "object" }
        },
        required: ["categorie", "produitId", "produitData"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            message: { type: "string" }
          }
        }
      }
    }
  }, updateProduct);

  // Supprimer un produit
  fastify.delete("/pricing/products/:categorie/:produitId", {
    schema: {
      tags: ["Pricing"],
      summary: "Supprimer un produit",
      params: {
        type: "object",
        properties: {
          categorie: { type: "string" },
          produitId: { type: "string" }
        },
        required: ["categorie", "produitId"]
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        }
      }
    }
  }, deleteProduct);

  // Récupérer la configuration pour GPT (format simplifié)
  fastify.get("/pricing/gpt", getPricingForGPT);
}
