import {
  createEntry,
  findEntry,
  loadContentContext,
  updateEntry,
} from "../../tools/content-cli/lib/local-content.mjs";
import {
  RESOURCE_TYPE_OPTIONS,
  TOPIC_TYPE_OPTIONS,
} from "./story-relation-options.mjs";

export class StoryRelationEditorError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "StoryRelationEditorError";
    this.status = status;
  }
}

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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function validateUrl(value, fieldName) {
  const urlValue = requireString(value, fieldName);

  try {
    new URL(urlValue);
  } catch {
    throw new StoryRelationEditorError(`Field "${fieldName}" must be a valid URL`);
  }

  return urlValue;
}

function validateOptionalNumber(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new StoryRelationEditorError(`Field "${fieldName}" must be a valid number`);
  }

  return numberValue;
}

function assertDevMode(isDev) {
  if (!isDev) {
    throw new StoryRelationEditorError("Story relation editor is only available in local dev", 403);
  }
}

function assertStoryExists(context, storySlug, storyLanguage) {
  const story = findEntry(context, "story", storySlug, { language: storyLanguage });
  if (!story) {
    throw new StoryRelationEditorError(`Could not find story "${storySlug}"`, 404);
  }

  return story;
}

function getStoryMetadata(context, story) {
  return context.indexes.metadataBySlug.get(story.routeSlug)?.data || {
    topic_slugs: [],
    resource_slugs: [],
  };
}

function ensureUniqueSlug(existingEntry, entityName, slug) {
  if (existingEntry) {
    throw new StoryRelationEditorError(
      `${entityName} "${slug}" already exists`,
      409,
    );
  }
}

function validateTopic(topic, context) {
  const types = normalizeStringArray(topic?.types);
  if (types.length === 0) {
    throw new StoryRelationEditorError('Missing required field "types"');
  }

  const invalidTypes = types.filter((type) => !TOPIC_TYPE_OPTIONS.includes(type));
  if (invalidTypes.length > 0) {
    throw new StoryRelationEditorError(
      `Invalid topic type: ${invalidTypes.join(", ")}`,
    );
  }

  return {
    slug: requireString(topic?.slug, "slug"),
    item: requireString(topic?.item, "item"),
    item_bn: cleanOptionalString(topic?.item_bn),
    wikidata_id: cleanOptionalString(topic?.wikidata_id),
    types,
    description: cleanOptionalString(topic?.description),
    latitude: validateOptionalNumber(topic?.latitude, "latitude"),
    longitude: validateOptionalNumber(topic?.longitude, "longitude"),
  };
}

function validateResource(resource, context) {
  const topicSlugs = normalizeStringArray(resource?.topic_slugs);
  for (const topicSlug of topicSlugs) {
    if (!context.indexes.topicsBySlug.get(topicSlug)) {
      throw new StoryRelationEditorError(`Unknown topic slug "${topicSlug}"`, 404);
    }
  }

  const type = requireString(resource?.type, "type");
  if (!RESOURCE_TYPE_OPTIONS.includes(type)) {
    throw new StoryRelationEditorError(`Invalid resource type "${type}"`);
  }

  return {
    slug: requireString(resource?.slug, "slug"),
    title: requireString(resource?.title, "title"),
    url: validateUrl(resource?.url, "url"),
    type,
    topic_slugs: topicSlugs,
  };
}

async function attachExistingTopic({ rootDir, context, storySlug, storyLanguage, topicSlug }) {
  const story = assertStoryExists(context, storySlug, storyLanguage);
  const topic = context.indexes.topicsBySlug.get(topicSlug);
  if (!topic) {
    throw new StoryRelationEditorError(`Unknown topic slug "${topicSlug}"`, 404);
  }

  const metadata = getStoryMetadata(context, story);
  if ((metadata.topic_slugs || []).includes(topicSlug)) {
    return {
      action: "attach-existing",
      relationType: "topic",
      changed: false,
      attachedSlug: topicSlug,
    };
  }

  const updated = await updateEntry(
    rootDir,
    "story",
    storySlug,
    { add: [`topic_slugs=${topicSlug}`] },
    { language: storyLanguage },
  );

  return {
    action: "attach-existing",
    relationType: "topic",
    changed: true,
    attachedSlug: topicSlug,
    metadata: updated.metadata,
  };
}

async function createAndAttachTopic({ rootDir, context, storySlug, storyLanguage, topic }) {
  assertStoryExists(context, storySlug, storyLanguage);
  const validatedTopic = validateTopic(topic, context);
  ensureUniqueSlug(context.indexes.topicsBySlug.get(validatedTopic.slug), "Topic", validatedTopic.slug);

  const created = await createEntry(rootDir, "topic", validatedTopic);
  const updated = await updateEntry(
    rootDir,
    "story",
    storySlug,
    { add: [`topic_slugs=${validatedTopic.slug}`] },
    { language: storyLanguage },
  );

  return {
    action: "create-and-attach",
    relationType: "topic",
    changed: true,
    attachedSlug: validatedTopic.slug,
    created: created.data,
    metadata: updated.metadata,
  };
}

async function attachExistingResource({
  rootDir,
  context,
  storySlug,
  storyLanguage,
  resourceSlug,
}) {
  const story = assertStoryExists(context, storySlug, storyLanguage);
  const resource = context.indexes.resourcesBySlug.get(resourceSlug);
  if (!resource) {
    throw new StoryRelationEditorError(`Unknown resource slug "${resourceSlug}"`, 404);
  }

  const metadata = getStoryMetadata(context, story);
  if ((metadata.resource_slugs || []).includes(resourceSlug)) {
    return {
      action: "attach-existing",
      relationType: "resource",
      changed: false,
      attachedSlug: resourceSlug,
    };
  }

  const updated = await updateEntry(
    rootDir,
    "story",
    storySlug,
    { add: [`resource_slugs=${resourceSlug}`] },
    { language: storyLanguage },
  );

  return {
    action: "attach-existing",
    relationType: "resource",
    changed: true,
    attachedSlug: resourceSlug,
    metadata: updated.metadata,
  };
}

async function createAndAttachResource({
  rootDir,
  context,
  storySlug,
  storyLanguage,
  resource,
}) {
  assertStoryExists(context, storySlug, storyLanguage);
  const validatedResource = validateResource(resource, context);
  ensureUniqueSlug(
    context.indexes.resourcesBySlug.get(validatedResource.slug),
    "Resource",
    validatedResource.slug,
  );

  const created = await createEntry(rootDir, "resource", validatedResource);
  const updated = await updateEntry(
    rootDir,
    "story",
    storySlug,
    { add: [`resource_slugs=${validatedResource.slug}`] },
    { language: storyLanguage },
  );

  return {
    action: "create-and-attach",
    relationType: "resource",
    changed: true,
    attachedSlug: validatedResource.slug,
    created: created.data,
    metadata: updated.metadata,
  };
}

export async function mutateStoryRelations({
  rootDir,
  isDev,
  relationType,
  payload,
}) {
  assertDevMode(isDev);

  const storySlug = requireString(payload?.storySlug, "storySlug");
  const storyLanguage = requireString(payload?.storyLanguage, "storyLanguage");
  const action = requireString(payload?.action, "action");
  const context = await loadContentContext(rootDir);

  if (relationType === "topic") {
    if (action === "attach-existing") {
      return attachExistingTopic({
        rootDir,
        context,
        storySlug,
        storyLanguage,
        topicSlug: requireString(payload?.topicSlug, "topicSlug"),
      });
    }

    if (action === "create-and-attach") {
      return createAndAttachTopic({
        rootDir,
        context,
        storySlug,
        storyLanguage,
        topic: payload?.topic,
      });
    }
  }

  if (relationType === "resource") {
    if (action === "attach-existing") {
      return attachExistingResource({
        rootDir,
        context,
        storySlug,
        storyLanguage,
        resourceSlug: requireString(payload?.resourceSlug, "resourceSlug"),
      });
    }

    if (action === "create-and-attach") {
      return createAndAttachResource({
        rootDir,
        context,
        storySlug,
        storyLanguage,
        resource: payload?.resource,
      });
    }
  }

  throw new StoryRelationEditorError(
    `Unsupported ${relationType} action "${action}"`,
    400,
  );
}
