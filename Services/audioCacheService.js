import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import elevenLabsService from "./elevenLabsService.js";
import { findPhrase, getPhraseKey } from "../Config/phrases_cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dossier de cache audio
const CACHE_DIR = path.join(__dirname, "../Cache/audio");
const CACHE_INDEX_FILE = path.join(CACHE_DIR, "index.json");

/**
 * Service de cache audio pour ElevenLabs
 * 
 * Stratégie :
 * 1. Phrases communes → Prégénérées et cachées
 * 2. Phrases dynamiques → Générées à la volée mais mises en cache
 * 3. Cache avec expiration et statistiques
 */
class AudioCacheService {
  constructor() {
    this.cacheIndex = {};
    this.stats = {
      hits: 0,
      misses: 0,
      generated: 0,
      savings: 0, // Économies en tokens
    };
  }

  /**
   * Initialise le système de cache
   */
  async initialize() {
    try {
      // Créer le dossier de cache s'il n'existe pas
      await fs.mkdir(CACHE_DIR, { recursive: true });
      console.log(`✅ Dossier cache créé: ${CACHE_DIR}`);

      // Charger l'index du cache
      await this.loadCacheIndex();
      
      console.log(`📊 Cache audio initialisé: ${Object.keys(this.cacheIndex).length} entrées`);
    } catch (error) {
      console.error("❌ Erreur initialisation cache audio:", error);
    }
  }

  /**
   * Charge l'index du cache depuis le fichier
   */
  async loadCacheIndex() {
    try {
      const data = await fs.readFile(CACHE_INDEX_FILE, "utf8");
      this.cacheIndex = JSON.parse(data);
    } catch (error) {
      // Si le fichier n'existe pas, on démarre avec un index vide
      this.cacheIndex = {};
    }
  }

  /**
   * Sauvegarde l'index du cache
   */
  async saveCacheIndex() {
    try {
      await fs.writeFile(
        CACHE_INDEX_FILE,
        JSON.stringify(this.cacheIndex, null, 2),
        "utf8"
      );
    } catch (error) {
      console.error("❌ Erreur sauvegarde index cache:", error);
    }
  }

  /**
   * Génère un hash unique pour un texte
   */
  getTextHash(text, voiceSettings = {}) {
    const normalizedText = text.trim().toLowerCase();
    const settingsStr = JSON.stringify(voiceSettings);
    return crypto
      .createHash("md5")
      .update(normalizedText + settingsStr)
      .digest("hex");
  }

  /**
   * Génère le chemin du fichier audio en cache
   */
  getCachePath(hash) {
    return path.join(CACHE_DIR, `${hash}.ulaw`);
  }

  /**
   * Vérifie si un texte est en cache
   */
  async isCached(text, voiceSettings = {}) {
    const hash = this.getTextHash(text, voiceSettings);
    const cachePath = this.getCachePath(hash);

    try {
      await fs.access(cachePath);
      return { cached: true, hash, path: cachePath };
    } catch {
      return { cached: false, hash, path: cachePath };
    }
  }

  /**
   * Récupère l'audio depuis le cache
   * @returns {Promise<Buffer|null>} Audio buffer ou null si pas en cache
   */
  async getFromCache(text, voiceSettings = {}) {
    const { cached, hash, path: cachePath } = await this.isCached(text, voiceSettings);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    try {
      const audioBuffer = await fs.readFile(cachePath);
      this.stats.hits++;
      
      // Mettre à jour l'index (dernière utilisation)
      if (this.cacheIndex[hash]) {
        this.cacheIndex[hash].lastUsed = new Date().toISOString();
        this.cacheIndex[hash].usageCount = (this.cacheIndex[hash].usageCount || 0) + 1;
      }

      console.log(`🎯 Cache HIT: "${text.substring(0, 30)}..." (${audioBuffer.length} bytes)`);
      return audioBuffer;
    } catch (error) {
      console.error(`❌ Erreur lecture cache pour "${text}":`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Génère et met en cache un audio
   */
  async generateAndCache(text, voiceId, voiceSettings = {}) {
    const { hash, path: cachePath } = await this.isCached(text, voiceSettings);

    try {
      console.log(`🔄 Génération audio pour: "${text.substring(0, 50)}..."`);

      // Générer l'audio avec ElevenLabs
      const audioBuffer = await elevenLabsService.textToSpeech(
        text,
        voiceId,
        {
          stability: 0.5,
          similarityBoost: 0.85,
          style: 0.15,
          outputFormat: "ulaw_8000",
          ...voiceSettings,
        }
      );

      // Sauvegarder dans le cache
      await fs.writeFile(cachePath, audioBuffer);

      // Mettre à jour l'index
      this.cacheIndex[hash] = {
        text: text.substring(0, 100), // Limité pour l'index
        hash,
        size: audioBuffer.length,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        usageCount: 1,
        voiceSettings,
      };

      await this.saveCacheIndex();

      this.stats.generated++;
      this.stats.savings += text.length; // Approximatif (tokens)

      console.log(`✅ Audio généré et mis en cache: ${audioBuffer.length} bytes`);
      return audioBuffer;
    } catch (error) {
      console.error(`❌ Erreur génération audio pour "${text}":`, error);
      throw error;
    }
  }

  /**
   * Récupère ou génère un audio (stratégie cache-first)
   */
  async getOrGenerateAudio(text, voiceId = null, voiceSettings = {}) {
    // 1. Vérifier si la phrase est prédéfinie dans le cache
    const phrase = findPhrase(text);
    if (phrase) {
      console.log(`📋 Phrase prédéfinie détectée: "${phrase.text}"`);
    }

    // 2. Chercher dans le cache
    const cachedAudio = await this.getFromCache(text, voiceSettings);
    if (cachedAudio) {
      return cachedAudio;
    }

    // 3. Générer et cacher
    return await this.generateAndCache(text, voiceId, voiceSettings);
  }

  /**
   * Prégénère toutes les phrases du cache
   * (À utiliser avec le script de prégénération)
   */
  async pregenerateAll(phrases, voiceId = null, voiceSettings = {}) {
    console.log(`🚀 Début prégénération de ${phrases.length} phrases...`);
    
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const phrase of phrases) {
      try {
        const { cached } = await this.isCached(phrase.text, voiceSettings);
        
        if (cached) {
          skipped++;
          console.log(`⏭️ Déjà en cache: "${phrase.text}"`);
          continue;
        }

        await this.generateAndCache(phrase.text, voiceId, voiceSettings);
        generated++;
        
        // Attendre un peu entre chaque génération (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors++;
        console.error(`❌ Erreur génération "${phrase.text}":`, error.message);
      }
    }

    console.log(`\n✅ Prégénération terminée:`);
    console.log(`   - Générées: ${generated}`);
    console.log(`   - Déjà en cache: ${skipped}`);
    console.log(`   - Erreurs: ${errors}`);
    
    return { generated, skipped, errors };
  }

  /**
   * Affiche les statistiques du cache
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: Object.keys(this.cacheIndex).length,
    };
  }

  /**
   * Affiche les statistiques dans la console
   */
  logStats() {
    const stats = this.getStats();
    console.log(`\n📊 Statistiques Cache Audio:`);
    console.log(`   - Hits: ${stats.hits}`);
    console.log(`   - Misses: ${stats.misses}`);
    console.log(`   - Hit Rate: ${stats.hitRate}`);
    console.log(`   - Taille cache: ${stats.cacheSize} fichiers`);
    console.log(`   - Générés: ${stats.generated}`);
    console.log(`   - Économies (tokens): ~${stats.savings}`);
  }

  /**
   * Nettoie les fichiers du cache non utilisés depuis X jours
   */
  async cleanOldCache(daysOld = 30) {
    const now = new Date();
    let cleaned = 0;

    for (const [hash, entry] of Object.entries(this.cacheIndex)) {
      const lastUsed = new Date(entry.lastUsed);
      const daysDiff = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > daysOld) {
        try {
          const cachePath = this.getCachePath(hash);
          await fs.unlink(cachePath);
          delete this.cacheIndex[hash];
          cleaned++;
        } catch (error) {
          console.error(`❌ Erreur nettoyage ${hash}:`, error.message);
        }
      }
    }

    if (cleaned > 0) {
      await this.saveCacheIndex();
      console.log(`🧹 Cache nettoyé: ${cleaned} fichiers supprimés`);
    }

    return cleaned;
  }
}

// Exporter une instance singleton
const audioCacheService = new AudioCacheService();

export default audioCacheService;

