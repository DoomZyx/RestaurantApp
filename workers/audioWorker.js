/**
 * Worker audio : reçoit les chunks media via le bus, nettoie (RNNoise) et enregistre, republie pour le LLM.
 * Phase 4 : module prêt à être branché (connection.js publiera media:in en Phase 5).
 */

import { workerBus } from "./workerBus.js";
import { cleanAudio } from "../Services/audioProcessing/audioCleaningService.js";
import { recordAudioChunk } from "../Services/audioProcessing/audioRecordingService.js";

let unsubscribe = null;

/**
 * Démarre l'audioWorker : s'abonne à "media:in", traite et publie "media:cleaned".
 * Message media:in : { streamSid, payload (base64), useNoiseReduction }.
 */
export function start() {
  if (unsubscribe) return;
  unsubscribe = workerBus.subscribe("media:in", async (data) => {
    if (!data || typeof data.streamSid === "undefined") return;
    const { streamSid, payload, useNoiseReduction } = data;
    if (!payload) return;
    try {
      const cleaned = useNoiseReduction ? await cleanAudio(payload) : payload;
      if (cleaned !== payload) {
        await recordAudioChunk(streamSid, cleaned, true);
      }
      workerBus.publish("media:cleaned", { streamSid, payload: cleaned });
    } catch (err) {
      console.error("[audioWorker] error:", err);
      workerBus.publish("media:cleaned", { streamSid, payload });
    }
  });
}

/**
 * Arrête l'audioWorker (unsubscribe).
 */
export function stop() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
