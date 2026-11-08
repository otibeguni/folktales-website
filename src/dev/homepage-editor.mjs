import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { ZodError } from "zod";

import { parseHomepageConfig } from "../utils/homepage-schema.mjs";
import { StoryRelationEditorError } from "./story-relation-editor.mjs";

const CONFIG_PATH = path.join("src", "data", "homepage-tiles.json");
const IMAGE_DIRECTORY = path.join("public", "images", "homepage");
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

function assertDevMode(isDev) {
  if (!isDev) {
    throw new StoryRelationEditorError(
      "Homepage editor is only available in local development",
      403,
    );
  }
}

function isValidImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    const fileType = buffer.subarray(4, 12).toString("ascii");
    return fileType === "ftypavif" || fileType === "ftypavis";
  }
  return false;
}

function sanitizeFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const sanitized = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return sanitized.slice(0, 60) || "homepage-image";
}

export async function saveHomepageConfig({ rootDir, isDev, payload }) {
  assertDevMode(isDev);

  let config;
  try {
    config = parseHomepageConfig(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((issue) => issue.message).join("; ");
      throw new StoryRelationEditorError(`Invalid homepage configuration: ${message}`);
    }
    throw error;
  }

  const destination = path.join(rootDir, CONFIG_PATH);
  const temporaryPath = `${destination}.${crypto.randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(destination), { recursive: true });

  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, destination);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    changed: true,
    path: CONFIG_PATH.split(path.sep).join("/"),
    tileCount: config.tiles.length,
  };
}

export async function saveHomepageImage({ rootDir, isDev, payload }) {
  assertDevMode(isDev);

  const filename = typeof payload?.filename === "string" ? payload.filename.trim() : "";
  const mimeType = typeof payload?.mimeType === "string" ? payload.mimeType.trim() : "";
  const data = typeof payload?.data === "string" ? payload.data : "";
  const extension = MIME_EXTENSIONS.get(mimeType);

  if (!filename) {
    throw new StoryRelationEditorError('Missing required field "filename"');
  }
  if (!extension) {
    throw new StoryRelationEditorError(
      "Homepage images must be JPEG, PNG, WebP, or AVIF files",
    );
  }

  const prefix = `data:${mimeType};base64,`;
  if (!data.startsWith(prefix)) {
    throw new StoryRelationEditorError("Image data does not match its declared file type");
  }

  const base64 = data.slice(prefix.length);
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new StoryRelationEditorError("Image data is not valid base64");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    throw new StoryRelationEditorError("The selected image is empty");
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new StoryRelationEditorError("Homepage images must be 10 MB or smaller", 413);
  }
  if (!isValidImageSignature(buffer, mimeType)) {
    throw new StoryRelationEditorError("The selected file is not a valid image of that type");
  }

  const digest = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
  const outputFilename = `${sanitizeFilename(filename)}-${digest}.${extension}`;
  const destinationDirectory = path.join(rootDir, IMAGE_DIRECTORY);
  const destination = path.join(destinationDirectory, outputFilename);
  await fs.mkdir(destinationDirectory, { recursive: true });
  await fs.writeFile(destination, buffer);

  return {
    changed: true,
    path: `/images/homepage/${outputFilename}`,
    bytes: buffer.length,
  };
}
