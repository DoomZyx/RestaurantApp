/**
 * Service de nettoyage audio via RNNoise
 * Communique avec le service Python RNNoise pour supprimer le bruit de fond
 */

import fetch from 'node-fetch';

const RNNOISE_SERVICE_URL = process.env.RNNOISE_SERVICE_URL || 'http://localhost:8081';
const ENABLE_NOISE_REDUCTION = process.env.ENABLE_NOISE_REDUCTION === 'true';

/**
 * Vérifie si le service RNNoise est disponible
 * @returns {Promise<boolean>}
 */
export async function checkRNNoiseAvailability() {
  try {
    const response = await fetch(`${RNNOISE_SERVICE_URL}/health`, {
      method: 'GET',
      timeout: 2000
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.rnnoise_loaded === true;
    }
    return false;
  } catch (error) {
    console.warn('⚠️ Service RNNoise non disponible:', error.message);
    return false;
  }
}

/**
 * Nettoie l'audio en supprimant le bruit de fond
 * @param {string} audioPayload - Audio encodé en base64 (mulaw format)
 * @returns {Promise<string>} Audio nettoyé en base64
 */
export async function cleanAudio(audioPayload) {
  // Si la réduction de bruit est désactivée, retourner l'audio original
  if (!ENABLE_NOISE_REDUCTION) {
    return audioPayload;
  }

  try {
    const response = await fetch(`${RNNOISE_SERVICE_URL}/clean-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_payload: audioPayload,
        sample_rate: 8000
      }),
      timeout: 100 // 100ms max pour rester temps réel
    });

    if (!response.ok) {
      console.warn(`Erreur service RNNoise: ${response.status}`);
      return audioPayload; // Fallback: retourner l'audio original
    }

    const data = await response.json();
    
    if (data.success && data.cleaned_audio) {
      return data.cleaned_audio;
    }

    return audioPayload;
  } catch (error) {
    // En cas d'erreur, retourner l'audio original (fail-safe)
    console.warn('Erreur nettoyage audio, utilisation audio original:', error.message);
    return audioPayload;
  }
}

/**
 * Nettoie un chunk audio avec cache pour éviter les appels répétés
 * @param {string} audioPayload - Audio encodé en base64
 * @returns {Promise<string>} Audio nettoyé
 */
const processingCache = new Map();
const CACHE_MAX_SIZE = 50;

export async function cleanAudioWithCache(audioPayload) {
  // Vérifier le cache
  if (processingCache.has(audioPayload)) {
    return processingCache.get(audioPayload);
  }

  // Nettoyer l'audio
  const cleaned = await cleanAudio(audioPayload);

  // Ajouter au cache (FIFO)
  if (processingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = processingCache.keys().next().value;
    processingCache.delete(firstKey);
  }
  processingCache.set(audioPayload, cleaned);

  return cleaned;
}

/**
 * Statistiques du service de nettoyage audio
 */
let stats = {
  totalProcessed: 0,
  totalErrors: 0,
  totalFallbacks: 0,
  avgProcessingTime: 0
};

export function getAudioCleaningStats() {
  return { ...stats };
}

export function resetAudioCleaningStats() {
  stats = {
    totalProcessed: 0,
    totalErrors: 0,
    totalFallbacks: 0,
    avgProcessingTime: 0
  };
}

