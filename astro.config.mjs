import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";

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

  integrations: [react(), mdx(), sitemap(), pagefind()],
  site: "https://otibeguni.com",
});
