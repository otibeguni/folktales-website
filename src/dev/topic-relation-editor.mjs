import fs from "node:fs/promises";
import path from "node:path";

import {
  createEntry,
  loadContentContext,
} from "../../tools/content-cli/lib/local-content.mjs";
import {
  TOPIC_RELATION_TYPES,
  getTopicRelationSlug,
} from "../utils/topic-relations.mjs";
import { StoryRelationEditorError } from "./story-relation-editor.mjs";

function cleanOptionalString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requireString(value, fieldName) {
  const trimmed = cleanOptionalString(value);
  if (!trimmed) {
    throw new StoryRelationEditorError(`Missing required field "${fieldName}"`);
  }
  return trimmed;
}

function assertDevMode(isDev) {
  if (!isDev) {
    throw new StoryRelationEditorError("Topic relation editor is only available in local dev", 403);
  }
}

function validateRelationType(type) {
  const relationType = requireString(type, "relationType");
  if (!TOPIC_RELATION_TYPES.includes(relationType)) {
    throw new StoryRelationEditorError(`Invalid relation type "${relationType}"`);
  }
  return relationType;
}

function validateTopicsExist(context, sourceTopicSlug, targetTopicSlug) {
  if (!context.indexes.topicsBySlug.get(sourceTopicSlug)) {
    throw new StoryRelationEditorError(`Unknown source topic slug "${sourceTopicSlug}"`, 404);
  }

  if (!context.indexes.topicsBySlug.get(targetTopicSlug)) {
    throw new StoryRelationEditorError(`Unknown target topic slug "${targetTopicSlug}"`, 404);
  }

  if (sourceTopicSlug === targetTopicSlug) {
    throw new StoryRelationEditorError("sourceTopicSlug and targetTopicSlug cannot match");
  }
}

async function createTopicRelation({ rootDir, context, sourceTopicSlug, targetTopicSlug, relationType }) {
  validateTopicsExist(context, sourceTopicSlug, targetTopicSlug);

  const slug = getTopicRelationSlug(relationType, sourceTopicSlug, targetTopicSlug);
  if (context.indexes.topicRelationsBySlug.get(slug)) {
    return {
      action: "attach-existing",
      changed: false,
      relationSlug: slug,
    };
  }

  const inverseSlug = getTopicRelationSlug(relationType, targetTopicSlug, sourceTopicSlug);
  if (context.indexes.topicRelationsBySlug.get(inverseSlug)) {
    throw new StoryRelationEditorError(
      `Conflicting inverse relation already exists as "${inverseSlug}"`,
      409,
    );
  }

  const created = await createEntry(rootDir, "topic-relation", {
    slug,
    source_topic_slug: sourceTopicSlug,
    target_topic_slug: targetTopicSlug,
    type: relationType,
  });

  return {
    action: "attach-existing",
    changed: true,
    relationSlug: slug,
    created: created.data,
  };
}

async function removeTopicRelation({ rootDir, context, relationSlug }) {
  const relation = context.indexes.topicRelationsBySlug.get(relationSlug);
  if (!relation) {
    throw new StoryRelationEditorError(`Unknown topic relation "${relationSlug}"`, 404);
  }

  await fs.unlink(path.join(rootDir, relation.relativePath));

  return {
    action: "remove",
    changed: true,
    relationSlug,
  };
}

export async function mutateTopicRelations({
  rootDir,
  isDev,
  payload,
}) {
  assertDevMode(isDev);

  const action = requireString(payload?.action, "action");
  const context = await loadContentContext(rootDir);

  if (action === "attach-existing") {
    return createTopicRelation({
      rootDir,
      context,
      sourceTopicSlug: requireString(payload?.sourceTopicSlug, "sourceTopicSlug"),
      targetTopicSlug: requireString(payload?.targetTopicSlug, "targetTopicSlug"),
      relationType: validateRelationType(payload?.relationType),
    });
  }

  if (action === "remove") {
    return removeTopicRelation({
      rootDir,
      context,
      relationSlug: requireString(payload?.relationSlug, "relationSlug"),
    });
  }

  throw new StoryRelationEditorError(`Unsupported topic relation action "${action}"`, 400);
}
