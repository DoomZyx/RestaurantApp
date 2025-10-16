import PricingModel from "../models/pricing.js";
import mongoose from "mongoose";

// Créer ou mettre à jour la configuration des tarifs
export async function createOrUpdatePricing(request, reply) {
  try {
    const pricingData = request.body;

    // Chercher s'il existe déjà une configuration
    let pricing = await PricingModel.findOne();
    
    if (pricing) {
      // Mettre à jour la configuration existante
      Object.assign(pricing, pricingData);
      pricing.markModified('menuPricing'); // Nécessaire pour les champs Mixed
      pricing.derniereModification = new Date();
      await pricing.save();
    } else {
      // Créer une nouvelle configuration
      pricing = await PricingModel.create(pricingData);
    }

    // Recharger et retourner les données en format JSON pur
    const updatedPricingDoc = await PricingModel.findOne();
    const updatedPricing = updatedPricingDoc ? updatedPricingDoc.toObject() : null;

    return reply.send({
      success: true,
      data: updatedPricing,
      message: "Configuration des tarifs mise à jour avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des tarifs:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer la configuration des tarifs
export async function getPricing(request, reply) {
  try {
    const pricingDoc = await PricingModel.findOne();
    
    if (!pricingDoc) {
      // Créer une configuration par défaut si elle n'existe pas
      const newPricing = await PricingModel.create({
        restaurantInfo: {
          nom: "Mon Restaurant",
          adresse: "",
          telephone: "",
          email: "",
          horairesOuverture: {
            lundi: { ouvert: false, ouverture: "09:00", fermeture: "18:00" },
            mardi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
            mercredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
            jeudi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
            vendredi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
            samedi: { ouvert: true, ouverture: "09:00", fermeture: "18:00" },
            dimanche: { ouvert: false, ouverture: "09:00", fermeture: "18:00" }
          }
        },
        menuPricing: {
          pizzas: {
            nom: "Pizzas",
            produits: [
              { nom: "Margherita", description: "Tomate, mozzarella, basilic", prixBase: 12.50, taille: "Moyenne", disponible: true },
              { nom: "Pepperoni", description: "Tomate, mozzarella, pepperoni", prixBase: 14.50, taille: "Moyenne", disponible: true },
              { nom: "Quatre Fromages", description: "Mozzarella, gorgonzola, parmesan, chèvre", prixBase: 16.50, taille: "Moyenne", disponible: true }
            ]
          },
          burgers: {
            nom: "Burgers",
            produits: [
              { nom: "Cheeseburger", description: "Steak, cheddar, salade, tomate", prixBase: 11.50, disponible: true },
              { nom: "Bacon Burger", description: "Steak, bacon, cheddar, oignons", prixBase: 13.50, disponible: true },
              { nom: "Chicken Burger", description: "Poulet pané, salade, tomate", prixBase: 12.50, disponible: true }
            ]
          },
          salades: {
            nom: "Salades",
            produits: [
              { nom: "Salade César", description: "Salade, poulet, parmesan, croûtons", prixBase: 9.50, disponible: true },
              { nom: "Salade Grecque", description: "Salade, tomates, olives, feta", prixBase: 8.50, disponible: true }
            ]
          },
          boissons: {
            nom: "Boissons",
            produits: [
              { nom: "Coca-Cola", description: "Boisson gazeuse", prixBase: 2.50, taille: "33cl", disponible: true },
              { nom: "Eau", description: "Eau plate", prixBase: 2.00, taille: "33cl", disponible: true },
              { nom: "Jus d'orange", description: "Jus de fruits", prixBase: 3.00, taille: "33cl", disponible: true }
            ]
          },
          desserts: {
            nom: "Desserts",
            produits: [
              { nom: "Tiramisu", description: "Dessert italien", prixBase: 4.50, disponible: true },
              { nom: "Tarte aux pommes", description: "Tarte traditionnelle", prixBase: 3.50, disponible: true }
            ]
          }
        },
        deliveryPricing: {
          activerLivraison: true,
          fraisBase: 2.50,
          prixParKm: 0.80,
          distanceMaximale: 10,
          montantMinimumCommande: 15,
          delaiPreparation: 30
        }
      });
      const pricing = newPricing.toObject();
      
      return reply.send({
        success: true,
        data: pricing
      });
    }

    // Convertir le document Mongoose en objet JSON pur
    const pricingObj = pricingDoc.toObject();

    // Forcer la sérialisation JSON
    const pricing = JSON.parse(JSON.stringify(pricingObj));

    const response = {
      success: true,
      data: pricing
    };    
    return reply.send(response);
  } catch (error) {
    console.error("Erreur lors de la récupération des tarifs:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Calculer les frais de livraison
export async function calculateDeliveryFees(request, reply) {
  try {
    const { distance } = request.query;
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    const fraisLivraison = pricing.calculerFraisLivraison(parseFloat(distance));
    
    if (fraisLivraison === null) {
      return reply.send({
        success: true,
        data: {
          disponible: false,
          message: `Livraison non disponible au-delà de ${pricing.deliveryPricing.distanceMaximale}km`
        }
      });
    }

    return reply.send({
      success: true,
      data: {
        disponible: true,
        fraisLivraison,
        distance: parseFloat(distance),
        fraisBase: pricing.deliveryPricing.fraisBase,
        prixParKm: pricing.deliveryPricing.prixParKm,
        montantMinimum: pricing.deliveryPricing.montantMinimumCommande
      }
    });
  } catch (error) {
    console.error("Erreur lors du calcul des frais de livraison:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer les produits disponibles par catégorie
export async function getAvailableProducts(request, reply) {
  try {
    const { categorie } = request.params;
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    const produits = pricing.obtenirProduitsDisponibles(categorie);
    
    return reply.send({
      success: true,
      data: {
        categorie,
        produits
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Vérifier la disponibilité du restaurant
export async function checkRestaurantAvailability(request, reply) {
  try {
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    const disponible = pricing.verifierDisponibilite();
    
    return reply.send({
      success: true,
      data: {
        disponible,
        horaires: pricing.restaurantInfo.horairesOuverture,
        restaurantInfo: pricing.restaurantInfo
      }
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de disponibilité:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Ajouter un nouveau produit
export async function addProduct(request, reply) {
  try {
    const { categorie, produit } = request.body;
    
    console.log("➕ Ajout produit - Catégorie:", categorie, "Produit:", produit);
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    console.log("📋 Catégories disponibles:", Object.keys(pricing.menuPricing || {}));

    // Si la catégorie n'existe pas, la créer automatiquement
    if (!pricing.menuPricing[categorie]) {
      console.log(`⚠️ Catégorie "${categorie}" inexistante, création automatique...`);
      pricing.menuPricing[categorie] = {
        nom: categorie.charAt(0).toUpperCase() + categorie.slice(1),
        produits: []
      };
      pricing.markModified('menuPricing'); // Nécessaire pour les champs Mixed
      await pricing.save();
      console.log(`✅ Catégorie "${categorie}" créée`);
    }

    // Vérifier que le tableau produits existe
    if (!pricing.menuPricing[categorie].produits) {
      console.log(`⚠️ Tableau produits manquant pour "${categorie}", initialisation...`);
      pricing.menuPricing[categorie].produits = [];
      pricing.markModified('menuPricing');
      await pricing.save();
    }

    // Définir les tailles valides par catégorie
    const taillesValides = {
      pizzas: ["Petite", "Moyenne", "Grande"],
      boissons: ["33cl", "50cl", "1L"]
    };

    // Validation et nettoyage des données du produit
    const produitNettoye = {
      _id: new mongoose.Types.ObjectId(), // Générer un _id manuellement
      nom: produit.nom?.trim() || "",
      description: produit.description?.trim() || "",
      prixBase: parseFloat(produit.prixBase) || 0,
      disponible: Boolean(produit.disponible)
    };

    // Ajouter la taille selon la catégorie avec validation
    if (categorie === 'pizzas') {
      const tailleProposee = produit.taille || 'Moyenne';
      if (!taillesValides.pizzas.includes(tailleProposee)) {
        return reply.code(400).send({
          error: `Taille invalide pour les pizzas. Valeurs acceptées: ${taillesValides.pizzas.join(', ')}`
        });
      }
      produitNettoye.taille = tailleProposee;
    } else if (categorie === 'boissons') {
      const tailleProposee = produit.taille || '33cl';
      if (!taillesValides.boissons.includes(tailleProposee)) {
        return reply.code(400).send({
          error: `Taille invalide pour les boissons. Valeurs acceptées: ${taillesValides.boissons.join(', ')}`
        });
      }
      produitNettoye.taille = tailleProposee;
    }

    // Validation des champs obligatoires
    if (!produitNettoye.nom) {
      return reply.code(400).send({
        error: "Le nom du produit est obligatoire"
      });
    }

    if (produitNettoye.prixBase <= 0) {
      return reply.code(400).send({
        error: "Le prix doit être supérieur à 0"
      });
    }

    pricing.menuPricing[categorie].produits.push(produitNettoye);
    pricing.markModified('menuPricing'); // Nécessaire pour les champs Mixed
    pricing.derniereModification = new Date();
    await pricing.save();

    // Recharger et retourner les données en format JSON pur
    const updatedPricingDoc = await PricingModel.findOne();
    const updatedPricing = updatedPricingDoc.toObject();

    return reply.send({
      success: true,
      data: updatedPricing.menuPricing[categorie],
      message: "Produit ajouté avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du produit:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Mettre à jour un produit
export async function updateProduct(request, reply) {
  try {
    const { categorie, produitId, produitData } = request.body;
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    const produit = pricing.menuPricing[categorie].produits.id(produitId);
    if (!produit) {
      return reply.code(404).send({
        error: "Produit non trouvé"
      });
    }

    // Définir les tailles valides par catégorie
    const taillesValides = {
      pizzas: ["Petite", "Moyenne", "Grande"],
      boissons: ["33cl", "50cl", "1L"]
    };

    // Nettoyer et valider les données
    const donneesMisesAJour = {
      nom: produitData.nom?.trim() || produit.nom,
      description: produitData.description?.trim() || produit.description,
      prixBase: parseFloat(produitData.prixBase) || produit.prixBase,
      disponible: Boolean(produitData.disponible)
    };

    // Gérer la taille selon la catégorie avec validation
    if (categorie === 'pizzas') {
      const tailleProposee = produitData.taille || produit.taille || 'Moyenne';
      if (!taillesValides.pizzas.includes(tailleProposee)) {
        return reply.code(400).send({
          error: `Taille invalide pour les pizzas. Valeurs acceptées: ${taillesValides.pizzas.join(', ')}`
        });
      }
      donneesMisesAJour.taille = tailleProposee;
    } else if (categorie === 'boissons') {
      const tailleProposee = produitData.taille || produit.taille || '33cl';
      if (!taillesValides.boissons.includes(tailleProposee)) {
        return reply.code(400).send({
          error: `Taille invalide pour les boissons. Valeurs acceptées: ${taillesValides.boissons.join(', ')}`
        });
      }
      donneesMisesAJour.taille = tailleProposee;
    }

    Object.assign(produit, donneesMisesAJour);
    pricing.markModified('menuPricing'); // Nécessaire pour les champs Mixed
    pricing.derniereModification = new Date();
    await pricing.save();

    // Recharger et retourner les données en format JSON pur
    const updatedPricingDoc = await PricingModel.findOne();
    const updatedPricing = updatedPricingDoc.toObject();
    const updatedProduct = updatedPricing.menuPricing[categorie].produits.find(p => p._id.toString() === produitId);

    return reply.send({
      success: true,
      data: updatedProduct,
      message: "Produit mis à jour avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Supprimer un produit
export async function deleteProduct(request, reply) {
  try {
    const { categorie, produitId } = request.params;
    
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    // Vérifier que la catégorie existe
    if (!pricing.menuPricing[categorie]) {
      return reply.code(404).send({
        error: `Catégorie "${categorie}" non trouvée`
      });
    }

    // Utiliser pull() pour supprimer le produit par son _id
    pricing.menuPricing[categorie].produits.pull(produitId);
    pricing.markModified('menuPricing'); // Nécessaire pour les champs Mixed
    pricing.derniereModification = new Date();
    await pricing.save();

    console.log(`✅ Produit ${produitId} supprimé de la catégorie ${categorie}`);

    return reply.send({
      success: true,
      message: "Produit supprimé avec succès"
    });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du produit:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

// Récupérer la configuration pour GPT (format simplifié)
export async function getPricingForGPT(request, reply) {
  try {
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return reply.code(404).send({
        error: "Configuration des tarifs non trouvée"
      });
    }

    // Format simplifié pour GPT
    const gptData = {
      restaurantInfo: pricing.restaurantInfo,
      menu: {},
      delivery: pricing.deliveryPricing,
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

    return reply.send({
      success: true,
      data: gptData
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des données pour GPT:", error);
    return reply.code(500).send({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}
