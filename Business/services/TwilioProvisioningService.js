/**
 * Provisioning Twilio pour une instance : webhook sur numéro, optionnellement subaccount + achat numéro.
 * Ne jamais logger AccountSid, AuthToken, ni aucune clé.
 */

import twilio from "twilio";
import { InstanceModel, RESIDENCE_COUNTRIES } from "../../storage/models/Instance.js";

function resolveCountryCode(optionsCountry, instanceCountry) {
  const c = (optionsCountry || instanceCountry || "FR").toString().trim().toUpperCase();
  return RESIDENCE_COUNTRIES.includes(c) ? c : "FR";
}

/**
 * Configure le webhook Voice d'un numéro existant vers le Gateway.
 * @param {string} phoneNumber - E.164 (ex: +33600000000)
 * @param {string} webhookUrl - ex: https://gateway.example.com/twilio/slug/incoming-call
 * @param {Object} [twilioClient] - client Twilio (compte principal si absent)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function setNumberWebhook(phoneNumber, webhookUrl, twilioClient) {
  const client =
    twilioClient ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null);
  if (!client) {
    return { success: false, error: "TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant" };
  }

  try {
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber });
    if (!numbers || numbers.length === 0) {
      return { success: false, error: "Numéro non trouvé sur ce compte" };
    }
    await client.incomingPhoneNumbers(numbers[0].sid).update({ voiceUrl: webhookUrl });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Erreur Twilio" };
  }
}

/**
 * Crée un subaccount Twilio et retourne son SID et AuthToken.
 * À appeler avec le compte principal. Ne pas logger le token.
 */
export async function createSubaccount(friendlyName) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials manquants", accountSid: null, authToken: null };
  }

  try {
    const client = twilio(accountSid, authToken);
    const account = await client.api.accounts.create({ friendlyName: friendlyName || "Subaccount" });
    return {
      success: true,
      accountSid: account.sid,
      authToken: account.authToken,
    };
  } catch (err) {
    return { success: false, error: err.message || "Erreur création subaccount", accountSid: null, authToken: null };
  }
}

/**
 * Recherche des numéros disponibles (compte principal ou subaccount).
 * @param {string} countryCode - ex: FR
 * @param {string} [areaCode] - optionnel
 * @param {Object} [twilioClient] - client twilio (compte principal ou subaccount)
 */
export async function searchAvailableNumbers(countryCode, areaCode, twilioClient) {
  const client = twilioClient || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null);
  if (!client) return { success: false, available: [], error: "Twilio non configuré" };

  try {
    const params = areaCode ? { areaCode } : {};
    const list = await client.availablePhoneNumbers(countryCode).local.list(params);
    return { success: true, available: (list || []).slice(0, 10).map((n) => n.phoneNumber) };
  } catch (err) {
    return { success: false, available: [], error: err.message };
  }
}

/**
 * Achète un numéro (compte principal ou subaccount).
 * @param {string} phoneNumber - E.164
 * @param {Object} [twilioClient] - optionnel (subaccount)
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
export async function buyPhoneNumber(phoneNumber, twilioClient) {
  const client = twilioClient || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null);
  if (!client) return { success: false, error: "Twilio non configuré" };

  try {
    const number = await client.incomingPhoneNumbers.create({ phoneNumber });
    return { success: true, sid: number.sid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Provisionne Twilio pour une instance : configure le webhook du premier numéro,
 * ou (si buyOnMainAccount) achète un numéro sur le compte principal et lie le webhook,
 * ou (si provisionSubaccount) crée un subaccount, achète un numéro, configure le webhook.
 * @param {string} instanceId
 * @param {Object} options - { buyOnMainAccount?: boolean, provisionSubaccount?: boolean, countryCode?: string, areaCode?: string }
 * @returns {Promise<{ status, instanceId, twilioNumber, openAiKey, notes }>}
 */
export async function provisionTwilioForInstance(instanceId, options = {}) {
  const instance = await InstanceModel.findOne({ instanceId }).lean();
  if (!instance) {
    return {
      status: "error",
      instanceId,
      twilioNumber: null,
      openAiKey: null,
      notes: "Instance non trouvée",
    };
  }

  const gatewayHost = process.env.VOICE_GATEWAY_PUBLIC_HOST || process.env.PUBLIC_HOST || "localhost:3001";
  const webhookUrl = `https://${gatewayHost}/twilio/${instance.slug}/incoming-call`;

  const existingNumber = instance.twilioNumbers && instance.twilioNumbers[0];

  if (existingNumber) {
    const result = await setNumberWebhook(existingNumber, webhookUrl);
    if (!result.success) {
      return {
        status: "error",
        instanceId,
        twilioNumber: existingNumber,
        openAiKey: null,
        notes: `Webhook non configuré: ${result.error}`,
      };
    }
    return {
      status: "ok",
      instanceId,
      twilioNumber: existingNumber,
      openAiKey: null,
      notes: `Webhook configuré vers ${webhookUrl}`,
    };
  }

  const residenceCountry = resolveCountryCode(options.countryCode, instance.countryCode);

  if (options.buyOnMainAccount === true) {
    const search = await searchAvailableNumbers(residenceCountry, options.areaCode);
    if (!search.success || !search.available || search.available.length === 0) {
      return {
        status: "error",
        instanceId,
        twilioNumber: null,
        openAiKey: null,
        notes: `Aucun numéro dispo: ${search.error || "liste vide"}`,
      };
    }
    const buy = await buyPhoneNumber(search.available[0]);
    if (!buy.success) {
      return {
        status: "error",
        instanceId,
        twilioNumber: null,
        openAiKey: null,
        notes: `Achat numéro: ${buy.error}`,
      };
    }
    const webhookResult = await setNumberWebhook(search.available[0], webhookUrl);
    if (!webhookResult.success) {
      return {
        status: "error",
        instanceId,
        twilioNumber: search.available[0],
        openAiKey: null,
        notes: `Webhook: ${webhookResult.error}`,
      };
    }
    await InstanceModel.updateOne(
      { instanceId },
      { $set: { twilioNumbers: [search.available[0]], updatedAt: new Date() } }
    );
    return {
      status: "ok",
      instanceId,
      twilioNumber: search.available[0],
      openAiKey: null,
      notes: "Numéro acheté (compte principal), webhook configuré",
    };
  }

  if (options.provisionSubaccount) {
    const sub = await createSubaccount(`Instance ${instance.slug}`);
    if (!sub.success || !sub.accountSid || !sub.authToken) {
      return {
        status: "error",
        instanceId,
        twilioNumber: null,
        openAiKey: null,
        notes: `Subaccount: ${sub.error}`,
      };
    }
    const subClient = twilio(sub.accountSid, sub.authToken);
    const search = await searchAvailableNumbers(residenceCountry, options.areaCode, subClient);
    if (!search.success || !search.available || search.available.length === 0) {
      await InstanceModel.updateOne(
        { instanceId },
        { $set: { twilioSubaccountSid: sub.accountSid, updatedAt: new Date() } }
      );
      return {
        status: "error",
        instanceId,
        twilioNumber: null,
        openAiKey: null,
        notes: `Aucun numéro dispo: ${search.error || "liste vide"}. Subaccount créé.`,
      };
    }
    const buy = await buyPhoneNumber(search.available[0], subClient);
    if (!buy.success) {
      return {
        status: "error",
        instanceId,
        twilioNumber: null,
        openAiKey: null,
        notes: `Achat numéro: ${buy.error}`,
      };
    }
    const webhookResult = await setNumberWebhook(search.available[0], webhookUrl, subClient);
    if (!webhookResult.success) {
      return {
        status: "error",
        instanceId,
        twilioNumber: search.available[0],
        openAiKey: null,
        notes: `Webhook: ${webhookResult.error}`,
      };
    }
    const update = {
      twilioNumbers: [search.available[0]],
      twilioSubaccountSid: sub.accountSid,
      updatedAt: new Date(),
    };
    if (sub.authToken) update.twilioAuthToken = sub.authToken;
    await InstanceModel.updateOne({ instanceId }, { $set: update });
    return {
      status: "ok",
      instanceId,
      twilioNumber: search.available[0],
      openAiKey: null,
      notes: "Subaccount créé, numéro acheté, webhook configuré",
    };
  }

  return {
    status: "skipped",
    instanceId,
    twilioNumber: null,
    openAiKey: null,
    notes: "Aucun numéro sur l'instance ; fournir twilioNumbers, buyOnMainAccount: true ou provisionSubaccount: true",
  };
}
