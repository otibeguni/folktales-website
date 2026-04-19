import { getCollection, render, type CollectionEntry } from "astro:content";

export const BOOK_CATEGORY_LABELS: Record<string, string> = {
  puthi: "Puthi",
  "bengali-folklore": "Bengali Folklore",
  "sylheti-nagri-script": "Sylheti Nagri Script",
  "indigenous-folklore": "Indigenous Folklore",
  "bengali-legend": "Bengali Legend",
  "bengali-non-fiction": "Bengali Non-fiction",
  "bengali-religious-text": "Bengali Religious Text",
  "academic-publication": "Academic Publication",
};

export type StoryEntry = CollectionEntry<"stories">;
export type TopicEntry = CollectionEntry<"topics">;
export type BookEntry = CollectionEntry<"books">;
export type ResourceEntry = CollectionEntry<"resources">;
export type StoryCollectionEntry = CollectionEntry<"storyCollections">;
export type CodexEntry = CollectionEntry<"codex">;
type BookLinkFields = {
  slug: string;
  library_url?: string;
  url?: string;
};

export function getBookAvailability(
  book: Pick<BookEntry, "slug" | "data"> | BookLinkFields,
) {
  const libraryUrl = "data" in book ? book.data.library_url : book.library_url;
  const sourceUrl = "data" in book ? book.data.url : book.url;

  if (libraryUrl) return "read-online";
  if (sourceUrl) return "purchase";
  return undefined;
}

export function getStoryRouteSlug(story: StoryEntry) {
  return story.data.url_slug ?? story.slug.split("/").pop() ?? story.slug;
}

export async function getAllStories() {
  return getCollection("stories");
}

export async function getStoriesByLanguage(language: string) {
  return getCollection("stories", ({ data }) => data.language === language);
}

export async function getAllTopics() {
  return getCollection("topics");
}

export async function getAllBooks() {
  return getCollection("books");
}

export async function getAllResources() {
  return getCollection("resources");
}

export async function getAllCodexEntries() {
  return getCollection("codex");
}

export async function getAllStoryCollections() {
  return getCollection("storyCollections");
}

export function indexEntriesBySlug<
  T extends { slug: string },
>(entries: T[]) {
  return new Map(entries.map((entry) => [entry.slug, entry]));
}

export function findStoryBySlugAndLanguage(
  stories: StoryEntry[],
  slug: string,
  language: string,
) {
  return stories.find(
    (story) => getStoryRouteSlug(story) === slug && story.data.language === language,
  );
}

export function findStoryTranslation(
  stories: StoryEntry[],
  slug: string,
  targetLanguage: string,
) {
  return stories.find(
    (story) =>
      getStoryRouteSlug(story) === slug && story.data.language === targetLanguage,
  );
}

export function getBookCategoryLabel(category?: string) {
  if (!category) return "";
  return BOOK_CATEGORY_LABELS[category] ?? category;
}

export function bookHasDetailPage(
  book: Pick<BookEntry, "slug" | "data"> | BookLinkFields,
) {
  return Boolean(getBookAvailability(book));
}

export function getBookDetailPath(slug: string) {
  return `/books/${slug}`;
}

export async function renderEntry(entry: StoryEntry | StoryCollectionEntry | CodexEntry) {
  return render(entry);
}

export function storyBasePath(language: string) {
  return language === "bn" ? "/bn/stories" : "/stories";
}
