/**
 * Détection des silences prolongés pendant l'appel.
 * Surveille l'activité vocale du client (speech_started, transcription utilisateur)
 * et déclenche un callback après un délai configurable sans activité.
 */

const DEFAULT_SILENCE_TIMEOUT_MS = 18 * 1000; // 18 secondes (entre 15 et 20)
const CHECK_INTERVAL_MS = 3000;

/**
 * @param {Object} options
 * @param {function(string): string|null} options.getCallSid - streamSid -> callSid
 * @param {function(string): Promise<void>} options.onSilenceTimeout - callback(streamSid) quand le timeout est atteint
 * @param {number} [options.silenceTimeoutMs] - délai sans voix avant déclenchement (défaut: 18s, env SILENCE_TIMEOUT_MS)
 */
export class SilenceMonitor {
  constructor({ getCallSid, onSilenceTimeout, silenceTimeoutMs = undefined }) {
    this.getCallSid = getCallSid;
    this.onSilenceTimeout = onSilenceTimeout;
    this.silenceTimeoutMs =
      silenceTimeoutMs ??
      (process.env.SILENCE_TIMEOUT_MS ? parseInt(process.env.SILENCE_TIMEOUT_MS, 10) : null) ??
      DEFAULT_SILENCE_TIMEOUT_MS;

    this.streamSid = null;
    this.lastVoiceActivityAt = 0;
    this.intervalId = null;
    this.triggered = false;
  }

  /**
   * Démarre la surveillance pour un stream (appelé à la réception de l'événement "start" Twilio).
   * @param {string} streamSid
   */
  start(streamSid) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.streamSid = streamSid;
    this.lastVoiceActivityAt = Date.now();
    this.triggered = false;

    this.intervalId = setInterval(() => {
      if (this.triggered || !this.streamSid) return;
      const elapsed = Date.now() - this.lastVoiceActivityAt;
      if (elapsed >= this.silenceTimeoutMs) {
        this.triggered = true;
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.onSilenceTimeout(this.streamSid).catch(() => {});
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * À appeler à chaque détection d'activité vocale client (speech_started ou transcription utilisateur).
   */
  onUserVoiceActivity() {
    this.lastVoiceActivityAt = Date.now();
  }

  /**
   * Arrête la surveillance et nettoie l'intervalle.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.streamSid = null;
  }
}
