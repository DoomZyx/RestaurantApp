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
