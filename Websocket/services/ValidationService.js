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

    // 2. Détecter phrases incomplètes (appel coupé)
    const trimmed = transcription.trim();
    const lastChar = trimmed[trimmed.length - 1];
    const hasFinalPunctuation = /[.!?]/.test(lastChar);
    
    // Vérifier si dernière phrase est incomplète
    const sentences = trimmed.split(/[.!?]/);
    const lastSentence = sentences[sentences.length - 1].trim();
    
    // Si pas de ponctuation finale ET dernière phrase très courte (< 10 caractères)
    if (!hasFinalPunctuation && lastSentence.length < 10 && lastSentence.length > 0) {
      return "Transcription incomplète - Phrase coupée détectée (appel interrompu)";
    }

    // Vérifier si dernier mot est coupé (moins de 3 caractères et pas de ponctuation)
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.length < 3 && !/[.!?]/.test(lastWord)) {
      return "Transcription incomplète - Mot coupé détecté (appel interrompu)";
    }

    // 3. Compter le nombre de mots
    if (words.length < 10) {
      return `Transcription trop courte (${words.length} mots) - Pas assez d'informations`;
    }

    // 4. Vérifier si la transcription contient au moins une interaction client
    const hasClientInteraction = /Client:/i.test(transcription);
    const hasUserContent = transcription.split("Client:").length > 1;
    
    if (!hasClientInteraction || !hasUserContent) {
      return "Aucune interaction client détectée - Client n'a probablement rien dit";
    }

    // 5. Extraire uniquement les parties "Client:" pour analyser
    const clientParts = transcription.split(/Client:/i).slice(1).join(" ");
    const clientWords = clientParts.trim().split(/\s+/).filter(w => w.length > 0);
    
    if (clientWords.length < 5) {
      return `Client a parlé trop peu (${clientWords.length} mots) - Informations insuffisantes`;
    }

    // 6. Vérifier si c'est juste du bruit (mots répétés, onomatopées)
    const noiseWords = ["euh", "hein", "ah", "oh", "um", "uh", "mmm", "hum"];
    const meaningfulWords = clientWords.filter(word => 
      !noiseWords.includes(word.toLowerCase()) && word.length > 2
    );
    
    if (meaningfulWords.length < 3) {
      return "Transcription ne contient que du bruit - Aucune information utile";
    }

    // Transcription valide
    return true;
  }
}

