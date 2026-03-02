/**
 * Service centralisé de normalisation des transcriptions
 * Orchestre tous les normalisateurs pour améliorer la qualité des transcriptions
 */

import { normalizeNumbers, normalizeIsolatedNumbers } from "./numberNormalizer.js";
import { normalizeTime, extractAndNormalizeTime } from "./timeNormalizer.js";
import { extractAndNormalizePhone, normalizePhonesInText } from "./phoneNormalizer.js";
import { correctProductName, correctProductNamesInText } from "./productNameCorrector.js";

/**
 * Normalise une transcription complète
 * Applique toutes les corrections dans l'ordre optimal
 * @param {string} transcription - Transcription brute
 * @param {Object} options - Options de normalisation
 * @param {Array<string>} options.productCatalog - Catalogue de produits pour validation (optionnel)
 * @returns {string} - Transcription normalisée
 */
export function normalizeTranscription(transcription, options = {}) {
  if (!transcription || typeof transcription !== "string") {
    return transcription;
  }

  let normalized = transcription;

  // 1. Normaliser les heures (avant normalisation des nombres pour éviter conflits)
  normalized = normalizeTime(normalized);

  // 2. Normaliser les numéros de téléphone
  normalized = normalizePhonesInText(normalized);

  // 3. Normaliser les nombres isolés (quantités, etc.)
  // On évite de toucher aux heures déjà normalisées
  normalized = normalizeIsolatedNumbers(normalized);

  // 4. Corriger les noms de produits
  if (options.productCatalog) {
    normalized = correctProductNamesInText(normalized, options.productCatalog);
  } else {
    normalized = correctProductNamesInText(normalized);
  }

  return normalized;
}

/**
 * Extrait et normalise des données spécifiques depuis une transcription
 * @param {string} transcription - Transcription brute
 * @returns {Object} - Données extraites et normalisées
 */
export function extractNormalizedData(transcription) {
  if (!transcription || typeof transcription !== "string") {
    return {
      phone: null,
      times: [],
      normalized: transcription
    };
  }

  const normalized = normalizeTranscription(transcription);
  
  // Extraire téléphone
  const phone = extractAndNormalizePhone(normalized);

  // Extraire toutes les heures mentionnées
  const timePattern = /\b(\d{1,2})h(\d{2})?\b/g;
  const times = [];
  let match;
  while ((match = timePattern.exec(normalized)) !== null) {
    const time = extractAndNormalizeTime(match[0]);
    if (time) {
      times.push(time);
    }
  }

  return {
    phone,
    times: [...new Set(times)], // Dédupliquer
    normalized
  };
}

export {
  normalizeNumbers,
  normalizeIsolatedNumbers,
  normalizeTime,
  extractAndNormalizeTime,
  extractAndNormalizePhone,
  normalizePhonesInText,
  correctProductName,
  correctProductNamesInText
};

