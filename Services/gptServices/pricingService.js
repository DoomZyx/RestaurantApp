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
      delivery: pricing.deliveryPricing,
      availability: pricing.verifierDisponibilite()
    };

    // Simplifier le menu pour GPT
    Object.keys(pricing.menuPricing).forEach(categorie => {
      gptPricing.menu[categorie] = {
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

    // Récupérer toutes les données depuis la DB pour avoir taxes et promotions
    const pricingDoc = await PricingModel.findOne();
    const tauxTVA = pricingDoc?.taxes?.tva || 20;
    const fraisService = pricingDoc?.taxes?.serviceCharge || 0;
    const appliquerFraisService = pricingDoc?.taxes?.applicableServiceCharge || false;

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
MENU ET TARIFS (PRIX HT) :
========================================
⚠️ IMPORTANT : Les prix ci-dessous sont en HORS TAXES (HT).
Tu DOIS TOUJOURS calculer et annoncer le prix TTC au client.

TVA applicable : ${tauxTVA}%
${appliquerFraisService ? `Frais de service : ${fraisService}%` : ''}

Formule de calcul :
- Prix TTC = Prix HT × (1 + ${tauxTVA}/100)${appliquerFraisService ? ` × (1 + ${fraisService}/100)` : ''}
- Exemple : Un produit à 10€ HT = ${(10 * (1 + tauxTVA/100) * (appliquerFraisService ? (1 + fraisService/100) : 1)).toFixed(2)}€ TTC

MENU :
${Object.keys(pricing.menu).map(categorie => {
  const category = pricing.menu[categorie];
  return `
${category.nom.toUpperCase()} :
${category.produits.map(produit => {
  const prixTTC = (produit.prix * (1 + tauxTVA/100) * (appliquerFraisService ? (1 + fraisService/100) : 1)).toFixed(2);
  return `- ${produit.nom} : ${produit.prix}€ HT (${prixTTC}€ TTC) - ${produit.description}`;
}).join('\n')}`;
}).join('\n')}

========================================
FRAIS DE LIVRAISON :
========================================
- Livraison ${pricing.delivery.activerLivraison ? 'activée' : 'désactivée'}
- Frais de base : ${pricing.delivery.fraisBase}€
- Prix par kilomètre : ${pricing.delivery.prixParKm}€
- Distance maximale : ${pricing.delivery.distanceMaximale}km
- Montant minimum pour livraison : ${pricing.delivery.montantMinimumCommande}€
- Délai de préparation : ${pricing.delivery.delaiPreparation} minutes
${pricing.delivery.zonesLivraison?.length > 0 ? `
Zones de livraison avec frais supplémentaires :
${pricing.delivery.zonesLivraison.map(zone => `- ${zone.nom} (${zone.codePostal}) : +${zone.fraisSupplimentaire}€`).join('\n')}` : ''}

========================================
PROMOTIONS ACTIVES :
========================================
${pricingDoc?.promotions?.filter(p => p.active && (!p.dateFin || new Date(p.dateFin) >= new Date())).length > 0 
  ? pricingDoc.promotions.filter(p => p.active && (!p.dateFin || new Date(p.dateFin) >= new Date())).map(promo => `
📢 ${promo.nom}
Description : ${promo.description}
Type : ${promo.type === 'pourcentage' ? `Réduction de ${promo.valeur}%` : promo.type === 'montant_fixe' ? `Réduction de ${promo.valeur}€` : 'Produit gratuit'}
${promo.conditions.montantMinimum > 0 ? `Montant minimum : ${promo.conditions.montantMinimum}€` : ''}
${promo.conditions.joursValides?.length > 0 ? `Jours valides : ${promo.conditions.joursValides.join(', ')}` : ''}
${promo.conditions.heureDebut && promo.conditions.heureFin ? `Horaires : ${promo.conditions.heureDebut} - ${promo.conditions.heureFin}` : ''}
${promo.dateFin ? `Valable jusqu'au : ${new Date(promo.dateFin).toLocaleDateString('fr-FR')}` : ''}
`).join('\n---\n') 
  : 'Aucune promotion active actuellement.'}

========================================
INSTRUCTIONS IMPORTANTES :
========================================
1. 🔴 TOUJOURS annoncer les prix en TTC au client, jamais en HT
2. Si le client demande un prix, calcule le TTC avec la formule ci-dessus
3. Propose les promotions actives si elles s'appliquent à la commande du client
4. Vérifie les horaires d'ouverture avant de confirmer une commande
5. Informe le client des frais de livraison selon sa distance
6. Tu peux donner l'adresse, le téléphone ou l'email si le client le demande
7. Informe le client du délai de préparation estimé
`;

    // Ajouter les informations de tarifs à la fin du prompt
    enrichedPrompt += pricingInfo;

    return enrichedPrompt;
  } catch (error) {
    console.error("Erreur lors de la génération du prompt enrichi:", error);
    return basePrompt;
  }
}

// Calculer le prix total d'une commande (retourne HT et TTC)
export async function calculateOrderTotal(orderItems, distance = 0) {
  try {
    const pricingDoc = await PricingModel.findOne();
    if (!pricingDoc) {
      return { totalHT: 0, totalTTC: 0, fraisLivraison: 0, taxes: 0 };
    }

    const pricing = {
      restaurantInfo: pricingDoc.restaurantInfo,
      menu: {},
      delivery: pricingDoc.deliveryPricing
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

    let totalHT = 0;
    
    // Calculer le total HT des articles
    orderItems.forEach(item => {
      const product = findProductInPricing(item.nom, item.categorie, pricing);
      if (product) {
        totalHT += product.prix * (item.quantite || 1);
      }
    });

    // Ajouter les frais de livraison si applicable
    let fraisLivraison = 0;
    if (distance > 0 && pricing.delivery.activerLivraison) {
      fraisLivraison = pricing.delivery.fraisBase + (distance * pricing.delivery.prixParKm);
      totalHT += fraisLivraison;
    }

    // Récupérer les taxes
    const tauxTVA = pricingDoc.taxes?.tva || 20;
    const fraisService = pricingDoc.taxes?.serviceCharge || 0;
    const appliquerFraisService = pricingDoc.taxes?.applicableServiceCharge || false;

    // Calculer le TTC
    let totalTTC = totalHT * (1 + tauxTVA / 100);
    if (appliquerFraisService) {
      totalTTC = totalTTC * (1 + fraisService / 100);
    }

    const montantTaxes = totalTTC - totalHT;

    return {
      totalHT: Math.round(totalHT * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
      fraisLivraison: Math.round(fraisLivraison * 100) / 100,
      taxes: Math.round(montantTaxes * 100) / 100,
      tauxTVA,
      fraisService: appliquerFraisService ? fraisService : 0
    };
  } catch (error) {
    console.error("Erreur lors du calcul du total:", error);
    return { totalHT: 0, totalTTC: 0, fraisLivraison: 0, taxes: 0 };
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
