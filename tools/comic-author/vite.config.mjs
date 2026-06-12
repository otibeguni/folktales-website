import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolRoot, "..", "..");

export default defineConfig({
  root: toolRoot,
  publicDir: resolve(repoRoot, "public"),
  plugins: [react()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
