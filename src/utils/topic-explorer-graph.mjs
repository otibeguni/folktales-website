export function buildTopicExplorerGraphData({
  topics,
  topicRelations,
  stories,
  resources,
  books,
  getBookAvailability,
  getBookHref,
  getStoryRouteSlug,
  storyBasePath,
  topicRelationLabels,
}) {
  const nodes = [];
  const edges = [];
  const topicNodeIdsBySlug = new Map();

  for (const topic of topics) {
    const nodeId = `topic:${topic.slug}`;
    topicNodeIdsBySlug.set(topic.slug, nodeId);
    nodes.push({
      id: nodeId,
      type: "topic",
      slug: topic.slug,
      label: topic.data.item,
      href: `/topics/${topic.slug}`,
      description: topic.data.description?.trim() ?? "",
      itemBn: topic.data.item_bn,
      topicTypes: topic.data.types ?? [],
    });
  }

  const storyGroups = new Map();

  for (const story of stories) {
    const routeSlug = getStoryRouteSlug(story);

    if (!routeSlug) {
      continue;
    }

    const existingGroup = storyGroups.get(routeSlug) ?? [];
    existingGroup.push(story);
    storyGroups.set(routeSlug, existingGroup);
  }

  for (const [routeSlug, storyGroup] of storyGroups.entries()) {
    const preferredStory =
      storyGroup.find((entry) => entry.data.language === "en") ?? storyGroup[0];
    const languages = Array.from(
      new Set(storyGroup.map((entry) => entry.data.language).filter(Boolean)),
    ).sort();
    const topicSlugs = Array.from(
      new Set(storyGroup.flatMap((entry) => entry.data.topic_slugs ?? [])),
    );
    const hrefLanguage =
      preferredStory.data.language === "en"
        ? "en"
        : preferredStory.data.language;

    nodes.push({
      id: `story:${routeSlug}`,
      type: "story",
      slug: routeSlug,
      label: preferredStory.data.title,
      href: `${storyBasePath(hrefLanguage)}/${routeSlug}`,
      storyLanguages: languages,
    });

    for (const topicSlug of topicSlugs) {
      const topicNodeId = topicNodeIdsBySlug.get(topicSlug);

      if (!topicNodeId) {
        continue;
      }

      edges.push({
        id: `story_topic:${routeSlug}:${topicSlug}`,
        type: "story_topic",
        source: `story:${routeSlug}`,
        target: topicNodeId,
      });
    }
  }

  for (const resource of resources) {
    const resourceNodeId = `resource:${resource.slug}`;

    nodes.push({
      id: resourceNodeId,
      type: "resource",
      slug: resource.slug,
      label: resource.data.title,
      href: resource.data.url,
      resourceType: resource.data.type,
    });

    for (const topicSlug of resource.data.topic_slugs ?? []) {
      const topicNodeId = topicNodeIdsBySlug.get(topicSlug);

      if (!topicNodeId) {
        continue;
      }

      edges.push({
        id: `resource_topic:${resource.slug}:${topicSlug}`,
        type: "resource_topic",
        source: resourceNodeId,
        target: topicNodeId,
      });
    }
  }

  for (const book of books) {
    const bookNodeId = `book:${book.slug}`;

    nodes.push({
      id: bookNodeId,
      type: "book",
      slug: book.slug,
      label: book.data.name,
      href: getBookHref(book),
      bookLanguage: book.data.language,
      bookCategory: book.data.category,
      bookAvailability: getBookAvailability(book),
    });

    for (const topicSlug of book.data.topic_slugs ?? []) {
      const topicNodeId = topicNodeIdsBySlug.get(topicSlug);

      if (!topicNodeId) {
        continue;
      }

      edges.push({
        id: `book_topic:${book.slug}:${topicSlug}`,
        type: "book_topic",
        source: bookNodeId,
        target: topicNodeId,
      });
    }
  }

  for (const relation of topicRelations) {
    const sourceNodeId = topicNodeIdsBySlug.get(relation.data.source_topic_slug);
    const targetNodeId = topicNodeIdsBySlug.get(relation.data.target_topic_slug);

    if (!sourceNodeId || !targetNodeId) {
      continue;
    }

    edges.push({
      id: `topic_relation:${relation.slug}`,
      type: "topic_relation",
      source: sourceNodeId,
      target: targetNodeId,
      relationType: relation.data.type,
      label: topicRelationLabels[relation.data.type]?.forward ?? relation.data.type,
    });
  }

  nodes.sort((left, right) => left.label.localeCompare(right.label));
  edges.sort((left, right) => left.id.localeCompare(right.id));

  return { nodes, edges };
}
