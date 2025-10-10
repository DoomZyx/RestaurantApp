// @ts-nocheck
import { generateTwiml } from "./twilioServices.js";

describe("twilioService", () => {
  it("devrait générer un TwiML valide avec l'URL correcte", () => {
    const xml = generateTwiml("example.com");
    expect(xml).toContain("<Response>");
    expect(xml).toContain("<Say");
    expect(xml).toContain("wss://example.com/media-stream");
    expect(xml).toContain("<Connect>");
    expect(xml).toContain("</Response>");
  });
});
