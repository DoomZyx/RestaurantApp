

/**
 * Génère le TwiML pour connecter l'appel au media stream.
 * @param {string} host - Host du serveur (ex: gateway.example.com)
 * @param {string} [streamPath] - Chemin du stream WebSocket (défaut: /media-stream). Ex Gateway: /v1/inst_xxx/media-stream
 */
export function generateTwiml(host, streamPath = "/media-stream") {
  const path = streamPath.startsWith("/") ? streamPath : `/${streamPath}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Play>https://doomzyx.github.io/IntroVoice/VoiceIntro.mp3</Play>
  <Connect>
    <Stream url="wss://${host}${path}" />
  </Connect>
</Response>`;
}

/**
 * TwiML pour refuser l'appel quand la ligne est désactivée (répondeur / occupé)
 */
export function generateTwimlLineDisabled() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;
}

/**
 * TwiML pour transférer l'appel vers le numéro du restaurant (ligne désactivée).
 * @param {string|null} phone - Numéro E.164 (ex: +33672886255). Si absent, renvoie Reject.
 */
export function generateTwimlTransferToRestaurant(phone) {
  const number = phone?.trim();
  if (!number) {
    return generateTwimlLineDisabled();
  }
  const escaped = number.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Number>${escaped}</Number>
  </Dial>
</Response>`;
}
