/**
 * Service de validation des transcriptions (regles assouplies pour laisser passer plus d'appels).
 * Retourne true si valide, sinon un message d'erreur (string).
 */
export class ValidationService {
  /**
   * Valide si la transcription contient des informations exploitables.
   * @param {string} transcription - La transcription à valider
   * @returns {true|string} true si valide, message d'erreur sinon
   */
  static validateTranscription(transcription) {
    if (!transcription || typeof transcription !== "string") {
      return "Transcription vide ou invalide";
    }

    const trimmed = transcription.trim();

    // 1. Longueur minimale (assoupli: 30 caractères)
    if (trimmed.length < 30) {
      return "Transcription trop courte (< 30 caractères) - Appel probablement raccroché";
    }

    // 2. Nombre de mots (assoupli: au moins 5 mots)
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 5) {
      return `Transcription trop courte (${words.length} mots)`;
    }

    // 3. Phrase / mot coupé (appel interrompu) - on assouplit: seulement si vraiment tronqué
    const lastChar = trimmed[trimmed.length - 1];
    const hasFinalPunctuation = /[.!?]/.test(lastChar);
    const sentences = trimmed.split(/[.!?]/);
    const lastSentence = (sentences[sentences.length - 1] || "").trim();
    if (!hasFinalPunctuation && lastSentence.length > 0 && lastSentence.length < 5) {
      return "Transcription incomplète - Phrase coupée (appel interrompu)";
    }
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.length === 1 && !/[.!?]/.test(lastWord)) {
      return "Transcription incomplète - Mot coupé";
    }

    // 4. Interaction client : on accepte si "Client:" présent OU si le texte a assez de corps (format peut varier)
    const hasClientLabel = /Client:/i.test(transcription);
    const clientParts = hasClientLabel ? transcription.split(/Client:/i).slice(1).join(" ") : trimmed;
    const clientWords = clientParts.trim().split(/\s+/).filter((w) => w.length > 0);

    if (hasClientLabel && clientWords.length < 3) {
      return `Client a parlé trop peu (${clientWords.length} mots)`;
    }

    // 5. Bruit seul : au moins 2 mots "utiles" (hors euh, hein, etc.)
    const noiseWords = ["euh", "hein", "ah", "oh", "um", "uh", "mmm", "hum", "oui", "non"];
    const meaningfulWords = (hasClientLabel ? clientWords : words).filter(
      (word) => !noiseWords.includes(word.toLowerCase()) && word.length > 1
    );
    if (meaningfulWords.length < 2) {
      return "Transcription ne contient que du bruit ou réponses trop courtes";
    }

    return true;
  }
}
