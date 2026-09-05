import assert from "node:assert/strict";
import test from "node:test";

import { buildTopicNeighborhoodGraphData } from "./topic-neighborhood-graph.mjs";

const labels = {
  located_in: { forward: "Located in" },
  related_to: { forward: "Related to" },
};

const makeTopic = (slug, item = slug) => ({
  slug,
  data: { item, types: ["Person"] },
});

const makeRelation = (slug, source, target, type = "related_to") => ({
  slug,
  data: {
    source_topic_slug: source,
    target_topic_slug: target,
    type,
  },
});

test("topic neighborhood includes direct inbound relations and follows outbound relations to the requested depth", () => {
  const graph = buildTopicNeighborhoodGraphData({
    topics: ["root", "one", "two", "three", "four"].map((slug) => makeTopic(slug)),
    topicRelations: [
      makeRelation("one-root", "one", "root"),
      makeRelation("one-two", "one", "two"),
      makeRelation("two-three", "two", "three"),
      makeRelation("three-four", "three", "four"),
    ],
    rootTopicSlug: "root",
    maxDepth: 3,
    topicRelationLabels: labels,
  });

  assert.deepEqual(
    graph.nodes.map((node) => [node.slug, node.depth]),
    [
      ["root", 0],
      ["one", 1],
      ["two", 2],
      ["three", 3],
    ],
  );
  assert.equal(graph.edges.length, 3);
  assert.equal(graph.edges[0].source, "topic:one");
  assert.equal(graph.edges[0].target, "topic:root");
});

test("topic neighborhood does not expand inbound branches into the third layer", () => {
  const graph = buildTopicNeighborhoodGraphData({
    topics: ["root", "one", "incoming", "outbound", "hidden"].map((slug) =>
      makeTopic(slug),
    ),
    topicRelations: [
      makeRelation("root-one", "root", "one"),
      makeRelation("incoming-one", "incoming", "one"),
      makeRelation("incoming-outbound", "incoming", "outbound"),
      makeRelation("hidden-incoming", "hidden", "incoming"),
    ],
    rootTopicSlug: "root",
    maxDepth: 3,
    topicRelationLabels: labels,
  });

  assert.deepEqual(graph.nodes.map((node) => node.slug), [
    "root",
    "one",
    "incoming",
    "outbound",
  ]);
  assert.equal(graph.nodes.some((node) => node.slug === "hidden"), false);
});

test("topic neighborhood handles cycles and includes induced cross-links", () => {
  const graph = buildTopicNeighborhoodGraphData({
    topics: ["root", "alpha", "beta"].map((slug) => makeTopic(slug)),
    topicRelations: [
      makeRelation("root-alpha", "root", "alpha"),
      makeRelation("root-beta", "root", "beta"),
      makeRelation("alpha-beta", "alpha", "beta", "located_in"),
      makeRelation("beta-root", "beta", "root"),
    ],
    rootTopicSlug: "root",
    maxDepth: 1,
    topicRelationLabels: labels,
  });

  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 4);
  assert.equal(
    graph.edges.find((edge) => edge.id === "topic_relation:alpha-beta")?.label,
    "Located in",
  );
  assert.equal(graph.nodes.filter((node) => node.isRoot).length, 1);
});

test("topic neighborhood skips dangling references and sorts output deterministically", () => {
  const graph = buildTopicNeighborhoodGraphData({
    topics: [makeTopic("zulu", "Zulu"), makeTopic("alpha", "Alpha")],
    topicRelations: [
      makeRelation("zulu-missing", "zulu", "missing"),
      makeRelation("zulu-alpha", "zulu", "alpha"),
    ],
    rootTopicSlug: "zulu",
    maxDepth: 3,
    topicRelationLabels: labels,
  });

  assert.deepEqual(graph.nodes.map((node) => node.slug), ["zulu", "alpha"]);
  assert.deepEqual(graph.edges.map((edge) => edge.id), ["topic_relation:zulu-alpha"]);
});

test("topic neighborhood returns an empty graph for a missing root", () => {
  const graph = buildTopicNeighborhoodGraphData({
    topics: [makeTopic("alpha")],
    topicRelations: [],
    rootTopicSlug: "missing",
    maxDepth: 3,
    topicRelationLabels: labels,
  });

  assert.equal(graph.rootNodeId, "topic:missing");
  assert.deepEqual(graph.nodes, []);
  assert.deepEqual(graph.edges, []);
});
