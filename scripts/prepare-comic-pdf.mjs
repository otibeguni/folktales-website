import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMMatrix, ImageData, Path2D, createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  createComicManifestFromPages,
  ensureComicDirectories,
  getComicImagesPath,
  readComicManifest,
  writeComicManifest,
} from "./lib/comic-manifest.mjs";

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const DEFAULT_DPI = 144;
const PAGE_ID_PAD = 3;

function usage() {
  console.error(`Usage:
  npm run comic:prepare-pdf -- --slug <comic-slug> --input <path-to-pdf> [options]

Options:
  --title <comic title>     Optional display title, defaults to existing manifest title or slug
  --dpi <number>            Rasterization DPI, defaults to ${DEFAULT_DPI}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function buildPageId(pageNumber) {
  return `page-${String(pageNumber).padStart(PAGE_ID_PAD, "0")}`;
}

function createNodeCanvasFactory() {
  return {
    create(width, height) {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      return { canvas, context };
    },
    reset(canvasAndContext, width, height) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    },
    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };
}

export async function renderComicPdfToPages({ inputPath, slug, title, dpi = DEFAULT_DPI }) {
  const scale = dpi / 72;
  const pdfBytes = readFileSync(inputPath);
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes),
    disableWorker: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const outputDir = getComicImagesPath(slug);
  const canvasFactory = createNodeCanvasFactory();

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      const { canvas, context } = canvasFactory.create(width, height);

      await page.render({
        canvasContext: context,
        viewport,
        canvasFactory,
      }).promise;

      const pageId = buildPageId(pageNumber);
      const fileName = `${pageId}.png`;
      const outputPath = join(outputDir, fileName);
      const pngBuffer = canvas.toBuffer("image/png");
      writeFileSync(outputPath, pngBuffer);

      pages.push({
        id: pageId,
        src: `/images/comics/${slug}/${fileName}`,
        width,
        height,
      });
    }
  } finally {
    if (typeof loadingTask.destroy === "function") {
      await loadingTask.destroy();
    }
  }

  let existingManifest;

  try {
    existingManifest = readComicManifest(slug);
  } catch {
    existingManifest = undefined;
  }

  const manifest = createComicManifestFromPages({
    slug,
    title,
    pages,
    existingManifest,
  });

  writeComicManifest(manifest);
  return manifest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug?.trim();
  const input = args.input?.trim();
  const title = args.title?.trim();
  const dpi = args.dpi ? Number(args.dpi) : DEFAULT_DPI;

  if (!slug || !input) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new Error("DPI must be a positive number.");
  }

  ensureComicDirectories();
  const manifest = await renderComicPdfToPages({
    inputPath: resolve(input),
    slug,
    title,
    dpi,
  });

  console.log(
    `Prepared ${manifest.pages.length} page(s) for "${manifest.title}" (${manifest.slug}).`,
  );
  console.log(`Manifest: ${basename(join("src", "data", "comics", `${manifest.slug}.json`))}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
