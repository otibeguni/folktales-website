import { TOPIC_RELATION_LABELS } from './topic-relations.mjs';

/** @typedef {import('./content').TopicNeighborhoodNode} TopicNode */
/** @typedef {import('./content').TopicNeighborhoodEdge} TopicEdge */
/** @typedef {{ edge: TopicEdge, node: TopicNode }} TourRelation */
/** @typedef {{ id: string, kind: 'intro' | 'relationship', label: string, verb: string, relations: TourRelation[], duration: number }} TourStep */

const VERBS = {
  located_in: { outbound: 'is located in', inbound: 'contains' },
  part_of_tradition: { outbound: 'belongs to the tradition of', inbound: 'includes' },
  about: { outbound: 'is about', inbound: 'is the subject of' },
  related_to: { outbound: 'is related to', inbound: 'is related to' },
};

/**
 * Derive a complete one-hop view, even when a caller supplies a larger graph.
 * Preserve cross-links as context; only the current sentence's edges are focused.
 * @param {import('./content').TopicNeighborhoodGraph} graph
 */
export function buildTopicRelationshipTour(graph) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const root = nodesById.get(graph.rootNodeId);
  /** @type {TourStep[]} */
  const steps = [];
  if (!root) return { root, nodes: [], edges: [], steps };

  /** @type {Map<string, { label: string, verb: string, relations: TourRelation[] }>} */
  const groups = new Map();
  const visibleIds = new Set([root.id]);
  for (const edge of graph.edges) {
    if (edge.source !== root.id && edge.target !== root.id) continue;
    const outbound = edge.source === root.id;
    const node = nodesById.get(outbound ? edge.target : edge.source);
    if (!node) continue;
    visibleIds.add(node.id);
    const direction = outbound ? 'outbound' : 'inbound';
    const key = `${edge.relationType}:${direction}`;
    if (!groups.has(key)) {
      groups.set(key, {
        label: TOPIC_RELATION_LABELS[edge.relationType]?.[outbound ? 'forward' : 'reverse'] ?? edge.label,
        verb: VERBS[edge.relationType]?.[direction] ?? 'is connected to',
        relations: [],
      });
    }
    groups.get(key).relations.push({ edge, node });
  }

  steps.push({ id: 'intro', kind: 'intro', label: root.label, verb: '', relations: [], duration: 3000 });
  for (const [key, group] of [...groups].sort((a, b) => a[1].label.localeCompare(b[1].label) || a[0].localeCompare(b[0]))) {
    group.relations.sort((a, b) => a.node.label.localeCompare(b.node.label) || a.edge.id.localeCompare(b.edge.id));
    for (let offset = 0; offset < group.relations.length; offset += 4) {
      const relations = group.relations.slice(offset, offset + 4);
      steps.push({
        id: `${key}:${offset}`,
        kind: 'relationship',
        label: group.relations.length > 4 ? `${group.label} (${offset + 1}–${offset + relations.length})` : group.label,
        verb: group.verb,
        relations,
        duration: Math.max(3500, relations.length * 1250),
      });
    }
  }

  return {
    root,
    nodes: [root, ...graph.nodes.filter((node) => node.id !== root.id && visibleIds.has(node.id)).sort((a, b) => a.label.localeCompare(b.label))],
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    steps,
  };
}

/** @param {string} text @param {number} limit */
function wrapLabel(text, limit) {
  const lines = [];
  let line = '';
  const words = text.split(/\s+/).flatMap((word) => {
    const chunks = [];
    for (let offset = 0; offset < word.length; offset += limit) chunks.push(word.slice(offset, offset + limit));
    return chunks;
  });
  for (const word of words) {
    if (line && `${line} ${word}`.length > limit) {
      lines.push(line);
      line = word;
    } else line += `${line ? ' ' : ''}${word}`;
  }
  if (line) lines.push(line);
  return lines;
}

/** @param {TopicNode[]} nodes @param {string} rootId @param {number} availableWidth */
export function layoutTopicRelationshipGraph(nodes, rootId, availableWidth) {
  const width = Math.max(200, availableWidth);
  const narrow = width < 360;
  const nodeWidth = Math.min(124, narrow ? (width - 44) / 2 : (width - 90) / 3);
  const limit = Math.max(4, Math.floor((nodeWidth - 14) / 6.6));
  const lines = new Map(nodes.map((node) => [node.id, wrapLabel(node.label, limit)]));
  // Wrap long names rather than shrinking labels into unreadable text on phones.
  const fontSize = 11;
  const nodeHeight = Math.max(60, ...[...lines.values()].map((label) => label.length * 13 + 14));
  const peers = nodes.filter((node) => node.id !== rootId);
  const half = Math.ceil(peers.length / 2);
  const rootHeight = Math.max(72, nodeHeight);
  const height = narrow
    ? Math.max(400, 20 + rootHeight + 52 + half * (nodeHeight + 24))
    : Math.max(400, half * (nodeHeight + 23) + 60);
  const positions = new Map([[rootId, { x: width / 2, y: narrow ? 20 + rootHeight / 2 : height / 2, width: nodeWidth + 10, height: rootHeight }]]);
  peers.forEach((node, index) => {
    const right = narrow ? index % 2 === 1 : index >= half;
    const row = narrow ? Math.floor(index / 2) : right ? index - half : index;
    const count = right ? peers.length - half : half;
    positions.set(node.id, {
      x: right ? width - nodeWidth / 2 - 16 : nodeWidth / 2 + 16,
      y: narrow ? 20 + rootHeight + 52 + nodeHeight / 2 + row * (nodeHeight + 24) : height * (row + 1) / (count + 1),
      width: nodeWidth,
      height: nodeHeight,
    });
  });
  return { width, height, positions, lines, fontSize };
}

/**
 * Trim directed edges at the node boundaries. Curve cross-links and parallel
 * relations so neither self-relations nor distinct edges disappear behind nodes.
 * @param {TopicEdge} edge
 * @param {ReturnType<typeof layoutTopicRelationshipGraph>} layout
 * @param {string} rootId
 * @param {number} lane
 */
export function topicRelationshipEdgePath(edge, layout, rootId, lane = 0) {
  const a = layout.positions.get(edge.source);
  const b = layout.positions.get(edge.target);
  if (!a || !b) return '';
  if (edge.source === edge.target) {
    return `M ${a.x - 20} ${a.y - a.height / 2} C ${a.x - 65} ${a.y - a.height - 40}, ${a.x + 65} ${a.y - a.height - 40}, ${a.x + 20} ${a.y - a.height / 2 - 4}`;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const trim = (node) => Math.min((node.width / 2 + 4) / Math.max(.001, Math.abs(dx)), (node.height / 2 + 4) / Math.max(.001, Math.abs(dy)));
  const start = trim(a);
  const end = trim(b);
  const ax = a.x + dx * start;
  const ay = a.y + dy * start;
  const bx = b.x - dx * end;
  const by = b.y - dy * end;
  if (lane) {
    const length = Math.hypot(dx, dy);
    return `M ${ax} ${ay} Q ${(ax + bx) / 2 - dy / length * lane} ${(ay + by) / 2 + dx / length * lane} ${bx} ${by}`;
  }
  if (edge.source !== rootId && edge.target !== rootId) {
    const curve = Math.min(a.x, b.x) < layout.width / 2 ? -38 : 38;
    return `M ${ax} ${ay} Q ${(ax + bx) / 2 + curve} ${(ay + by) / 2} ${bx} ${by}`;
  }
  return `M ${ax} ${ay} L ${bx} ${by}`;
}
