import PricingModel from "../../models/pricing.js";
import mongoose from "mongoose";
import { PricingValidator } from "../validators/PricingValidator.js";
import { VALID_SIZES } from "../../Config/defaults/pricingDefaults.js";

/**
 * Service de gestion des produits du menu
 */
export class ProductService {
  /**
   * Ajoute un nouveau produit à une catégorie
   * @param {string} category - Catégorie du produit
   * @param {Object} productData - Données du produit
   * @returns {Promise<Object>} Catégorie mise à jour
   */
  static async addProduct(category, productData) {
    // Validation
    const validation = PricingValidator.validateProduct(productData, category);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const pricing = await PricingModel.findOne();
    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    // Créer la catégorie si elle n'existe pas
    if (!pricing.menuPricing[category]) {
      console.log(`⚠️ Catégorie "${category}" inexistante, création automatique...`);
      pricing.menuPricing[category] = {
        nom: category.charAt(0).toUpperCase() + category.slice(1),
        produits: []
      };
      pricing.markModified('menuPricing');
      await pricing.save();
      console.log(`✅ Catégorie "${category}" créée`);
    }

    // Initialiser le tableau produits si nécessaire
    if (!pricing.menuPricing[category].produits) {
      pricing.menuPricing[category].produits = [];
      pricing.markModified('menuPricing');
      await pricing.save();
    }

    // Nettoyer et préparer le produit
    const produitNettoye = {
      _id: new mongoose.Types.ObjectId(),
      nom: productData.nom?.trim(),
      description: productData.description?.trim() || "",
      prixBase: parseFloat(productData.prixBase),
      disponible: Boolean(productData.disponible)
    };

    // Ajouter la taille selon la catégorie
    if (category === 'pizzas') {
      produitNettoye.taille = productData.taille || 'Moyenne';
    } else if (category === 'boissons') {
      produitNettoye.taille = productData.taille || '33cl';
    }

    // Ajouter les champs spécifiques aux tacos
    if (category === 'tacos') {
      produitNettoye.personnalisable = Boolean(productData.personnalisable);
      produitNettoye.maxViandes = parseInt(productData.maxViandes) || 1;
      produitNettoye.ingredientsInclus = productData.ingredientsInclus || {};
      produitNettoye.ingredientsDisponibles = productData.ingredientsDisponibles || {};
      produitNettoye.options = productData.options || {};
    }

    pricing.menuPricing[category].produits.push(produitNettoye);
    pricing.markModified('menuPricing');
    pricing.derniereModification = new Date();
    await pricing.save();

    console.log(`✅ Produit "${produitNettoye.nom}" ajouté à la catégorie "${category}"`);

    // Retourner le produit créé avec son _id
    return produitNettoye;
  }

  /**
   * Met à jour un produit existant
   * @param {string} category - Catégorie du produit
   * @param {string} productId - ID du produit
   * @param {Object} productData - Nouvelles données
   * @returns {Promise<Object>} Produit mis à jour
   */
  static async updateProduct(category, productId, productData) {
    console.log('🔍 ProductService.updateProduct appelé avec:', { category, productId, productData });
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    // Trouver le produit
    const produit = pricing.menuPricing[category]?.produits?.find(
      p => p._id && p._id.toString() === productId
    );

    if (!produit) {
      throw new Error("Produit non trouvé");
    }

    console.log('📝 Produit trouvé:', produit);

    // Validation
    const mergedData = { ...produit, ...productData };
    console.log('🔍 Données fusionnées pour validation:', mergedData);
    
    const validation = PricingValidator.validateProduct(mergedData, category);
    console.log('✅ Résultat de validation:', validation);
    
    if (!validation.isValid) {
      console.error('❌ Validation échouée:', validation.errors);
      throw new Error(validation.errors.join(', '));
    }

    // Nettoyer et mettre à jour
    const donneesMisesAJour = {
      nom: productData.nom?.trim() || produit.nom,
      description: productData.description?.trim() || produit.description,
      prixBase: parseFloat(productData.prixBase) || produit.prixBase,
      disponible: Boolean(productData.disponible)
    };

    // Gérer la taille selon la catégorie
    if (category === 'pizzas') {
      donneesMisesAJour.taille = productData.taille || produit.taille || 'Moyenne';
    } else if (category === 'boissons') {
      donneesMisesAJour.taille = productData.taille || produit.taille || '33cl';
    }

    // Gérer les champs spécifiques aux tacos (personnalisables)
    if (category === 'tacos') {
      if (productData.personnalisable !== undefined) {
        donneesMisesAJour.personnalisable = Boolean(productData.personnalisable);
      }
      if (productData.maxViandes !== undefined) {
        donneesMisesAJour.maxViandes = parseInt(productData.maxViandes);
      }
      if (productData.ingredientsInclus) {
        donneesMisesAJour.ingredientsInclus = productData.ingredientsInclus;
      }
      if (productData.ingredientsDisponibles) {
        donneesMisesAJour.ingredientsDisponibles = productData.ingredientsDisponibles;
      }
      if (productData.options !== undefined) {
        donneesMisesAJour.options = productData.options;
      }
    }

    Object.assign(produit, donneesMisesAJour);
    pricing.markModified('menuPricing');
    pricing.derniereModification = new Date();
    await pricing.save();

    console.log(`✅ Produit "${produit.nom}" mis à jour`);

    // Recharger et retourner le produit mis à jour
    const updated = await PricingModel.findOne();
    const updatedProduct = updated.toObject().menuPricing[category].produits.find(
      p => p._id.toString() === productId
    );

    return updatedProduct;
  }

  /**
   * Supprime un produit
   * @param {string} category - Catégorie du produit
   * @param {string} productId - ID du produit
   */
  static async deleteProduct(category, productId) {
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      throw new Error("Configuration des tarifs non trouvée");
    }

    // Vérifier que la catégorie existe
    if (!pricing.menuPricing[category]) {
      throw new Error(`Catégorie "${category}" non trouvée`);
    }

    // Filtrer pour supprimer le produit
    pricing.menuPricing[category].produits = pricing.menuPricing[category].produits.filter(
      p => p._id && p._id.toString() !== productId
    );

    pricing.markModified('menuPricing');
    pricing.derniereModification = new Date();
    await pricing.save();

    console.log(`✅ Produit ${productId} supprimé de la catégorie ${category}`);
  }
}

