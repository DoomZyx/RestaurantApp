import { VALID_SIZES } from "../../Config/defaults/pricingDefaults.js";

/**
 * Validation des données de tarification
 */
export class PricingValidator {
  /**
   * Valide les données d'un produit
   * @param {Object} product - Produit à valider
   * @param {string} category - Catégorie du produit
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateProduct(product, category) {
    const errors = [];

    if (!product.nom || product.nom.trim().length === 0) {
      errors.push("Le nom du produit est obligatoire");
    }

    if (!product.prixBase || parseFloat(product.prixBase) <= 0) {
      errors.push("Le prix doit être supérieur à 0");
    }

    // Validation de la taille si applicable
    if (category === 'pizzas' && product.taille) {
      if (!VALID_SIZES.pizzas.includes(product.taille)) {
        errors.push(`Taille invalide pour les pizzas. Valeurs acceptées: ${VALID_SIZES.pizzas.join(', ')}`);
      }
    }

    if (category === 'boissons' && product.taille) {
      if (!VALID_SIZES.boissons.includes(product.taille)) {
        errors.push(`Taille invalide pour les boissons. Valeurs acceptées: ${VALID_SIZES.boissons.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide une distance de livraison
   * @param {number} distance - Distance en km
   * @returns {boolean}
   */
  static validateDistance(distance) {
    return !isNaN(distance) && distance >= 0;
  }

  /**
   * Valide une catégorie
   * @param {string} category - Nom de la catégorie
   * @returns {boolean}
   */
  static validateCategory(category) {
    return category && typeof category === 'string' && category.length > 0;
  }
}

