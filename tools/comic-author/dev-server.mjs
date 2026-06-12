import { createServer as createHttpServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { renderComicPdfToPages } from "../../scripts/prepare-comic-pdf.mjs";
import {
  listComicManifestSummaries,
  readComicManifest,
  writeComicManifest,
} from "../../scripts/lib/comic-manifest.mjs";

const TOOL_ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.COMIC_AUTHOR_PORT || "4322");

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(`${JSON.stringify(payload)}\n`);
}

function parseRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    request.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8").trim();

      if (!rawBody) {
        resolveBody({});
        return;
      }

      try {
        resolveBody(JSON.parse(rawBody));
      } catch (error) {
        rejectBody(error);
      }
    });

    request.on("error", rejectBody);
  });
}

function parseBinaryBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    request.on("end", () => {
      resolveBody(Buffer.concat(chunks));
    });

    request.on("error", rejectBody);
  });
}

function writeUploadedPdf({ fileName, bytes }) {
  const extension = extname(fileName || "").toLowerCase() === ".pdf" ? ".pdf" : ".pdf";
  const safeBaseName = (fileName || "comic-upload")
    .replace(/\.[^.]+$/u, "")
    .replace(/[^a-z0-9-_]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80) || "comic-upload";
  const uploadDir = join(tmpdir(), "otibeguni-comic-author");

  mkdirSync(uploadDir, { recursive: true });

  const tempPath = join(uploadDir, `${Date.now()}-${safeBaseName}${extension}`);
  writeFileSync(tempPath, bytes);
  return tempPath;
}

async function handleApiRequest(request, response) {
  const method = request.method || "GET";
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (url.pathname === "/api/comics" && method === "GET") {
    sendJson(response, 200, {
      comics: listComicManifestSummaries(),
    });
    return true;
  }

  if (url.pathname.startsWith("/api/comics/")) {
    const slug = decodeURIComponent(url.pathname.slice("/api/comics/".length));

    if (!slug) {
      sendJson(response, 400, { error: "Comic slug is required." });
      return true;
    }

    if (method === "GET") {
      try {
        sendJson(response, 200, readComicManifest(slug));
      } catch (error) {
        sendJson(response, 404, {
          error: error instanceof Error ? error.message : `Comic ${slug} not found.`,
        });
      }

      return true;
    }

    if (method === "PUT") {
      try {
        const body = await parseRequestBody(request);
        const manifest = writeComicManifest({
          ...body,
          slug,
        });

        sendJson(response, 200, {
          comic: manifest,
          comics: listComicManifestSummaries(),
        });
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : "Unable to save comic manifest.",
        });
      }

      return true;
    }
  }

  if (url.pathname === "/api/prepare-pdf" && method === "POST") {
    try {
      let body;

      if ((request.headers["content-type"] || "").startsWith("application/json")) {
        body = await parseRequestBody(request);
      } else {
        const bytes = await parseBinaryBody(request);
        body = {
          slug: request.headers["x-comic-slug"],
          title: request.headers["x-comic-title"],
          dpi: request.headers["x-comic-dpi"],
          input: writeUploadedPdf({
            fileName: request.headers["x-comic-file-name"],
            bytes,
          }),
        };
      }

      const manifest = await renderComicPdfToPages({
        slug: typeof body.slug === "string" ? body.slug : "",
        inputPath: body.input,
        title: body.title,
        dpi: body.dpi ? Number(body.dpi) : undefined,
      });

      sendJson(response, 200, {
        comic: manifest,
        comics: listComicManifestSummaries(),
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to prepare comic PDF.",
      });
    }

    return true;
  }

  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
}

async function main() {
  const vite = await createViteServer({
    root: TOOL_ROOT,
    configFile: resolve(TOOL_ROOT, "vite.config.mjs"),
    server: {
      middlewareMode: true,
    },
    appType: "spa",
  });

  const server = createHttpServer(async (request, response) => {
    try {
      if (await handleApiRequest(request, response)) {
        return;
      }

      vite.middlewares(request, response, () => {
        response.statusCode = 404;
        response.end("Not found");
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Comic author running at http://127.0.0.1:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
