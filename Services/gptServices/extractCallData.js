import OpenAI from "openai";
import dotenv from "dotenv";
import { getPricingForGPT } from "./pricingService.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `
Tu es un assistant spécialisé dans l'extraction d'informations à partir de transcriptions d'appels téléphoniques pour un RESTAURANT.

IMPORTANT : Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.

⚠️ CORRECTION AUTOMATIQUE DES ERREURS DE TRANSCRIPTION :
Les transcriptions audio contiennent souvent des erreurs. Tu DOIS corriger automatiquement les mots mal transcrits en fonction du contexte RESTAURANT.

EXEMPLES DE CORRECTIONS COURANTES :
- "copoins", "copins", "coco" → "coca"
- "pizaa", "pizza", "pizzza" → "pizza"
- "borger", "burgeur" → "burger"
- "frite", "frittes" → "frites"
- "salad", "salade" → "salade"
- "mennu", "menu" → "menu"
- "desert", "désert" → "dessert"
- "boisson", "boissson" → "boisson"
- "marguerite", "margarita" → "Margherita"
- "quatre fromage", "4 fromages" → "4 fromages"
- "reine", "reines" → "Reine"

RÈGLE : Dans la description de la commande, utilise TOUJOURS les termes corrects de restaurant, pas la transcription brute.

Analyse la transcription suivante et extrait les informations importantes.

Informations à extraire :
- nom : nom complet du client (string) - ex: "Jean Dupont", "Marie Dubois"
- telephone : numéro de téléphone du client (string) - ex: "0123456789", "0987654321"
- type_demande : type de demande client (string) - UNIQUEMENT une de ces valeurs : "Commande à emporter", "Livraison à domicile", "Réservation de table", "Information menu", "Réclamation", "Facturation", "Autre"
- services : services demandés (string) - UNIQUEMENT une de ces valeurs : "Pizzas", "Burgers", "Salades", "Boissons", "Desserts", "Menus", "Promotions", "Autre"
- description : description détaillée de la demande (string) - résume clairement le projet
- statut : statut de la demande (string) - toujours "nouveau" pour un nouvel appel
- order : objet ou null (CRITIQUE - TRÈS IMPORTANT)
   * ✅ CRÉER UN ORDER SI : Le client veut COMMANDER ou RÉSERVER quelque chose
     → Exemples : "je veux commander", "une pizza", "livraison", "à emporter", "réserver une table"
   * ❌ METTRE NULL SI : Le client demande seulement des INFOS sans commander
     → Exemples : "c'est quoi vos horaires ?", "vous avez quoi au menu ?", "c'est combien ?"
   * Si le client COMMANDE mais ne donne pas de date/heure → utiliser "ASAP" pour les deux

⚠️ RÈGLE D'OR : Si le client mentionne UN PLAT ou veut "commander" quelque chose → TOUJOURS créer un order, même sans toutes les infos !

Champs de l'objet order (REMPLIS CE QUE TU PEUX, mets "ASAP" ou null si tu n'as pas l'info) :
- date : date au format YYYY-MM-DD OU "ASAP" si pas mentionnée (mets "ASAP" par défaut)
- heure : heure au format HH:MM OU "ASAP" si pas mentionnée (mets "ASAP" par défaut)
- duree : 60 pour commandes, 90 pour réservations (mets 60 par défaut)
- type : valeurs possibles :
  "Commande à emporter", "Livraison à domicile", "Réservation de table", "Dégustation", "Événement privé"
  (mets "Commande à emporter" par défaut si pas précisé)
- modalite : valeurs possibles : "Sur place", "À emporter", "Livraison"
  (mets "À emporter" par défaut si pas précisé)
- nombrePersonnes : nombre de personnes (SEULEMENT pour "Réservation de table" - mets null sinon)
- description : résumé de la commande (mets ce que tu as compris)

Format de réponse JSON EXACT attendu :
{
"nom": "Nom complet du client", ## SURTOUT N OUBLIES PAS LE NOM DE L'INTERLOCUTEUR !!
  "telephone": "Numéro de téléphone complet",
  "type_demande": "Type de demande client",
  "services": "Services demandés",
  "description": "Description détaillée du projet",
  "statut": "nouveau",
  "order": {
    "date": "2025-10-05",
    "heure": "14:30",
    "duree": 60,
    "type": "Commande à emporter",
    "modalite": "Sur place",
    "nombrePersonnes": 4,
    "description": "Description de la commande"
  }
}

MAPPING DES VALEURS :
- Pour type_demande (demande client) :
  * "Commande à emporter" - pour commandes à récupérer
  * "Livraison à domicile" - pour livraisons
  * "Réservation de table" - pour réserver une table
  * "Information menu" - pour demandes d'infos menu
  * "Réclamation" - pour plaintes
  * "Facturation" - pour questions de facturation
  * "Autre" - pour autres types

- Pour services (produits) :
  * "Pizzas" - commande de pizzas
  * "Burgers" - commande de burgers
  * "Salades" - commande de salades
  * "Boissons" - commande de boissons
  * "Desserts" - commande de desserts
  * "Menus" - commande de menus
  * "Promotions" - demandes sur les promotions
  * "Autre" - autres produits

RÈGLES :
1. Réponds UNIQUEMENT avec le JSON, pas de texte avant ou après
2. Assure-toi que le JSON est valide
3. Utilise des guillemets doubles pour les strings
4. Pas de virgule finale
5. Extrais TOUJOURS le nom et téléphone s'ils sont mentionnés
6. Utilise UNIQUEMENT les valeurs autorisées pour type_demande, services, type (commande), modalite (commande)
7. Si aucune commande n'est mentionnée → "order": null

RÈGLES DE VALIDATION ASSOUPLIES :
⚠️ NOM DU CLIENT :
   → Si le nom est clairement donné : extrais-le
   → Si le nom est flou ou partiel : mets "Client" + première lettre (ex: "Client M")
   → Si AUCUN nom du tout : mets "Client inconnu"
   → L'important c'est de TOUJOURS créer la commande, même sans nom parfait

📞 TÉLÉPHONE (OPTIONNEL) :
   → Si le client donne son numéro : extrais-le
   → Si le client ne donne PAS son numéro : mets "Non fourni"
   → Ne jamais inventer un numéro

✅ Exemples de données VALIDES :
   - "Je m'appelle Jean Dupont" → nom: "Jean Dupont", telephone: "Non fourni"
   - "C'est Marie Dubois, mon numéro c'est le 06 12 34 56 78" → nom: "Marie Dubois", telephone: "0612345678"
   - "Bonjour, Thomas ici" → nom: "Thomas", telephone: "Non fourni"
   - "Je veux commander une pizza" (pas de nom) → nom: "Client inconnu", telephone: "Non fourni"
   - "M. Dupont à l'appareil" → nom: "M. Dupont", telephone: "Non fourni"

⚠️ TOUJOURS créer l'order si c'est une commande, même avec des données incomplètes !

EXEMPLES D'EXTRACTION :

✅ CAS AVEC ORDER (commande/réservation) :

1. "Je voudrais commander 2 pizzas 4 fromages à emporter"
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "2 pizzas 4 fromages" }

2. "Bonjour, je voudrais une livraison ce soir avec un burger et des frites"
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Livraison à domicile", modalite: "Livraison", description: "Burger et frites" }

3. "Je souhaite réserver une table pour mardi prochain à 19h, nous serons 4"
   → order: { date: "2025-10-15", heure: "19:00", duree: 90, type: "Réservation de table", modalite: "Sur place", nombrePersonnes: 4, description: "Table pour 4 personnes" }

4. "Je veux commander 3 burgers pour ce soir vers 20h"
   → order: { date: "ASAP", heure: "20:00", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "3 burgers" }

🔧 EXEMPLES AVEC CORRECTIONS DE TRANSCRIPTION :

5. "Je veux 3 copoins et 2 pizaas" (transcription audio avec erreurs)
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "3 coca et 2 pizzas" }
   ⚠️ NOTE : "copoins" corrigé en "coca", "pizaas" corrigé en "pizzas"

6. "Je voudrais un borger et des frittes sil vous plaît"
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "Burger et frites" }
   ⚠️ NOTE : "borger" corrigé en "burger", "frittes" corrigé en "frites"

❌ CAS SANS ORDER (informations seulement) :

1. "Vous êtes ouverts jusqu'à quelle heure ?"
   → order: null

2. "C'est quoi les ingrédients de la pizza 4 fromages ?"
   → order: null

3. "Vous livrez dans quel périmètre ?"
   → order: null

`;

export async function extractCallData(transcription) {
  try {
    console.log("🎤 Début extraction GPT - Longueur transcription:", transcription?.length || 0);
    console.log("📝 Transcription reçue:", transcription?.substring(0, 200) || "VIDE");

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
📋 MENU DU RESTAURANT (NOM EXACT DES PRODUITS) :
========================================
⚠️ UTILISE CES NOMS EXACTS DANS LA DESCRIPTION DE LA COMMANDE

${Object.keys(pricing.menu).map(categorie => {
  const category = pricing.menu[categorie];
  return `
${category.nom.toUpperCase()} :
${category.produits.map(produit => `- ${produit.nom}${produit.description ? ` (${produit.description})` : ''}`).join('\n')}`;
}).join('\n')}

⚠️ RÈGLE IMPORTANTE : 
Quand le client mentionne un produit, utilise le NOM EXACT du menu ci-dessus dans la description.
Exemples :
- Client dit "un copoin" → Écris "Coca-Cola" ou "Coca" (selon ce qui est au menu)
- Client dit "un borger" → Écris le nom exact du burger commandé (ex: "USA Beef Burger")
- Client dit "une pizaa" → Écris le nom exact de la pizza (ex: "Pizza Margherita")

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
    console.log("✅ Réponse OpenAI reçue (COMPLÈTE):", rawResponse);

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
    console.log("🔍 Order détecté dans la réponse ?", extractedData.order ? "✅ OUI" : "❌ NON");
    if (extractedData.order) {
      console.log("📦 Détails de l'order:", JSON.stringify(extractedData.order, null, 2));
    }

    // Vérifier si GPT a retourné une erreur (données non fournies)
    if (extractedData.error) {
      console.warn("⚠️ GPT a détecté des données invalides :", extractedData.error);
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
    
    console.log("✅ Nom accepté:", nomClient);
    
    // Validation du téléphone (format français) - OPTIONNEL
    const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;
    let cleanedPhone = "Non fourni";
    
    if (extractedData.telephone && extractedData.telephone !== "Non fourni") {
      const phoneTest = extractedData.telephone.replace(/[\s.-]/g, '');
      if (phoneRegex.test(phoneTest)) {
        cleanedPhone = phoneTest;
        console.log("✅ Téléphone valide détecté:", cleanedPhone);
      } else {
        console.warn("⚠️ Téléphone invalide, on le met à 'Non fourni':", extractedData.telephone);
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

    // Logs pour debugging
    console.log("🔍 Données extraites par GPT:", {
      client: `${validatedData.nom} - ${validatedData.telephone}`,
      type_demande: validatedData.type_demande,
      services: validatedData.services,
      appointment: validatedData.appointment ? "✅ Présent" : "❌ Absent"
    });

    if (validatedData.appointment) {
      console.log("📅 Détails de la commande extraite:", validatedData.appointment);
    }

    return validatedData;

  } catch (error) {
    console.error("❌ ERREUR EXTRACTION GPT:");
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

