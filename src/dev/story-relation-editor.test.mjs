import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseFrontmatter } from "../../tools/content-cli/lib/local-content.mjs";
import {
  mutateStoryRelations,
  StoryRelationEditorError,
} from "./story-relation-editor.mjs";

async function writeFile(rootDir, relativePath, contents) {
  const filePath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function readFrontmatter(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const source = await fs.readFile(filePath, "utf8");
  return parseFrontmatter(source).data;
}

async function makeFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-relations-"));

  await writeFile(
    rootDir,
    "src/content/stories/en/forest-story.md",
    `---
title: Forest Story
language: en
---

The forest story body.
`,
  );

  await writeFile(
    rootDir,
    "src/content/stories/bn/forest-story.md",
    `---
title: Forest Story BN
language: bn
---

Bangla story body.
`,
  );

  await writeFile(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
    `---
category: Folktale
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
description: Existing forest topic.
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/topics/river-topic.md",
    `---
slug: river-topic
item: River Topic
types:
  - Natural
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
    "src/content/resources/river-video.md",
    `---
slug: river-video
title: River Video
url: https://example.com/river-video
type: video
topic_slugs: []
---
`,
  );

  return rootDir;
}

test("attach existing topic appends to story metadata", async () => {
  const rootDir = await makeFixture();

  const result = await mutateStoryRelations({
    rootDir,
    isDev: true,
    relationType: "topic",
    payload: {
      action: "attach-existing",
      storySlug: "forest-story",
      storyLanguage: "en",
      topicSlug: "river-topic",
    },
  });

  assert.equal(result.changed, true);
  const metadata = await readFrontmatter(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
  );
  assert.deepEqual(metadata.topic_slugs, ["forest-topic", "river-topic"]);
});

test("attach existing resource appends to story metadata", async () => {
  const rootDir = await makeFixture();

  const result = await mutateStoryRelations({
    rootDir,
    isDev: true,
    relationType: "resource",
    payload: {
      action: "attach-existing",
      storySlug: "forest-story",
      storyLanguage: "en",
      resourceSlug: "river-video",
    },
  });

  assert.equal(result.changed, true);
  const metadata = await readFrontmatter(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
  );
  assert.deepEqual(metadata.resource_slugs, ["moon-resource", "river-video"]);
});

test("duplicate attach returns unchanged and does not duplicate metadata", async () => {
  const rootDir = await makeFixture();

  const result = await mutateStoryRelations({
    rootDir,
    isDev: true,
    relationType: "topic",
    payload: {
      action: "attach-existing",
      storySlug: "forest-story",
      storyLanguage: "bn",
      topicSlug: "forest-topic",
    },
  });

  assert.equal(result.changed, false);
  const metadata = await readFrontmatter(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
  );
  assert.deepEqual(metadata.topic_slugs, ["forest-topic"]);
});

test("create topic writes file and patches story metadata", async () => {
  const rootDir = await makeFixture();

  const result = await mutateStoryRelations({
    rootDir,
    isDev: true,
    relationType: "topic",
    payload: {
      action: "create-and-attach",
      storySlug: "forest-story",
      storyLanguage: "en",
      topic: {
        slug: "snake-prince",
        item: "Snake Prince",
        types: ["Person", "Legendary"],
        description: "A new topic from the story page.",
      },
    },
  });

  assert.equal(result.changed, true);
  const topic = await readFrontmatter(rootDir, "src/content/topics/snake-prince.md");
  assert.equal(topic.item, "Snake Prince");
  assert.deepEqual(topic.types, ["Person", "Legendary"]);

  const metadata = await readFrontmatter(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
  );
  assert.deepEqual(metadata.topic_slugs, ["forest-topic", "snake-prince"]);
});

test("create resource writes file, persists topic slugs, and patches story metadata", async () => {
  const rootDir = await makeFixture();

  const result = await mutateStoryRelations({
    rootDir,
    isDev: true,
    relationType: "resource",
    payload: {
      action: "create-and-attach",
      storySlug: "forest-story",
      storyLanguage: "en",
      resource: {
        slug: "forest-map",
        title: "Forest Map",
        url: "https://example.com/forest-map",
        type: "website",
        topic_slugs: ["forest-topic", "river-topic"],
      },
    },
  });

  assert.equal(result.changed, true);
  const resource = await readFrontmatter(
    rootDir,
    "src/content/resources/forest-map.md",
  );
  assert.equal(resource.title, "Forest Map");
  assert.deepEqual(resource.topic_slugs, ["forest-topic", "river-topic"]);

  const metadata = await readFrontmatter(
    rootDir,
    "src/content/storyMetadata/forest-story.md",
  );
  assert.deepEqual(metadata.resource_slugs, ["moon-resource", "forest-map"]);
});

test("non-dev guard rejects mutations", async () => {
  const rootDir = await makeFixture();

  await assert.rejects(
    mutateStoryRelations({
      rootDir,
      isDev: false,
      relationType: "topic",
      payload: {
        action: "attach-existing",
        storySlug: "forest-story",
        storyLanguage: "en",
        topicSlug: "river-topic",
      },
    }),
    (error) =>
      error instanceof StoryRelationEditorError &&
      error.status === 403 &&
      /only available in local dev/i.test(error.message),
  );
});
