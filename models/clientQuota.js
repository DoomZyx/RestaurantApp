import mongoose from "mongoose";

/**
 * Quota de minutes par client et par mois (MongoDB).
 * Permet des mises à jour atomiques ($inc, pipeline) pour éviter les race conditions.
 */
const clientQuotaSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: false, index: true },
    clientId: { type: String, required: true },
    abonnement: { type: String, required: true },
    quotaMax: { type: Number, required: true },
    minutesUtilisees: { type: Number, required: true, default: 0 },
    periodeDebut: { type: String, required: true }
  },
  { timestamps: true }
);

clientQuotaSchema.index({ instanceId: 1, clientId: 1 }, { unique: true });
clientQuotaSchema.index({ clientId: 1 });
clientQuotaSchema.index({ periodeDebut: 1 });

const ClientQuotaModel = mongoose.model("ClientQuota", clientQuotaSchema);

export default ClientQuotaModel;
