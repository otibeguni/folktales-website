export function buildTopicNeighborhoodGraphData({
  topics,
  topicRelations,
  rootTopicSlug,
  maxDepth = 3,
  topicRelationLabels,
}) {
  const rootNodeId = `topic:${rootTopicSlug}`;
  const topicsBySlug = new Map(topics.map((topic) => [topic.slug, topic]));

  if (!topicsBySlug.has(rootTopicSlug)) {
    return { rootNodeId, nodes: [], edges: [] };
  }

  const safeMaxDepth = Math.max(0, Math.floor(maxDepth));
  const validRelations = topicRelations.filter((relation) => {
    return (
      topicsBySlug.has(relation.data.source_topic_slug) &&
      topicsBySlug.has(relation.data.target_topic_slug)
    );
  });
  const outboundTopicSlugs = new Map();
  const inboundTopicSlugs = new Map();

  for (const relation of validRelations) {
    const { source_topic_slug: source, target_topic_slug: target } = relation.data;

    if (!outboundTopicSlugs.has(source)) outboundTopicSlugs.set(source, new Set());
    if (!inboundTopicSlugs.has(target)) inboundTopicSlugs.set(target, new Set());

    outboundTopicSlugs.get(source).add(target);
    inboundTopicSlugs.get(target).add(source);
  }

  const depthByTopicSlug = new Map([[rootTopicSlug, 0]]);
  let frontier = [rootTopicSlug];

  for (let depth = 1; depth <= safeMaxDepth && frontier.length > 0; depth += 1) {
    const nextFrontier = [];

    for (const topicSlug of frontier) {
      const neighbors = new Set(outboundTopicSlugs.get(topicSlug) ?? []);

      if (depth <= Math.min(safeMaxDepth, 2)) {
        for (const inboundTopicSlug of inboundTopicSlugs.get(topicSlug) ?? []) {
          neighbors.add(inboundTopicSlug);
        }
      }

      for (const neighborSlug of neighbors) {
        if (depthByTopicSlug.has(neighborSlug)) continue;

        depthByTopicSlug.set(neighborSlug, depth);
        nextFrontier.push(neighborSlug);
      }
    }

    frontier = nextFrontier;
  }

  const nodes = Array.from(depthByTopicSlug.entries())
    .map(([topicSlug, depth]) => {
      const topic = topicsBySlug.get(topicSlug);

      return {
        id: `topic:${topicSlug}`,
        slug: topicSlug,
        label: topic.data.item,
        href: `/topics/${topicSlug}`,
        types: topic.data.types ?? [],
        depth,
        isRoot: topicSlug === rootTopicSlug,
      };
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;
      return left.label.localeCompare(right.label);
    });

  const edges = validRelations
    .filter((relation) => {
      return (
        depthByTopicSlug.has(relation.data.source_topic_slug) &&
        depthByTopicSlug.has(relation.data.target_topic_slug)
      );
    })
    .map((relation) => ({
      id: `topic_relation:${relation.slug}`,
      source: `topic:${relation.data.source_topic_slug}`,
      target: `topic:${relation.data.target_topic_slug}`,
      relationType: relation.data.type,
      label: topicRelationLabels[relation.data.type]?.forward ?? relation.data.type,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return { rootNodeId, nodes, edges };
}
