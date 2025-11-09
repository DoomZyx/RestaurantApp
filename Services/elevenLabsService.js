import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

/**
 * Service ElevenLabs pour la génération de voix TTS
 * Wrapper autour de l'API ElevenLabs
 */
class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = "https://api.elevenlabs.io/v1";
    this.defaultVoiceId = "AudiA"; // Voix par défaut
  }

  /**
   * Génère un stream audio depuis un texte (streaming en temps réel)
   * @param {string} text - Texte à convertir
   * @param {string|null} voiceId - ID de la voix (null = défaut)
   * @param {Object} options - Options de génération
   * @returns {AsyncGenerator<Buffer>} Stream de chunks audio
   */
  async* textToSpeechStream(text, voiceId = null, options = {}) {
    const voice = voiceId || this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voice}/stream`;

    const {
      stability = 0.5,
      similarityBoost = 0.85,
      style = 0.15,
      outputFormat = "ulaw_8000"
    } = options;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
        },
        output_format: outputFormat,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    // Stream les chunks au fur et à mesure
    for await (const chunk of response.body) {
      yield Buffer.from(chunk);
    }
  }

  /**
   * Génère un audio complet depuis un texte (non-streaming)
   * @param {string} text - Texte à convertir
   * @param {string|null} voiceId - ID de la voix (null = défaut)
   * @param {Object} options - Options de génération
   * @returns {Promise<Buffer>} Buffer audio complet
   */
  async textToSpeech(text, voiceId = null, options = {}) {
    const voice = voiceId || this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voice}`;

    const {
      stability = 0.5,
      similarityBoost = 0.85,
      style = 0.15,
      outputFormat = "ulaw_8000"
    } = options;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
        },
        output_format: outputFormat,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// Export singleton
const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;

