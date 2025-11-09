/**
 * Service de validation des transcriptions
 * Vérifie si une transcription contient suffisamment d'informations exploitables
 */
export class ValidationService {
  /**
   * Valide si la transcription contient des informations utiles
   * @param {string} transcription - La transcription à valider
   * @returns {boolean|string} true si valide, message d'erreur sinon
   */
  static validateTranscription(transcription) {
    // 1. Vérifier la longueur minimale (au moins 50 caractères)
    if (!transcription || transcription.trim().length < 50) {
      return "Transcription trop courte (< 50 caractères) - Appel probablement raccroché immédiatement";
    }

    // 2. Compter le nombre de mots
    const words = transcription.trim().split(/\s+/);
    if (words.length < 10) {
      return `Transcription trop courte (${words.length} mots) - Pas assez d'informations`;
    }

    // 3. Vérifier si la transcription contient au moins une interaction client
    const hasClientInteraction = /Client:/i.test(transcription);
    const hasUserContent = transcription.split("Client:").length > 1;
    
    if (!hasClientInteraction || !hasUserContent) {
      return "Aucune interaction client détectée - Client n'a probablement rien dit";
    }

    // 4. Extraire uniquement les parties "Client:" pour analyser
    const clientParts = transcription.split(/Client:/i).slice(1).join(" ");
    const clientWords = clientParts.trim().split(/\s+/).filter(w => w.length > 0);
    
    if (clientWords.length < 5) {
      return `Client a parlé trop peu (${clientWords.length} mots) - Informations insuffisantes`;
    }

    // 5. Vérifier si c'est juste du bruit (mots répétés, onomatopées)
    const noiseWords = ["euh", "hein", "ah", "oh", "um", "uh", "mmm", "hum"];
    const meaningfulWords = clientWords.filter(word => 
      !noiseWords.includes(word.toLowerCase()) && word.length > 2
    );
    
    if (meaningfulWords.length < 3) {
      return "Transcription ne contient que du bruit - Aucune information utile";
    }

    // ✅ Transcription valide
    return true;
  }
}

