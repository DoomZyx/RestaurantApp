/**
 * Configuration des vitesses TTS pour l'API Realtime
 * 
 * Plage de vitesse : 0.25 (très lent) → 1.0 (normal) → 1.5 (très rapide)
 * La vitesse ne peut être changée qu'entre les tours de conversation, pas pendant qu'une réponse est en cours
 */

export const TTS_SPEED_CONFIG = {
  // Prise de commande générale (questions sur produits, menu, etc.)
  ORDER_TAKING: 1.3,
  
  // Confirmation de commandes (récapitulatif avant validation)
  ORDER_CONFIRMATION: 1.15,
  
  // Numéros de téléphone / heures (informations critiques)
  CRITICAL_INFO: 1.15,
  
  // Récapitulatif final (avant clôture)
  FINAL_SUMMARY: 1.15,
  
  // Par défaut (accueil, questions générales)
  DEFAULT: 1.2
};

/**
 * Mots-clés pour détecter le contexte de conversation
 */
export const CONTEXT_KEYWORDS = {
  // Mots-clés pour détection de prise de commande
  ORDER_TAKING: [
    'menu', 'commande', 'produit', 'article', 'burger', 'tacos', 'pizza',
    'frites', 'boisson', 'sauce', 'désirez', 'souhaitez', 'voulez',
    'autre chose', 'autre', 'encore'
  ],
  
  // Mots-clés pour détection de confirmation
  ORDER_CONFIRMATION: [
    'c\'est bien', 'c\'est correct', 'confirmer', 'valider', 'récapitulatif',
    'récapitule', 'résumé', 'donc', 'alors', 'pour résumer'
  ],
  
  // Mots-clés pour détection d'informations critiques
  CRITICAL_INFO: [
    'numéro', 'téléphone', 'tél', 'heure', 'h', 'h00', 'h30', 'midi', 'minuit',
    'chiffre', 'chiffre par chiffre', 'répète', 'confirme', '0', '1', '2', '3',
    '4', '5', '6', '7', '8', '9', 'dix', 'onze', 'douze', 'treize', 'quatorze',
    'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'
  ],
  
  // Mots-clés pour détection de récapitulatif final
  FINAL_SUMMARY: [
    'récapitulatif final', 'pour finir', 'en résumé', 'au total', 'donc vous avez',
    'votre commande', 'commande complète'
  ]
};

/**
 * Détecte le contexte de conversation à partir de la transcription
 * @param {string} transcription - Transcription complète de la conversation
 * @param {string} lastAssistantText - Dernier texte prononcé par l'assistant
 * @returns {string} Type de contexte détecté
 */
export function detectConversationContext(transcription, lastAssistantText = '') {
  const textToAnalyze = (lastAssistantText + ' ' + transcription).toLowerCase();
  
  // Vérifier les informations critiques en priorité (numéros, heures)
  const criticalMatches = CONTEXT_KEYWORDS.CRITICAL_INFO.filter(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  if (criticalMatches.length > 0) {
    return 'CRITICAL_INFO';
  }
  
  // Vérifier le récapitulatif final
  const finalSummaryMatches = CONTEXT_KEYWORDS.FINAL_SUMMARY.filter(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  if (finalSummaryMatches.length > 0) {
    return 'FINAL_SUMMARY';
  }
  
  // Vérifier la confirmation de commande
  const confirmationMatches = CONTEXT_KEYWORDS.ORDER_CONFIRMATION.filter(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  if (confirmationMatches.length > 0) {
    return 'ORDER_CONFIRMATION';
  }
  
  // Vérifier la prise de commande
  const orderTakingMatches = CONTEXT_KEYWORDS.ORDER_TAKING.filter(keyword => 
    textToAnalyze.includes(keyword.toLowerCase())
  );
  if (orderTakingMatches.length > 0) {
    return 'ORDER_TAKING';
  }
  
  // Par défaut
  return 'DEFAULT';
}

/**
 * Obtient la vitesse TTS appropriée selon le contexte
 * @param {string} context - Type de contexte détecté
 * @returns {number} Vitesse TTS (0.25 - 1.5)
 */
export function getSpeedForContext(context) {
  switch (context) {
    case 'ORDER_TAKING':
      return TTS_SPEED_CONFIG.ORDER_TAKING;
    case 'ORDER_CONFIRMATION':
      return TTS_SPEED_CONFIG.ORDER_CONFIRMATION;
    case 'CRITICAL_INFO':
      return TTS_SPEED_CONFIG.CRITICAL_INFO;
    case 'FINAL_SUMMARY':
      return TTS_SPEED_CONFIG.FINAL_SUMMARY;
    default:
      return TTS_SPEED_CONFIG.DEFAULT;
  }
}

