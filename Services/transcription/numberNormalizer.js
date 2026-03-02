/**
 * Service de normalisation des nombres dans les transcriptions
 * Convertit les nombres en lettres français vers format numérique
 */

// Dictionnaire nombres français → chiffres
const NUMBER_MAP = {
  "zéro": "0", "un": "1", "une": "1", "deux": "2", "trois": "3", "quatre": "4",
  "cinq": "5", "six": "6", "sept": "7", "huit": "8", "neuf": "9", "dix": "10",
  "onze": "11", "douze": "12", "treize": "13", "quatorze": "14", "quinze": "15",
  "seize": "16", "dix-sept": "17", "dix-huit": "18", "dix-neuf": "19",
  "vingt": "20", "vingt-et-un": "21", "vingt-deux": "22", "vingt-trois": "23",
  "vingt-quatre": "24", "vingt-cinq": "25", "vingt-six": "26", "vingt-sept": "27",
  "vingt-huit": "28", "vingt-neuf": "29",
  "trente": "30", "trente-et-un": "31", "trente-deux": "32", "trente-trois": "33",
  "trente-quatre": "34", "trente-cinq": "35", "trente-six": "36", "trente-sept": "37",
  "trente-huit": "38", "trente-neuf": "39",
  "quarante": "40", "quarante-et-un": "41", "quarante-deux": "42", "quarante-trois": "43",
  "quarante-quatre": "44", "quarante-cinq": "45", "quarante-six": "46", "quarante-sept": "47",
  "quarante-huit": "48", "quarante-neuf": "49",
  "cinquante": "50", "cinquante-et-un": "51", "cinquante-deux": "52", "cinquante-trois": "53",
  "cinquante-quatre": "54", "cinquante-cinq": "55", "cinquante-six": "56", "cinquante-sept": "57",
  "cinquante-huit": "58", "cinquante-neuf": "59",
  "soixante": "60", "soixante-et-un": "61", "soixante-deux": "62", "soixante-trois": "63",
  "soixante-quatre": "64", "soixante-cinq": "65", "soixante-six": "66", "soixante-sept": "67",
  "soixante-huit": "68", "soixante-neuf": "69",
  "soixante-dix": "70", "soixante-et-onze": "71", "soixante-douze": "72", "soixante-treize": "73",
  "soixante-quatorze": "74", "soixante-quinze": "75", "soixante-seize": "76", "soixante-dix-sept": "77",
  "soixante-dix-huit": "78", "soixante-dix-neuf": "79",
  "quatre-vingt": "80", "quatre-vingt-un": "81", "quatre-vingt-deux": "82", "quatre-vingt-trois": "83",
  "quatre-vingt-quatre": "84", "quatre-vingt-cinq": "85", "quatre-vingt-six": "86", "quatre-vingt-sept": "87",
  "quatre-vingt-huit": "88", "quatre-vingt-neuf": "89",
  "quatre-vingt-dix": "90", "quatre-vingt-onze": "91", "quatre-vingt-douze": "92", "quatre-vingt-treize": "93",
  "quatre-vingt-quatorze": "94", "quatre-vingt-quinze": "95", "quatre-vingt-seize": "96", "quatre-vingt-dix-sept": "97",
  "quatre-vingt-dix-huit": "98", "quatre-vingt-dix-neuf": "99",
  "cent": "100"
};

/**
 * Normalise les nombres en lettres vers format numérique
 * @param {string} text - Texte à normaliser
 * @returns {string} - Texte avec nombres normalisés
 */
export function normalizeNumbers(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let normalized = text;

  // Trier par longueur décroissante pour éviter les remplacements partiels
  const sortedNumbers = Object.keys(NUMBER_MAP).sort((a, b) => b.length - a.length);

  for (const numberWord of sortedNumbers) {
    const regex = new RegExp(`\\b${numberWord}\\b`, "gi");
    normalized = normalized.replace(regex, NUMBER_MAP[numberWord]);
  }

  // Gérer les nombres composés avec "et" (ex: "vingt-et-un")
  // Ces cas sont déjà dans le dictionnaire, mais on peut améliorer pour les cas complexes

  return normalized;
}

/**
 * Normalise uniquement les nombres isolés (pour éviter de toucher aux heures)
 * @param {string} text - Texte à normaliser
 * @returns {string} - Texte avec nombres isolés normalisés
 */
export function normalizeIsolatedNumbers(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  // Pattern pour détecter nombres en lettres isolés (pas dans contexte d'heure)
  const numberPattern = /\b(zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|quatre-vingt|cent)(\s|$)/gi;

  return text.replace(numberPattern, (match, numberWord) => {
    const lowerWord = numberWord.toLowerCase();
    if (NUMBER_MAP[lowerWord]) {
      return NUMBER_MAP[lowerWord] + (match.endsWith(" ") ? " " : "");
    }
    return match;
  });
}

