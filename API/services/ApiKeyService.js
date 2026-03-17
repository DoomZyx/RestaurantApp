import crypto from "crypto";
import { ApiKeyModel } from "../../storage/models/ApiKey.js";

const KEY_BYTES = 32;
const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";
// audit-fix: pas de fallback; vérification au chargement (voir ensureApiKeySalt)
const SALT = process.env.API_KEY_SALT;

export class ApiKeyService {
  static generateRawKey() {
    return crypto.randomBytes(KEY_BYTES).toString("base64url");
  }

  static hashKey(rawKey) {
    const salt = process.env.API_KEY_SALT;
    if (!salt || typeof salt !== "string" || salt.length < 8) {
      throw new Error("API_KEY_SALT doit être défini (au moins 8 caractères)");
    }
    return crypto
      .pbkdf2Sync(rawKey, salt, ITERATIONS, KEYLEN, DIGEST)
      .toString("hex");
  }

  static async createForInstance(instanceId, { label, scopes = ["voice:connect"] } = {}) {
    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);

    await ApiKeyModel.create({
      instanceId,
      keyHash,
      label: label || "auto",
      scopes: Array.isArray(scopes) ? scopes : ["voice:connect"],
    });

    return { apiKey: rawKey };
  }

  static async validate(rawKey) {
    if (!rawKey || typeof rawKey !== "string") return null;
    const keyHash = this.hashKey(rawKey.trim());
    const doc = await ApiKeyModel.findOne({ keyHash, revokedAt: null }).lean();
    if (!doc) return null;
    return { instanceId: doc.instanceId, apiKeyDoc: doc };
  }
}
