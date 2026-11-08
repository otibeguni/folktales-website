import {
  bookHasDetailPage,
  getAllBooks,
  getAllMazarTraditions,
  getAllResources,
  getAllSourceTexts,
  getAllStoryCollections,
  getAllTopics,
  getBookCategoryLabel,
  getBookDetailPath,
  getMazarTraditionPath,
  getResolvedStories,
  getSourceTextPath,
  getStoryRouteSlug,
  storyBasePath,
} from "@/utils/content";
import { getBlogPosts } from "@/utils/storyblok-blog";
import { PUBLICATION_CATALOG } from "@/data/publications";
import type {
  HomepageCatalogItem,
  HomepageConfig,
  HomepageContentType,
  HomepageResolvedTile,
  HomepageSource,
} from "@/types/homepage";
import {
  getHomepageSourceKey,
  parseHomepageConfig,
} from "@/utils/homepage-schema.mjs";

export const HOMEPAGE_TYPE_LABELS: Record<HomepageContentType, string> = {
  story: "Story",
  book: "Book",
  sourceText: "Source text",
  topic: "Topic",
  mazarTradition: "Mazar tradition",
  resource: "Resource",
  storyCollection: "Story collection",
  publication: "Publication",
  blogPost: "Blog",
  illustration: "Illustration",
};

function normalizeDescription(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function makeCatalogItem(
  input: Omit<HomepageCatalogItem, "sourceKey" | "typeLabel" | "searchText"> & {
    searchParts?: Array<string | undefined>;
  },
): HomepageCatalogItem {
  const { searchParts = [], ...item } = input;
  return {
    ...item,
    sourceKey: getHomepageSourceKey(item.source),
    typeLabel: HOMEPAGE_TYPE_LABELS[item.type],
    searchText: [
      item.title,
      item.description,
      item.type,
      HOMEPAGE_TYPE_LABELS[item.type],
      ...searchParts,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

export async function getHomepageCatalog(): Promise<HomepageCatalogItem[]> {
  const [
    stories,
    books,
    sourceTexts,
    topics,
    mazarTraditions,
    resources,
    storyCollections,
    blogPosts,
  ] = await Promise.all([
    getResolvedStories(),
    getAllBooks(),
    getAllSourceTexts(),
    getAllTopics(),
    getAllMazarTraditions(),
    getAllResources(),
    getAllStoryCollections(),
    getBlogPosts(),
  ]);

  const booksBySlug = new Map(books.map((book) => [book.slug, book]));

  const storyItems = stories.map((story) => {
    const slug = getStoryRouteSlug(story);
    const languageLabel = story.data.language === "bn" ? "Bengali" : "English";
    return makeCatalogItem({
      type: "story",
      source: { type: "story", slug, language: story.data.language },
      title: story.data.title,
      description: `${story.data.category} story · ${languageLabel}`,
      image: story.data.cover_image,
      href: `${storyBasePath(story.data.language)}/${slug}`,
      language: story.data.language,
      searchParts: [slug, story.data.category, languageLabel],
    });
  });

  const bookItems = books.map((book) => {
    const category = getBookCategoryLabel(book.data.category);
    const description = [book.data.author && `By ${book.data.author}`, category]
      .filter(Boolean)
      .join(" · ");
    const href = bookHasDetailPage(book)
      ? getBookDetailPath(book.slug)
      : book.data.library_url || book.data.url || "/books";
    return makeCatalogItem({
      type: "book",
      source: { type: "book", slug: book.slug },
      title: book.data.name,
      description: normalizeDescription(description, "From the Otibeguni folklore library"),
      image: book.data.cover_image,
      href,
      language: book.data.language,
      isExternal: isExternalHref(href),
      searchParts: [book.slug, book.data.author, category, book.data.language],
    });
  });

  const sourceTextItems = sourceTexts.map((sourceText) => {
    const sourceBook = booksBySlug.get(sourceText.data.source_book_slug);
    return makeCatalogItem({
      type: "sourceText",
      source: { type: "sourceText", slug: sourceText.slug },
      title: sourceText.data.title,
      description: normalizeDescription(
        sourceText.data.intro_note,
        sourceBook ? `Source text from ${sourceBook.data.name}` : "Bengali source text",
      ),
      image: sourceBook?.data.cover_image,
      href: getSourceTextPath(sourceText.slug),
      language: sourceText.data.language,
      searchParts: [sourceText.slug, sourceText.data.source_book_slug],
    });
  });

  const topicItems = topics.map((topic) =>
    makeCatalogItem({
      type: "topic",
      source: { type: "topic", slug: topic.slug },
      title: topic.data.item,
      description: normalizeDescription(
        topic.data.description,
        `${topic.data.types.join(" · ")} topic`,
      ),
      href: `/topics/${topic.slug}`,
      searchParts: [topic.slug, topic.data.item_bn, ...topic.data.types],
    }),
  );

  const mazarItems = mazarTraditions.map((tradition) =>
    makeCatalogItem({
      type: "mazarTradition",
      source: { type: "mazarTradition", slug: tradition.slug },
      title: tradition.data.title,
      description: tradition.data.summary,
      href: getMazarTraditionPath(tradition.slug),
      searchParts: [tradition.slug],
    }),
  );

  const resourceItems = resources.map((resource) => {
    let domain = "External resource";
    try {
      domain = new URL(resource.data.url).hostname.replace(/^www\./, "");
    } catch {
      // The content schema already validates the URL; retain a safe fallback.
    }
    return makeCatalogItem({
      type: "resource",
      source: { type: "resource", slug: resource.slug },
      title: resource.data.title,
      description: `${resource.data.type} · ${domain}`,
      href: resource.data.url,
      isExternal: true,
      searchParts: [resource.slug, resource.data.type, domain],
    });
  });

  const collectionItems = storyCollections.map((collection) =>
    makeCatalogItem({
      type: "storyCollection",
      source: { type: "storyCollection", slug: collection.slug },
      title: collection.data.title,
      description: `${collection.data.stories.length} curated ${
        collection.data.stories.length === 1 ? "story" : "stories"
      }`,
      href: `/stories/collection/${collection.slug}`,
      searchParts: [collection.slug, ...collection.data.stories],
    }),
  );

  const publicationItems = PUBLICATION_CATALOG.map((publication) =>
    makeCatalogItem({
      type: "publication",
      source: { type: "publication", slug: publication.slug },
      title: publication.title,
      description: publication.description,
      image: publication.cover,
      href: publication.href,
      isExternal: isExternalHref(publication.href),
      searchParts: [publication.slug, publication.meta, publication.section],
    }),
  );

  const blogItems = blogPosts.map((post) =>
    makeCatalogItem({
      type: "blogPost",
      source: { type: "blogPost", slug: post.slug },
      title: post.title,
      description: normalizeDescription(
        post.summary,
        post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "From the Otibeguni blog",
      ),
      image: post.coverImage?.src,
      href: `/blog/${post.slug}`,
      searchParts: [post.slug, post.postType, post.publishedAt],
    }),
  );

  return [
    ...storyItems,
    ...bookItems,
    ...sourceTextItems,
    ...topicItems,
    ...mazarItems,
    ...resourceItems,
    ...collectionItems,
    ...publicationItems,
    ...blogItems,
  ].sort((left, right) => left.title.localeCompare(right.title));
}

function illustrationToCatalogItem(source: Extract<HomepageSource, { type: "illustration" }>) {
  const title = source.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return makeCatalogItem({
    type: "illustration",
    source,
    title: title || source.filename,
    description: "Vintage illustration from the Otibeguni archive",
    image: source.thumbnailUrl,
    href: "/vintage-illustrations",
    searchParts: [source.key, source.filename],
  });
}

export function resolveHomepageTiles(
  rawConfig: unknown,
  catalog: HomepageCatalogItem[],
): { config: HomepageConfig; tiles: HomepageResolvedTile[] } {
  const config = parseHomepageConfig(rawConfig) as HomepageConfig;
  const catalogByKey = new Map(catalog.map((item) => [item.sourceKey, item]));

  const tiles = config.tiles.map((tile) => {
    const sourceKey = getHomepageSourceKey(tile.source);
    const catalogItem =
      tile.source.type === "illustration"
        ? illustrationToCatalogItem(tile.source)
        : catalogByKey.get(sourceKey);

    if (!catalogItem) {
      throw new Error(
        `Homepage tile "${tile.id}" references missing content "${sourceKey}"`,
      );
    }

    return {
      ...catalogItem,
      id: tile.id,
      defaultTitle: catalogItem.title,
      defaultDescription: catalogItem.description,
      defaultImage: catalogItem.image,
      title: tile.titleOverride ?? catalogItem.title,
      description: tile.descriptionOverride ?? catalogItem.description,
      image: tile.imageOverride ?? catalogItem.image,
      titleOverride: tile.titleOverride,
      descriptionOverride: tile.descriptionOverride,
      imageOverride: tile.imageOverride,
    };
  });

  return { config, tiles };
}
