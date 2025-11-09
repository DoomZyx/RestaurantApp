/**
 * Configuration des phrases prégénérées pour le cache audio ElevenLabs
 * 
 * Stratégie :
 * - Prégénérer les phrases STATIQUES (90% du contenu)
 * - Générer en temps réel UNIQUEMENT les parties dynamiques (prix, noms, dates)
 * 
 * Économie : Réduction de ~85-90% des coûts d'API ElevenLabs
 */

export const PHRASES_CACHE = {
  // ========================================
  // ACCUEIL ET SALUTATIONS
  // ========================================
  accueil: {
    bonjour_base: "Bonjour ! Vous êtes bien au restaurant",
    je_vous_ecoute: "je vous écoute",
    bienvenue: "Bienvenue",
    bonne_journee: "Bonne journée",
    au_revoir: "Au revoir",
    merci_appel: "Merci de votre appel",
  },

  // ========================================
  // QUESTIONS FRÉQUENTES
  // ========================================
  questions: {
    nom_question: "C'est à quel nom ?",
    nom_question_alt1: "Et votre nom ?",
    nom_question_alt2: "Je peux avoir votre nom s'il vous plaît ?",
    nom_question_alt3: "Votre nom ?",
    nom_question_alt4: "Et vous êtes ?",
    nom_question_insistance: "J'ai besoin de votre nom pour enregistrer la commande",
    
    combien_personnes: "Vous serez combien ?",
    combien_personnes_alt: "Pour combien de personnes ?",
    
    quelle_heure: "Pour quelle heure ?",
    quel_jour: "Pour quel jour ?",
    
    telephone: "Et votre numéro de téléphone ?",
    telephone_alt: "Votre numéro ?",
  },

  // ========================================
  // CONFIRMATIONS ET VALIDATIONS
  // ========================================
  confirmations: {
    parfait: "Parfait",
    parfait_exclamation: "Parfait !",
    d_accord: "D'accord",
    tres_bien: "Très bien",
    entendu: "Entendu",
    compris: "Compris",
    je_note: "Je note",
    c_est_note: "C'est noté",
    ok: "OK",
    super: "Super",
    excellent: "Excellent",
    merci: "Merci",
    merci_beaucoup: "Merci beaucoup",
  },

  // ========================================
  // EXCUSES ET CLARIFICATIONS
  // ========================================
  clarifications: {
    pardon: "Pardon",
    excusez_moi: "Excusez-moi",
    desole: "Désolée",
    pas_compris: "J'ai pas bien compris",
    pas_compris_nom: "Désolée, j'ai pas bien compris votre nom",
    repetez: "Vous pouvez répéter ?",
    repetez_nom: "Vous pouvez répéter votre nom ?",
    une_seconde: "Une seconde",
    attendez: "Attendez",
  },

  // ========================================
  // MENU ET PRODUITS
  // ========================================
  menu: {
    on_a: "On a",
    on_propose: "On propose",
    disponible: "C'est disponible",
    pas_disponible: "Ce n'est pas disponible",
    en_rupture: "C'est en rupture de stock",
    
    quel_produit: "Quel",
    combien_quantite: "Combien vous en voulez ?",
    avec_quoi: "Avec quoi ?",
    autre_chose: "Autre chose ?",
    ce_sera_tout: "Ce sera tout ?",
  },

  // ========================================
  // DÉLAIS ET HORAIRES
  // ========================================
  delais: {
    minutes_preparation: "minutes de préparation",
    environ: "Environ",
    dans: "Dans",
    pour: "Pour",
    
    ouvert_de: "Nous sommes ouverts de",
    ferme_a: "Nous fermons à",
    ouvre_a: "Nous ouvrons à",
  },

  // ========================================
  // MODALITÉS (Livraison, À emporter)
  // ========================================
  modalites: {
    livraison: "En livraison",
    a_emporter: "À emporter",
    sur_place: "Sur place",
    
    livraison_question: "C'est pour une livraison ?",
    emporter_question: "C'est à emporter ?",
    sur_place_question: "Vous mangez sur place ?",
  },

  // ========================================
  // PRIX ET PAIEMENT
  // ========================================
  prix: {
    ca_fait: "Ça fait",
    euros: "euros",
    euro: "euro",
    centimes: "centimes",
    total: "Le total est de",
    gratuit: "C'est gratuit",
    frais_livraison: "Frais de livraison",
  },

  // ========================================
  // RÉPONSES STANDARDS
  // ========================================
  reponses: {
    on_vous_recontacte: "On vous recontacte rapidement",
    on_prepare: "On prépare ça",
    en_cours: "C'est en cours",
    
    pas_de_probleme: "Pas de problème",
    avec_plaisir: "Avec plaisir",
    bien_sur: "Bien sûr",
    certainement: "Certainement",
    
    non_desole: "Non désolée",
    malheureusement_non: "Malheureusement non",
  },

  // ========================================
  // PHRASES COMPLÈTES FRÉQUENTES
  // ========================================
  phrases_completes: {
    bonjour_complet: "Bonjour ! Vous êtes bien au restaurant, je vous écoute",
    nom_et_telephone: "Je peux avoir votre nom et votre numéro de téléphone ?",
    confirmation_reservation: "Je confirme la réservation",
    preparation_en_cours: "Votre commande est en préparation",
    rappel_30min: "Ça sera prêt dans environ 30 minutes",
    merci_au_revoir: "Merci, au revoir",
    bonne_journee_complet: "Merci de votre appel, bonne journée",
  },

  // ========================================
  // PARTICULES ET CONNECTEURS
  // ========================================
  connecteurs: {
    et: "et",
    ou: "ou",
    donc: "donc",
    alors: "alors",
    mais: "mais",
    pour: "pour",
    avec: "avec",
    sans: "sans",
    aussi: "aussi",
    egalement: "également",
  },
};

/**
 * Génère une clé unique pour une phrase (hash)
 * Utilisé pour nommer les fichiers audio en cache
 */
export function getPhraseKey(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Retire les accents
    .replace(/[^a-z0-9]/g, "_")      // Remplace les caractères spéciaux
    .replace(/_+/g, "_")             // Supprime les underscores multiples
    .replace(/^_|_$/g, "")           // Retire les underscores début/fin
    .substring(0, 50);               // Limite à 50 caractères
}

/**
 * Liste toutes les phrases à prégénérer (aplatit l'objet)
 */
export function getAllPhrases() {
  const allPhrases = [];
  
  function flatten(obj, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        allPhrases.push({
          category: prefix,
          key: key,
          text: value,
          cacheKey: getPhraseKey(value),
        });
      } else if (typeof value === "object") {
        flatten(value, prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  
  flatten(PHRASES_CACHE);
  return allPhrases;
}

/**
 * Trouve une phrase dans le cache par son texte
 */
export function findPhrase(text) {
  if (!text || typeof text !== "string") return null;
  
  const normalized = text.trim();
  const allPhrases = getAllPhrases();
  
  return allPhrases.find(p => p.text === normalized);
}

export default PHRASES_CACHE;

