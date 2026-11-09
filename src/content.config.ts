import { defineCollection, z } from "astro:content";
import { TOPIC_RELATION_TYPES } from "./utils/topic-relations.mjs";
import { SUPERNATURAL_BEING_KINDS, TOPIC_CATEGORIES, validateTopicClassification } from "./utils/topic-taxonomy.mjs";

const stories = defineCollection({
  schema: z.object({
    title: z.string(),
    title_bn: z.string().optional(),
    url_slug: z.string().optional(),
    language: z.enum(["en", "bn"]),
  }),
});

const storyMetadata = defineCollection({
  schema: z.object({
    category: z.string(),
    cover_image: z.string().url().optional(),
    source_slug: z.string().optional(),
    source_label: z.string().optional(),
    source_text_slug: z.string().optional(),
    topic_slugs: z.array(z.string()).default([]),
    resource_slugs: z.array(z.string()).default([]),
  }),
});

const topics = defineCollection({
  schema: z.object({
    item: z.string(),
    item_bn: z.string().optional(),
    wikidata_id: z.string().optional(),
    category: z.enum(TOPIC_CATEGORIES),
    types: z.never().optional(),
    subtype: z.string().optional(),
    being_kind: z.enum(SUPERNATURAL_BEING_KINDS).optional(),
    description: z.string().nullable().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).superRefine((topic, context) => {
    const message = validateTopicClassification(topic);
    if (message) context.addIssue({ code: "custom", message });
  }),
});

const books = defineCollection({
  schema: z.object({
    name: z.string(),
    author: z.string().optional(),
    url: z.string().url().optional(),
    library_url: z.string().url().optional(),
    cover_image: z.string().optional(),
    series_slug: z.string().optional(),
    series_title: z.string().optional(),
    language: z.string(),
    category: z.string().optional(),
    categories: z.array(z.string()).default([]),
    topic_slugs: z.array(z.string()).default([]),
  }),
});

const topicRelations = defineCollection({
  schema: z.object({
    source_topic_slug: z.string(),
    target_topic_slug: z.string(),
    type: z.enum(TOPIC_RELATION_TYPES),
  }),
});

const sourceTexts = defineCollection({
  schema: z.object({
    title: z.string(),
    language: z.enum(["bn"]),
    source_book_slug: z.string(),
    work_slug: z.string(),
    story_slug: z.string().optional(),
    order: z.number().optional(),
    intro_note: z.string().optional(),
  }),
});

const resources = defineCollection({
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    type: z.string(),
    topic_slugs: z.array(z.string()).default([]),
  }),
});

const storyCollections = defineCollection({
  schema: z.object({
    title: z.string(),
    stories: z.array(z.string()).default([]),
  }),
});

const mazarTraditions = defineCollection({
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    topic_slugs: z.array(z.string()).default([]),
    resource_slugs: z.array(z.string()).default([]),
  }),
});

export const collections = {
  stories,
  storyMetadata,
  topics,
  topicRelations,
  books,
  sourceTexts,
  resources,
  storyCollections,
  mazarTraditions,
};
