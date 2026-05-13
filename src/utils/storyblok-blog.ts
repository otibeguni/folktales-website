import { getYouTubeEmbedUrl, getYouTubeHref, getYouTubeThumbnailUrl } from "@/utils/youtube";

type StoryblokAsset = {
  filename?: string;
  alt?: string;
  title?: string;
};

type StoryblokMultilink = {
  url?: string;
  cached_url?: string;
  linktype?: string;
};

type StoryblokBlogContent = {
  title?: string;
  post_type?: string;
  published_at?: string;
  summary?: string;
  bookmark_url?: StoryblokMultilink;
  bookmark_link_text?: string;
  bookmark_commentary?: string;
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
  postType: "article" | "bookmark";
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
  bookmark?: {
    url: string;
    domain: string;
    linkText: string;
    commentary: string;
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

const getExternalHref = (link?: StoryblokMultilink) => {
  const href = link?.cached_url || link?.url || "";
  return href.trim();
};

const getBookmarkScreenshotUrl = (href: string) =>
  `https://image.thum.io/get/width/1200/noanimate/${href}`;

const getDomainFromHref = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
};

const clampSummary = (value: string, maxLength = 180) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const extractHeadline = (html: string) => {
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  if (ogTitleMatch?.[1]) {
    return decodeHtmlEntities(ogTitleMatch[1].trim());
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) {
    const plainText = h1Match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return decodeHtmlEntities(plainText);
  }

  return "";
};

const getBookmarkLinkText = async (href: string, explicitText: string) => {
  if (explicitText.trim()) {
    return explicitText.trim();
  }

  try {
    const response = await fetch(href, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return extractHeadline(html);
  } catch {
    return "";
  }
};

const mapStoryblokPost = async (story: StoryblokStory): Promise<BlogPost> => {
  const { content } = story;
  const bookmarkUrl = getExternalHref(content.bookmark_url);
  const isBookmark = content.post_type === "bookmark" && Boolean(bookmarkUrl);
  const coverSrc = content.cover_image?.filename || (isBookmark ? getBookmarkScreenshotUrl(bookmarkUrl) : undefined);
  const coverVideoUrl = getYouTubeHref(content.cover_video_url);
  const coverVideoEmbedUrl = getYouTubeEmbedUrl(coverVideoUrl);
  const coverVideoThumbnailUrl = getYouTubeThumbnailUrl(coverVideoUrl);
  const title = content.title || story.name;
  const bookmarkDomain = isBookmark ? getDomainFromHref(bookmarkUrl) : "";
  const bookmarkLinkText = isBookmark
    ? (await getBookmarkLinkText(bookmarkUrl, content.bookmark_link_text || "")) || title || bookmarkDomain
    : "";
  const bookmarkCommentary = content.bookmark_commentary?.trim() || "";
  const coverAlt = content.cover_alt ||
    content.cover_image?.alt ||
    (isBookmark ? `Screenshot of ${bookmarkDomain}` : title);
  const coverMedia = !isBookmark && coverVideoEmbedUrl
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
    postType: isBookmark ? "bookmark" : "article",
    publishedAt: content.published_at || "",
    summary: content.summary || clampSummary(bookmarkCommentary),
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
    bookmark: isBookmark
      ? {
          url: bookmarkUrl,
          domain: bookmarkDomain,
          linkText: bookmarkLinkText,
          commentary: bookmarkCommentary,
        }
      : undefined,
    content,
    seoTitle: content.seo_title,
    seoDescription: content.seo_description || clampSummary(bookmarkCommentary, 155),
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

  const posts = await Promise.all(
    (data.stories ?? [])
      .filter((story) => story.content)
      .map(mapStoryblokPost),
  );

  return posts.sort(
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
