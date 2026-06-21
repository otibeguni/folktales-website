import { defineCollection, z } from "astro:content";
import { TOPIC_RELATION_TYPES } from "./utils/topic-relations.mjs";

const topicTypes = [
  "Deity",
  "Person",
  "People",
  "Place",
  "Site",
  "Kingdom",
  "Being",
  "Work",
  "Religion",
  "Event",
  "Sacred",
  "Historical",
  "Legendary",
  "Mythic",
  "Natural",
  "Literary",
] as const;

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
    topic_slugs: z.array(z.string()).default([]),
    resource_slugs: z.array(z.string()).default([]),
  }),
});

const codex = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    language: z.string(),
    date: z.union([z.string(), z.date()]).optional(),
  }),
});

const topics = defineCollection({
  schema: z.object({
    item: z.string(),
    item_bn: z.string().optional(),
    wikidata_id: z.string().optional(),
    types: z.array(z.enum(topicTypes)).min(1),
    description: z.string().nullable().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
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

const bookFullTexts = defineCollection({
  schema: z.object({
    book_slug: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    language: z.enum(["bn"]),
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

export const collections = {
  stories,
  storyMetadata,
  codex,
  topics,
  topicRelations,
  books,
  bookFullTexts,
  resources,
  storyCollections,
};
