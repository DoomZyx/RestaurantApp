import OpenAI from "openai";
import dotenv from "dotenv";
import { getPricingForGPT } from "./pricingService.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `RÈGLES ABSOLUES - FORMAT JSON UNIQUEMENT 

1. Réponds UNIQUEMENT avec un JSON valide
2. AUCUN texte avant ou après le JSON
3. Guillemets doubles OBLIGATOIRES
4. PAS de virgule finale dans les objets

========================================
TA MISSION :
Extraire les informations d'un appel téléphonique de RESTAURANT
========================================

CORRECTION AUTOMATIQUE DES ERREURS DE TRANSCRIPTION :

Audio → Correction :
- "copoins", "copins", "coco" → "Coca" ou "Coca-Cola"
- "pizaa", "pizzza" → "Pizza"
- "borger", "burgeur" → "Burger"
- "frite", "frittes" → "Frites"
- "salad" → "Salade"
- "mennu" → "Menu"
- "desert", "désert" → "Dessert"
- "marguerite", "margarita" → "Margherita"
- "quatre fromage" → "4 Fromages"
- "reine", "reines" → "Reine"

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
    "date": "2025-10-21 ou ASAP",
    "heure": "19:00 ou ASAP",
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
- Questions sur le menu/ingrédients
- Réclamations sans commande

SI TU HÉSITES → CRÉER L'ORDER quand même !

========================================
CHAMPS À EXTRAIRE :
========================================

NOM (nom) - RÈGLE CRITIQUE :
→ CHERCHE LE NOM dans TOUTE la transcription (début, milieu, fin)
→ Variantes possibles : "Je m'appelle X", "C'est X", "X à l'appareil", "Pour X", "Nom : X"
→ Si prénom seul (ex: "Martin") : Accepte-le tel quel
→ Si nom complet (ex: "Jean Dupont") : Extrais-le complet
→ Si titre + nom (ex: "Monsieur Martin") : Garde tout
→ Si flou/partiel : "Client" + initiale (ex: "Client M")
→ Si totalement absent : "Client inconnu"

IMPORTANT : Le nom est souvent dit au MILIEU de la conversation, pas au début
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
→ Si donné : Extrais-le (format : 0612345678)
→ Si absent : "Non fourni"
NE JAMAIS inventer un numéro

TYPE_DEMANDE (type_demande) :
Valeurs autorisées UNIQUEMENT :
"Commande à emporter" | "Livraison à domicile" | "Réservation de table" | "Information menu" | "Réclamation" | "Facturation" | "Autre"

SERVICES (services) :
Valeurs autorisées UNIQUEMENT :
"Pizzas" | "Burgers" | "Salades" | "Boissons" | "Desserts" | "Menus" | "Promotions" | "Autre"

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
→ Si AUCUNE heure : "ASAP"
→ IMPORTANT : Si heure ambiguë (ex: "8h" sans "matin/soir"):
  * Fast-food ouvert midi (11h-15h) et soir (18h-23h)
  * "8h" = probablement 20:00 (soir)
  * "midi" ou "12h" = 12:00
  * Si contexte clair → adapte (ex: "8h du matin" = 08:00)

DURÉE (duree) :
→ Commande : 60
→ Réservation : 90

TYPE (type) :
Valeurs autorisées :
"Commande à emporter" | "Livraison à domicile" | "Réservation de table" | "Dégustation" | "Événement privé"
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
  "nom": "Nom exact du produit",
  "categorie": "Pizzas",
  "quantite": 2,
  "prixUnitaire": 12.50,
  "supplements": "+fromage, +oignons",
  "personnalisation": null  // Pour les tacos personnalisés (voir ci-dessous)
}

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

MENUS - RÈGLE CRITIQUE :
Si le client commande un MENU (ex: "Menu USA Beef Burger", "Menu Tacos Double"), c'est UN SEUL produit.
Le menu INCLUT DEJA : plat + boisson + accompagnement (frites).

→ Extrais le menu comme UN SEUL item dans commandes[] avec le nom exact du menu
→ NE PAS extraire séparément le burger/tacos, la boisson et les frites
→ La boisson choisie va dans le champ "options" comme objet structuré

Exemple Menu :
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
    "heure": "ASAP",
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

========================================
RAPPEL FINAL - RÈGLES ABSOLUES
========================================

1. JSON valide UNIQUEMENT (pas de texte)

2. NOM DU CLIENT = CHERCHE-LE PARTOUT
   → Lis TOUTE la transcription (début, milieu, fin)
   → Patterns : "Je m'appelle X", "C'est X", "Pour X", "Monsieur/Madame X"
   → Même un prénom seul (ex: "Martin") = VALIDE, extrais-le
   → Si vraiment absent = "Client inconnu"

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

export async function extractCallData(transcription) {
  try {

    if (!transcription || transcription.trim().length === 0) {
      throw new Error("Transcription vide ou invalide");
    }

    // Récupérer le menu configuré
    const pricing = await getPricingForGPT();
    let enrichedPrompt = EXTRACTION_PROMPT;

    // Ajouter le menu du restaurant au prompt si disponible
    if (pricing && pricing.menu) {
      const menuInfo = `
========================================
MENU DU RESTAURANT (NOM EXACT DES PRODUITS) :
========================================
UTILISE CES NOMS EXACTS DANS LA DESCRIPTION DE LA COMMANDE

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

    const completion = await openai.chat.completions.create({
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
      temperature: 0.1,
      max_tokens: 500,
    });

    const rawResponse = completion.choices?.[0]?.message?.content?.trim();

    if (!rawResponse) {
      throw new Error("Aucune réponse de l'API OpenAI");
    }

    // Nettoyer le markdown éventuel
    let response = rawResponse;
    if (response.startsWith("```json")) {
      response = response.replace(/```json\n?/, "").replace(/```\n?/, "");
    } else if (response.startsWith("```")) {
      response = response.replace(/```\n?/, "").replace(/```\n?/, "");
    }

    const extractedData = JSON.parse(response);
    
    // Log pour debugging : afficher si un order a été créé
    if (extractedData.order) {
    }

    // Vérifier si GPT a retourné une erreur (données non fournies)
    if (extractedData.error) {
      throw new Error(`Extraction impossible : ${extractedData.error}`);
    }

    // ===== VALIDATION SOUPLE DES DONNÉES =====
    
    // Validation du nom (accepte "Client inconnu" maintenant)
    let nomClient = extractedData.nom || "Client inconnu";
    
    // Nettoyer les valeurs invalides
    if (typeof nomClient !== 'string' || 
        nomClient.trim().length < 2 ||
        nomClient === "Non spécifié" ||
        nomClient === "Inconnu" ||
        nomClient === "Non fourni") {
      nomClient = "Client inconnu";
    }
    
    
    // Validation du téléphone (format français) - OPTIONNEL
    const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;
    let cleanedPhone = "Non fourni";
    
    if (extractedData.telephone && extractedData.telephone !== "Non fourni") {
      const phoneTest = extractedData.telephone.replace(/[\s.-]/g, '');
      if (phoneRegex.test(phoneTest)) {
        cleanedPhone = phoneTest;
      } else {
        cleanedPhone = "Non fourni";
      }
    }

    // Normaliser la structure
    // IMPORTANT : GPT retourne "order" pas "appointment" donc on lit "order"
    const validatedData = {
      nom: nomClient.trim(),
      telephone: cleanedPhone,
      type_demande: extractedData.type_demande || "Autre",
      services: extractedData.services || "Autre",
      description: extractedData.description || "Aucune description fournie",
      statut: extractedData.statut || "nouveau",
      date: new Date(),
      appointment: extractedData.hasOwnProperty("order") 
      ? extractedData.order 
      : null
    };

    if (validatedData.appointment) {
    }

    return validatedData;

  } catch (error) {
    console.error("ERREUR EXTRACTION GPT:");
    console.error("Type d'erreur:", error.name);
    console.error("Message d'erreur:", error.message);
    console.error("Stack:", error.stack);
    
    // Vérifier si c'est une erreur d'API OpenAI
    if (error.response) {
      console.error("Erreur API OpenAI:", {
        status: error.response.status,
        data: error.response.data
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

