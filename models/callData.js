// models/modelDataCall.js
import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: false,
  },
  type_demande: {
    type: String,
    required: true,
    enum: [
      "Commande à emporter",
      "Livraison à domicile",
      "Réservation de table",
      "Information menu",
      "Réclamation",
      "Facturation",
      "Autre",
    ],
  },
  services: {
    type: String,
    enum: [
      "Pizzas",
      "Burgers",
      "Salades",
      "Boissons",
      "Desserts",
      "Menus",
      "Promotions",
      "Autre",
    ],
  },
  description: { type: String },
  date: { type: Date, required: true },
  statut: {
    type: String,
    enum: ["nouveau", "en_cours", "termine", "annule"],
    default: "nouveau",
  },

  // Lien vers une commande si planifiée
  related_order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: false,
  },
});

// index pour trier plus vite par date
callSchema.index({ date: -1 });

const CallModel = mongoose.model("CallsData", callSchema);

export default CallModel;
