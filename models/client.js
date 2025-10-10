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
  }
);


const ClientModel = mongoose.model("Client", clientSchema);

export default ClientModel;
