/**
 * Service de normalisation des heures dans les transcriptions
 * Convertit les heures en format texte vers format standard HHh ou HHhMM
 */

// Dictionnaire heures en lettres → format numérique
const TIME_EXPRESSIONS = {
  "minuit": "00h",
  "midi": "12h",
  "une heure": "1h",
  "deux heures": "2h",
  "trois heures": "3h",
  "quatre heures": "4h",
  "cinq heures": "5h",
  "six heures": "6h",
  "sept heures": "7h",
  "huit heures": "8h",
  "neuf heures": "9h",
  "dix heures": "10h",
  "onze heures": "11h",
  "douze heures": "12h",
  "treize heures": "13h",
  "quatorze heures": "14h",
  "quinze heures": "15h",
  "seize heures": "16h",
  "dix-sept heures": "17h",
  "dix-huit heures": "18h",
  "dix-neuf heures": "19h",
  "vingt heures": "20h",
  "vingt-et-une heures": "21h",
  "vingt-deux heures": "22h",
  "vingt-trois heures": "23h"
};

/**
 * Normalise les heures vers format HHh ou HHhMM
 * @param {string} text - Texte à normaliser
 * @returns {string} - Texte avec heures normalisées
 */
export function normalizeTime(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let normalized = text;

  // 1. Remplacer expressions spéciales (minuit, midi)
  normalized = normalized.replace(/\bminuit\b/gi, "00h");
  normalized = normalized.replace(/\bmidi\b/gi, "12h");

  // 2. Remplacer heures en lettres complètes (ex: "dix-huit heures" → "18h")
  // Trier par longueur décroissante pour éviter remplacements partiels
  const sortedExpressions = Object.keys(TIME_EXPRESSIONS).sort((a, b) => b.length - a.length);
  
  for (const expression of sortedExpressions) {
    const regex = new RegExp(`\\b${expression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    normalized = normalized.replace(regex, TIME_EXPRESSIONS[expression]);
  }

  // 3. Gérer heures avec minutes (ex: "dix-huit heures trente" → "18h30")
  // Pattern: nombre heures + "heures" + nombre minutes
  const hourMinutePattern = /(\d+)h\s+(\d+)/g;
  normalized = normalized.replace(hourMinutePattern, "$1h$2");

  // 4. Normaliser format "HH:MM" vers "HHhMM"
  normalized = normalized.replace(/(\d{1,2}):(\d{2})\b/g, "$1h$2");

  // 5. Gérer expressions "vers", "à", "pour" avec heures
  // Ex: "vers 19h" → "19h", "à 20h" → "20h"
  normalized = normalized.replace(/\b(vers|à|pour)\s+(\d{1,2}h(?:\d{2})?)\b/gi, "$2");

  // 6. Gérer heures ambiguës (ex: "8h" sans contexte)
  // Si "8h" apparaît, on garde tel quel (le contexte GPT décidera)
  // Mais on normalise "huit heures" → "8h" (ou "20h" selon contexte, mais on laisse GPT gérer)

  // 7. Normaliser "heures" restantes vers "h"
  normalized = normalized.replace(/\b(\d{1,2})\s*heures?\b/gi, "$1h");

  return normalized;
}

/**
 * Extrait et normalise une heure spécifique
 * @param {string} timeText - Texte contenant une heure
 * @returns {string|null} - Heure normalisée au format HHh ou HHhMM, ou null si non trouvée
 */
export function extractAndNormalizeTime(timeText) {
  if (!timeText || typeof timeText !== "string") {
    return null;
  }

  // Pattern pour détecter heures au format HHh ou HHhMM
  const timePattern = /(\d{1,2})h(\d{2})?/;
  const match = timeText.match(timePattern);
  
  if (match) {
    const hours = match[1].padStart(2, "0");
    const minutes = match[2] || "";
    return minutes ? `${hours}h${minutes}` : `${hours}h`;
  }

  // Essayer de normaliser d'abord puis réessayer
  const normalized = normalizeTime(timeText);
  const normalizedMatch = normalized.match(/(\d{1,2})h(\d{2})?/);
  
  if (normalizedMatch) {
    const hours = normalizedMatch[1].padStart(2, "0");
    const minutes = normalizedMatch[2] || "";
    return minutes ? `${hours}h${minutes}` : `${hours}h`;
  }

  return null;
}




