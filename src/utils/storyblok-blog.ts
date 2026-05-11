type StoryblokAsset = {
  filename?: string;
  alt?: string;
  title?: string;
};

type StoryblokBlogContent = {
  title?: string;
  published_at?: string;
  summary?: string;
  cover_image?: StoryblokAsset;
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
  const title = content.title || story.name;

  return {
    id: story.uuid || String(story.id),
    slug: normalizeSlug(story.full_slug || story.slug),
    title,
    publishedAt: content.published_at || "",
    summary: content.summary || "",
    coverImage: coverSrc
      ? {
          src: coverSrc,
          alt: content.cover_alt || content.cover_image?.alt || title,
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
  blogPostsPromise ??= getStoryblokBlogPosts();
  return blogPostsPromise;
};

export const getBlogPostBySlug = async (slug: string) => {
  const normalizedSlug = normalizeSlug(slug);
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === normalizedSlug) ?? null;
};
