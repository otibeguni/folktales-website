import { isSymmetricTopicRelation, TOPIC_RELATION_LABELS } from './topic-relations.mjs';
import { getTopicCategory, isPlaceCategory, SUPERNATURAL_BEING_KIND_LABELS } from './topic-taxonomy.mjs';

/** @typedef {import('./content').TopicNeighborhoodNode} TopicNode */
/** @typedef {import('./content').TopicNeighborhoodEdge} TopicEdge */
/** @typedef {{ edge: TopicEdge, node: TopicNode }} TourRelation */
/** @typedef {{ prefix?: string, connector: string, neighborsFirst?: boolean }} TourSentence */
/** @typedef {{ id: string, kind: 'intro', label: string, relations: TourRelation[], duration: number } | { id: string, kind: 'relationship', label: string, heading?: string, sentence: TourSentence, relations: TourRelation[], duration: number }} TourStep */

const RELATED_SENTENCE = { prefix: 'Explore connections linking ', connector: ' to ' };

/** @type {Record<string, { outbound: TourSentence, inbound: TourSentence }>} */
const SENTENCES = {
  located_in: {
    outbound: { prefix: 'Find ', connector: ' in ' },
    inbound: { prefix: 'Find ', connector: ' in ', neighborsFirst: true },
  },
  part_of_tradition: {
    outbound: { prefix: 'The collection associates ', connector: ' with ' },
    inbound: { prefix: 'The collection associates ', connector: ' with ', neighborsFirst: true },
  },
  member_of: {
    outbound: { connector: ' is a member of ' },
    inbound: { connector: ' is a member of the group ', neighborsFirst: true },
  },
  about: {
    outbound: { prefix: 'Read about ', connector: ' in ', neighborsFirst: true },
    inbound: { prefix: 'Read about ', connector: ' in ' },
  },
  commemorates: {
    outbound: { connector: ' commemorates ' },
    inbound: { connector: ' is commemorated at ' },
  },
  related_to: { outbound: RELATED_SENTENCE, inbound: RELATED_SENTENCE },
};

/** @type {Partial<Record<string, [string, string]>>} */
const TRADITION_CONNECTORS = {
  Deity: [' is a deity in ', ' are deities in '],
  Person: [' is a significant figure in ', ' are significant figures in '],
  Group: [' are a group associated with ', ' are groups associated with '],
  Landscape: [' is a natural feature associated with ', ' are natural features associated with '],
  Settlement: [' is a settlement associated with ', ' are settlements associated with '],
  Region: [' is a region associated with ', ' are regions associated with '],
  Polity: [' is a historical polity associated with ', ' are historical polities associated with '],
  Site: [' is a site associated with ', ' are sites associated with '],
  Realm: [' is a mythical place associated with ', ' are mythical places associated with '],
  Tradition: [' is part of the tradition of ', ' are part of the tradition of '],
  Scripture: [' is a sacred text in ', ' are sacred texts in '],
  'Named supernatural being': [' is a supernatural being in ', ' are supernatural beings in '],
  'Class of supernatural beings': [' are a class of supernatural beings in ', ' are classes of supernatural beings in '],
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

  /** @type {Map<string, { label: string, showHeading: boolean, sentence: TourSentence, pluralConnector?: string, relations: TourRelation[] }>} */
  const groups = new Map();
  const visibleIds = new Set([root.id]);
  for (const edge of graph.edges) {
    if (edge.source !== root.id && edge.target !== root.id) continue;
    const outbound = edge.source === root.id;
    const node = nodesById.get(outbound ? edge.target : edge.source);
    if (!node) continue;
    visibleIds.add(node.id);
    const direction = outbound ? 'outbound' : 'inbound';
    const symmetric = isSymmetricTopicRelation(edge.relationType);
    const isTraditionLink = edge.relationType === 'part_of_tradition';
    const groupByCategory = symmetric || isTraditionLink;
    const category = node.beingKind
      ? SUPERNATURAL_BEING_KIND_LABELS[node.beingKind]
      : getTopicCategory(node) ?? 'Other topics';
    const slideCategory = isTraditionLink && !outbound && node.subtype === 'Scripture'
      ? 'Scripture'
      : groupByCategory ? category : undefined;
    const key = `${edge.relationType}:${symmetric ? 'symmetric' : direction}:${slideCategory ?? ''}`;
    if (!groups.has(key)) {
      const target = outbound ? node : root;
      const isGroupAssociation = isTraditionLink &&
        getTopicCategory(target) === 'Group';
      const label = isGroupAssociation
        ? (outbound ? 'Associated group' : 'Associated with this group')
        : TOPIC_RELATION_LABELS[edge.relationType]?.[outbound ? 'forward' : 'reverse'] ?? edge.label;
      let sentence = SENTENCES[edge.relationType]?.[direction] ?? RELATED_SENTENCE;
      let pluralConnector = edge.relationType === 'member_of' && !outbound
        ? ' are members of the group '
        : undefined;
      const rootCategory = getTopicCategory(root);
      if (symmetric && rootCategory === 'Group' && isPlaceCategory(category)) {
        sentence = { prefix: 'The group ', connector: ' is associated with ' };
      } else if (symmetric && isPlaceCategory(rootCategory) && category === 'Group') {
        sentence = { connector: ' is associated with ' };
      } else if (isGroupAssociation) {
        sentence = { prefix: 'Explore connections linking the group ', connector: ' to ', neighborsFirst: outbound };
      } else if (isTraditionLink) {
        const subject = outbound ? root : node;
        const subjectCategory = getTopicCategory(subject);
        const connectorCategory = subject.beingKind
          ? SUPERNATURAL_BEING_KIND_LABELS[subject.beingKind]
          : subject.subtype === 'Scripture' ? 'Scripture' : subjectCategory;
        const connectors = TRADITION_CONNECTORS[connectorCategory ?? ''];
        if (connectors) {
          sentence = {
            prefix: subjectCategory === 'Group' ? 'The ' : undefined,
            connector: connectors[0],
            neighborsFirst: !outbound,
          };
          pluralConnector = connectors[1];
        } else if (subjectCategory === 'Work') {
          sentence = { prefix: 'Works associated with ', connector: ' include ', neighborsFirst: outbound };
        } else if (subjectCategory === 'Supernatural being') {
          sentence = { prefix: 'Supernatural beings in ', connector: ' include ', neighborsFirst: outbound };
        }
      }
      groups.set(key, {
        label: slideCategory ? `${label} · ${slideCategory}` : label,
        showHeading: symmetric,
        sentence,
        pluralConnector,
        relations: [],
      });
    }
    groups.get(key).relations.push({ edge, node });
  }

  steps.push({ id: 'intro', kind: 'intro', label: root.label, relations: [], duration: 3000 });
  for (const [key, group] of [...groups].sort((a, b) => a[1].label.localeCompare(b[1].label) || a[0].localeCompare(b[0]))) {
    group.relations.sort((a, b) => a.node.label.localeCompare(b.node.label) || a.edge.id.localeCompare(b.edge.id));
    for (let offset = 0; offset < group.relations.length; offset += 4) {
      const relations = group.relations.slice(offset, offset + 4);
      const label = group.relations.length > 4 ? `${group.label} (${offset + 1}–${offset + relations.length})` : group.label;
      const subject = group.sentence.neighborsFirst ? relations[0].node : root;
      const hasMultipleSubjects = group.sentence.neighborsFirst && relations.length > 1;
      const isVedas = !hasMultipleSubjects && subject.slug === 'vedas';
      const sentence = group.pluralConnector && (hasMultipleSubjects || isVedas)
        ? {
            ...group.sentence,
            prefix: isVedas && !/^the\s/i.test(subject.label) ? 'The ' : group.sentence.prefix,
            connector: group.pluralConnector,
          }
        : group.sentence;
      steps.push({
        id: `${key}:${offset}`,
        kind: 'relationship',
        label,
        heading: group.showHeading ? label : undefined,
        sentence,
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
  const width = Math.max(160, availableWidth);
  const fontSize = 11;
  const margin = 12;
  const gap = 22;
  const root = nodes.find((node) => node.id === rootId);
  const peers = nodes.filter((node) => node.id !== rootId);
  const rows = [];
  for (let index = 0; index < peers.length; index += 2) {
    rows.push(peers.slice(index, index + 2));
  }
  if (root) {
    if (peers.length === 1 && width >= 220) rows[0].unshift(root);
    else if (peers.length === 2 && width >= 320) rows[0].splice(1, 0, root);
    else rows.splice(Math.floor(rows.length / 2), 0, [root]);
  }

  /** @type {Map<string, string[]>} */
  const lines = new Map();
  /** @type {Map<string, { x: number, y: number, width: number, height: number }>} */
  const positions = new Map();
  let top = margin;
  for (const row of rows) {
    const nodeWidth = Math.min(156, (width - margin * 2 - gap * (row.length - 1)) / row.length);
    const limit = Math.max(4, Math.floor((nodeWidth - 14) / 6.6));
    const heights = row.map((node) => {
      const label = wrapLabel(node.label, limit);
      lines.set(node.id, label);
      return Math.max(node.id === rootId ? 40 : 34, label.length * 13 + 14);
    });
    const rowHeight = Math.max(...heights);
    const rowWidth = nodeWidth * row.length + gap * (row.length - 1);
    row.forEach((node, index) => {
      positions.set(node.id, {
        x: (width - rowWidth + nodeWidth) / 2 + index * (nodeWidth + gap),
        y: top + rowHeight / 2,
        width: nodeWidth,
        height: heights[index],
      });
    });
    top += rowHeight + gap;
  }
  const height = rows.length ? top - gap + margin : margin * 2;
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
