import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { StoryRelationEditorError } from "./story-relation-editor.mjs";
import { saveHomepageConfig, saveHomepageImage } from "./homepage-editor.mjs";

const validConfig = {
  version: 1,
  tiles: [
    {
      id: "story-forest",
      source: { type: "story", slug: "forest", language: "en" },
    },
    {
      id: "book-river",
      source: { type: "book", slug: "river" },
      titleOverride: "River book",
      imageOverride: "/images/homepage/river-cover.webp",
    },
  ],
};

async function makeFixture() {
  return fs.mkdtemp(path.join(os.tmpdir(), "homepage-editor-"));
}

test("homepage save validates and atomically writes formatted JSON", async () => {
  const rootDir = await makeFixture();
  const result = await saveHomepageConfig({ rootDir, isDev: true, payload: validConfig });
  const saved = JSON.parse(
    await fs.readFile(path.join(rootDir, "src/data/homepage-tiles.json"), "utf8"),
  );

  assert.equal(result.tileCount, 2);
  assert.deepEqual(saved, validConfig);
});

test("homepage save rejects duplicate content references", async () => {
  const rootDir = await makeFixture();

  await assert.rejects(
    saveHomepageConfig({
      rootDir,
      isDev: true,
      payload: {
        version: 1,
        tiles: [
          { id: "one", source: { type: "topic", slug: "river" } },
          { id: "two", source: { type: "topic", slug: "river" } },
        ],
      },
    }),
    (error) =>
      error instanceof StoryRelationEditorError &&
      /duplicate homepage source/i.test(error.message),
  );
});

test("homepage mutations are disabled outside local development", async () => {
  const rootDir = await makeFixture();

  await assert.rejects(
    saveHomepageConfig({ rootDir, isDev: false, payload: validConfig }),
    (error) =>
      error instanceof StoryRelationEditorError && /only available in local development/i.test(error.message),
  );
});

test("homepage image upload sanitizes names and stays in its fixed directory", async () => {
  const rootDir = await makeFixture();
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const result = await saveHomepageImage({
    rootDir,
    isDev: true,
    payload: {
      filename: "../../River Cover.PNG",
      mimeType: "image/png",
      data: `data:image/png;base64,${pngBytes.toString("base64")}`,
    },
  });

  assert.match(result.path, /^\/images\/homepage\/river-cover-[a-f0-9]{12}\.png$/);
  const storedPath = path.join(rootDir, "public", result.path.replace(/^\//, ""));
  assert.deepEqual(await fs.readFile(storedPath), pngBytes);
});

test("homepage image upload rejects unsupported and spoofed files", async () => {
  const rootDir = await makeFixture();

  await assert.rejects(
    saveHomepageImage({
      rootDir,
      isDev: true,
      payload: {
        filename: "cover.svg",
        mimeType: "image/svg+xml",
        data: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      },
    }),
    /must be JPEG, PNG, WebP, or AVIF/i,
  );

  await assert.rejects(
    saveHomepageImage({
      rootDir,
      isDev: true,
      payload: {
        filename: "cover.png",
        mimeType: "image/png",
        data: `data:image/png;base64,${Buffer.from("not a png").toString("base64")}`,
      },
    }),
    /not a valid image/i,
  );
});
