/**
 * Service de correction des noms de produits mal transcrits
 * Utilise un dictionnaire de correspondances pour corriger les erreurs fréquentes
 */

// Dictionnaire de correction : erreur → correction
const PRODUCT_CORRECTIONS = {
  // Boissons
  "copoins": "Coca-Cola",
  "coca cola": "Coca-Cola",
  "coca": "Coca-Cola",
  "coca-cola": "Coca-Cola",
  "ice tea": "Ice Tea",
  "icetea": "Ice Tea",
  
  // Burgers
  "borger": "burger",
  "burguer": "burger",
  "burgers": "burgers",
  
  // Frites et accompagnements
  "frittes": "frites",
  "frite": "frites",
  
  // Pizzas
  "pizaa": "pizza",
  "piza": "pizza",
  "pizzas": "pizzas",
  "margarita": "margherita",
  "margherita": "margherita",
  
  // Tacos
  "taco": "tacos",
  "tacos": "tacos",
  
  // Sauces
  "sauce algérienne": "sauce Algérienne",
  "sauce algerienne": "sauce Algérienne",
  "sauce samourai": "sauce Samouraï",
  "sauce samourai": "sauce Samouraï",
  "sauce biggy": "sauce Biggy",
  
  // Autres
  "nuggets": "nuggets",
  "crudités": "crudités",
  "crudites": "crudités"
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * @param {string} str1 - Première chaîne
 * @param {string} str2 - Deuxième chaîne
 * @returns {number} - Distance de Levenshtein
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Trouve la correspondance la plus proche dans le dictionnaire
 * @param {string} word - Mot à corriger
 * @param {number} maxDistance - Distance maximale acceptée (défaut: 2)
 * @returns {string|null} - Correction trouvée ou null
 */
function findClosestMatch(word, maxDistance = 2) {
  const lowerWord = word.toLowerCase().trim();
  
  // Vérifier correspondance exacte (insensible à la casse)
  if (PRODUCT_CORRECTIONS[lowerWord]) {
    return PRODUCT_CORRECTIONS[lowerWord];
  }

  // Chercher correspondance avec distance de Levenshtein
  let bestMatch = null;
  let minDistance = Infinity;

  for (const [error, correction] of Object.entries(PRODUCT_CORRECTIONS)) {
    const distance = levenshteinDistance(lowerWord, error);
    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = correction;
    }
  }

  return bestMatch;
}

/**
 * Corrige un nom de produit
 * @param {string} productName - Nom de produit potentiellement mal transcrit
 * @returns {string} - Nom corrigé
 */
export function correctProductName(productName) {
  if (!productName || typeof productName !== "string") {
    return productName;
  }

  const trimmed = productName.trim();
  if (!trimmed) return productName;

  // Chercher correspondance exacte d'abord
  const lowerTrimmed = trimmed.toLowerCase();
  if (PRODUCT_CORRECTIONS[lowerTrimmed]) {
    return PRODUCT_CORRECTIONS[lowerTrimmed];
  }

  // Chercher correspondance avec distance
  const closest = findClosestMatch(trimmed);
  if (closest) {
    return closest;
  }

  // Si aucune correspondance, retourner original
  return productName;
}

/**
 * Corrige les noms de produits dans un texte
 * @param {string} text - Texte contenant potentiellement des noms de produits
 * @param {Array<string>} productCatalog - Catalogue de produits valides (optionnel)
 * @returns {string} - Texte avec noms de produits corrigés
 */
export function correctProductNamesInText(text, productCatalog = []) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let corrected = text;

  // Si catalogue fourni, l'utiliser pour validation
  if (productCatalog && productCatalog.length > 0) {
    const catalogLower = productCatalog.map(p => p.toLowerCase());
    
    // Chercher mots qui ressemblent à des produits
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]$/, ""); // Retirer ponctuation
      const correctedWord = correctProductName(word);
      
      // Vérifier si correction existe dans catalogue
      if (correctedWord !== word && catalogLower.includes(correctedWord.toLowerCase())) {
        corrected = corrected.replace(new RegExp(`\\b${word}\\b`, "gi"), correctedWord);
      }
    }
  } else {
    // Sans catalogue, utiliser uniquement le dictionnaire
    for (const [error, correction] of Object.entries(PRODUCT_CORRECTIONS)) {
      const regex = new RegExp(`\\b${error.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      corrected = corrected.replace(regex, correction);
    }
  }

  return corrected;
}

