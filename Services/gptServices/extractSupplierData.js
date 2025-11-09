import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extrait les informations de la réponse du fournisseur depuis la transcription
 * @param {string} transcription - La transcription complète de l'appel
 * @param {Array} ingredients - Liste des ingrédients commandés
 * @returns {Promise<Object>} - Les données extraites
 */
export async function extractSupplierResponse(transcription, ingredients) {
  try {
    console.log("🤖 Extraction des données fournisseur avec GPT-4...");

    const ingredientsList = ingredients
      .map(ing => `${ing.quantite} ${ing.unite} de ${ing.nom}`)
      .join(", ");

    const prompt = `Tu es un assistant qui analyse des transcriptions d'appels téléphoniques avec des fournisseurs.

CONTEXTE :
Notre restaurant a passé une commande au fournisseur pour les ingrédients suivants :
${ingredientsList}

TRANSCRIPTION DE L'APPEL :
${transcription}

TÂCHE :
Extrais les informations suivantes de la conversation :
1. Est-ce que le fournisseur accepte la commande ? (oui/non)
2. Date de livraison proposée (format YYYY-MM-DD si mentionnée)
3. Heure de livraison (format HH:MM si mentionnée)
4. Prix total (en euros, si mentionné)
5. Délai de livraison en texte (ex: "demain matin", "dans 2 jours")
6. Commentaires ou conditions particulières

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :
{
  "accepte": true/false,
  "date_livraison": "YYYY-MM-DD" ou null,
  "heure_livraison": "HH:MM" ou null,
  "prix_total": nombre ou null,
  "delai_livraison": "texte" ou null,
  "commentaire": "texte" ou null
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant spécialisé dans l'extraction d'informations structurées depuis des transcriptions d'appels. Tu réponds TOUJOURS en JSON valide."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    console.log("📝 Réponse GPT:", responseText);

    const extractedData = JSON.parse(responseText);

    // Validation et nettoyage des données
    const cleanedData = {
      accepte: extractedData.accepte === true,
      date_livraison: extractedData.date_livraison || null,
      heure_livraison: extractedData.heure_livraison || null,
      prix_total: extractedData.prix_total ? parseFloat(extractedData.prix_total) : null,
      delai_livraison: extractedData.delai_livraison || null,
      commentaire: extractedData.commentaire || null
    };

    console.log("✅ Données extraites:", cleanedData);
    return cleanedData;

  } catch (error) {
    console.error("❌ Erreur extraction données fournisseur:", error);
    throw new Error(`Erreur extraction GPT: ${error.message}`);
  }
}

/**
 * Génère un résumé de la commande pour le fournisseur
 * @param {string} restaurantName - Nom du restaurant
 * @param {Array} ingredients - Liste des ingrédients
 * @returns {string} - Résumé formaté
 */
export function generateOrderSummary(restaurantName, ingredients) {
  const items = ingredients
    .map(ing => `${ing.quantite} ${ing.unite} de ${ing.nom}`)
    .join(", ");
  
  return `Bonjour, c'est ${restaurantName}. Je souhaiterais commander : ${items}. Pouvez-vous me confirmer si c'est possible et quand vous pourriez livrer ?`;
}

export default {
  extractSupplierResponse,
  generateOrderSummary
};






