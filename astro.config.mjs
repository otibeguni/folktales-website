import fs from "node:fs";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import { storyblok } from "@storyblok/astro";
import { createStoryRelationDevPlugin } from "./src/dev/story-relation-dev-plugin.mjs";

const storyblokAccessToken =
  process.env.STORYBLOK_DELIVERY_TOKEN || process.env.PUBLIC_STORYBLOK_TOKEN;
const storyblokRegion = process.env.STORYBLOK_REGION || "eu";
const useDevHttps = process.env.ASTRO_DEV_HTTPS === "true";
const isDevCommand = process.argv.includes("dev");
const trustedDevKeyPath = new URL("./.cert/localhost-key.pem", import.meta.url);
const trustedDevCertPath = new URL("./.cert/localhost.pem", import.meta.url);
const hasTrustedDevCertificate =
  fs.existsSync(trustedDevKeyPath) && fs.existsSync(trustedDevCertPath);

if (useDevHttps && !hasTrustedDevCertificate) {
  throw new Error(
    "ASTRO_DEV_HTTPS is enabled, but the local HTTPS certificate is missing. Run npm run dev:https so it can be generated first.",
  );
}

const integrations = [react(), mdx(), sitemap(), pagefind()];

if (storyblokAccessToken) {
  integrations.push(
    storyblok({
      accessToken: storyblokAccessToken,
      apiOptions: {
        region: storyblokRegion,
      },
    }),
  );
}

// https://astro.build/config
export default defineConfig({
  output: "static",

  vite: {
    // Astro otherwise shares optimized dependencies between concurrent dev and
    // build processes. A production optimization can replace React's dev JSX
    // runtime while the local editor is open, causing `jsxDEV` to be undefined.
    cacheDir: isDevCommand
      ? "node_modules/.vite/astro-dev"
      : "node_modules/.vite/astro-build",
    plugins: [tailwindcss(), createStoryRelationDevPlugin()],
    server: {
      https: useDevHttps
        ? {
            key: fs.readFileSync(trustedDevKeyPath),
            cert: fs.readFileSync(trustedDevCertPath),
          }
        : undefined,
      port: 4321,
      strictPort: true,
      proxy: {
        "/__pdfproxy": {
          target: "https://data.otibeguni.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__pdfproxy/, ""),
        },
      },
    },
  },

  integrations,
  site: "https://otibeguni.com",
});
