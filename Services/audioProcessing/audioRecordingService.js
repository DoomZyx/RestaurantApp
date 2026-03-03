import { mkdir, appendFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const TEST_AUDIO_DIR = join(process.cwd(), "testAudio");

/**
 * Initialise le dossier testAudio s'il n'existe pas
 */
async function ensureTestAudioDir() {
  if (!existsSync(TEST_AUDIO_DIR)) {
    await mkdir(TEST_AUDIO_DIR, { recursive: true });
  }
}

/**
 * Enregistre un chunk audio dans un fichier pour un appel donné
 * @param {string} streamSid - Identifiant du stream
 * @param {string} audioPayload - Payload audio en base64 (format mu-law)
 * @param {boolean} isCleaned - Indique si l'audio a été nettoyé par RNNoise
 */
export async function recordAudioChunk(streamSid, audioPayload, isCleaned = false) {
  try {
    await ensureTestAudioDir();
    
    const filename = isCleaned 
      ? `${streamSid || "unknown"}_cleaned.ulaw`
      : `${streamSid || "unknown"}_raw.ulaw`;
    
    const filepath = join(TEST_AUDIO_DIR, filename);
    
    // Décoder le base64 et écrire en mode append
    const audioBuffer = Buffer.from(audioPayload, "base64");
    await appendFile(filepath, audioBuffer);
    
    return filepath;
  } catch (error) {
    console.error(`[AUDIO_RECORDING] Erreur enregistrement audio chunk:`, error.message);
    return null;
  }
}

/**
 * Enregistre la transcription complète dans un fichier texte
 * @param {string} streamSid - Identifiant du stream
 * @param {string} transcription - Transcription complète
 */
export async function recordTranscription(streamSid, transcription) {
  try {
    await ensureTestAudioDir();
    
    const filename = `${streamSid || "unknown"}_transcription.txt`;
    const filepath = join(TEST_AUDIO_DIR, filename);
    
    const content = `=== TRANSCRIPTION COMPLÈTE ===
StreamSid: ${streamSid || "unknown"}
Timestamp: ${new Date().toISOString()}
Longueur: ${transcription.length} caractères

${transcription}
`;
    
    await appendFile(filepath, content);
    
    return filepath;
  } catch (error) {
    console.error(`[TRANSCRIPTION_RECORDING] Erreur enregistrement transcription:`, error.message);
    return null;
  }
}

