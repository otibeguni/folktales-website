import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import { storyblok } from "@storyblok/astro";

const storyblokAccessToken =
  process.env.STORYBLOK_DELIVERY_TOKEN || process.env.PUBLIC_STORYBLOK_TOKEN;
const storyblokRegion = process.env.STORYBLOK_REGION || "eu";

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
    plugins: [tailwindcss()],
    server: {
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
