import { copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "..", "dist");
const sitemapIndexPath = path.join(distDir, "sitemap-index.xml");
const sitemapPath = path.join(distDir, "sitemap.xml");

try {
  await access(sitemapIndexPath);
  await copyFile(sitemapIndexPath, sitemapPath);
  console.log("Aliased sitemap-index.xml to sitemap.xml");
} catch (error) {
  console.warn("Skipping sitemap alias; sitemap-index.xml was not found.");
  if (error?.code && error.code !== "ENOENT") {
    console.warn(error);
  }
}
