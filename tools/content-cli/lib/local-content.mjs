import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  TOPIC_RELATION_LABELS,
  TOPIC_RELATION_TYPES,
  getTopicRelationSlug,
  isTopicRelationType,
} from "../../../src/utils/topic-relations.mjs";

const execAsync = promisify(exec);

export const ENTITY_DEFINITIONS = {
  story: {
    canonical: "story",
    aliases: ["story", "stories"],
    label: "Story",
    collectionName: "stories",
    pathParts: ["src", "content", "stories"],
    requiresBody: true,
    fields: [
      { name: "title", required: true, type: "string" },
      { name: "title_bn", required: false, type: "string" },
      { name: "url_slug", required: false, type: "string" },
      { name: "language", required: true, type: "string" },
    ],
  },
  storyMetadata: {
    canonical: "story-metadata",
    aliases: ["story-metadata", "storyMetadata", "story-metadatas", "storymetadata"],
    label: "Story Metadata",
    collectionName: "storyMetadata",
    pathParts: ["src", "content", "storyMetadata"],
    requiresBody: false,
    fields: [
      { name: "category", required: true, type: "string" },
      { name: "cover_image", required: false, type: "string" },
      { name: "source_slug", required: false, type: "string" },
      { name: "source_label", required: false, type: "string" },
      { name: "source_text_slug", required: false, type: "string" },
      { name: "topic_slugs", required: false, type: "array", defaultValue: [] },
      { name: "resource_slugs", required: false, type: "array", defaultValue: [] },
    ],
  },
  topic: {
    canonical: "topic",
    aliases: ["topic", "topics"],
    label: "Topic",
    collectionName: "topics",
    pathParts: ["src", "content", "topics"],
    requiresBody: false,
    fields: [
      { name: "slug", required: true, type: "string" },
      { name: "item", required: true, type: "string" },
      { name: "item_bn", required: false, type: "string" },
      { name: "wikidata_id", required: false, type: "string" },
      { name: "types", required: true, type: "array" },
      { name: "description", required: false, type: "string" },
      { name: "latitude", required: false, type: "number" },
      { name: "longitude", required: false, type: "number" },
    ],
  },
  topicRelation: {
    canonical: "topic-relation",
    aliases: ["topic-relation", "topic-relations", "topicRelation", "topicrelations"],
    label: "Topic Relation",
    collectionName: "topicRelations",
    pathParts: ["src", "content", "topicRelations"],
    requiresBody: false,
    fields: [
      { name: "slug", required: true, type: "string" },
      { name: "source_topic_slug", required: true, type: "string" },
      { name: "target_topic_slug", required: true, type: "string" },
      { name: "type", required: true, type: "string" },
    ],
  },
  resource: {
    canonical: "resource",
    aliases: ["resource", "resources"],
    label: "Resource",
    collectionName: "resources",
    pathParts: ["src", "content", "resources"],
    requiresBody: false,
    fields: [
      { name: "slug", required: true, type: "string" },
      { name: "title", required: true, type: "string" },
      { name: "url", required: true, type: "string" },
      { name: "type", required: true, type: "string" },
      { name: "topic_slugs", required: false, type: "array", defaultValue: [] },
    ],
  },
  book: {
    canonical: "book",
    aliases: ["book", "books"],
    label: "Book",
    collectionName: "books",
    pathParts: ["src", "content", "books"],
    requiresBody: false,
    fields: [
      { name: "slug", required: true, type: "string" },
      { name: "name", required: true, type: "string" },
      { name: "author", required: false, type: "string" },
      { name: "url", required: false, type: "string" },
      { name: "library_url", required: false, type: "string" },
      { name: "cover_image", required: false, type: "string" },
      { name: "series_slug", required: false, type: "string" },
      { name: "series_title", required: false, type: "string" },
      { name: "language", required: true, type: "string" },
      { name: "category", required: false, type: "string" },
      { name: "categories", required: false, type: "array", defaultValue: [] },
      { name: "topic_slugs", required: false, type: "array", defaultValue: [] },
    ],
  },
  sourceText: {
    canonical: "source-text",
    aliases: ["source-text", "source-texts", "sourceText", "sourceTexts", "sourcetext", "sourcetexts"],
    label: "Source Text",
    collectionName: "sourceTexts",
    pathParts: ["src", "content", "sourceTexts"],
    requiresBody: true,
    fields: [
      { name: "slug", required: true, type: "string" },
      { name: "title", required: true, type: "string" },
      { name: "language", required: true, type: "string" },
      { name: "source_book_slug", required: true, type: "string" },
      { name: "work_slug", required: true, type: "string" },
      { name: "story_slug", required: false, type: "string" },
      { name: "order", required: false, type: "number" },
      { name: "intro_note", required: false, type: "string" },
    ],
  },
  storyCollection: {
    canonical: "story-collection",
    aliases: ["story-collection", "story-collections", "storyCollection", "storycollections"],
    label: "Story Collection",
    collectionName: "storyCollections",
    pathParts: ["src", "content", "storyCollections"],
    requiresBody: true,
    fields: [
      { name: "title", required: true, type: "string" },
      { name: "slug", required: false, type: "string" },
      { name: "stories", required: false, type: "array", defaultValue: [] },
    ],
  },
};

export const ENTITY_ORDER = [
  "story",
  "topic",
  "topic-relation",
  "resource",
  "book",
  "source-text",
  "story-collection",
];

const USER_VISIBLE_ENTITY_SET = new Set(ENTITY_ORDER);
const STORY_METADATA_FIELDS = new Set(
  ENTITY_DEFINITIONS.storyMetadata.fields.map((field) => field.name),
);

const STORY_LANGUAGES = new Set(["en", "bn"]);

export function getRepoRoot() {
  return process.env.CONTENT_CLI_ROOT || process.cwd();
}

export function resolveEntityName(input) {
  if (!input) return null;
  const normalized = String(input).trim();
  for (const definition of Object.values(ENTITY_DEFINITIONS)) {
    if (definition.aliases.includes(normalized)) {
      return definition.canonical;
    }
  }
  if (normalized === "all") {
    return "all";
  }
  return null;
}

export function getEntityDefinition(entityName) {
  const canonical = resolveEntityName(entityName);
  if (!canonical || canonical === "all") {
    throw new Error(`Unknown entity: ${entityName}`);
  }

  return Object.values(ENTITY_DEFINITIONS).find(
    (definition) => definition.canonical === canonical,
  );
}

export function isUserVisibleEntity(entityName) {
  const canonical = resolveEntityName(entityName);
  return canonical ? USER_VISIBLE_ENTITY_SET.has(canonical) : false;
}

function splitFrontmatter(documentText) {
  if (!documentText.startsWith("---")) {
    return { frontmatterText: "", body: documentText.replace(/^\r?\n/, "") };
  }

  const closingIndex = documentText.indexOf("\n---", 3);
  if (closingIndex === -1) {
    return { frontmatterText: "", body: documentText };
  }

  const frontmatterText = documentText.slice(4, closingIndex).replace(/\r/g, "");
  const bodyStart = documentText.indexOf("\n", closingIndex + 4);
  const body = bodyStart === -1 ? "" : documentText.slice(bodyStart + 1);

  return { frontmatterText, body };
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineList(inner).map(parseScalarValuePreservingString);
  }

  return value;
}

function splitInlineList(value) {
  const parts = [];
  let current = "";
  let quote = null;

  for (const char of value) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }

    if (quote && char === quote) {
      quote = null;
      current += char;
      continue;
    }

    if (!quote && char === ",") {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseScalarValuePreservingString(value) {
  const parsed = parseScalar(value);
  return parsed == null ? "" : parsed;
}

export function parseFrontmatter(documentText) {
  const { frontmatterText, body } = splitFrontmatter(documentText);
  const data = {};

  if (!frontmatterText) {
    return { data, body };
  }

  const lines = frontmatterText.split("\n");
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayItemMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const [, key, rawValue] = keyMatch;
    currentKey = key;

    if (!rawValue) {
      data[key] = [];
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, body };
}

function formatScalar(value) {
  if (typeof value === "string") {
    if (
      value === "" ||
      /[:#[\]{},"'\n\r\t]/.test(value) ||
      /^\s|\s$/.test(value)
    ) {
      return JSON.stringify(value);
    }
    return value;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return JSON.stringify(value);
}

export function stringifyFrontmatter(data) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${formatScalar(item)}`);
        }
      }
      continue;
    }

    lines.push(`${key}: ${formatScalar(value)}`);
  }

  lines.push("---");
  return `${lines.join(os.EOL)}${os.EOL}`;
}

export function serializeDocument(data, body = "") {
  const normalizedBody = body.replace(/\r/g, "");
  const trimmedLeading = normalizedBody.replace(/^\n+/, "");
  const bodySuffix = trimmedLeading ? `${os.EOL}${trimmedLeading}` : `${os.EOL}`;
  return `${stringifyFrontmatter(data)}${bodySuffix}`;
}

async function readDocumentFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  return { raw, data, body };
}

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function getStoryRouteSlug(storyEntry) {
  return storyEntry.data.url_slug || storyEntry.slug;
}

async function listFiles(directoryPath) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadStories(rootDir) {
  const storyRoot = path.join(rootDir, "src", "content", "stories");
  const stories = [];

  for (const language of ["en", "bn"]) {
    const directoryEntries = await listFiles(path.join(storyRoot, language));
    for (const entry of directoryEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const filePath = path.join(storyRoot, language, entry.name);
      const document = await readDocumentFile(filePath);
      const slug = stripExtension(entry.name);
      stories.push({
        entity: "story",
        slug,
        routeSlug: document.data.url_slug || slug,
        language,
        path: filePath,
        relativePath: path.relative(rootDir, filePath),
        data: document.data,
        body: document.body,
      });
    }
  }

  return stories;
}

async function loadFlatCollection(rootDir, entityKey) {
  const definition = getEntityDefinition(entityKey);
  const directoryPath = path.join(rootDir, ...definition.pathParts);
  const directoryEntries = await listFiles(directoryPath);
  const items = [];

  for (const entry of directoryEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const filePath = path.join(directoryPath, entry.name);
    const document = await readDocumentFile(filePath);
    const fileSlug = stripExtension(entry.name);
    items.push({
      entity: definition.canonical,
      slug: document.data.slug || fileSlug,
      path: filePath,
      relativePath: path.relative(rootDir, filePath),
      data: document.data,
      body: document.body,
    });
  }

  return items;
}

function ensureDefaults(entityName, data) {
  const definition = getEntityDefinition(entityName);
  const next = { ...data };
  for (const field of definition.fields) {
    if (next[field.name] === undefined && field.defaultValue !== undefined) {
      next[field.name] = Array.isArray(field.defaultValue)
        ? [...field.defaultValue]
        : field.defaultValue;
    }
  }
  return next;
}

function indexBy(items, keyBuilder) {
  return new Map(items.map((item) => [keyBuilder(item), item]));
}

function buildStoryMetadataLinks(context, resolvedStory) {
  const topicLinks = (resolvedStory.metadata.topic_slugs || [])
    .map((slug) => context.indexes.topicsBySlug.get(slug))
    .filter(Boolean)
    .map((topic) => ({
      slug: topic.slug,
      item: topic.data.item,
    }));

  const resourceLinks = (resolvedStory.metadata.resource_slugs || [])
    .map((slug) => context.indexes.resourcesBySlug.get(slug))
    .filter(Boolean)
    .map((resource) => ({
      slug: resource.slug,
      title: resource.data.title,
      type: resource.data.type,
    }));

  const sourceBook = resolvedStory.metadata.source_slug
    ? context.indexes.booksBySlug.get(resolvedStory.metadata.source_slug) || null
    : null;
  const sourceText = resolvedStory.metadata.source_text_slug
    ? context.indexes.sourceTextsBySlug.get(resolvedStory.metadata.source_text_slug) || null
    : null;

  const translations = context.stories
    .filter((story) => getStoryRouteSlug(story) === resolvedStory.routeSlug)
    .map((story) => ({
      language: story.language,
      slug: story.slug,
      path: story.relativePath,
    }));

  return {
    topics: topicLinks,
    resources: resourceLinks,
    sourceBook: sourceBook
      ? {
          slug: sourceBook.slug,
          name: sourceBook.data.name,
          author: sourceBook.data.author || null,
        }
      : resolvedStory.metadata.source_label
      ? {
          slug: null,
          name: resolvedStory.metadata.source_label,
          author: null,
        }
      : null,
    sourceText: sourceText
      ? {
          slug: sourceText.slug,
          title: sourceText.data.title,
          sourceBookSlug: sourceText.data.source_book_slug,
        }
      : null,
    translations,
  };
}

export async function loadContentContext(rootDir = getRepoRoot()) {
  const stories = await loadStories(rootDir);
  const storyMetadata = await loadFlatCollection(rootDir, "story-metadata");
  const topics = await loadFlatCollection(rootDir, "topic");
  const topicRelations = await loadFlatCollection(rootDir, "topic-relation");
  const books = await loadFlatCollection(rootDir, "book");
  const sourceTexts = await loadFlatCollection(rootDir, "source-text");
  const resources = await loadFlatCollection(rootDir, "resource");
  const storyCollections = await loadFlatCollection(rootDir, "story-collection");

  const indexes = {
    storiesByKey: indexBy(stories, (story) => `${story.routeSlug}:${story.language}`),
    storiesBySlug: indexBy(stories, (story) => `${story.slug}:${story.language}`),
    metadataBySlug: indexBy(storyMetadata, (entry) => entry.slug),
    topicsBySlug: indexBy(topics, (entry) => entry.slug),
    topicRelationsBySlug: indexBy(topicRelations, (entry) => entry.slug),
    booksBySlug: indexBy(books, (entry) => entry.slug),
    sourceTextsBySlug: indexBy(sourceTexts, (entry) => entry.slug),
    resourcesBySlug: indexBy(resources, (entry) => entry.slug),
    storyCollectionsBySlug: indexBy(storyCollections, (entry) => entry.slug),
  };

  const resolvedStories = stories.map((story) => {
    const metadata = indexes.metadataBySlug.get(story.routeSlug) || null;
    const resolved = {
      ...story,
      metadata: metadata?.data || null,
      metadataPath: metadata?.relativePath || null,
      links: null,
    };
    resolved.links = buildStoryMetadataLinks(
      {
        stories,
        storyMetadata,
        topics,
        topicRelations,
        books,
        sourceTexts,
        resources,
        storyCollections,
        indexes,
      },
      resolved,
    );
    return resolved;
  });

  return {
    rootDir,
    stories,
    storyMetadata,
    topics,
    topicRelations,
    books,
    sourceTexts,
    resources,
    storyCollections,
    resolvedStories,
    indexes,
  };
}

export function summarizeEntry(entry, context) {
  switch (entry.entity) {
    case "story": {
      const resolved = context.resolvedStories.find(
        (story) => story.slug === entry.slug && story.language === entry.language,
      );
      return {
        entity: entry.entity,
        slug: entry.slug,
        routeSlug: entry.routeSlug,
        language: entry.language,
        title: entry.data.title,
        metadataCategory: resolved?.metadata?.category || null,
        sourceSlug: resolved?.metadata?.source_slug || null,
        sourceLabel: resolved?.metadata?.source_label || null,
        sourceTextSlug: resolved?.metadata?.source_text_slug || null,
        path: entry.relativePath,
      };
    }
    case "story-metadata":
      return {
        entity: entry.entity,
        slug: entry.slug,
        category: entry.data.category,
        sourceSlug: entry.data.source_slug || null,
        sourceLabel: entry.data.source_label || null,
        sourceTextSlug: entry.data.source_text_slug || null,
        topicCount: (entry.data.topic_slugs || []).length,
        resourceCount: (entry.data.resource_slugs || []).length,
        path: entry.relativePath,
      };
    case "topic":
      return {
        entity: entry.entity,
        slug: entry.slug,
        item: entry.data.item,
        types: entry.data.types || [],
        path: entry.relativePath,
      };
    case "topic-relation":
      return {
        entity: entry.entity,
        slug: entry.slug,
        sourceTopicSlug: entry.data.source_topic_slug,
        targetTopicSlug: entry.data.target_topic_slug,
        type: entry.data.type,
        label: `${entry.data.source_topic_slug} -> ${entry.data.target_topic_slug}`,
        path: entry.relativePath,
      };
    case "resource":
      return {
        entity: entry.entity,
        slug: entry.slug,
        title: entry.data.title,
        type: entry.data.type,
        path: entry.relativePath,
      };
    case "book":
      return {
        entity: entry.entity,
        slug: entry.slug,
        name: entry.data.name,
        author: entry.data.author || null,
        language: entry.data.language || null,
        category: entry.data.category || null,
        path: entry.relativePath,
      };
    case "source-text":
      return {
        entity: entry.entity,
        slug: entry.slug,
        title: entry.data.title,
        language: entry.data.language || null,
        sourceBookSlug: entry.data.source_book_slug || null,
        workSlug: entry.data.work_slug || null,
        storySlug: entry.data.story_slug || null,
        order: entry.data.order ?? null,
        path: entry.relativePath,
      };
    case "story-collection":
      return {
        entity: entry.entity,
        slug: entry.slug,
        title: entry.data.title,
        stories: entry.data.stories || [],
        path: entry.relativePath,
      };
    default:
      return {
        entity: entry.entity,
        slug: entry.slug,
        path: entry.relativePath,
      };
  }
}

export function getEntriesForEntity(context, entityName) {
  switch (resolveEntityName(entityName)) {
    case "story":
      return context.stories;
    case "topic":
      return context.topics;
    case "topic-relation":
      return context.topicRelations;
    case "resource":
      return context.resources;
    case "book":
      return context.books;
    case "source-text":
      return context.sourceTexts;
    case "story-collection":
      return context.storyCollections;
    default:
      return [];
  }
}

export function findEntry(context, entityName, slug, options = {}) {
  const entity = resolveEntityName(entityName);
  if (entity === "story") {
    const language = options.language || null;
    const routeMatch = context.stories.find((story) => {
      if (story.routeSlug !== slug && story.slug !== slug) return false;
      return language ? story.language === language : true;
    });
    return routeMatch || null;
  }

  return getEntriesForEntity(context, entity).find((entry) => entry.slug === slug) || null;
}

export function getResolvedStory(context, storyEntry) {
  return (
    context.resolvedStories.find(
      (story) => story.slug === storyEntry.slug && story.language === storyEntry.language,
    ) || null
  );
}

function arrayify(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getTopicRelationLabel(type, direction = "forward") {
  const labels = TOPIC_RELATION_LABELS[type];
  if (!labels) {
    return type;
  }
  return direction === "reverse" ? labels.reverse : labels.forward;
}

function matchesFilterValue(actual, expected) {
  const actualValues = arrayify(actual).map((value) => String(value));
  const expectedValues = arrayify(expected).map((value) => String(value));
  return expectedValues.every((value) => actualValues.includes(value));
}

export function applyEntityFilters(entries, context, entityName, options = {}) {
  const entity = resolveEntityName(entityName);
  return entries.filter((entry) => {
    if (options.language && entry.entity === "story" && entry.language !== options.language) {
      return false;
    }

    if (options.category) {
      if (entry.entity === "story") {
        const resolved = getResolvedStory(context, entry);
        if ((resolved?.metadata?.category || null) !== options.category) {
          return false;
        }
      } else {
        const categories = uniqueValues([
          entry.data.category,
          ...(entry.data.categories || []),
        ]).filter(Boolean);
        if (!categories.includes(options.category)) {
          return false;
        }
      }
    }

    if (options.topic) {
      let topicSlugs = [];
      if (entry.entity === "story") {
        const resolved = getResolvedStory(context, entry);
        topicSlugs = resolved?.metadata?.topic_slugs || [];
      } else {
        topicSlugs = entry.data.topic_slugs || [];
      }

      if (!matchesFilterValue(topicSlugs, options.topic)) {
        return false;
      }
    }

    if (options.type) {
      if (entry.entity === "topic") {
        if (!matchesFilterValue(entry.data.types || [], options.type)) {
          return false;
        }
      } else if (entry.entity === "topic-relation") {
        if (String(entry.data.type) !== String(options.type)) {
          return false;
        }
      } else if (entry.entity === "resource") {
        if (String(entry.data.type) !== String(options.type)) {
          return false;
        }
      } else {
        return false;
      }
    }

    if (options["source-slug"]) {
      const resolved = entry.entity === "story" ? getResolvedStory(context, entry) : null;
      const sourceSlug = entry.entity === "source-text"
        ? entry.data.source_book_slug || null
        : resolved?.metadata?.source_slug || null;
      if (sourceSlug !== options["source-slug"]) {
        return false;
      }
    }

    return true;
  });
}

function getSearchFieldsForEntry(entry, context) {
  switch (entry.entity) {
    case "story": {
      const resolved = getResolvedStory(context, entry);
      return {
        title: [entry.data.title, entry.data.title_bn, entry.routeSlug],
        metadata: [
          resolved?.metadata?.category,
          resolved?.metadata?.source_slug,
          resolved?.metadata?.source_label,
          resolved?.metadata?.source_text_slug,
          ...(resolved?.metadata?.topic_slugs || []),
          ...(resolved?.metadata?.resource_slugs || []),
        ],
        body: [entry.body],
      };
    }
    case "story-metadata":
      return {
        title: [entry.slug],
        metadata: [
          entry.data.category,
          entry.data.source_slug,
          entry.data.source_label,
          entry.data.source_text_slug,
          ...(entry.data.topic_slugs || []),
          ...(entry.data.resource_slugs || []),
        ],
        body: [],
      };
    case "topic":
      return {
        title: [entry.slug, entry.data.item, entry.data.item_bn],
        metadata: [...(entry.data.types || []), entry.data.description || ""],
        body: [],
      };
    case "topic-relation":
      return {
        title: [entry.slug],
        metadata: [
          entry.data.type,
          getTopicRelationLabel(entry.data.type, "forward"),
          entry.data.source_topic_slug,
          entry.data.target_topic_slug,
        ],
        body: [],
      };
    case "resource":
      return {
        title: [entry.slug, entry.data.title],
        metadata: [entry.data.type, entry.data.url, ...(entry.data.topic_slugs || [])],
        body: [],
      };
    case "book":
      return {
        title: [entry.slug, entry.data.name, entry.data.author || "", entry.data.series_title || ""],
        metadata: [
          entry.data.language,
          entry.data.category,
          ...(entry.data.categories || []),
          entry.data.series_slug || "",
          ...(entry.data.topic_slugs || []),
        ],
        body: [],
      };
    case "source-text":
      return {
        title: [entry.slug, entry.data.title, entry.data.work_slug],
        metadata: [
          entry.data.language,
          entry.data.source_book_slug,
          entry.data.story_slug || "",
          entry.data.intro_note || "",
        ],
        body: [entry.body],
      };
    case "story-collection":
      return {
        title: [entry.slug, entry.data.title],
        metadata: [...(entry.data.stories || [])],
        body: [entry.body],
      };
    default:
      return {
        title: [entry.slug],
        metadata: [],
        body: [],
      };
  }
}

function buildSnippet(text, query) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!normalizedText) return null;

  const lowered = normalizedText.toLowerCase();
  const index = lowered.indexOf(query.toLowerCase());
  if (index === -1) {
    return normalizedText.slice(0, 120);
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(normalizedText.length, index + query.length + 60);
  return normalizedText.slice(start, end);
}

export function searchEntries(context, entityName, query, options = {}) {
  const normalizedQuery = normalizeText(query);
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const fieldMode = options.field || "all";

  const targetEntries = entityName === "all"
    ? ENTITY_ORDER.flatMap((name) => getEntriesForEntity(context, name))
    : getEntriesForEntity(context, entityName);

  const filteredEntries = entityName === "all"
    ? targetEntries
    : applyEntityFilters(targetEntries, context, entityName, options);

  const results = [];

  for (const entry of filteredEntries) {
    const fields = getSearchFieldsForEntry(entry, context);
    const includedFields = fieldMode === "all"
      ? ["title", "metadata", "body"]
      : [fieldMode];

    let score = 0;
    const matchedFields = new Set();
    let snippet = null;

    for (const fieldName of includedFields) {
      const values = (fields[fieldName] || []).filter(Boolean).map(String);
      for (const value of values) {
        const normalizedValue = normalizeText(value);
        if (!normalizedValue) continue;

        let matchedTermCount = 0;
        for (const term of queryTerms) {
          if (normalizedValue === term) {
            score += fieldName === "title" ? 40 : 25;
            matchedTermCount += 1;
          } else if (normalizedValue.includes(term)) {
            score += fieldName === "title" ? 18 : fieldName === "metadata" ? 12 : 8;
            matchedTermCount += 1;
          }
        }

        if (matchedTermCount === queryTerms.length && queryTerms.length > 0) {
          matchedFields.add(fieldName);
          snippet ||= fieldName === "body" ? buildSnippet(value, query) : null;
        }
      }
    }

    if (score > 0) {
      results.push({
        entity: entry.entity,
        slug: entry.slug,
        summary: summarizeEntry(entry, context),
        score,
        matchedFields: [...matchedFields],
        snippet: options["include-snippets"] ? snippet : null,
      });
    }
  }

  return results
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const leftTitle = left.summary.title || left.summary.name || left.summary.item || left.summary.slug;
      const rightTitle =
        right.summary.title || right.summary.name || right.summary.item || right.summary.slug;
      return String(leftTitle).localeCompare(String(rightTitle));
    })
    .slice(0, options.limit ? Number(options.limit) : undefined);
}

export function getRelatedEntries(context, entityName, slug, options = {}) {
  const entry = findEntry(context, entityName, slug, options);
  if (!entry) {
    return null;
  }

  const outbound = [];
  const inbound = [];

  if (entry.entity === "story") {
    const resolved = getResolvedStory(context, entry);
    const topicSlugs = resolved?.metadata?.topic_slugs || [];
    const resourceSlugs = resolved?.metadata?.resource_slugs || [];
    const sourceSlug = resolved?.metadata?.source_slug || null;
    const sourceTextSlug = resolved?.metadata?.source_text_slug || null;

    for (const topicSlug of topicSlugs) {
      const topic = context.indexes.topicsBySlug.get(topicSlug);
      if (topic) outbound.push({ entity: "topic", slug: topic.slug, label: topic.data.item });
    }
    for (const resourceSlug of resourceSlugs) {
      const resource = context.indexes.resourcesBySlug.get(resourceSlug);
      if (resource) {
        outbound.push({ entity: "resource", slug: resource.slug, label: resource.data.title });
      }
    }
    if (sourceSlug) {
      const book = context.indexes.booksBySlug.get(sourceSlug);
      if (book) outbound.push({ entity: "book", slug: book.slug, label: book.data.name });
    }
    if (sourceTextSlug) {
      const sourceText = context.indexes.sourceTextsBySlug.get(sourceTextSlug);
      if (sourceText) {
        outbound.push({
          entity: "source-text",
          slug: sourceText.slug,
          label: sourceText.data.title,
        });
      }
    }

    for (const collection of context.storyCollections) {
      if ((collection.data.stories || []).includes(entry.routeSlug)) {
        inbound.push({
          entity: "story-collection",
          slug: collection.slug,
          label: collection.data.title,
        });
      }
    }
  }

  if (entry.entity === "topic") {
    for (const relation of context.topicRelations) {
      if (relation.data.source_topic_slug === entry.slug) {
        const targetTopic = context.indexes.topicsBySlug.get(relation.data.target_topic_slug);
        if (targetTopic) {
          outbound.push({
            entity: "topic",
            slug: targetTopic.slug,
            label: targetTopic.data.item,
            type: relation.data.type,
            detail: getTopicRelationLabel(relation.data.type, "forward"),
          });
        }
      }

      if (relation.data.target_topic_slug === entry.slug) {
        const sourceTopic = context.indexes.topicsBySlug.get(relation.data.source_topic_slug);
        if (sourceTopic) {
          inbound.push({
            entity: "topic",
            slug: sourceTopic.slug,
            label: sourceTopic.data.item,
            type: relation.data.type,
            detail: getTopicRelationLabel(relation.data.type, "reverse"),
          });
        }
      }
    }

    for (const story of context.resolvedStories) {
      if ((story.metadata?.topic_slugs || []).includes(entry.slug)) {
        inbound.push({
          entity: "story",
          slug: story.routeSlug,
          label: story.data.title,
          language: story.language,
        });
      }
    }
    for (const book of context.books) {
      if ((book.data.topic_slugs || []).includes(entry.slug)) {
        inbound.push({ entity: "book", slug: book.slug, label: book.data.name });
      }
    }
    for (const resource of context.resources) {
      if ((resource.data.topic_slugs || []).includes(entry.slug)) {
        inbound.push({ entity: "resource", slug: resource.slug, label: resource.data.title });
      }
    }
  }

  if (entry.entity === "book") {
    for (const story of context.resolvedStories) {
      if (story.metadata?.source_slug === entry.slug) {
        inbound.push({
          entity: "story",
          slug: story.routeSlug,
          label: story.data.title,
          language: story.language,
        });
      }
    }
    for (const sourceText of context.sourceTexts) {
      if (sourceText.data.source_book_slug === entry.slug) {
        inbound.push({
          entity: "source-text",
          slug: sourceText.slug,
          label: sourceText.data.title,
        });
      }
    }
    for (const topicSlug of entry.data.topic_slugs || []) {
      const topic = context.indexes.topicsBySlug.get(topicSlug);
      if (topic) outbound.push({ entity: "topic", slug: topic.slug, label: topic.data.item });
    }
  }

  if (entry.entity === "source-text") {
    const book = context.indexes.booksBySlug.get(entry.data.source_book_slug);
    if (book) outbound.push({ entity: "book", slug: book.slug, label: book.data.name });

    if (entry.data.story_slug) {
      for (const story of context.resolvedStories) {
        if (story.routeSlug === entry.data.story_slug) {
          outbound.push({
            entity: "story",
            slug: story.routeSlug,
            label: story.data.title,
            language: story.language,
          });
        }
      }
    }

    for (const story of context.resolvedStories) {
      if (story.metadata?.source_text_slug === entry.slug) {
        inbound.push({
          entity: "story",
          slug: story.routeSlug,
          label: story.data.title,
          language: story.language,
        });
      }
    }
  }

  if (entry.entity === "topic-relation") {
    const sourceTopic = context.indexes.topicsBySlug.get(entry.data.source_topic_slug);
    const targetTopic = context.indexes.topicsBySlug.get(entry.data.target_topic_slug);

    if (sourceTopic) {
      outbound.push({
        entity: "topic",
        slug: sourceTopic.slug,
        label: sourceTopic.data.item,
        detail: "Source topic",
      });
    }

    if (targetTopic) {
      outbound.push({
        entity: "topic",
        slug: targetTopic.slug,
        label: targetTopic.data.item,
        detail: "Target topic",
      });
    }
  }

  if (entry.entity === "resource") {
    for (const topicSlug of entry.data.topic_slugs || []) {
      const topic = context.indexes.topicsBySlug.get(topicSlug);
      if (topic) outbound.push({ entity: "topic", slug: topic.slug, label: topic.data.item });
    }
    for (const story of context.resolvedStories) {
      if ((story.metadata?.resource_slugs || []).includes(entry.slug)) {
        inbound.push({
          entity: "story",
          slug: story.routeSlug,
          label: story.data.title,
          language: story.language,
        });
      }
    }
  }

  if (entry.entity === "story-collection") {
    for (const storySlug of entry.data.stories || []) {
      const story = context.resolvedStories.find((candidate) => candidate.routeSlug === storySlug);
      if (story) {
        outbound.push({
          entity: "story",
          slug: story.routeSlug,
          label: story.data.title,
          language: story.language,
        });
      }
    }
  }

  return {
    entry: summarizeEntry(entry, context),
    outbound,
    inbound,
  };
}

export function validateContext(context, scope = "all") {
  const issues = [];

  const selectedEntities = scope === "all" ? ENTITY_ORDER : [resolveEntityName(scope)];

  if (selectedEntities.includes("story")) {
    const routeSlugMap = new Map();
    for (const story of context.stories) {
      const metadata = context.indexes.metadataBySlug.get(story.routeSlug);
      if (!metadata) {
        issues.push({
          severity: "error",
          entity: "story",
          slug: story.routeSlug,
          message: `Missing story metadata for "${story.routeSlug}"`,
          path: story.relativePath,
        });
      }

      const languageKey = `${story.routeSlug}:${story.language}`;
      if (routeSlugMap.has(languageKey)) {
        issues.push({
          severity: "error",
          entity: "story",
          slug: story.routeSlug,
          message: `Duplicate route slug for language "${story.language}"`,
          path: story.relativePath,
        });
      } else {
        routeSlugMap.set(languageKey, story.relativePath);
      }
    }
  }

  if (selectedEntities.includes("story-metadata") || selectedEntities.includes("story")) {
    for (const metadata of context.storyMetadata) {
      if (metadata.data.source_slug && !context.indexes.booksBySlug.get(metadata.data.source_slug)) {
        issues.push({
          severity: "error",
          entity: "story-metadata",
          slug: metadata.slug,
          message: `Broken source_slug "${metadata.data.source_slug}"`,
          path: metadata.relativePath,
        });
      }

      const sourceText = metadata.data.source_text_slug
        ? context.indexes.sourceTextsBySlug.get(metadata.data.source_text_slug)
        : null;

      if (metadata.data.source_text_slug && !sourceText) {
        issues.push({
          severity: "error",
          entity: "story-metadata",
          slug: metadata.slug,
          message: `Broken source_text_slug "${metadata.data.source_text_slug}"`,
          path: metadata.relativePath,
        });
      }

      if (
        metadata.data.source_slug &&
        sourceText &&
        sourceText.data.source_book_slug !== metadata.data.source_slug
      ) {
        issues.push({
          severity: "error",
          entity: "story-metadata",
          slug: metadata.slug,
          message: `source_text_slug "${metadata.data.source_text_slug}" belongs to source_book_slug "${sourceText.data.source_book_slug}", not source_slug "${metadata.data.source_slug}"`,
          path: metadata.relativePath,
        });
      }

      for (const topicSlug of metadata.data.topic_slugs || []) {
        if (!context.indexes.topicsBySlug.get(topicSlug)) {
          issues.push({
            severity: "error",
            entity: "story-metadata",
            slug: metadata.slug,
            message: `Broken topic_slugs reference "${topicSlug}"`,
            path: metadata.relativePath,
          });
        }
      }

      for (const resourceSlug of metadata.data.resource_slugs || []) {
        if (!context.indexes.resourcesBySlug.get(resourceSlug)) {
          issues.push({
            severity: "error",
            entity: "story-metadata",
            slug: metadata.slug,
            message: `Broken resource_slugs reference "${resourceSlug}"`,
            path: metadata.relativePath,
          });
        }
      }
    }
  }

  if (selectedEntities.includes("source-text")) {
    for (const sourceText of context.sourceTexts) {
      if (!context.indexes.booksBySlug.get(sourceText.data.source_book_slug)) {
        issues.push({
          severity: "error",
          entity: "source-text",
          slug: sourceText.slug,
          message: `Broken source_book_slug "${sourceText.data.source_book_slug}"`,
          path: sourceText.relativePath,
        });
      }

      if (
        sourceText.data.story_slug &&
        !context.resolvedStories.some((story) => story.routeSlug === sourceText.data.story_slug)
      ) {
        issues.push({
          severity: "error",
          entity: "source-text",
          slug: sourceText.slug,
          message: `Broken story_slug "${sourceText.data.story_slug}"`,
          path: sourceText.relativePath,
        });
      }
    }
  }

  if (selectedEntities.includes("book")) {
    for (const book of context.books) {
      for (const topicSlug of book.data.topic_slugs || []) {
        if (!context.indexes.topicsBySlug.get(topicSlug)) {
          issues.push({
            severity: "error",
            entity: "book",
            slug: book.slug,
            message: `Broken topic_slugs reference "${topicSlug}"`,
            path: book.relativePath,
          });
        }
      }
    }
  }

  if (selectedEntities.includes("resource")) {
    for (const resource of context.resources) {
      for (const topicSlug of resource.data.topic_slugs || []) {
        if (!context.indexes.topicsBySlug.get(topicSlug)) {
          issues.push({
            severity: "error",
            entity: "resource",
            slug: resource.slug,
            message: `Broken topic_slugs reference "${topicSlug}"`,
            path: resource.relativePath,
          });
        }
      }
    }
  }

  if (selectedEntities.includes("topic-relation")) {
    const seenKeys = new Set();
    const reverseConflictKeys = new Set();

    for (const relation of context.topicRelations) {
      const { slug, source_topic_slug: sourceTopicSlug, target_topic_slug: targetTopicSlug, type } =
        relation.data;

      if (!context.indexes.topicsBySlug.get(sourceTopicSlug)) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: `Broken source_topic_slug "${sourceTopicSlug}"`,
          path: relation.relativePath,
        });
      }

      if (!context.indexes.topicsBySlug.get(targetTopicSlug)) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: `Broken target_topic_slug "${targetTopicSlug}"`,
          path: relation.relativePath,
        });
      }

      if (sourceTopicSlug === targetTopicSlug) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: "source_topic_slug and target_topic_slug cannot match",
          path: relation.relativePath,
        });
      }

      if (!isTopicRelationType(type)) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: `Invalid relation type "${type}"`,
          path: relation.relativePath,
        });
      }

      const canonicalSlug = getTopicRelationSlug(type, sourceTopicSlug, targetTopicSlug);
      if (slug !== canonicalSlug) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: `Expected slug "${canonicalSlug}" for this relation`,
          path: relation.relativePath,
        });
      }

      const relationKey = `${type}:${sourceTopicSlug}:${targetTopicSlug}`;
      if (seenKeys.has(relationKey)) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: "Duplicate topic relation entry",
          path: relation.relativePath,
        });
      } else {
        seenKeys.add(relationKey);
      }

      const reverseKey = `${type}:${targetTopicSlug}:${sourceTopicSlug}`;
      if (reverseConflictKeys.has(relationKey)) {
        issues.push({
          severity: "error",
          entity: "topic-relation",
          slug: relation.slug,
          message: "Conflicting inverse topic relation entry",
          path: relation.relativePath,
        });
      }
      reverseConflictKeys.add(reverseKey);
    }
  }

  if (selectedEntities.includes("story-collection")) {
    for (const collection of context.storyCollections) {
      for (const storySlug of collection.data.stories || []) {
        const story = context.resolvedStories.find((candidate) => candidate.routeSlug === storySlug);
        if (!story) {
          issues.push({
            severity: "error",
            entity: "story-collection",
            slug: collection.slug,
            message: `Broken stories reference "${storySlug}"`,
            path: collection.relativePath,
          });
        }
      }
    }
  }

  return issues;
}

function getPromptQuestion(field) {
  if (field.type === "array") {
    return `${field.name} (comma-separated)`;
  }
  return field.name;
}

export async function promptForMissingFields(entityName, data, prompt) {
  const next = ensureDefaults(entityName, { ...data });
  const definitions = resolveEntityName(entityName) === "story"
    ? [getEntityDefinition("story"), getEntityDefinition("story-metadata")]
    : [getEntityDefinition(entityName)];

  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (!field.required || next[field.name] !== undefined) {
        continue;
      }

      const answer = await prompt(getPromptQuestion(field));
      if (field.type === "array") {
        next[field.name] = answer
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else if (field.type === "number") {
        next[field.name] = Number(answer);
      } else if (field.type === "boolean") {
        next[field.name] = answer === "true";
      } else {
        next[field.name] = answer;
      }
    }
  }

  return next;
}

function parseInputValue(rawValue) {
  if (rawValue.includes(",")) {
    return rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(rawValue)) return Number(rawValue);
  return rawValue;
}

export function parseAssignments(values) {
  const assignments = [];
  for (const item of arrayify(values)) {
    const separatorIndex = String(item).indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`Expected field assignment in the form field=value, received "${item}"`);
    }
    const key = item.slice(0, separatorIndex);
    const rawValue = item.slice(separatorIndex + 1);
    assignments.push({
      key,
      value: parseInputValue(rawValue),
    });
  }
  return assignments;
}

export function buildDataFromFlags(entityName, flags) {
  const data = {};
  const definitions = resolveEntityName(entityName) === "story"
    ? [getEntityDefinition("story"), getEntityDefinition("story-metadata")]
    : [getEntityDefinition(entityName)];

  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (flags[field.name] !== undefined) {
        if (field.type === "array") {
          data[field.name] = arrayify(flags[field.name])
            .flatMap((value) =>
              Array.isArray(value)
                ? value
                : String(value)
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
            );
        } else if (field.type === "number") {
          data[field.name] = Number(flags[field.name]);
        } else if (field.type === "boolean") {
          data[field.name] = flags[field.name] === true || flags[field.name] === "true";
        } else {
          data[field.name] = flags[field.name];
        }
      }
    }
  }

  if (flags.slug !== undefined) {
    data.slug = flags.slug;
  }

  return ensureDefaults(entityName, data);
}

function getCollectionPath(rootDir, entityName) {
  const definition = getEntityDefinition(entityName);
  return path.join(rootDir, ...definition.pathParts);
}

function getEntryFilePath(rootDir, entityName, data) {
  if (resolveEntityName(entityName) === "story") {
    const language = data.language;
    if (!STORY_LANGUAGES.has(language)) {
      throw new Error(`Story language must be one of: ${[...STORY_LANGUAGES].join(", ")}`);
    }
    const slug = data.slug || data.url_slug;
    if (!slug) {
      throw new Error("Story creation requires --slug or --url-slug");
    }
    return path.join(getCollectionPath(rootDir, entityName), language, `${slug}.md`);
  }

  const slug = data.slug;
  if (!slug) {
    throw new Error(`${entityName} requires a slug`);
  }

  return path.join(getCollectionPath(rootDir, entityName), `${slug}.md`);
}

export async function createEntry(rootDir, entityName, data, body = "") {
  const nextData = ensureDefaults(entityName, data);
  const storyMetadataData = resolveEntityName(entityName) === "story"
    ? extractStoryMetadataData(nextData)
    : null;
  const storyData = resolveEntityName(entityName) === "story"
    ? stripStoryMetadataFields(nextData)
    : nextData;
  assertRequiredFields(resolveEntityName(entityName) === "story" ? "story" : entityName, storyData);
  if (storyMetadataData) {
    assertRequiredFields("story-metadata", storyMetadataData);
  }
  const filePath = getEntryFilePath(rootDir, entityName, storyData);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
    throw new Error(`Entry already exists at ${path.relative(rootDir, filePath)}`);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const serialized = serializeDocument(storyData, body);
  await fs.writeFile(filePath, serialized, "utf8");

  let metadataRelativePath = null;
  if (storyMetadataData) {
    const metadataPath = getEntryFilePath(rootDir, "story-metadata", {
      slug: storyData.url_slug || storyData.slug,
    });
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, serializeDocument(storyMetadataData, ""), "utf8");
    metadataRelativePath = path.relative(rootDir, metadataPath);
  }

  return {
    path: filePath,
    relativePath: path.relative(rootDir, filePath),
    metadataPath: metadataRelativePath,
    data: storyData,
    metadata: storyMetadataData,
    body,
  };
}

export async function updateEntry(rootDir, entityName, slug, updates, options = {}) {
  const context = await loadContentContext(rootDir);
  const entry = findEntry(context, entityName, slug, options);
  if (!entry) {
    throw new Error(`Could not find ${entityName} "${slug}"`);
  }
  const isStoryEntity = resolveEntityName(entityName) === "story";

  const setAssignments = parseAssignments(updates.set || []);
  const addAssignments = parseAssignments(updates.add || []);
  const removeAssignments = parseAssignments(updates.remove || []);

  const nextData = ensureDefaults(entityName, { ...entry.data });
  const metadataEntry = isStoryEntity
    ? context.indexes.metadataBySlug.get(entry.routeSlug) || null
    : null;
  const hasMetadataAssignments = isStoryEntity && [...setAssignments, ...addAssignments, ...removeAssignments]
    .some((assignment) => isStoryMetadataField(assignment.key));
  const nextMetadata =
    metadataEntry || hasMetadataAssignments
      ? ensureDefaults("story-metadata", { ...(metadataEntry?.data || {}) })
      : null;

  applyAssignments(
    nextData,
    setAssignments.filter((assignment) => !(isStoryEntity && isStoryMetadataField(assignment.key))),
    "set",
  );
  applyAssignments(
    nextData,
    addAssignments.filter((assignment) => !(isStoryEntity && isStoryMetadataField(assignment.key))),
    "add",
  );
  applyAssignments(
    nextData,
    removeAssignments.filter((assignment) => !(isStoryEntity && isStoryMetadataField(assignment.key))),
    "remove",
  );

  if (nextMetadata) {
    applyAssignments(nextMetadata, setAssignments.filter((assignment) => isStoryMetadataField(assignment.key)), "set");
    applyAssignments(nextMetadata, addAssignments.filter((assignment) => isStoryMetadataField(assignment.key)), "add");
    applyAssignments(nextMetadata, removeAssignments.filter((assignment) => isStoryMetadataField(assignment.key)), "remove");
  }

  const nextBody = updates.body !== undefined ? updates.body : entry.body;
  await fs.writeFile(entry.path, serializeDocument(nextData, nextBody), "utf8");

  if (nextMetadata) {
    const metadataPath = metadataEntry?.path || getEntryFilePath(rootDir, "story-metadata", { slug: entry.routeSlug });
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(metadataPath, serializeDocument(nextMetadata, ""), "utf8");
  }

  return {
    path: entry.path,
    relativePath: entry.relativePath,
    data: nextData,
    metadata: nextMetadata,
    body: nextBody,
  };
}

export async function readBodyInput(flags) {
  if (flags["body-file"]) {
    const filePath = path.resolve(getRepoRoot(), flags["body-file"]);
    return fs.readFile(filePath, "utf8");
  }
  return flags.body || "";
}

export async function openPathInEditor(targetPath) {
  if (process.platform === "win32") {
    await execAsync(`start "" "${targetPath}"`, { shell: "cmd.exe" });
    return;
  }
  if (process.platform === "darwin") {
    await execAsync(`open "${targetPath}"`);
    return;
  }
  await execAsync(`xdg-open "${targetPath}"`);
}

export function getFieldDefinitions(entityName) {
  if (resolveEntityName(entityName) === "story") {
    return [
      ...getEntityDefinition("story").fields,
      ...getEntityDefinition("story-metadata").fields,
    ];
  }
  return getEntityDefinition(entityName).fields;
}

export function buildTemplate(entityName) {
  const definition = getEntityDefinition(entityName);
  const data = {};
  for (const field of definition.fields) {
    if (field.required) {
      if (field.type === "array") {
        data[field.name] = [`example-${field.name.replace(/_slugs$/, "")}`];
      } else if (field.type === "number") {
        data[field.name] = 1;
      } else if (field.type === "boolean") {
        data[field.name] = true;
      } else {
        data[field.name] = `example-${field.name}`;
      }
    } else if (field.defaultValue !== undefined) {
      data[field.name] = field.defaultValue;
    }
  }

  if (resolveEntityName(entityName) === "story") {
    data.title = "Example Story";
    data.language = "en";
    data.category = "Folktale";
    data.topic_slugs = ["example-topic"];
    data.resource_slugs = ["example-resource"];
  }
  if (resolveEntityName(entityName) === "topic") {
    data.item = "Example Topic";
    data.types = ["Place"];
  }
  if (resolveEntityName(entityName) === "topic-relation") {
    data.slug = "located_in--example-site--example-region";
    data.source_topic_slug = "example-site";
    data.target_topic_slug = "example-region";
    data.type = "located_in";
  }
  if (resolveEntityName(entityName) === "book") {
    data.name = "Example Book";
    data.language = "bn";
  }
  if (resolveEntityName(entityName) === "source-text") {
    data.title = "Example Source Text";
    data.language = "bn";
    data.source_book_slug = "example-book";
    data.work_slug = "example-work";
  }
  if (resolveEntityName(entityName) === "story-collection") {
    data.title = "Example Collection";
    data.stories = ["example-story"];
  }

  return serializeDocument(data, definition.requiresBody ? "Example body text." : "");
}

export function getDoctorReport(context) {
  const validation = validateContext(context, "all");
  return {
    rootDir: context.rootDir,
    counts: {
      stories: context.stories.length,
      topics: context.topics.length,
      topicRelations: context.topicRelations.length,
      resources: context.resources.length,
      books: context.books.length,
      sourceTexts: context.sourceTexts.length,
      storyCollections: context.storyCollections.length,
    },
    issues: validation,
  };
}

export function buildStoryInspect(context, storyEntry) {
  const resolved = getResolvedStory(context, storyEntry);
  return {
    ...summarizeEntry(storyEntry, context),
    metadata: resolved?.metadata || null,
    links: resolved?.links || null,
    body: storyEntry.body,
  };
}

export function buildGenericInspect(context, entry) {
  const summary = summarizeEntry(entry, context);
  return {
    ...summary,
    data: entry.data,
    body: entry.body,
  };
}

export function cliPath(rootDir = getRepoRoot()) {
  return pathToFileURL(path.join(rootDir, "tools", "content-cli", "cli.mjs")).href;
}

function isStoryMetadataField(fieldName) {
  return STORY_METADATA_FIELDS.has(fieldName);
}

function stripStoryMetadataFields(data) {
  const next = { ...data };
  for (const fieldName of STORY_METADATA_FIELDS) {
    delete next[fieldName];
  }
  return next;
}

function extractStoryMetadataData(data) {
  const metadata = {};
  for (const fieldName of STORY_METADATA_FIELDS) {
    if (data[fieldName] !== undefined) {
      metadata[fieldName] = data[fieldName];
    }
  }
  return ensureDefaults("story-metadata", metadata);
}

function applyAssignments(target, assignments, mode) {
  for (const assignment of assignments) {
    if (mode === "set") {
      target[assignment.key] = assignment.value;
      continue;
    }
    if (mode === "add") {
      const current = Array.isArray(target[assignment.key]) ? [...target[assignment.key]] : [];
      const values = arrayify(assignment.value).map((value) => String(value));
      target[assignment.key] = uniqueValues([...current, ...values]);
      continue;
    }
    if (mode === "remove") {
      const current = Array.isArray(target[assignment.key]) ? [...target[assignment.key]] : [];
      const valuesToRemove = new Set(arrayify(assignment.value).map((value) => String(value)));
      target[assignment.key] = current.filter((value) => !valuesToRemove.has(String(value)));
    }
  }
}

function assertRequiredFields(entityName, data) {
  const definition = getEntityDefinition(entityName);
  for (const field of definition.fields) {
    if (!field.required) continue;
    const value = data[field.name];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      throw new Error(`Missing required field "${field.name}" for ${resolveEntityName(entityName)}`);
    }
  }
}
