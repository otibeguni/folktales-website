import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { parseFrontmatter } from "../../tools/content-cli/lib/local-content.mjs";
import { StoryRelationEditorError } from "./story-relation-editor.mjs";
import { mutateTopicRelations } from "./topic-relation-editor.mjs";

async function writeFile(rootDir, relativePath, contents) {
  const filePath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, "utf8");
}

async function exists(rootDir, relativePath) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readFrontmatter(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const source = await fs.readFile(filePath, "utf8");
  return parseFrontmatter(source).data;
}

async function makeFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "topic-relations-"));

  await writeFile(
    rootDir,
    "src/content/topics/forest-topic.md",
    `---
slug: forest-topic
item: Forest Topic
types:
  - Place
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
  - Place
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/topics/hinduism-topic.md",
    `---
slug: hinduism-topic
item: Hinduism Topic
types:
  - Religion
---
`,
  );

  await writeFile(
    rootDir,
    "src/content/topicRelations/located_in--forest-topic--river-topic.md",
    `---
slug: located_in--forest-topic--river-topic
source_topic_slug: forest-topic
target_topic_slug: river-topic
type: located_in
---
`,
  );

  return rootDir;
}

test("attach existing topic relation writes a new relation file", async () => {
  const rootDir = await makeFixture();

  const result = await mutateTopicRelations({
    rootDir,
    isDev: true,
    payload: {
      action: "attach-existing",
      sourceTopicSlug: "forest-topic",
      targetTopicSlug: "hinduism-topic",
      relationType: "part_of_tradition",
    },
  });

  assert.equal(result.changed, true);
  const relation = await readFrontmatter(
    rootDir,
    "src/content/topicRelations/part_of_tradition--forest-topic--hinduism-topic.md",
  );
  assert.equal(relation.type, "part_of_tradition");
});

test("duplicate attach returns unchanged", async () => {
  const rootDir = await makeFixture();

  const result = await mutateTopicRelations({
    rootDir,
    isDev: true,
    payload: {
      action: "attach-existing",
      sourceTopicSlug: "forest-topic",
      targetTopicSlug: "river-topic",
      relationType: "located_in",
    },
  });

  assert.equal(result.changed, false);
});

test("remove deletes outbound relation file", async () => {
  const rootDir = await makeFixture();

  const result = await mutateTopicRelations({
    rootDir,
    isDev: true,
    payload: {
      action: "remove",
      relationSlug: "located_in--forest-topic--river-topic",
    },
  });

  assert.equal(result.changed, true);
  assert.equal(
    await exists(
      rootDir,
      "src/content/topicRelations/located_in--forest-topic--river-topic.md",
    ),
    false,
  );
});

test("invalid relation type is rejected", async () => {
  const rootDir = await makeFixture();

  await assert.rejects(
    mutateTopicRelations({
      rootDir,
      isDev: true,
      payload: {
        action: "attach-existing",
        sourceTopicSlug: "forest-topic",
        targetTopicSlug: "hinduism-topic",
        relationType: "related_to",
      },
    }),
    (error) =>
      error instanceof StoryRelationEditorError &&
      /invalid relation type/i.test(error.message),
  );
});
