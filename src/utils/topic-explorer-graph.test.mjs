import assert from "node:assert/strict";
import test from "node:test";

import { buildTopicExplorerGraphData } from "./topic-explorer-graph.mjs";

const makeTopic = (slug, item, types, extra = {}) => ({
  slug,
  data: {
    item,
    types,
    description: extra.description,
    item_bn: extra.item_bn,
  },
});

const makeStory = (slug, title, language, topicSlugs) => ({
  slug: `${language}/${slug}`,
  data: {
    title,
    language,
    url_slug: slug,
    topic_slugs: topicSlugs,
  },
});

const makeResource = (slug, title, type, topicSlugs) => ({
  slug,
  data: {
    title,
    type,
    url: `https://example.com/${slug}`,
    topic_slugs: topicSlugs,
  },
});

const makeBook = (slug, name, topicSlugs, extra = {}) => ({
  slug,
  data: {
    name,
    topic_slugs: topicSlugs,
    language: extra.language ?? "bn",
    category: extra.category,
    library_url: extra.library_url,
    url: extra.url,
  },
});

const makeRelation = (slug, sourceTopicSlug, targetTopicSlug, type) => ({
  slug,
  data: {
    source_topic_slug: sourceTopicSlug,
    target_topic_slug: targetTopicSlug,
    type,
  },
});

test("topic explorer graph emits topic relation and content link edges", () => {
  const graph = buildTopicExplorerGraphData({
    topics: [
      makeTopic("forest-topic", "Forest", ["Place"]),
      makeTopic("river-topic", "River", ["Natural"]),
    ],
    topicRelations: [
      makeRelation(
        "located_in--forest-topic--river-topic",
        "forest-topic",
        "river-topic",
        "located_in",
      ),
    ],
    stories: [makeStory("forest-story", "Forest Story", "en", ["forest-topic"])],
    resources: [makeResource("forest-map", "Forest Map", "Map", ["forest-topic"])],
    books: [
      makeBook("forest-book", "Forest Book", ["forest-topic"], {
        category: "Folklore",
        library_url: "https://example.com/forest-book.pdf",
      }),
    ],
    getBookAvailability: (book) => (book.data.library_url ? "read-online" : undefined),
    getBookHref: (book) => book.data.library_url,
    getStoryRouteSlug: (story) => story.data.url_slug,
    storyBasePath: (language) => (language === "bn" ? "/bn/stories" : "/stories"),
    topicRelationLabels: {
      located_in: { forward: "Located in" },
      part_of_tradition: { forward: "Part of tradition" },
      about: { forward: "About" },
    },
  });

  assert.equal(graph.nodes.length, 5);
  assert.equal(graph.edges.length, 4);
  assert.ok(graph.edges.some((edge) => edge.type === "topic_relation"));
  assert.ok(graph.edges.some((edge) => edge.type === "story_topic"));
  assert.ok(graph.edges.some((edge) => edge.type === "resource_topic"));
  assert.ok(graph.edges.some((edge) => edge.type === "book_topic"));
});

test("topic explorer graph collapses story translations by canonical slug", () => {
  const graph = buildTopicExplorerGraphData({
    topics: [makeTopic("forest-topic", "Forest", ["Place"])],
    topicRelations: [],
    stories: [
      makeStory("forest-story", "Forest Story", "en", ["forest-topic"]),
      makeStory("forest-story", "অরণ্যের গল্প", "bn", ["forest-topic"]),
    ],
    resources: [],
    books: [],
    getBookAvailability: () => undefined,
    getBookHref: () => undefined,
    getStoryRouteSlug: (story) => story.data.url_slug,
    storyBasePath: (language) => (language === "bn" ? "/bn/stories" : "/stories"),
    topicRelationLabels: {
      located_in: { forward: "Located in" },
      part_of_tradition: { forward: "Part of tradition" },
      about: { forward: "About" },
    },
  });

  const storyNodes = graph.nodes.filter((node) => node.type === "story");

  assert.equal(storyNodes.length, 1);
  assert.equal(storyNodes[0].label, "Forest Story");
  assert.deepEqual(storyNodes[0].storyLanguages, ["bn", "en"]);
  assert.equal(
    graph.edges.filter((edge) => edge.type === "story_topic").length,
    1,
  );
});

test("topic explorer graph populates filter metadata and skips dangling topic references", () => {
  const graph = buildTopicExplorerGraphData({
    topics: [
      makeTopic("forest-topic", "Forest", ["Place"], {
        description: "Sacred forest.",
        item_bn: "বন",
      }),
    ],
    topicRelations: [
      makeRelation(
        "about--forest-topic--missing-topic",
        "forest-topic",
        "missing-topic",
        "about",
      ),
    ],
    stories: [makeStory("forest-story", "Forest Story", "en", ["missing-topic"])],
    resources: [makeResource("forest-video", "Forest Video", "Video", ["forest-topic"])],
    books: [
      makeBook("forest-book", "Forest Book", ["forest-topic", "missing-topic"], {
        language: "en",
        category: "Legend",
        url: "https://example.com/forest-book",
      }),
    ],
    getBookAvailability: (book) => (book.data.url ? "purchase" : undefined),
    getBookHref: (book) => book.data.url,
    getStoryRouteSlug: (story) => story.data.url_slug,
    storyBasePath: (language) => (language === "bn" ? "/bn/stories" : "/stories"),
    topicRelationLabels: {
      located_in: { forward: "Located in" },
      part_of_tradition: { forward: "Part of tradition" },
      about: { forward: "About" },
    },
  });

  const topicNode = graph.nodes.find((node) => node.id === "topic:forest-topic");
  const bookNode = graph.nodes.find((node) => node.id === "book:forest-book");
  const resourceNode = graph.nodes.find((node) => node.id === "resource:forest-video");

  assert.equal(topicNode?.itemBn, "বন");
  assert.equal(topicNode?.description, "Sacred forest.");
  assert.deepEqual(topicNode?.topicTypes, ["Place"]);
  assert.equal(bookNode?.bookLanguage, "en");
  assert.equal(bookNode?.bookCategory, "Legend");
  assert.equal(bookNode?.bookAvailability, "purchase");
  assert.equal(resourceNode?.resourceType, "Video");
  assert.equal(
    graph.edges.some((edge) => edge.target === "topic:missing-topic"),
    false,
  );
});
