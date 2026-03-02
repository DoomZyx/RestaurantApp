import mongoose from "mongoose";

/**
 * Modèle pour sauvegarder les transcriptions dont l'extraction a échoué
 * Permet le traitement manuel ultérieur
 */
const failedExtractionSchema = new mongoose.Schema({
  streamSid: {
    type: String,
    required: true,
  },
  transcription: {
    type: String,
    required: true,
  },
  error: {
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      required: false,
    },
    status: {
      type: Number,
      required: false,
    },
    code: {
      type: String,
      required: false,
    },
  },
  statut: {
    type: String,
    enum: ["extraction_echouee", "en_attente_traitement", "traite", "ignore"],
    default: "extraction_echouee",
  },
  tentatives_extraction: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  traiteAt: {
    type: Date,
    required: false,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
});

// Index pour recherche rapide
failedExtractionSchema.index({ statut: 1, createdAt: -1 });
failedExtractionSchema.index({ streamSid: 1 });

const FailedExtractionModel = mongoose.model("FailedExtraction", failedExtractionSchema);

export default FailedExtractionModel;

