import fs from "node:fs";

const BLOG_ARTICLE_COMPONENT = "blog_article";
const RELATED_POSTS_FIELD = "related_posts";
const TARGET_SLUGS = [
  "hidden-culture-of-the-munda-tribe",
  "otibeguni-indigenous-storytellers-fund-2025",
  "submissions-closed-indigenous-storytellers-fund-2025",
  "shortlist-announcement-indigenous-storytellers-fund-2025",
];

const loadEnv = (filePath = ".env") => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnv();

const requiredEnv = ["STORYBLOK_SPACE_ID", "STORYBLOK_MANAGEMENT_TOKEN", "STORYBLOK_DELIVERY_TOKEN"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const spaceId = process.env.STORYBLOK_SPACE_ID;
const managementToken = process.env.STORYBLOK_MANAGEMENT_TOKEN;
const deliveryToken = process.env.STORYBLOK_DELIVERY_TOKEN;

const managementHeaders = {
  Authorization: managementToken,
  "Content-Type": "application/json",
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fieldDefinition = {
  type: "options",
  source: "internal_stories",
  is_reference_type: true,
  use_uuid: true,
  folder_slug: "blog",
  filter_content_type: [BLOG_ARTICLE_COMPONENT],
  required: false,
  entry_appearance: "link",
  allow_advanced_search: true,
  description: "Select related blog posts from the blog folder.",
  tooltip: false,
  pos: 15,
  id: "related_posts_auto",
};

const fetchJson = async (url, options = {}, attempt = 0) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429 && attempt < 5) {
      await wait(1000 * (attempt + 1));
      return fetchJson(url, options, attempt + 1);
    }
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${response.statusText}\n${body}`);
  }

  return response.json();
};

const arraysEqual = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const hasUsableContent = (content) =>
  Boolean(content) &&
  typeof content === "object" &&
  Object.keys(content).some((key) => key !== RELATED_POSTS_FIELD);

const normalizeContentForUpdate = (content) => ({
  ...content,
  post_type: content.post_type || "article",
});

const ensureRelatedPostsField = async () => {
  const componentData = await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/components`,
    { headers: { Authorization: managementToken } },
  );
  const component = (componentData.components ?? []).find(
    (entry) => entry.name === BLOG_ARTICLE_COMPONENT,
  );

  if (!component) {
    throw new Error(`Could not find Storyblok component: ${BLOG_ARTICLE_COMPONENT}`);
  }

  const existingField = component.schema?.[RELATED_POSTS_FIELD];
  const nextSchema = { ...component.schema };
  const nextPos = Math.max(
    0,
    ...Object.values(component.schema ?? {}).map((field) =>
      typeof field?.pos === "number" ? field.pos : 0,
    ),
  ) + 1;
  const desiredField = {
    ...fieldDefinition,
    pos: existingField?.pos ?? nextPos,
    id: existingField?.id ?? fieldDefinition.id,
  };

  const currentComparable = existingField
    ? {
        type: existingField.type,
        source: existingField.source,
        is_reference_type: existingField.is_reference_type,
        use_uuid: existingField.use_uuid,
        folder_slug: existingField.folder_slug,
        filter_content_type: existingField.filter_content_type,
        required: existingField.required,
        entry_appearance: existingField.entry_appearance,
        allow_advanced_search: existingField.allow_advanced_search,
        description: existingField.description,
        tooltip: existingField.tooltip,
      }
    : null;
  const desiredComparable = {
    type: desiredField.type,
    source: desiredField.source,
    is_reference_type: desiredField.is_reference_type,
    use_uuid: desiredField.use_uuid,
    folder_slug: desiredField.folder_slug,
    filter_content_type: desiredField.filter_content_type,
    required: desiredField.required,
    entry_appearance: desiredField.entry_appearance,
    allow_advanced_search: desiredField.allow_advanced_search,
    description: desiredField.description,
    tooltip: desiredField.tooltip,
  };

  if (
    currentComparable &&
    JSON.stringify(currentComparable) === JSON.stringify(desiredComparable)
  ) {
    console.log("Storyblok component field already up to date.");
    return component;
  }

  nextSchema[RELATED_POSTS_FIELD] = desiredField;

  await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/components/${component.id}`,
    {
      method: "PUT",
      headers: managementHeaders,
      body: JSON.stringify({
        component: {
          name: component.name,
          display_name: component.display_name,
          description: component.description,
          is_root: component.is_root,
          is_nestable: component.is_nestable,
          preview_field: component.preview_field,
          preview_tmpl: component.preview_tmpl,
          real_name: component.real_name,
          component_group_uuid: component.component_group_uuid,
          color: component.color,
          icon: component.icon,
          schema: nextSchema,
        },
      }),
    },
  );

  console.log("Updated Storyblok component schema with related_posts field.");
  return { ...component, schema: nextSchema };
};

const getStoryBySlug = async (slug) => {
  const data = await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/stories?with_slug=blog/${slug}`,
    { headers: { Authorization: managementToken } },
  );
  const storySummary = (data.stories ?? [])[0];
  if (!storySummary) {
    throw new Error(`Could not find Storyblok story for slug: ${slug}`);
  }

  const storyData = await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/stories/${storySummary.id}`,
    { headers: { Authorization: managementToken } },
  );
  const story = storyData.story;
  if (!story) {
    throw new Error(`Could not load full Storyblok story for slug: ${slug}`);
  }
  return story;
};

const getLatestRestorableContent = async (storyId) => {
  const data = await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/story_versions?by_story_id=${storyId}&per_page=25&show_content=1`,
    { headers: { Authorization: managementToken } },
  );

  const version = (data.story_versions ?? []).find((entry) => hasUsableContent(entry.content));
  return version?.content ?? null;
};

const updateStoryRelatedPosts = async (story, relatedIds) => {
  const baseContent = hasUsableContent(story.content)
    ? story.content
    : await getLatestRestorableContent(story.id);
  if (!baseContent) {
    throw new Error(`Could not find restorable content for ${story.full_slug}`);
  }

  const normalizedBaseContent = normalizeContentForUpdate(baseContent);
  const currentIds = Array.isArray(normalizedBaseContent?.[RELATED_POSTS_FIELD])
    ? normalizedBaseContent[RELATED_POSTS_FIELD].filter((value) => typeof value === "string")
    : [];
  const normalizedCurrent = [...currentIds].sort();
  const normalizedTarget = [...relatedIds].sort();

  if (arraysEqual(normalizedCurrent, normalizedTarget)) {
    console.log(`Story already up to date: ${story.full_slug}`);
    return story;
  }

  const updated = await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/stories/${story.id}`,
    {
      method: "PUT",
      headers: managementHeaders,
      body: JSON.stringify({
        story: {
          name: story.name,
          slug: story.slug,
          parent_id: story.parent_id,
          is_startpage: story.is_startpage,
          content: {
            ...normalizedBaseContent,
            [RELATED_POSTS_FIELD]: normalizedTarget,
          },
        },
      }),
    },
  );

  await fetchJson(
    `https://mapi.storyblok.com/v1/spaces/${spaceId}/stories/${story.id}/publish`,
    { headers: { Authorization: managementToken } },
  );

  console.log(`Updated and published: ${story.full_slug}`);
  return updated.story ?? story;
};

const verifyPublishedStory = async (slug, expectedIds) => {
  const params = new URLSearchParams({
    token: deliveryToken,
    version: "published",
  });
  const data = await fetchJson(
    `https://api.storyblok.com/v2/cdn/stories/blog/${slug}?${params.toString()}`,
  );
  const publishedIds = Array.isArray(data.story?.content?.[RELATED_POSTS_FIELD])
    ? data.story.content[RELATED_POSTS_FIELD].filter((value) => typeof value === "string").sort()
    : [];
  const normalizedExpected = [...expectedIds].sort();

  if (!arraysEqual(publishedIds, normalizedExpected)) {
    throw new Error(
      `Published verification failed for ${slug}. Expected ${JSON.stringify(normalizedExpected)}, received ${JSON.stringify(publishedIds)}`,
    );
  }

  console.log(`Verified published related posts: blog/${slug}`);
};

const main = async () => {
  await ensureRelatedPostsField();

  const stories = [];
  for (const slug of TARGET_SLUGS) {
    stories.push(await getStoryBySlug(slug));
  }
  const bySlug = new Map(stories.map((story) => [story.slug, story]));

  for (const slug of TARGET_SLUGS) {
    const story = bySlug.get(slug);
    const relatedIds = TARGET_SLUGS
      .filter((candidate) => candidate !== slug)
      .map((candidate) => {
        const relatedStory = bySlug.get(candidate);
        if (!relatedStory?.uuid) {
          throw new Error(`Missing UUID for related story: ${candidate}`);
        }
        return relatedStory.uuid;
      });

    await updateStoryRelatedPosts(story, relatedIds);
    await verifyPublishedStory(slug, relatedIds);
  }
};

await main();
