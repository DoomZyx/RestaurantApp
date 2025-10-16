import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema({
  // Informations du restaurant
  restaurantInfo: {
    nom: { type: String, default: "Mon Restaurant" },
    adresse: { type: String, default: "" },
    telephone: { type: String, default: "" },
    email: { type: String, default: "" },
    nombreCouverts: { type: Number, default: 0 },
    horairesOuverture: {
      lundi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      mardi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      mercredi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      jeudi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      vendredi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      samedi: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: true } 
      },
      dimanche: { 
        midi: { ouverture: String, fermeture: String },
        soir: { ouverture: String, fermeture: String },
        ouvert: { type: Boolean, default: false } 
      }
    }
  },

  // Tarifs des produits par catégorie (utilise Mixed pour permettre des catégories dynamiques)
  menuPricing: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      pizzas: {
        nom: "Pizzas",
        produits: []
      },
      burgers: {
        nom: "Burgers",
        produits: []
      },
      salades: {
        nom: "Salades",
        produits: []
      },
      boissons: {
        nom: "Boissons",
        produits: []
      },
      desserts: {
        nom: "Desserts",
        produits: []
      }
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
  if (!horairesJour || !horairesJour.ouvert) return false;
  
  // Vérifier si on est dans la plage du midi
  const midiOuvert = horairesJour.midi && 
    horairesJour.midi.ouverture && 
    horairesJour.midi.fermeture &&
    heure >= horairesJour.midi.ouverture && 
    heure <= horairesJour.midi.fermeture;
  
  // Vérifier si on est dans la plage du soir
  const soirOuvert = horairesJour.soir && 
    horairesJour.soir.ouverture && 
    horairesJour.soir.fermeture &&
    heure >= horairesJour.soir.ouverture && 
    heure <= horairesJour.soir.fermeture;
  
  return midiOuvert || soirOuvert;
};

pricingSchema.methods.obtenirProduitsDisponibles = function(categorie) {
  if (!this.menuPricing[categorie]) return [];
  return this.menuPricing[categorie].produits.filter(produit => produit.disponible);
};

// Index pour les requêtes fréquentes
pricingSchema.index({ derniereModification: -1 });

const PricingModel = mongoose.model("Pricing", pricingSchema);

export default PricingModel;
