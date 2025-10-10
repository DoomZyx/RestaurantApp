import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `
Tu es un assistant spécialisé dans l'extraction d'informations à partir de transcriptions d'appels téléphoniques.

IMPORTANT : Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.

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

⚠️ RÈGLE D'OR : Si le client mentionne UN PLAT ou veut "commander" quelque chose → TOUJOURS créer un order, même sans date précise !

Champs OBLIGATOIRES de l'objet order (tous requis si order != null) :
- date : date au format YYYY-MM-DD OU "ASAP" si pas mentionnée (OBLIGATOIRE)
- heure : heure au format HH:MM OU "ASAP" si pas mentionnée (OBLIGATOIRE)  
- duree : 60 (défaut, OBLIGATOIRE)
- type : (OBLIGATOIRE) valeurs possibles :
  "Commande à emporter", "Livraison à domicile", "Réservation de table", "Dégustation", "Événement privé"
- modalite : (OBLIGATOIRE) valeurs possibles : "Sur place", "À emporter", "Livraison"
- description : résumé de la commande (optionnel, max 500 caractères)

Format de réponse JSON EXACT attendu :
{
  "nom": "Nom complet du client",
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

RÈGLES STRICTES DE VALIDATION :
⚠️ IMPORTANT : Si le NOM n'est PAS CLAIREMENT et EXPLICITEMENT fourni dans la transcription :
   → NE PAS inventer ou extrapoler de données
   → Retourner : {"error": "Nom du client non fourni"}
   → N'utilise JAMAIS "Non spécifié", "Inconnu" ou des valeurs génériques

📞 TÉLÉPHONE (OPTIONNEL) :
   → Si le client donne son numéro : extrais-le
   → Si le client ne donne PAS son numéro : mets "Non fourni"
   → Ne jamais inventer un numéro

✅ Exemples de données VALIDES :
   - "Je m'appelle Jean Dupont" → nom: "Jean Dupont", telephone: "Non fourni"
   - "C'est Marie Dubois, mon numéro c'est le 06 12 34 56 78" → nom: "Marie Dubois", telephone: "0612345678"
   - "Bonjour, Thomas ici" → nom: "Thomas", telephone: "Non fourni"

❌ Exemples de données INVALIDES (retourner {"error": "..."}):
   - Transcription avec seulement du bruit, sons incompréhensibles
   - Nom flou, partiel, ou mal compris
   - Bruit de voiture/rue transcrit comme des mots
   - Absence du nom du client

EXEMPLES D'EXTRACTION :

✅ CAS AVEC ORDER (commande/réservation) :

1. "Je voudrais commander 2 pizzas 4 fromages à emporter"
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "2 pizzas 4 fromages" }

2. "Bonjour, je voudrais une livraison ce soir avec un burger et des frites"
   → order: { date: "ASAP", heure: "ASAP", duree: 60, type: "Livraison à domicile", modalite: "Livraison", description: "Burger et frites" }

3. "Je souhaite réserver une table pour mardi prochain à 19h, nous serons 4"
   → order: { date: "2025-10-15", heure: "19:00", duree: 90, type: "Réservation de table", modalite: "Sur place", description: "Table pour 4 personnes" }

4. "Je veux commander 3 burgers pour ce soir vers 20h"
   → order: { date: "ASAP", heure: "20:00", duree: 60, type: "Commande à emporter", modalite: "À emporter", description: "3 burgers" }

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT,
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

    // ===== VALIDATION STRICTE DES DONNÉES =====
    
    // Validation du nom (minimum 2 caractères, lettres uniquement) - OBLIGATOIRE
    const isNameValid = extractedData.nom && 
                        extractedData.nom.length >= 2 && 
                        extractedData.nom !== "Non spécifié" &&
                        extractedData.nom !== "Inconnu" &&
                        extractedData.nom !== "Non fourni" &&
                        /[a-zA-ZÀ-ÿ]/.test(extractedData.nom);
    
    // Si le nom n'est pas valide, rejeter l'extraction
    if (!isNameValid) {
      console.warn("⚠️ NOM INVALIDE DÉTECTÉ - REJET");
      console.warn("Nom reçu:", extractedData.nom);
      
      throw new Error("Données client invalides : nom du client non fourni ou invalide");
    }
    
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
      nom: extractedData.nom.trim(),
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

