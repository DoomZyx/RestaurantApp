import twilio from "twilio";
import dotenv from "dotenv";
import SupplierOrderModel from "../models/supplierOrder.js";

dotenv.config();

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Vérifier la configuration
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn("⚠️ Configuration Twilio manquante. Les appels fournisseurs ne fonctionneront pas.");
}

const twilioClient = twilio(accountSid, authToken);

/**
 * Normalise un numéro de téléphone français au format international E.164
 * @param {string} phoneNumber - Numéro à normaliser
 * @returns {string} - Numéro au format +33...
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;
  
  // Enlever tous les espaces, tirets, points, parenthèses
  let cleaned = phoneNumber.replace(/[\s\-\.()]/g, '');
  
  // Si déjà au format international (+33...), retourner tel quel
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Si commence par 00 (format international sans +), remplacer par +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }
  
  // Si commence par 0 (format français), remplacer par +33
  if (cleaned.startsWith('0')) {
    return '+33' + cleaned.substring(1);
  }
  
  // Si ne commence pas par 0, assumer que c'est déjà sans le 0
  return '+33' + cleaned;
}

/**
 * Initie un appel à un fournisseur
 * @param {Object} orderData - Données de la commande
 * @param {string} publicHost - Host public pour les webhooks
 * @returns {Promise<Object>} - Résultat de l'appel avec callSid et orderId
 */
export async function initiateSupplierCall(orderData, publicHost) {
  try {
    console.log("📞 Initiation appel fournisseur:", orderData.fournisseur.nom);

    // Normaliser le numéro de téléphone au format international
    const normalizedPhone = normalizePhoneNumber(orderData.fournisseur.telephone);
    console.log(`📱 Numéro normalisé: ${orderData.fournisseur.telephone} → ${normalizedPhone}`);

    // Créer la commande en base de données
    const order = await SupplierOrderModel.create({
      fournisseur: {
        ...orderData.fournisseur,
        telephone: normalizedPhone // Sauvegarder le numéro normalisé
      },
      ingredients: orderData.ingredients,
      statut: "en_attente",
      appel: {
        dateAppel: new Date()
      }
    });

    console.log("✅ Commande créée:", order._id);

    // Générer l'URL pour le TwiML
    const twimlUrl = `https://${publicHost}/supplier-call/${order._id}`;
    const statusCallbackUrl = `https://${publicHost}/supplier-call-status/${order._id}`;

    console.log("📡 TwiML URL:", twimlUrl);
    console.log("📡 Status callback URL:", statusCallbackUrl);

    // Créer l'appel Twilio
    const call = await twilioClient.calls.create({
      to: normalizedPhone,
      from: twilioPhoneNumber,
      url: twimlUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      record: false, // Pas besoin d'enregistrer, on a la transcription
      timeout: 60,
      machineDetection: "Enable", // Détecter les répondeurs
      asyncAmd: false
    });

    console.log("✅ Appel Twilio créé:", call.sid);

    // Mettre à jour la commande avec le Call SID
    order.appel.callSid = call.sid;
    await order.save();

    return {
      success: true,
      orderId: order._id.toString(),
      callSid: call.sid,
      message: "Appel en cours d'initiation"
    };

  } catch (error) {
    console.error("❌ Erreur initiation appel:", error);
    throw new Error(`Erreur Twilio: ${error.message}`);
  }
}

/**
 * Génère le TwiML pour connecter l'appel au WebSocket
 * @param {string} orderId - ID de la commande
 * @param {string} publicHost - Host public pour le WebSocket
 * @returns {string} - TwiML XML
 */
export function generateTwiML(orderId, publicHost) {
  const wsUrl = `wss://${publicHost}/supplier-stream/${orderId}`;
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="orderId" value="${orderId}" />
    </Stream>
  </Connect>
</Response>`;

  return twiml;
}

/**
 * Met à jour le statut de l'appel en fonction des événements Twilio
 * @param {string} orderId - ID de la commande
 * @param {Object} callStatus - Statut de l'appel Twilio
 */
export async function updateCallStatus(orderId, callStatus) {
  try {
    const order = await SupplierOrderModel.findById(orderId);
    if (!order) {
      console.error("❌ Commande introuvable:", orderId);
      return;
    }

    console.log(`📞 Statut appel ${callStatus.CallSid}: ${callStatus.CallStatus}`);

    // Mettre à jour les informations de l'appel
    order.appel.statut = callStatus.CallStatus;
    
    if (callStatus.CallDuration) {
      order.appel.duree = parseInt(callStatus.CallDuration);
    }

    // Si l'appel a échoué ou n'a pas abouti
    if (["failed", "busy", "no-answer", "canceled"].includes(callStatus.CallStatus)) {
      order.statut = "erreur";
      console.log(`❌ Appel échoué: ${callStatus.CallStatus}`);
    }

    await order.save();

  } catch (error) {
    console.error("❌ Erreur mise à jour statut appel:", error);
  }
}

/**
 * Vérifie si la configuration Twilio est complète
 * @returns {boolean}
 */
export function isTwilioConfigured() {
  return !!(accountSid && authToken && twilioPhoneNumber);
}

export default {
  initiateSupplierCall,
  generateTwiML,
  updateCallStatus,
  isTwilioConfigured
};

