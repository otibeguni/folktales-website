import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "tools", "content-cli", "cli.mjs");

async function writeFile(rootDir, relativePath, contents) {
  const filePath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function makeFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-cli-"));

  await writeFile(
    rootDir,
    "src/content/stories/en/forest-story.md",
    `---
title: Forest Story
language: en
---

The tiger walked through the moonlit forest and found an ancient shrine.
`,
  );

  await writeFile(
    rootDir,
    "src/content/stories/bn/forest-story.md",
    `---
title: Forest Story BN
language: bn
---

Bengali translation body.
`,
  );

  await writeFile(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
    `---
category: Folktale
source_slug: moon-book
topic_slugs:
  - forest-topic
resource_slugs:
  - moon-resource
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/topics/forest-topic.md",
    `---
slug: forest-topic
item: Forest Topic
types:
  - Place
description: Sacred woodland topic.
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/resources/moon-resource.md",
    `---
slug: moon-resource
title: Moon Resource
url: https://example.com/moon
type: website
topic_slugs:
  - forest-topic
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/books/moon-book.md",
    `---
slug: moon-book
name: Moon Book
author: Example Author
language: en
category: folklore
topic_slugs:
  - forest-topic
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/storyCollections/featured.md",
    `---
title: Featured
order: 1
isShow: true
stories:
  - forest-story
---

This collection highlights the moonlit forest story.
`,
  );

  await writeFile(
    rootDir,
    "AGENTS.md",
    `# Local Repo Notes
`,
  );

  return rootDir;
}

async function runCli(rootDir, args, options = {}) {
  try {
    const result = await execFileAsync(
      process.execPath,
      [cliPath, ...args],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          CONTENT_CLI_ROOT: rootDir,
        },
        input: options.input,
      },
    );
    return {
      code: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    };
  }
}

test("list and get story resolve metadata", async () => {
  const rootDir = await makeFixture();
  const list = await runCli(rootDir, ["list", "stories", "--json"]);
  assert.equal(list.code, 0);
  const listed = JSON.parse(list.stdout);
  assert.equal(listed.length, 2);

  const get = await runCli(rootDir, ["get", "story", "forest-story", "--language", "en", "--json"]);
  const record = JSON.parse(get.stdout);
  assert.equal(record.metadata.category, "Folktale");
  assert.equal(record.links.sourceBook.slug, "moon-book");
});

test("search matches body text and ranks title/body hits", async () => {
  const rootDir = await makeFixture();
  const search = await runCli(rootDir, [
    "search",
    "stories",
    "--query",
    "moonlit forest",
    "--include-snippets",
    "--json",
  ]);
  assert.equal(search.code, 0);
  const results = JSON.parse(search.stdout);
  assert.equal(results[0].slug, "forest-story");
  assert.match(results[0].snippet, /moonlit forest/i);
});

test("validate reports broken references", async () => {
  const rootDir = await makeFixture();
  await writeFile(
    rootDir,
    "src/content/storyMetadata/broken.md",
    `---
category: Folktale
source_slug: missing-book
topic_slugs:
  - missing-topic
resource_slugs:
  - missing-resource
---
`,
  );
  const validate = await runCli(rootDir, ["validate", "all", "--json"]);
  assert.equal(validate.code, 1);
  const issues = JSON.parse(validate.stdout);
  assert.ok(issues.some((issue) => issue.message.includes('Broken source_slug "missing-book"')));
  assert.ok(issues.some((issue) => issue.message.includes('Broken topic_slugs reference "missing-topic"')));
});

test("create and update local entries preserve body and patch arrays", async () => {
  const rootDir = await makeFixture();
  const create = await runCli(rootDir, [
    "create",
    "topic",
    "--slug",
    "river-topic",
    "--item",
    "River Topic",
    "--types",
    "Place,Natural",
  ]);
  assert.equal(create.code, 0);

  const update = await runCli(rootDir, [
    "update",
    "book",
    "moon-book",
    "--add",
    "topic_slugs=river-topic",
    "--set",
    "series_title=Moon Series",
    "--json",
  ]);
  const updated = JSON.parse(update.stdout);
  assert.deepEqual(updated.data.topic_slugs.sort(), ["forest-topic", "river-topic"]);
  assert.equal(updated.data.series_title, "Moon Series");
});

test("update story can patch underlying metadata fields", async () => {
  const rootDir = await makeFixture();
  const update = await runCli(rootDir, [
    "update",
    "story",
    "forest-story",
    "--language",
    "en",
    "--set",
    "source_slug=moon-book",
    "--add",
    "topic_slugs=forest-topic",
    "--add",
    "resource_slugs=moon-resource",
    "--json",
  ]);
  assert.equal(update.code, 0);
  const updated = JSON.parse(update.stdout);
  assert.equal(updated.metadata.source_slug, "moon-book");
  assert.deepEqual(updated.metadata.topic_slugs, ["forest-topic"]);
  assert.deepEqual(updated.metadata.resource_slugs, ["moon-resource"]);
});

test("story collection get and search include body and stories", async () => {
  const rootDir = await makeFixture();
  const get = await runCli(rootDir, ["get", "story-collection", "featured", "--json"]);
  const record = JSON.parse(get.stdout);
  assert.deepEqual(record.data.stories, ["forest-story"]);

  const search = await runCli(rootDir, [
    "search",
    "story-collections",
    "--query",
    "moonlit forest",
    "--json",
  ]);
  const results = JSON.parse(search.stdout);
  assert.equal(results[0].slug, "featured");
});

test("help includes tui usage", async () => {
  const rootDir = await makeFixture();
  const help = await runCli(rootDir, ["help"]);
  assert.equal(help.code, 0);
  assert.doesNotMatch(help.stdout, /content tui/);
  assert.doesNotMatch(help.stdout, /story-metadata/);
});
