import mongoose from "mongoose";

/**
 * Clés API par instance. Hash stocké, clé brute jamais persistée.
 */
const apiKeySchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, unique: true },
    label: { type: String, default: null },
    scopes: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

apiKeySchema.index({ instanceId: 1 });

export const ApiKeyModel = mongoose.model("ApiKey", apiKeySchema);
