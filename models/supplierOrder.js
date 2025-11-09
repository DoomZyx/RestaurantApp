import mongoose from "mongoose";

const supplierOrderSchema = new mongoose.Schema({
  // Informations du fournisseur
  fournisseur: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    nom: {
      type: String,
      required: true
    },
    telephone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false
    }
  },

  // Liste des ingrédients commandés
  ingredients: [{
    nom: {
      type: String,
      required: true
    },
    quantite: {
      type: Number,
      required: true,
      min: 0
    },
    unite: {
      type: String,
      required: true,
      enum: ["kg", "g", "L", "ml", "unité(s)", "boîte(s)", "sachet(s)"]
    }
  }],

  // Statut de la commande
  statut: {
    type: String,
    enum: ["en_attente", "appel_en_cours", "confirmee", "refusee", "erreur"],
    default: "en_attente"
  },

  // Informations de livraison (remplies après l'appel)
  livraison: {
    date: {
      type: Date,
      required: false
    },
    heure: {
      type: String,
      required: false
    },
    commentaire: {
      type: String,
      required: false,
      maxlength: 500
    }
  },

  // Informations de l'appel Twilio
  appel: {
    callSid: {
      type: String,
      required: false
    },
    duree: {
      type: Number, // en secondes
      required: false
    },
    statut: {
      type: String,
      required: false
    },
    transcription: {
      type: String,
      required: false
    },
    dateAppel: {
      type: Date,
      required: false
    }
  },

  // Réponse du fournisseur (extraite par GPT)
  reponse_fournisseur: {
    accepte: {
      type: Boolean,
      required: false
    },
    prix_total: {
      type: Number,
      required: false
    },
    delai_livraison: {
      type: String,
      required: false
    },
    commentaire: {
      type: String,
      required: false
    }
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
supplierOrderSchema.index({ "fournisseur.id": 1, createdAt: -1 });
supplierOrderSchema.index({ statut: 1 });
supplierOrderSchema.index({ "appel.callSid": 1 });

// Méthode pour formater les ingrédients en texte lisible
supplierOrderSchema.methods.getIngredientsText = function() {
  return this.ingredients
    .map(ing => `${ing.quantite} ${ing.unite} de ${ing.nom}`)
    .join(", ");
};

const SupplierOrderModel = mongoose.model("SupplierOrder", supplierOrderSchema);

export default SupplierOrderModel;






