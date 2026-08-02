// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-src https://player.twitch.tv https://www.twitch.tv https://player.kick.com https://kick.com https://www.youtube.com",
        "connect-src 'self' https: wss:",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: {
        resources: [
          { resource: "'self'", kind: "element" },
          { resource: "https://www.youtube.com", kind: "element" },
          { resource: "'none'", kind: "attribute" },
        ],
      },
      styleDirective: {
        resources: [
          { resource: "'self'", kind: "element" },
          { resource: "'unsafe-inline'", kind: "attribute" },
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://streammix.app",
  markdown: {
    syntaxHighlight: false,
  },
  integrations: [react(), sitemap()],
});
