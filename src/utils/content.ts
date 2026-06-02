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
export type StoryMetadataEntry = CollectionEntry<"storyMetadata">;
export type TopicEntry = CollectionEntry<"topics">;
export type BookEntry = CollectionEntry<"books">;
export type ResourceEntry = CollectionEntry<"resources">;
export type StoryCollectionEntry = CollectionEntry<"storyCollections">;
export type CodexEntry = CollectionEntry<"codex">;
export type ResolvedStoryEntry = StoryEntry & {
  data: StoryEntry["data"] & StoryMetadataEntry["data"];
};
export interface AtlasStoryLink {
  slug: string;
  title: string;
  href: string;
}

export interface AtlasResourceLink {
  slug: string;
  title: string;
  type: string;
  url: string;
}

export interface AtlasEntry {
  slug: string;
  item: string;
  description: string;
  types: TopicEntry["data"]["types"];
  latitude: number;
  longitude: number;
  relatedStories: AtlasStoryLink[];
  relatedResources: AtlasResourceLink[];
}
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

export function getStoryMetadataSlug(story: StoryEntry) {
  return getStoryRouteSlug(story);
}

export async function getAllStories() {
  return getCollection("stories");
}

export async function getStoriesByLanguage(language: string) {
  return getCollection("stories", ({ data }) => data.language === language);
}

export async function getAllStoryMetadata() {
  return getCollection("storyMetadata");
}

export function resolveStoryMetadata(
  story: StoryEntry,
  metadataBySlug: Map<string, StoryMetadataEntry>,
): ResolvedStoryEntry {
  const metadataSlug = getStoryMetadataSlug(story);
  const metadata = metadataBySlug.get(metadataSlug);

  if (!metadata) {
    throw new Error(`Missing story metadata for "${metadataSlug}"`);
  }

  return {
    ...story,
    data: {
      ...metadata.data,
      ...story.data,
    },
  };
}

export async function getResolvedStories() {
  const [stories, metadata] = await Promise.all([
    getAllStories(),
    getAllStoryMetadata(),
  ]);
  const metadataBySlug = indexEntriesBySlug(metadata);

  return stories.map((story) => resolveStoryMetadata(story, metadataBySlug));
}

export async function getAllTopics() {
  return getCollection("topics");
}

export async function getFolkloreAtlasEntries(): Promise<AtlasEntry[]> {
  const [topics, stories, resources] = await Promise.all([
    getAllTopics(),
    getResolvedStories(),
    getAllResources(),
  ]);

  return topics
    .filter((topic) => {
      return typeof topic.data.latitude === "number" && typeof topic.data.longitude === "number";
    })
    .map((topic) => {
      const relatedStories = stories
        .filter(
          (story) =>
            story.data.language === "en" && (story.data.topic_slugs ?? []).includes(topic.slug),
        )
        .map((story) => ({
          slug: getStoryRouteSlug(story),
          title: story.data.title,
          href: `${storyBasePath(story.data.language)}/${getStoryRouteSlug(story)}`,
        }));

      const relatedResources = resources
        .filter((resource) => (resource.data.topic_slugs ?? []).includes(topic.slug))
        .map((resource) => {
          if (!resource.data.url) {
            return null;
          }

          return {
            slug: resource.slug,
            title: resource.data.title,
            type: resource.data.type,
            url: resource.data.url,
          };
        })
        .filter((resource): resource is AtlasResourceLink => resource !== null);

      return {
        slug: topic.slug,
        item: topic.data.item,
        description: topic.data.description?.trim() ?? "",
        types: topic.data.types,
        latitude: topic.data.latitude,
        longitude: topic.data.longitude,
        relatedStories,
        relatedResources,
      };
    })
    .sort((left, right) => left.item.localeCompare(right.item));
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
