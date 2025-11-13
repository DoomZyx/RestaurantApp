import PricingModel from "../../models/pricing.js";

// Récupérer les tarifs et les intégrer dans le prompt GPT
export async function getPricingForGPT() {
  try {
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      return null;
    }

    // Format simplifié pour GPT
    const gptPricing = {
      restaurantInfo: pricing.restaurantInfo,
      menu: {},
      availability: pricing.verifierDisponibilite()
    };

    // Simplifier le menu pour GPT
    Object.keys(pricing.menuPricing).forEach(categorie => {
      gptPricing.menu[categorie] = {
        nom: pricing.menuPricing[categorie].nom,
        produits: pricing.menuPricing[categorie].produits
          .filter(p => p.disponible)
          .map(p => {
            const produitData = {
              nom: p.nom,
              description: p.description,
              prix: p.prixBase
            };
            
            // Ajouter les options pour les tacos
            if (p.options && Object.keys(p.options).length > 0) {
              produitData.options = p.options;
            }
            
            return produitData;
          })
      };
    });

    return gptPricing;
  } catch (error) {
    console.error("Erreur lors de la récupération des tarifs pour GPT:", error);
    return null;
  }
}

// Générer un prompt enrichi avec les tarifs
export async function generateEnrichedPrompt(basePrompt) {
  try {
    const pricing = await getPricingForGPT();
    if (!pricing) {
      return basePrompt;
    }

    let enrichedPrompt = basePrompt;

    // Ajouter les informations du restaurant
    if (pricing.restaurantInfo.nom) {
      enrichedPrompt = enrichedPrompt.replace(
        "{Nom du restaurant}",
        pricing.restaurantInfo.nom
      );
    }

    // Ajouter les informations sur les tarifs
    const pricingInfo = `
========================================
INFORMATIONS DU RESTAURANT :
========================================
Nom : ${pricing.restaurantInfo.nom}
Adresse : ${pricing.restaurantInfo.adresse || "Non renseignée"}
Téléphone : ${pricing.restaurantInfo.telephone || "Non renseigné"}
Email : ${pricing.restaurantInfo.email || "Non renseigné"}

HORAIRES D'OUVERTURE :
${Object.entries(pricing.restaurantInfo.horairesOuverture || {}).map(([jour, horaire]) => 
  `- ${jour.charAt(0).toUpperCase() + jour.slice(1)} : ${horaire.ouvert ? `${horaire.ouverture} - ${horaire.fermeture}` : 'Fermé'}`
).join('\n')}

========================================
MENU ET TARIFS :
========================================
IMPORTANT : Tous les prix affichés sont TTC (prix finaux).

MENU :
${Object.keys(pricing.menu).map(categorie => {
  const category = pricing.menu[categorie];
  return `
${category.nom.toUpperCase()} :
${category.produits.map(produit => {
  return `- ${produit.nom} : ${produit.prix}€ - ${produit.description}`;
}).join('\n')}`;
}).join('\n')}

========================================
INSTRUCTIONS IMPORTANTES :
========================================
1. Les prix affichés sont les prix finaux TTC
2. Vérifie les horaires d'ouverture avant de confirmer une commande
3. Tu peux donner l'adresse, le téléphone ou l'email si le client le demande
4. Informe le client du délai de préparation estimé
`;

    // Ajouter les informations de tarifs à la fin du prompt
    enrichedPrompt += pricingInfo;

    return enrichedPrompt;
  } catch (error) {
    console.error("Erreur lors de la génération du prompt enrichi:", error);
    return basePrompt;
  }
}

// Calculer le prix total d'une commande (retourne uniquement TTC)
export async function calculateOrderTotal(orderItems) {
  try {
    const pricingDoc = await PricingModel.findOne();
    if (!pricingDoc) {
      return { total: 0 };
    }

    const pricing = {
      restaurantInfo: pricingDoc.restaurantInfo,
      menu: {}
    };

    // Simplifier le menu pour la recherche
    Object.keys(pricingDoc.menuPricing).forEach(categorie => {
      pricing.menu[categorie] = {
        nom: pricingDoc.menuPricing[categorie].nom,
        produits: pricingDoc.menuPricing[categorie].produits
          .filter(p => p.disponible)
          .map(p => ({
            nom: p.nom,
            description: p.description,
            prix: p.prixBase
          }))
      };
    });

    let total = 0;
    
    // Calculer le total TTC des articles
    orderItems.forEach(item => {
      const product = findProductInPricing(item.nom, item.categorie, pricing);
      if (product) {
        total += product.prix * (item.quantite || 1);
      }
    });

    return {
      total: Math.round(total * 100) / 100
    };
  } catch (error) {
    console.error("Erreur lors du calcul du total:", error);
    return { total: 0 };
  }
}

// Trouver un produit dans la configuration des tarifs
function findProductInPricing(nomProduit, categorie, pricing) {
  try {
    if (!pricing.menu[categorie]) {
      return null;
    }

    return pricing.menu[categorie].produits.find(
      produit => produit.nom.toLowerCase() === nomProduit.toLowerCase()
    );
  } catch (error) {
    console.error("Erreur lors de la recherche du produit:", error);
    return null;
  }
}

// Vérifier la disponibilité d'un produit
export function checkProductAvailability(nomProduit, categorie, pricing) {
  try {
    const product = findProductInPricing(nomProduit, categorie, pricing);
    return product !== null;
  } catch (error) {
    console.error("Erreur lors de la vérification de disponibilité:", error);
    return false;
  }
}

// Obtenir les suggestions de produits similaires
export function getSimilarProducts(nomProduit, categorie, pricing) {
  try {
    if (!pricing.menu[categorie]) {
      return [];
    }

    const searchTerm = nomProduit.toLowerCase();
    return pricing.menu[categorie].produits.filter(produit =>
      produit.nom.toLowerCase().includes(searchTerm) ||
      produit.description.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error("Erreur lors de la recherche de produits similaires:", error);
    return [];
  }
}
