// @ts-nocheck

import { generateTwiml, generateTwimlTransferToRestaurant } from "../../Services/twilioServices/twilioServices.js";
import { PricingService } from "../../Business/services/PricingService.js";
import { PhoneLineService } from "../../Business/services/PhoneLineService.js";

const DEFAULT_INSTANCE_ID = "inst_default";

export default async function callRoutes(fastify) {
  fastify.all("/incoming-call", async (request, reply) => {
    const instanceId = DEFAULT_INSTANCE_ID;
    const lineEnabled = await PricingService.getPhoneLineEnabled(instanceId);
    if (!lineEnabled) {
      const transferNumber = await PhoneLineService.getTransferNumber(instanceId);
      return reply.type("text/xml").send(generateTwimlTransferToRestaurant(transferNumber));
    }
    const host = request.headers.host;
    const xml = generateTwiml(host);
    return reply.type("text/xml").send(xml);
  });
}
