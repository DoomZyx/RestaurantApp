import mongoose from "mongoose";

/**
 * Modèle de monitoring des appels : durée, numéro appelant, clientId, etc.
 * Persistance en base pour historique et reporting.
 */
const callMonitorSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    callSid: { type: String, required: true, unique: true },
    callerNumber: { type: String, default: null },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null }
  },
  { timestamps: true }
);

callMonitorSchema.index({ clientId: 1, startedAt: -1 });
callMonitorSchema.index({ startedAt: -1 });

const CallMonitorModel = mongoose.model("CallMonitor", callMonitorSchema);

export default CallMonitorModel;
