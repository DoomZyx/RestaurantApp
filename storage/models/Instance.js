import mongoose from "mongoose";

/** Pays de résidence du client (instance) : FR, BE, LU. Utilisé pour l'achat de numéros Twilio. */
const RESIDENCE_COUNTRIES = ["FR", "BE", "LU"];

/**
 * Modèle tenant SaaS : une instance = un client (ex. restaurant).
 * Chaque instance a son propre pricing, ses numéros Twilio, sa config voix.
 */
const instanceSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true, unique: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, required: true },
    /** Pays de résidence du client (FR, BE, LU) pour provisioning Twilio. */
    countryCode: {
      type: String,
      enum: RESIDENCE_COUNTRIES,
      default: "FR",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "closed"],
      default: "active",
    },
    twilioNumbers: [{ type: String }],
    twilioSubaccountSid: { type: String, required: false },
    twilioAuthToken: { type: String, required: false },
    openAi: {
      apiKey: { type: String, required: false },
      projectId: { type: String, required: false },
      model: { type: String, default: "gpt-4o-realtime-mini" },
      voice: { type: String, default: "ballad" },
    },
    audio: {
      enableNoiseReduction: { type: Boolean, default: true },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

instanceSchema.index({ twilioNumbers: 1 });

export const InstanceModel = mongoose.model("Instance", instanceSchema);
export { RESIDENCE_COUNTRIES };
