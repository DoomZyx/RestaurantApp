import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    host: '0.0.0.0', // Écoute sur toutes les interfaces
    port: 5173,
    allowedHosts: [
      '.trycloudflare.com', // Wildcard pour tous les tunnels Cloudflare
      '.ngrok.io',          // Si tu veux aussi ngrok
    ],
  },
  plugins: [react()],
});
