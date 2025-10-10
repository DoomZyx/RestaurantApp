import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema({
  // Informations du restaurant
  restaurantInfo: {
    nom: { type: String, default: "Mon Restaurant" },
    adresse: { type: String, default: "" },
    telephone: { type: String, default: "" },
    email: { type: String, default: "" },
    horairesOuverture: {
      lundi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      mardi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      mercredi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      jeudi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      vendredi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      samedi: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: true } },
      dimanche: { ouverture: String, fermeture: String, ouvert: { type: Boolean, default: false } }
    }
  },

  // Tarifs des produits par catégorie
  menuPricing: {
    pizzas: {
      nom: { type: String, default: "Pizzas" },
      produits: [{
        nom: { type: String, required: true },
        description: { type: String, default: "" },
        prixBase: { type: Number, required: true },
        taille: { type: String, enum: ["Petite", "Moyenne", "Grande"], default: "Moyenne" },
        disponible: { type: Boolean, default: true }
      }]
    },
    burgers: {
      nom: { type: String, default: "Burgers" },
      produits: [{
        nom: { type: String, required: true },
        description: { type: String, default: "" },
        prixBase: { type: Number, required: true },
        disponible: { type: Boolean, default: true }
      }]
    },
    salades: {
      nom: { type: String, default: "Salades" },
      produits: [{
        nom: { type: String, required: true },
        description: { type: String, default: "" },
        prixBase: { type: Number, required: true },
        disponible: { type: Boolean, default: true }
      }]
    },
    boissons: {
      nom: { type: String, default: "Boissons" },
      produits: [{
        nom: { type: String, required: true },
        description: { type: String, default: "" },
        prixBase: { type: Number, required: true },
        taille: { type: String, enum: ["33cl", "50cl", "1L"], default: "33cl" },
        disponible: { type: Boolean, default: true }
      }]
    },
    desserts: {
      nom: { type: String, default: "Desserts" },
      produits: [{
        nom: { type: String, required: true },
        description: { type: String, default: "" },
        prixBase: { type: Number, required: true },
        disponible: { type: Boolean, default: true }
      }]
    }
  },

  // Configuration des frais de livraison
  deliveryPricing: {
    activerLivraison: { type: Boolean, default: true },
    fraisBase: { type: Number, default: 2.50 }, // Frais de base
    prixParKm: { type: Number, default: 0.80 }, // Prix par kilomètre
    distanceMaximale: { type: Number, default: 10 }, // Distance maximale en km
    montantMinimumCommande: { type: Number, default: 15 }, // Montant minimum pour livraison
    delaiPreparation: { type: Number, default: 30 }, // Délai en minutes
    zonesLivraison: [{
      nom: { type: String, required: true },
      codePostal: { type: String, required: true },
      fraisSupplimentaire: { type: Number, default: 0 }
    }]
  },

  // Configuration des promotions
  promotions: [{
    nom: { type: String, required: true },
    description: { type: String, default: "" },
    type: { 
      type: String, 
      enum: ["pourcentage", "montant_fixe", "produit_gratuit"],
      default: "pourcentage"
    },
    valeur: { type: Number, required: true }, // Pourcentage ou montant
    conditions: {
      montantMinimum: { type: Number, default: 0 },
      produitsApplicables: [{ type: String }],
      joursValides: [{ 
        type: String, 
        enum: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
      }],
      heureDebut: { type: String, default: "00:00" },
      heureFin: { type: String, default: "23:59" }
    },
    active: { type: Boolean, default: true },
    dateDebut: { type: Date, default: Date.now },
    dateFin: { type: Date }
  }],

  // Configuration des taxes
  taxes: {
    tva: { type: Number, default: 20 }, // Pourcentage de TVA
    serviceCharge: { type: Number, default: 0 }, // Frais de service
    applicableServiceCharge: { type: Boolean, default: false }
  },

  // Métadonnées
  version: { type: String, default: "1.0" },
  derniereModification: { type: Date, default: Date.now },
  modifiePar: { type: String, default: "admin" }
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Méthodes utilitaires
pricingSchema.methods.calculerFraisLivraison = function(distance) {
  if (!this.deliveryPricing.activerLivraison) return 0;
  if (distance > this.deliveryPricing.distanceMaximale) return null; // Trop loin
  
  return this.deliveryPricing.fraisBase + (distance * this.deliveryPricing.prixParKm);
};

pricingSchema.methods.verifierDisponibilite = function() {
  const maintenant = new Date();
  const jour = maintenant.toLocaleDateString('fr-FR', { weekday: 'long' });
  const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  const horairesJour = this.restaurantInfo.horairesOuverture[jour];
  if (!horairesJour.ouvert) return false;
  
  return heure >= horairesJour.ouverture && heure <= horairesJour.fermeture;
};

pricingSchema.methods.obtenirProduitsDisponibles = function(categorie) {
  if (!this.menuPricing[categorie]) return [];
  return this.menuPricing[categorie].produits.filter(produit => produit.disponible);
};

// Index pour les requêtes fréquentes
pricingSchema.index({ derniereModification: -1 });

const PricingModel = mongoose.model("Pricing", pricingSchema);

export default PricingModel;
