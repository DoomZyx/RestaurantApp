// @ts-nocheck

import { generateTwiml } from "../../Services/twilioServices/twilioServices.js";
import { config } from "../../Config/env.js";

export default async function callRoutes(fastify) {
  fastify.all("/incoming-call", async (request, reply) => {
    // Pour les appels entrants, utiliser le host de la requête Twilio
    // (qui correspond à l'URL configurée dans Twilio Dashboard)
    const host = request.headers.host;
    const xml = generateTwiml(host);
    reply.type("text/xml").send(xml);
  });
}
