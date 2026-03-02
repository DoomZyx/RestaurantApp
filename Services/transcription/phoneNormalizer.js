/**
 * Service d'extraction et normalisation des numéros de téléphone
 * Extrait les numéros depuis la transcription et les normalise au format XX XX XX XX XX
 */

/**
 * Convertit un nombre en lettres français vers chiffre
 * @param {string} word - Mot représentant un nombre
 * @returns {string|null} - Chiffre correspondant ou null
 */
function wordToDigit(word) {
  const numberMap = {
    "zéro": "0", "un": "1", "une": "1", "deux": "2", "trois": "3", "quatre": "4",
    "cinq": "5", "six": "6", "sept": "7", "huit": "8", "neuf": "9", "dix": "10",
    "onze": "11", "douze": "12", "treize": "13", "quatorze": "14", "quinze": "15",
    "seize": "16", "dix-sept": "17", "dix-huit": "18", "dix-neuf": "19",
    "vingt": "20", "trente": "30", "quarante": "40", "cinquante": "50",
    "soixante": "60", "soixante-dix": "70", "quatre-vingt": "80", "quatre-vingt-dix": "90"
  };

  const lowerWord = word.toLowerCase().trim();
  
  // Si nombre simple
  if (numberMap[lowerWord]) {
    const num = parseInt(numberMap[lowerWord]);
    if (num < 10) return num.toString();
    if (num === 10) return "10";
  }

  // Gérer nombres composés (ex: "soixante-douze" → "72")
  if (lowerWord.includes("-")) {
    const parts = lowerWord.split("-");
    if (parts.length === 2) {
      const first = numberMap[parts[0]];
      const second = numberMap[parts[1]];
      if (first && second) {
        const num = parseInt(first) + parseInt(second);
        if (num < 100) return num.toString();
      }
    }
  }

  return null;
}

/**
 * Extrait un numéro de téléphone depuis un texte avec nombres en lettres
 * @param {string} text - Texte contenant potentiellement un numéro
 * @returns {string|null} - Numéro au format XX XX XX XX XX ou null
 */
function extractPhoneFromWords(text) {
  // Pattern pour détecter séquence de nombres en lettres
  const phonePattern = /(?:zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|soixante-dix|quatre-vingt|quatre-vingt-dix)(?:\s+(?:zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|soixante-dix|quatre-vingt|quatre-vingt-dix)){9,}/gi;
  
  const match = text.match(phonePattern);
  if (!match) return null;

  const words = match[0].toLowerCase().split(/\s+/);
  const digits = [];

  for (const word of words) {
    const digit = wordToDigit(word);
    if (digit) {
      // Si nombre > 9, extraire les chiffres individuels
      if (digit.length > 1) {
        digits.push(...digit.split(""));
      } else {
        digits.push(digit);
      }
    }
  }

  if (digits.length === 10) {
    return formatPhoneNumber(digits.join(""));
  }

  return null;
}

/**
 * Formate un numéro de téléphone au format XX XX XX XX XX
 * @param {string} phone - Numéro de téléphone (10 chiffres)
 * @returns {string|null} - Numéro formaté ou null si invalide
 */
export function formatPhoneNumber(phone) {
  if (!phone) return null;

  // Nettoyer : retirer espaces, points, tirets
  const cleaned = phone.replace(/[\s\.\-]/g, "");

  // Vérifier qu'il contient exactement 10 chiffres
  if (!/^\d{10}$/.test(cleaned)) {
    return null;
  }

  // Formater : XX XX XX XX XX
  return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8, 10)}`;
}

/**
 * Extrait et normalise un numéro de téléphone depuis un texte
 * @param {string} text - Texte contenant potentiellement un numéro
 * @returns {string|null} - Numéro normalisé au format XX XX XX XX XX ou null
 */
export function extractAndNormalizePhone(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  // 1. Chercher numéro déjà au format numérique (avec ou sans espaces)
  const numericPatterns = [
    /\b0[1-9](?:\s?\d){8}\b/g, // Format français avec 0 initial
    /\b\d{10}\b/g // 10 chiffres consécutifs
  ];

  for (const pattern of numericPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const formatted = formatPhoneNumber(match);
        if (formatted) return formatted;
      }
    }
  }

  // 2. Chercher numéro avec séparateurs (points, tirets)
  const separatorPattern = /\b0[1-9][\.\-\s]?\d{2}[\.\-\s]?\d{2}[\.\-\s]?\d{2}[\.\-\s]?\d{2}[\.\-\s]?\d{2}\b/g;
  const separatorMatches = text.match(separatorPattern);
  if (separatorMatches) {
    for (const match of separatorMatches) {
      const formatted = formatPhoneNumber(match);
      if (formatted) return formatted;
    }
  }

  // 3. Chercher numéro en lettres (ex: "zéro six soixante-douze...")
  const phoneFromWords = extractPhoneFromWords(text);
  if (phoneFromWords) {
    return phoneFromWords;
  }

  return null;
}

/**
 * Normalise tous les numéros de téléphone dans un texte
 * @param {string} text - Texte à normaliser
 * @returns {string} - Texte avec numéros normalisés
 */
export function normalizePhonesInText(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let normalized = text;

  // Extraire et remplacer chaque numéro trouvé
  const phonePattern = /\b0[1-9](?:\s?[\.\-\s]?\d){8}\b/g;
  const matches = text.match(phonePattern);
  
  if (matches) {
    for (const match of matches) {
      const formatted = formatPhoneNumber(match);
      if (formatted) {
        normalized = normalized.replace(match, formatted);
      }
    }
  }

  return normalized;
}

