/**
 * Chiffrement/déchiffrement pour les clés sensibles (ex: OpenAI API key).
 * AES-256-GCM. Préfixe "enc:" en base64 pour les valeurs chiffrées.
 * Ne jamais logger les entrées/sorties.
 */

import crypto from "crypto";

const PREFIX = "enc:";
const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT = "openai-key-salt";
const TAG_LEN = 16;

function getKey() {
  const secret = process.env.OPENAI_KEY_ENCRYPTION_SECRET;
  if (!secret || typeof secret !== "string") return null;
  return crypto.scryptSync(secret, SALT, KEY_LEN);
}

/**
 * Chiffre une chaîne. Retourne "enc:" + base64(iv + ciphertext + authTag).
 * Si OPENAI_KEY_ENCRYPTION_SECRET est absent, retourne la valeur en clair (non recommandé).
 * @param {string} plaintext
 * @returns {string}
 */
export function encrypt(plaintext) {
  if (plaintext == null || typeof plaintext !== "string") return "";
  const key = getKey();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, enc, tag]).toString("base64");
}

/**
 * Déchiffre une chaîne préfixée par "enc:".
 * Si pas de préfixe "enc:", retourne la valeur telle quelle (rétrocompat).
 * @param {string} stored
 * @returns {string}
 */
export function decrypt(stored) {
  if (stored == null || typeof stored !== "string") return "";
  if (!stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) return stored;
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    if (buf.length < IV_LEN + TAG_LEN) return stored;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(buf.length - TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    return stored;
  }
}

export function isEncryptionAvailable() {
  return getKey() !== null;
}
