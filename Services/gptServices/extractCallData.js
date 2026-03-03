import OpenAI from "openai";
import dotenv from "dotenv";
import { getPricingForGPT } from "./pricingService.js";
import {
  validateCallData,
  getValidationReport,
  validateTimeAgainstOpeningHours,
  validateTypeDemandeConsistency,
  validateQuantities,
  consolidateProducts,
  detectSuspiciousOrder,
} from "../validation/callDataValidation.js";
import {
  validateAllProducts,
} from "../validation/ProductValidationService.js";
import { callLogger } from "../logging/logger.js";
import {
  recordSuccessfulExtraction,
  recordParsingError,
  recordInvalidPhone,
  recordInvalidTime,
} from "../monitoring/extractionMetrics.js";
import { retryWithBackoff } from "../utils/retryWithBackoff.js";
import { extractWithRules } from "./ruleBasedExtractor.js";
import { FailedExtractionService } from "./failedExtractionService.js";
import circuitBreaker from "./circuitBreaker.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Version du prompt pour traçabilité (AMEL-011)
const PROMPT_VERSION = "2.0";

const EXTRACTION_PROMPT = `RÈGLES ABSOLUES - FORMAT JSON UNIQUEMENT 

1. Réponds UNIQUEMENT avec un JSON valide
2. AUCUN texte avant ou après le JSON
3. Guillemets doubles OBLIGATOIRES
4. PAS de virgule finale dans les objets

========================================
TA MISSION :
Extraire les informations d'un appel téléphonique de RESTAURANT
=======================================

Utilise les NOMS EXACTS du menu fourni ci-dessous, pas la transcription brute.

========================================
STRUCTURE JSON À RETOURNER :
========================================

{
  "nom": "Nom du client",
  "telephone": "0123456789 ou Non fourni",
  "type_demande": "Commande à emporter",
  "services": "Pizzas",
  "description": "Description claire de la demande",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": "19:00",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Pizza Margherita",
        "categorie": "Pizzas",
        "quantite": 2,
        "prixUnitaire": 12.50,
        "supplements": "+fromage"
      }
    ]
  }
}

========================================
RÈGLE CRITIQUE : QUAND CRÉER UN ORDER ?
========================================

CRÉER ORDER si :
- Le client mentionne UN PLAT (pizza, burger, salade, etc.)
- Le client dit "je veux commander"
- Le client dit "livraison" ou "à emporter"
- Le client dit "réserver une table"

ORDER = NULL si :
- Questions d'horaires uniquement
- Questions sur le menu/ingrédients sans demande de commande
- Réclamations sans commande
- Le client dit "je regarde le menu" ou "je consulte le menu"
- Le client demande seulement des informations (prix, horaires, adresse)
- Le client dit "je vais réfléchir" ou "je vais voir"

SI TU HÉSITES → Analyse le contexte :
- Si mention d'un PLAT CONCRET (nom de pizza, burger, etc.) → CRÉER ORDER
- Si seulement questions/infos sans mention de plat → ORDER = NULL
- En cas de doute, privilégie ORDER = NULL plutôt que créer une commande fantôme

========================================
CHAMPS À EXTRAIRE :
========================================

NOM (nom) - RÈGLE CRITIQUE :
→ CHERCHE LE NOM au millieu ou à la fin de la transcription (milieu, fin)
→ Variantes possibles : "Je m'appelle X", "C'est X", "X à l'appareil", "Pour X", "Nom : X"
→ Si prénom seul (ex: "Martin") : Accepte-le tel quel
→ Si nom complet (ex: "Jean Dupont") : Extrais-le complet
→ Si titre + nom (ex: "Monsieur Martin") : Garde tout
→ Si flou/partiel : "Client" + initiale (ex: "Client M")
→ Si totalement absent : "Client inconnu"

IMPORTANT : Le nom est souvent dit en fin de la conversation, pas au début
Exemple : "Je veux une pizza... oui Martin... pour 19h"
→ Extrais : "Martin"

PATTERNS DE NOM À DÉTECTER :
- "Je m'appelle [NOM]"
- "C'est [NOM]"
- "[NOM] à l'appareil"
- "Monsieur/Madame [NOM]"
- "Pour [NOM]"
- "C'est à quel nom ?" / "À [NOM]"
- "Nom: [NOM]" ou "Mon nom c'est [NOM]"

TÉLÉPHONE (telephone) :
→ Si donné : Extrais-le au format avec espaces entre paires de chiffres (ex: 07 86 87 67 89)
→ Si absent : "Non fourni"
NE JAMAIS inventer un numéro

TYPE_DEMANDE (type_demande) :
Valeurs autorisées UNIQUEMENT :
"Commande à emporter" | "Réservation de table" | "Information menu" | "Réclamation" | "Facturation" | "Autre"

SERVICES (services) :
Valeurs autorisées UNIQUEMENT :
"Pizzas" | "Burgers" | "Salades" | "Plats" | "Tacos" | "Boissons" | "Desserts" | "Menus" | "Promotions" | "Autre"

DESCRIPTION (description) :
→ Résumé clair de la demande du client

STATUT (statut) :
→ Toujours "nouveau"

========================================
🛒 OBJET ORDER (SI COMMANDE/RÉSERVATION) :
========================================

DATE (date) :
→ Si date mentionnée : Format YYYY-MM-DD
→ Si AUCUNE date : "ASAP"

HEURE (heure) :
→ Si heure mentionnée : Format HH:MM (ex: 19:00)
→ Si AUCUNE heure, ne jamais mettre "ASAP"
→ IMPORTANT : Si heure ambiguë (ex: "8h" sans "matin/soir"):
  * Fast-food ouvert midi (11h-15h) et soir (18h-23h)
  * "8h" = probablement 20:00 (soir)
  * "midi" ou "12h" = 12:00
  * Si contexte clair → adapte (ex: "8h du matin" = 08:00)
  * Si pour les minutes tu ne comprends pas si la transcription est ambiguë, ne jamais mettre "ASAP" mais mettre 30 minutes si le client commande 15 ou 20 minutes avant 30 minutes.

DURÉE (duree) :
→ Commande : 60
→ Réservation : 90

TYPE (type) :
Valeurs autorisées :
"Commande à emporter" | "Réservation de table"
Par défaut : "Commande à emporter"

MODALITÉ (modalite) :
Valeurs autorisées :
"Sur place" | "À emporter" | "Livraison"
Par défaut : "À emporter"

NOMBRE DE PERSONNES (nombrePersonnes) :
→ SEULEMENT pour "Réservation de table"
→ Sinon : null

COMMANDES (commandes) :
→ Tableau d'objets pour chaque plat :
{
  "nom": "Nom EXACT du produit tel qu'il apparaît dans le menu",
  "categorie": "Pizzas",
  "quantite": 2,
  "prixUnitaire": 12.50,
  "supplements": "+fromage, +oignons",
  "personnalisation": null  // Pour les tacos personnalisés (voir ci-dessous)
}

⚠️ RÈGLE CRITIQUE - NOM DU PRODUIT :
- Utilise le nom EXACT du menu (respect majuscules, variations)
- ATTENTION aux variations : Simple ≠ Double ≠ Triple
- Si client dit "triple tacos" → cherche "Menu Tacos Triple" ou "Tacos Triple"
- Si client dit "double burger" → cherche "Menu Double Burger" ou "Burger Double"
- NE PAS deviner ou simplifier le nom du produit

⚠️ TACOS - CORRESPONDANCE NOMBRE VIANDES :
Le client peut dire le NOMBRE DE VIANDES au lieu du type :
- "1 viande" ou "une viande" = Tacos Simple
- "2 viandes" ou "deux viandes" = Tacos Double
- "3 viandes" ou "trois viandes" = Tacos Triple

Exemples de detection :
- "un menu tacos 3 viandes" → "Menu Tacos Triple"
- "tacos avec 2 viandes" → "Tacos Double"
- "menu tacos une viande" → "Menu Tacos Simple"
- "triple tacos" → "Tacos Triple" (ou "Menu Tacos Triple" si menu)

Tu DOIS faire la conversion automatiquement.

PERSONNALISATION TACOS - RÈGLE OBLIGATOIRE :
Quand le client commande un TACOS, tu DOIS extraire ses choix de viandes et sauces :

Exemple 1 - Tacos Simple (1 viande) :
{
  "nom": "Tacos Simple (1 viande)",
  "categorie": "Tacos",
  "quantite": 1,
  "prixUnitaire": 7.50,
  "supplements": "",
  "personnalisation": {
    "viandes": ["Poulet"],  // 1 viande pour un simple
    "sauce": "Algérienne",
    "sansIngredients": [],
    "extras": []
  }
}

Exemple 2 - Tacos Double (2 viandes) :
{
  "nom": "Tacos Double (2 viandes)",
  "categorie": "Tacos",
  "quantite": 1,
  "prixUnitaire": 9.50,
  "supplements": "",
  "personnalisation": {
    "viandes": ["Poulet", "Merguez"],  // 2 viandes pour un double
    "sauce": "Sauce Blanche",
    "sansIngredients": ["oignons"],  // Si le client dit "sans X"
    "extras": []
  }
}

IMPORTANT TACOS :
- Tacos Simple = 1 viande → extrais LA viande choisie
- Tacos Double = 2 viandes → extrais LES 2 viandes choisies  
- Tacos Triple = 3 viandes → extrais LES 3 viandes choisies
- TOUJOURS extraire la/les viande(s) et la sauce mentionnées
- Utilise UNIQUEMENT les options disponibles dans le menu (voir ci-dessous)

DETECTION AUTOMATIQUE DU TYPE :
Si tu vois "1 viande"/"une viande" → Utilise "Tacos Simple" dans le nom
Si tu vois "2 viandes"/"deux viandes" → Utilise "Tacos Double" dans le nom
Si tu vois "3 viandes"/"trois viandes" → Utilise "Tacos Triple" dans le nom
Si tu vois "menu" + nombre viandes → Utilise "Menu Tacos [Simple/Double/Triple]"

MENUS - RÈGLE CRITIQUE :
Si le client commande un MENU (ex: "Menu USA Beef Burger", "Menu Tacos Double"), c'est UN SEUL produit.
Le menu INCLUT DEJA : plat + boisson + accompagnement (frites).

→ Extrais le menu comme UN SEUL item dans commandes[] avec le nom exact du menu
→ NE PAS extraire séparément le burger/tacos, la boisson et les frites
→ La boisson choisie va dans le champ "options" comme objet structuré

⚠️ RÈGLE ABSOLUE - BOISSONS DANS LES MENUS :
- Si plusieurs menus sont commandés, CHAQUE menu doit avoir sa boisson dans options
- La boisson est DÉJÀ incluse dans le prix du menu → NE JAMAIS l'ajouter comme produit séparé
- Si le client dit "un menu burger et un coca en plus" → c'est 1 menu (avec boisson dans options) + 1 coca séparé

Exemple Menu simple :
Client dit : "Je veux un menu USA Beef Burger avec un coca"
→ Extrais comme 1 seul item :
{
  "nom": "Menu USA Beef Burger",
  "categorie": "Menus",
  "quantite": 1,
  "prixUnitaire": 15.00,
  "supplements": "",
  "options": {
    "boisson": "Coca-Cola"
  }
}

Exemple Plusieurs menus :
Client dit : "Je veux 2 menus burger, un avec coca et l'autre avec sprite"
→ Extrais comme 2 items (un par menu avec sa boisson) :
[
  {
    "nom": "Menu USA Beef Burger",
    "categorie": "Menus",
    "quantite": 1,
    "prixUnitaire": 15.00,
    "options": { "boisson": "Coca-Cola" }
  },
  {
    "nom": "Menu USA Beef Burger",
    "categorie": "Menus",
    "quantite": 1,
    "prixUnitaire": 15.00,
    "options": { "boisson": "Sprite" }
  }
]

Exemple Menu + boisson supplémentaire :
Client dit : "Un menu burger avec coca et un coca en plus"
→ Extrais comme 2 items :
[
  {
    "nom": "Menu USA Beef Burger",
    "categorie": "Menus",
    "quantite": 1,
    "prixUnitaire": 15.00,
    "options": { "boisson": "Coca-Cola" }
  },
  {
    "nom": "Coca-Cola",
    "categorie": "Boissons",
    "quantite": 1,
    "prixUnitaire": 3.00
  }
]

Si le client ne précise pas la boisson, mets "options": null ou "options": { "boisson": "Non précisée" }

Si pas de personnalisation ou produit non-tacos → personnalisation: null

========================================
EXEMPLES CONCRETS :
========================================

Exemple 1 - Commande simple :
Transcription : "Bonjour, je voudrais commander 2 pizzas 4 fromages à emporter"

JSON :
{
  "nom": "Client inconnu",
  "telephone": "07 86 87 67 89", -> exemple de format avec espaces entre paires de chiffres
  "type_demande": "Commande à emporter",
  "services": "Pizzas",
  "description": "Commande de 2 pizzas 4 fromages à emporter",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": "ASAP",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Pizza 4 Fromages",
        "categorie": "Pizzas",
        "quantite": 2,
        "prixUnitaire": 12.50,
        "supplements": ""
      }
    ]
  }
}

Exemple 2 - Réservation avec nom :
Transcription : "Je m'appelle Dupont, je voudrais réserver pour 4 personnes mardi prochain à 19h"

JSON :
{
  "nom": "Dupont",
  "telephone": "Non fourni",
  "type_demande": "Réservation de table",
  "services": "Autre",
  "description": "Réservation pour 4 personnes",
  "statut": "nouveau",
  "order": {
    "date": "2025-10-28",
    "heure": "19:00",
    "duree": 90,
    "type": "Réservation de table",
    "modalite": "Sur place",
    "nombrePersonnes": 4,
    "description": "Table pour 4 personnes",
    "commandes": []
  }
}

Exemple 2B - Nom donné au milieu :
Transcription : "Bonjour, je veux commander une pizza Margherita. C'est à quel nom ? Martin. Pour 19h s'il vous plaît."

JSON :
{
  "nom": "Martin",
  "telephone": "Non fourni",
  "type_demande": "Commande à emporter",
  "services": "Pizzas",
  "description": "Commande d'une pizza Margherita pour 19h",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": "19:00",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Pizza Margherita",
        "categorie": "Pizzas",
        "quantite": 1,
        "prixUnitaire": 12.50,
        "supplements": ""
      }
    ]
  }
}

Exemple 2C - Nom avec variante :
Transcription : "Oui bonjour, 2 pizzas 4 fromages. Pour Madame Dubois. À emporter."

JSON :
{
  "nom": "Madame Dubois",
  "telephone": "Non fourni",
  "type_demande": "Commande à emporter",
  "services": "Pizzas",
  "description": "Commande de 2 pizzas 4 fromages à emporter",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": "ASAP",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Pizza 4 Fromages",
        "categorie": "Pizzas",
        "quantite": 2,
        "prixUnitaire": 12.50,
        "supplements": ""
      }
    ]
  }
}

Exemple 3 - Correction transcription :
Transcription : "Je veux 2 copoins et un borger avec frittes"

JSON :
{
  "nom": "Client inconnu",
  "telephone": "Non fourni",
  "type_demande": "Commande à emporter",
  "services": "Burgers",
  "description": "Commande de 2 Coca-Cola, 1 burger et frites",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": "ASAP",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Coca-Cola",
        "categorie": "Boissons",
        "quantite": 2,
        "prixUnitaire": 3.00,
        "supplements": ""
      },
      {
        "nom": "USA Beef Burger",
        "categorie": "Burgers",
        "quantite": 1,
        "prixUnitaire": 10.00,
        "supplements": ""
      },
      {
        "nom": "Frites",
        "categorie": "Accompagnements",
        "quantite": 1,
        "prixUnitaire": 4.00,
        "supplements": ""
      }
    ]
  }
}

Exemple 4 - Tacos personnalisé :
Transcription : "Je veux un tacos double. Poulet et merguez. Sauce algérienne. Sans oignons s'il vous plaît. C'est pour Martin."

JSON :
{
  "nom": "Martin",
  "telephone": "Non fourni",
  "type_demande": "Commande à emporter",
  "services": "Tacos",
  "description": "Commande d'un tacos double poulet-merguez sauce algérienne sans oignons",
  "statut": "nouveau",
  "order": {
    "date": "ASAP",
    "heure": exemple "19:00",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "À emporter",
    "nombrePersonnes": null,
    "description": "",
    "commandes": [
      {
        "nom": "Tacos Double (2 viandes)",
        "categorie": "Tacos",
        "quantite": 1,
        "prixUnitaire": 9.50,
        "supplements": "",
        "personnalisation": {
          "viandes": ["Poulet", "Merguez"],
          "sauce": "Algérienne",
          "sansIngredients": ["oignons"],
          "extras": []
        }
      }
    ]
  }
}

Exemple 5 - Info uniquement (PAS de commande) :
Transcription : "Vous êtes ouverts jusqu'à quelle heure ?"

JSON :
{
  "nom": "Client inconnu",
  "telephone": "Non fourni",
  "type_demande": "Information menu",
  "services": "Autre",
  "description": "Demande d'informations sur les horaires",
  "statut": "nouveau",
  "order": null
}

Exemple 6 - Réclamation (Pas de commandes) :
Transcription : "Bonjour, Je voudrais parler à un responsable concernant : 
Exemple : "La livraison a été retardée" ou "Le service a été mauvais" ou "Le plat a été mauvais" ou "Une intoxication alimentaire".

JSON : 
{
  "nom": "Client inconnu",
  "telephone": "Non fourni",
  "type_demande": "Réclamation",
  "services": "Autre",
  "description": "Réclamation concernant la livraison ou le service ou le plat ou l'intoxication alimentaire",
  "statut": "nouveau",
  "order": null
}
========================================
RAPPEL FINAL - RÈGLES ABSOLUES
========================================

1. JSON valide UNIQUEMENT (pas de texte)

2. NOM DU CLIENT = RÈGLE ABSOLUE - CHERCHE PARTOUT
   → LIS LA TRANSCRIPTION COMPLÈTE (début, milieu, fin)
   → Patterns courants :
     * "Je m'appelle X", "C'est X", "Mon nom c'est X"
     * "Pour X", "Au nom de X", "À quel nom ?" → "X"
     * "Monsieur/Madame X", juste "X" après une question
   → ACCEPTE TOUT : prénom seul (Martin), nom seul (Dupont), les deux
   → ⚠️ Si le GPT vocal demande le nom ET le client répond → TU DOIS L'EXTRAIRE
   → Seulement si VRAIMENT absent ou client refuse = "Client inconnu"

3. Créer ORDER dès qu'un plat est mentionné

4. Utiliser les NOMS EXACTS du menu (fourni ci-dessous)

5. TÉLÉPHONE absent = "Non fourni" (ne jamais inventer)

6. Date/Heure absentes = "ASAP"

7. Corriger les erreurs de transcription audio

ASTUCE NOM : 
Le nom est RAREMENT dit au début. Cherche dans TOUTE la conversation.
Exemple : "Une pizza... Martin... pour 19h" → Nom = "Martin"

C'est parti !
`;

// Schéma JSON strict pour l'extraction
const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    nom: { type: ["string", "null"] },
    telephone: { type: ["string", "null"] },
    type_demande: { type: "string" },
    services: { type: "string" },
    description: { type: "string" },
    statut: { type: "string" },
    order: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        date: { type: "string" },
        heure: { type: ["string", "null"] },
        duree: { type: "number" },
        type: { type: "string" },
        modalite: { type: "string" },
        nombrePersonnes: { type: ["number", "null"] },
        description: { type: "string" },
        commandes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              nom: { type: "string" },
              categorie: { type: "string" },
              quantite: { type: "number" },
              prixUnitaire: { type: "number" },
              supplements: { type: "string" },
              personnalisation: { type: ["object", "null"] },
              options: { type: ["object", "null"] }
            },
            required: ["nom", "categorie", "quantite", "prixUnitaire"]
          }
        }
      },
      required: ["date", "duree", "type", "modalite", "commandes"]
    }
  },
  required: ["nom", "telephone", "type_demande", "services", "description", "statut"]
};

/**
 * Consolide les produits identiques (même nom + même personnalisation) (AMEL-012)
 * @param {Array} produits - Tableau de produits
 * @returns {Array} - Tableau de produits consolidés
 */
export async function extractCallData(transcription, streamSid = "unknown") {
  const extractionStartTime = Date.now();
  
  try {
    if (!transcription || transcription.trim().length === 0) {
      throw new Error("Transcription vide ou invalide");
    }

    // Log transcription brute et version du prompt (AMEL-009)
    callLogger.info(streamSid, "Transcription brute reçue pour extraction GPT", {
      transcriptionLength: transcription.length,
      transcriptionPreview: transcription.substring(0, 500) + (transcription.length > 500 ? "..." : ""),
      transcriptionFull: transcription,
      promptVersion: PROMPT_VERSION,
      event: "transcription_raw_for_gpt",
      timestamp: new Date().toISOString()
    });

    // Récupérer le menu configuré
    const pricing = await getPricingForGPT();
    let enrichedPrompt = EXTRACTION_PROMPT;

    // Ajouter le menu du restaurant au prompt si disponible
    if (pricing && pricing.menu) {
      const menuInfo = `
========================================
MENU DU RESTAURANT (NOM EXACT DES PRODUITS) :
========================================
⚠️ UTILISE CES NOMS EXACTS - ATTENTION AUX VARIATIONS (Simple/Double/Triple)
Tu dois trouver et utiliser le nom EXACT du produit dans ce menu

${Object.keys(pricing.menu).map(categorie => {
  const category = pricing.menu[categorie];
  return `
${category.nom.toUpperCase()} :
${category.produits.map(produit => {
  let produitStr = `- ${produit.nom}${produit.description ? ` (${produit.description})` : ''} - ${produit.prix}€`;
  
  // Si le produit a des options (tacos), les afficher
  if (produit.options) {
    produitStr += '\n  Options personnalisables :';
    Object.keys(produit.options).forEach(optKey => {
      const option = produit.options[optKey];
      if (option.choix && option.choix.length > 0) {
        produitStr += `\n    ${option.nom}: ${option.choix.join(', ')}`;
      }
    });
  }
  
  return produitStr;
}).join('\n')}`;
}).join('\n')}

RÈGLE IMPORTANTE : 
Quand le client mentionne un produit, utilise le NOM EXACT du menu ci-dessus dans la description.
Exemples :
- Client dit "un copoin" → Écris "Coca-Cola" ou "Coca" (selon ce qui est au menu)
- Client dit "un borger" → Écris le nom exact du burger commandé (ex: "USA Beef Burger")
- Client dit "une pizaa" → Écris le nom exact de la pizza (ex: "Pizza Margherita")

POUR LES TACOS :
- Utilise les OPTIONS EXACTES affichées ci-dessus
- Si le client précise viandes/sauces/crudités, remplis l'objet "personnalisation"
- Exemples de viandes valides : celles listées dans "Viandes"
- Exemples de sauces valides : celles listées dans "Sauces"
- Exemples de crudités valides : celles listées dans "Crudités"

Si le client ne précise pas le produit exact, utilise les noms génériques mais corrects.
========================================
`;
      enrichedPrompt = EXTRACTION_PROMPT + menuInfo;
    }

    // Vérifier si le circuit breaker est ouvert (OpenAI down)
    if (circuitBreaker.isOpen()) {
      callLogger.warn(streamSid, "Circuit breaker ouvert - Utilisation extracteur rule-based", {
        circuitState: circuitBreaker.getState(),
        event: "circuit_breaker_open",
      });

      // Utiliser extracteur rule-based directement
      const ruleBasedData = extractWithRules(transcription);
      callLogger.info(streamSid, "Extraction rule-based effectuée (fallback)", {
        event: "rule_based_extraction",
      });

      // Convertir au format attendu
      return {
        nom: ruleBasedData.nom,
        telephone: ruleBasedData.telephone || "Non fourni",
        type_demande: ruleBasedData.type_demande,
        services: ruleBasedData.services,
        description: ruleBasedData.description,
        statut: ruleBasedData.statut,
        date: ruleBasedData.date,
        appointment: ruleBasedData.appointment,
        extraction_rule_based: true,
      };
    }

    // Appel OpenAI avec retry et backoff exponentiel (AMEL-005)
    let completion;
    let tentatives = 0;
    
    try {
      completion = await retryWithBackoff(
        async () => {
          tentatives++;
          return await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: enrichedPrompt,
              },
              {
                role: "user",
                content: transcription,
              },
            ],
            temperature: 0,
            max_tokens: 2000,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "call_extraction",
                schema: EXTRACTION_JSON_SCHEMA,
              },
            },
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error, delay) => {
            callLogger.warn(streamSid, `Tentative ${attempt}/3 d'extraction GPT après erreur`, {
              error: error.message,
              status: error.status || (error.response && error.response.status),
              delay: `${delay}ms`,
              event: "gpt_extraction_retry",
            });

            // Si erreur 429 (rate limit), enregistrer dans circuit breaker
            if (error.status === 429 || (error.response && error.response.status === 429)) {
              circuitBreaker.recordFailure();
            }
          },
        }
      );

      // Succès - enregistrer dans circuit breaker
      circuitBreaker.recordSuccess();
    } catch (retryError) {
      // Toutes les tentatives ont échoué
      const errorStatus = retryError.status || (retryError.response && retryError.response.status);
      
      callLogger.error(streamSid, new Error("Échec complet de l'extraction GPT après retry"), {
        source: "extractCallData",
        context: "gpt_extraction_failed",
        error: retryError.message,
        status: errorStatus,
        tentatives,
      });

      // Enregistrer l'échec dans le circuit breaker
      circuitBreaker.recordFailure();

      // Sauvegarder la transcription brute pour traitement manuel
      await FailedExtractionService.saveFailedExtraction(
        streamSid,
        transcription,
        retryError,
        tentatives
      );

      // Si erreur 429 (rate limit) ou erreurs serveur, utiliser fallback rule-based
      if (errorStatus === 429 || errorStatus === 500 || errorStatus === 502 || errorStatus === 503) {
        callLogger.warn(streamSid, "Utilisation extracteur rule-based après échec GPT", {
          errorStatus,
          event: "fallback_rule_based",
        });

        const ruleBasedData = extractWithRules(transcription);
        return {
          nom: ruleBasedData.nom,
          telephone: ruleBasedData.telephone || "Non fourni",
          type_demande: ruleBasedData.type_demande,
          services: ruleBasedData.services,
          description: ruleBasedData.description,
          statut: ruleBasedData.statut,
          date: ruleBasedData.date,
          appointment: ruleBasedData.appointment,
          extraction_rule_based: true,
        };
      }

      // Re-throw pour que le catch principal gère l'erreur
      throw retryError;
    }

    const rawResponse = completion.choices?.[0]?.message?.content?.trim();

    if (!rawResponse) {
      callLogger.error(streamSid, new Error("Aucune réponse de l'API OpenAI"), {
        source: "extractCallData",
        context: "gpt_no_response",
        completion: JSON.stringify(completion).substring(0, 500),
        event: "gpt_empty_response"
      });
      throw new Error("Aucune réponse de l'API OpenAI");
    }

    // Log réponse brute GPT
    callLogger.info(streamSid, "Réponse brute GPT reçue", {
      event: "gpt_raw_response",
      responseLength: rawResponse.length,
      responsePreview: rawResponse.substring(0, 500) + (rawResponse.length > 500 ? "..." : ""),
      responseFull: rawResponse,
      timestamp: new Date().toISOString()
    });

    // Avec json_schema, la réponse est déjà du JSON valide, pas besoin de nettoyer le markdown
    let extractedData;
    try {
      extractedData = JSON.parse(rawResponse);
    } catch (parseError) {
      recordParsingError();
      callLogger.error(streamSid, new Error("Erreur parsing JSON extrait"), {
        source: "extractCallData",
        context: "json_parsing",
        rawResponse: rawResponse.substring(0, 1000),
        rawResponseFull: rawResponse,
        parseError: parseError.message,
        event: "json_parsing_error"
      });
      throw new Error("Impossible de parser les données extraites");
    }

    // Log JSON extrait avec comparaison transcription
    callLogger.info(streamSid, "JSON extrait par GPT - comparaison avec transcription", {
      event: "json_extracted_comparison",
      extractedData: JSON.stringify(extractedData, null, 2),
      extractedDataCompact: JSON.stringify(extractedData),
      transcriptionOriginal: transcription,
      transcriptionLength: transcription.length,
      extractedDataKeys: Object.keys(extractedData),
      hasOrder: !!extractedData.order,
      hasCommandes: !!(extractedData.order?.commandes?.length),
      commandesCount: extractedData.order?.commandes?.length || 0,
      nom: extractedData.nom,
      telephone: extractedData.telephone,
      type_demande: extractedData.type_demande,
      timestamp: new Date().toISOString()
    });

    // Vérifier si GPT a retourné une erreur (données non fournies)
    if (extractedData.error) {
      throw new Error(`Extraction impossible : ${extractedData.error}`);
    }

    // ===== VALIDATION DES PRODUITS (AMEL-001 à AMEL-004) =====
    let productsToValidate = [];
    if (extractedData.order?.commandes && Array.isArray(extractedData.order.commandes)) {
      productsToValidate = extractedData.order.commandes;
    }
    
    const productsValidation = await validateAllProducts(productsToValidate, streamSid);
    
    // Remplacer les produits extraits par les produits validés
    if (extractedData.order && productsValidation.validatedProducts.length > 0) {
      extractedData.order.commandes = productsValidation.validatedProducts;
    }
    
    // Logger erreurs et warnings produits
    if (productsValidation.hasErrors) {
      callLogger.warn(streamSid, "Erreurs de validation produits", {
        errors: productsValidation.errors,
        event: "product_validation_errors"
      });
    }
    
    if (productsValidation.warnings.length > 0) {
      callLogger.info(streamSid, "Avertissements validation produits", {
        warnings: productsValidation.warnings,
        event: "product_validation_warnings"
      });
    }

    // ===== CONSOLIDATION PRODUITS IDENTIQUES (AMEL-012) =====
    if (extractedData.order?.commandes && Array.isArray(extractedData.order.commandes)) {
      const consolidated = consolidateProducts(extractedData.order.commandes);
      extractedData.order.commandes = consolidated;
      
      if (consolidated.length !== extractedData.order.commandes.length) {
        callLogger.info(streamSid, "Produits consolidés", {
          avant: extractedData.order.commandes.length,
          apres: consolidated.length,
          event: "products_consolidated",
        });
      }
    }


    // ===== VALIDATION STRICTE DES DONNÉES =====
    const validatedData = validateCallData(extractedData);
    const validationReport = getValidationReport(extractedData, validatedData);
    
    // ===== VALIDATION HEURES CONTRE HORAIRES (AMEL-007) =====
    if (validatedData.appointment?.heure && validatedData.appointment?.date) {
      const timeValidation = await validateTimeAgainstOpeningHours(
        validatedData.appointment.heure,
        validatedData.appointment.date
      );
      
      if (!timeValidation.isValid) {
        callLogger.warn(streamSid, "Heure hors horaires d'ouverture", {
          heure: validatedData.appointment.heure,
          date: validatedData.appointment.date,
          reason: timeValidation.reason,
          adjustedTime: timeValidation.adjustedTime,
          event: "time_outside_hours"
        });
        
        // Ajuster l'heure si possible
        if (timeValidation.adjustedTime) {
          validatedData.appointment.heure = timeValidation.adjustedTime;
        }
      }
    }

    // ===== VALIDATION HEURES CONTRE HORAIRES (AMEL-007) =====
    if (validatedData.appointment?.heure) {
      const timeValidation = await validateTimeAgainstOpeningHours(
        validatedData.appointment.heure,
        validatedData.appointment.date
      );
      
      if (!timeValidation.isValid) {
        callLogger.warn(streamSid, "Heure hors horaires d'ouverture", {
          heure: validatedData.appointment.heure,
          date: validatedData.appointment.date,
          reason: timeValidation.reason,
          adjustedTime: timeValidation.adjustedTime,
          event: "time_outside_hours",
        });
        
        // Ajuster l'heure si possible
        if (timeValidation.adjustedTime) {
          validatedData.appointment.heure = timeValidation.adjustedTime;
        }
      }
    }

    // ===== VALIDATION COHÉRENCE TYPE_DEMANDE (AMEL-014) =====
    const consistencyValidation = validateTypeDemandeConsistency(
      validatedData.type_demande,
      validatedData.appointment?.commandes || []
    );
    
    if (!consistencyValidation.isValid) {
      callLogger.warn(streamSid, "Incohérence type_demande vs commandes", {
        type_demande: validatedData.type_demande,
        nombreCommandes: validatedData.appointment?.commandes?.length || 0,
        errors: consistencyValidation.errors,
        event: "type_demande_inconsistency",
      });
    }

    // Log erreurs de validation et enregistrer métriques
    if (!validationReport.isValid || validationReport.errors.length > 0) {
      callLogger.warn(streamSid, "Erreurs de validation détectées", {
        validationReport,
        event: "validation_errors"
      });

      // Enregistrer les métriques d'erreur
      validationReport.errors.forEach((error) => {
        if (error.field === "telephone") {
          recordInvalidPhone();
        } else if (error.field === "heure") {
          recordInvalidTime();
        }
      });
    }

    // Enregistrer extraction réussie
    recordSuccessfulExtraction();

    // Convertir "order" en "appointment" pour la compatibilité
    const finalData = {
      nom: validatedData.nom,
      telephone: validatedData.telephone || "Non fourni",
      type_demande: validatedData.type_demande,
      services: validatedData.services,
      description: validatedData.description,
      statut: validatedData.statut,
      date: validatedData.date,
      appointment: validatedData.appointment,
    };

    const extractionDuration = Date.now() - extractionStartTime;
    callLogger.performance(streamSid, "gpt_extraction", extractionDuration);

    return finalData;

  } catch (error) {
    const extractionDuration = Date.now() - extractionStartTime;
    
    callLogger.error(streamSid, error, {
      source: "extractCallData",
      context: "extraction_error",
      extractionDuration,
    });
    
    // Vérifier si c'est une erreur d'API OpenAI
    if (error.response) {
      callLogger.error(streamSid, new Error("Erreur API OpenAI"), {
        source: "extractCallData",
        context: "openai_api_error",
        status: error.response.status,
        data: error.response.data,
      });
    }

    // En cas d'erreur complète, utiliser extracteur rule-based de secours (AMEL-006)
    callLogger.warn(streamSid, "Erreur extraction GPT, tentative extraction rule-based", {
      error: error.message,
      event: "fallback_to_rule_based_on_error"
    });
    
    try {
      const pricing = await getPricingForGPT();
      const fallbackData = extractWithRules(transcription, pricing);
      callLogger.info(streamSid, "Extraction rule-based utilisée après erreur GPT", {
        extractedData: fallbackData,
        event: "rule_based_extraction_used"
      });
      return fallbackData;
    } catch (fallbackError) {
      callLogger.error(streamSid, new Error("Échec extraction rule-based également"), {
        error: fallbackError.message,
        event: "rule_based_extraction_failed"
      });
    }

    return {
      nom: "Client inconnu",
      telephone: "Non fourni",
      type_demande: "Autre",
      services: "Autre",
      description: "Erreur complète d'extraction",
      statut: "nouveau",
      date: new Date(),
      appointment: null
    };
  }
}

