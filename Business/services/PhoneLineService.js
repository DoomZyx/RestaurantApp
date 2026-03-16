import PricingModel from "../../models/pricing.js";

/**
 * Normalise un numéro pour E.164 / Twilio (ex: "06 72 88 62 55" -> "+33672886255")
 * @param {string} phone
 * @returns {string|null}
 */
function normalizePhoneE164(phone) {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+33${digits.slice(1)}`;
  }
  if (digits.length === 9 && !digits.startsWith("0")) {
    return `+33${digits}`;
  }
  if (digits.length >= 11 && digits.startsWith("33")) {
    return `+${digits}`;
  }
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return null;
}

const DEFAULT_INSTANCE_ID = "inst_default";

function resolveInstanceId(instanceId) {
  return instanceId != null && String(instanceId).trim() !== "" ? String(instanceId).trim() : DEFAULT_INSTANCE_ID;
}

/**
 * Service téléphonie : numéro de transfert quand la ligne est désactivée.
 * Lit le numéro depuis la config restaurant (infos du restaurant) par instance.
 */
export class PhoneLineService {
  /**
   * Retourne le numéro du restaurant pour transfert d'appel (E.164), ou null.
   * @param {string} [instanceId] - ID instance (défaut: inst_default)
   * @returns {Promise<string|null>}
   */
  static async getTransferNumber(instanceId) {
    const id = resolveInstanceId(instanceId);
    const pricing = await PricingModel.findOne({ instanceId: id });
    const phone = pricing?.restaurantInfo?.telephone;
    if (!phone) return null;
    return normalizePhoneE164(String(phone).trim());
  }
}
