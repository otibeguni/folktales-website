import { getYouTubeEmbedUrl, getYouTubeHref, getYouTubeThumbnailUrl } from "@/utils/youtube";

type StoryblokAsset = {
  filename?: string;
  alt?: string;
  title?: string;
};

type StoryblokMultilink = {
  url?: string;
  cached_url?: string;
};

type StoryblokBlogContent = {
  title?: string;
  published_at?: string;
  summary?: string;
  cover_image?: StoryblokAsset;
  cover_video_url?: StoryblokMultilink;
  cover_alt?: string;
  body?: unknown;
  seo_title?: string;
  seo_description?: string;
};

type StoryblokStory = {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  full_slug: string;
  content: StoryblokBlogContent;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  coverMedia?:
    | {
        type: "image";
        src: string;
        alt: string;
      }
    | {
        type: "youtube";
        url: string;
        embedUrl: string;
        thumbnailSrc: string;
        alt: string;
      };
  coverImage?: {
    src: string;
    alt: string;
  };
  content?: StoryblokBlogContent;
  seoTitle?: string;
  seoDescription?: string;
};

let blogPostsPromise: Promise<BlogPost[]> | null = null;

const BLOG_PREFIX = "blog/";

const getDeliveryToken = () =>
  import.meta.env.STORYBLOK_DELIVERY_TOKEN ||
  import.meta.env.PUBLIC_STORYBLOK_TOKEN;

const normalizeSlug = (slug: string) =>
  slug.replace(/^\/+|\/+$/g, "").replace(new RegExp(`^${BLOG_PREFIX}`), "");

const mapStoryblokPost = (story: StoryblokStory): BlogPost => {
  const { content } = story;
  const coverSrc = content.cover_image?.filename;
  const coverVideoUrl = getYouTubeHref(content.cover_video_url);
  const coverVideoEmbedUrl = getYouTubeEmbedUrl(coverVideoUrl);
  const coverVideoThumbnailUrl = getYouTubeThumbnailUrl(coverVideoUrl);
  const title = content.title || story.name;
  const coverAlt = content.cover_alt || content.cover_image?.alt || title;
  const coverMedia = coverVideoEmbedUrl
    ? {
        type: "youtube" as const,
        url: coverVideoUrl,
        embedUrl: coverVideoEmbedUrl,
        thumbnailSrc: coverSrc || coverVideoThumbnailUrl,
        alt: coverAlt,
      }
    : coverSrc
      ? {
          type: "image" as const,
          src: coverSrc,
          alt: coverAlt,
        }
      : undefined;

  return {
    id: story.uuid || String(story.id),
    slug: normalizeSlug(story.full_slug || story.slug),
    title,
    publishedAt: content.published_at || "",
    summary: content.summary || "",
    coverMedia,
    coverImage: coverMedia?.type === "youtube"
      ? coverMedia.thumbnailSrc
        ? {
            src: coverMedia.thumbnailSrc,
            alt: coverAlt,
          }
        : undefined
      : coverSrc
      ? {
          src: coverSrc,
          alt: coverAlt,
        }
      : undefined,
    content,
    seoTitle: content.seo_title,
    seoDescription: content.seo_description,
  };
};

const getStoryblokBlogPosts = async (): Promise<BlogPost[]> => {
  const token = getDeliveryToken();

  if (!token) {
    throw new Error(
      "Storyblok delivery token is required to build blog pages. Set STORYBLOK_DELIVERY_TOKEN.",
    );
  }

  const params = new URLSearchParams({
    token,
    version: "published",
    starts_with: BLOG_PREFIX,
    per_page: "100",
    sort_by: "content.published_at:desc",
  });

  const response = await fetch(
    `https://api.storyblok.com/v2/cdn/stories?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Storyblok blog fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { stories?: StoryblokStory[] };

  return (data.stories ?? [])
    .filter((story) => story.content)
    .map(mapStoryblokPost)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf(),
    );
};

export const getBlogPosts = () => {
  if (import.meta.env.DEV) {
    return getStoryblokBlogPosts();
  }

  blogPostsPromise ??= getStoryblokBlogPosts();
  return blogPostsPromise;
};

export const getBlogPostBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === normalizedSlug) ?? null;
};
