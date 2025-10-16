import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    telephone: { type: String, required: true, unique: true },
    email: { type: String },
    adresse: { type: String },
    entrepriseName: { type: String },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual pour afficher le téléphone de manière lisible
clientSchema.virtual('telephoneDisplay').get(function() {
  if (this.telephone && this.telephone.startsWith('NF_')) {
    return 'Non fourni';
  }
  return this.telephone;
});

// Virtual pour le nom complet
clientSchema.virtual('nomComplet').get(function() {
  if (this.nom === '.' || !this.nom) {
    return this.prenom;
  }
  return `${this.prenom} ${this.nom}`;
});

const ClientModel = mongoose.model("Client", clientSchema);

export default ClientModel;
