import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: false, // Optionnel : les commandes peuvent être créées sans client
  },
  // Nom de l'appelant (si pas de client associé)
  nom: {
    type: String,
    required: false
  },
  // Informations de la commande
  date: {
    type: Date,
    required: true
  },
  heure: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // Format HH:MM
  },
  duree: {
    type: Number,
    required: false,
    min: 30,
    max: 180 // 3h max
  },

  // Type et modalité
  type: {
    type: String,
    required: false,
    enum: [
      "Commande à emporter",
      "Livraison à domicile",
      "Réservation de table",
      "Dégustation",
      "Événement privé"
    ]
  },
  modalite: {
    type: String,
    required: false,
    enum: ["Sur place", "À emporter", "Livraison"],
    default: "Sur place"
  },

  // Détails
  description: {
    type: String,
    maxlength: 500
  },
  nombrePersonnes: {
    type: Number,
    min: 1,
    max: 100
  },
  notes_internes: {
    type: String,
    maxlength: 1000
  },

  // Commandes (plats commandés pour les commandes à emporter)
  commandes: [{
    produitId: {
      type: String,
      required: false
    },
    nom: {
      type: String,
      required: false
    },
    categorie: {
      type: String,
      required: false
    },
    quantite: {
      type: Number,
      min: 1,
      default: 1
    },
    prixUnitaire: {
      type: Number,
      required: false
    },
    supplements: {
      type: String,
      maxlength: 200
    },
    options: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],

  // Statut
  statut: {
    type: String,
    enum: ["planifie", "confirme", "en_cours", "termine", "annule", "reporte"],
    default: "confirme" // Confirmation automatique
  },

  // Métadonnées
  createdBy: {
    type: String,
    enum: ["manual", "calendly", "system"],
    default: "manual"
  },

  // Rappels
  rappel_envoye: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },

  // Lien avec un appel si applicable
  related_call: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CallsData",
    required: false
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// Index pour les requêtes fréquentes
orderSchema.index({ date: 1, heure: 1 });
orderSchema.index({ client: 1, date: -1 });
orderSchema.index({ statut: 1, date: 1 });

// Méthode pour vérifier si le créneau est dans les horaires d'ouverture
// ⚠️ IMPORTANT : Cette méthode nécessite les horaires depuis la BDD (PricingModel)
// Elle doit être appelée avec les horaires en paramètre
orderSchema.methods.isValidTimeSlot = async function() {
  const PricingModel = require("./pricing.js").default;
  
  try {
    const pricing = await PricingModel.findOne();
    if (!pricing || !pricing.restaurantInfo?.horairesOuverture) {
      console.warn("⚠️ Horaires non configurés, validation impossible");
      return true; // Accepter par défaut si pas configuré
    }

    // Récupérer le jour de la commande
    const orderDate = new Date(this.date);
    const joursFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const jour = joursFr[orderDate.getDay()];
    
    const horaire = pricing.restaurantInfo.horairesOuverture[jour];
    
    if (!horaire || !horaire.ouvert) {
      return false; // Fermé ce jour-là
    }

    const [hours, minutes] = this.heure.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    // Vérifier si dans la plage midi
    let isValidMidi = false;
    if (horaire.midi?.ouverture && horaire.midi?.fermeture) {
      const [midiStartH, midiStartM] = horaire.midi.ouverture.split(':').map(Number);
      const [midiEndH, midiEndM] = horaire.midi.fermeture.split(':').map(Number);
      const midiStart = midiStartH * 60 + midiStartM;
      const midiEnd = midiEndH * 60 + midiEndM;
      isValidMidi = timeInMinutes >= midiStart && timeInMinutes <= midiEnd;
    }

    // Vérifier si dans la plage soir
    let isValidSoir = false;
    if (horaire.soir?.ouverture && horaire.soir?.fermeture) {
      const [soirStartH, soirStartM] = horaire.soir.ouverture.split(':').map(Number);
      const [soirEndH, soirEndM] = horaire.soir.fermeture.split(':').map(Number);
      const soirStart = soirStartH * 60 + soirStartM;
      const soirEnd = soirEndH * 60 + soirEndM;
      isValidSoir = timeInMinutes >= soirStart && timeInMinutes <= soirEnd;
    }

    return isValidMidi || isValidSoir;
  } catch (error) {
    console.error("Erreur validation horaire:", error);
    return true; // Accepter par défaut en cas d'erreur
  }
};

// Méthode pour calculer l'heure de fin
orderSchema.methods.getEndTime = function() {
  const [hours, minutes] = this.heure.split(':').map(Number);
  const startInMinutes = hours * 60 + minutes;
  const endInMinutes = startInMinutes + this.duree;

  const endHours = Math.floor(endInMinutes / 60);
  const endMins = endInMinutes % 60;

  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

const OrderModel = mongoose.model("Order", orderSchema);

export default OrderModel; 