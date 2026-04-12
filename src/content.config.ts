import { defineCollection, z } from "astro:content";

const stories = defineCollection({
  schema: z.object({
    title: z.string(),
    title_bn: z.string().optional(),
    category: z.string(),
    language: z.enum(["en", "bn"]),
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
    type: z.string(),
    description: z.string().nullable().optional(),
  }),
});

const books = defineCollection({
  schema: z.object({
    name: z.string(),
    author: z.string().optional(),
    url: z.string().url().optional(),
    library_url: z.string().url().optional(),
    language: z.string(),
    category: z.string().optional(),
    categories: z.array(z.string()).default([]),
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
    order: z.number(),
    isShow: z.boolean(),
    stories: z.array(z.string()).default([]),
  }),
});

export const collections = {
  stories,
  codex,
  topics,
  books,
  resources,
  storyCollections,
};
