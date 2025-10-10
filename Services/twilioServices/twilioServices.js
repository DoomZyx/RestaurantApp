// Service Twilio optimisé - génération TwiML uniquement
export function generateTwiml(host) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/media-stream" />
  </Connect>
</Response>`;
}
