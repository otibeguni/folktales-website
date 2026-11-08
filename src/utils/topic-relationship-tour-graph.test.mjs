import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTopicRelationshipTour, layoutTopicRelationshipGraph, topicRelationshipEdgePath } from './topic-relationship-tour.mjs';

const node = (id, label = id) => ({ id, slug: id, label, href: `/topics/${id}`, types: ['Place'], depth: 0, isRoot: id === 'root' });
const edge = (id, source, target, relationType = 'related_to') => ({ id, source, target, relationType, label: relationType });
const graph = (nodes, edges) => ({ rootNodeId: 'root', nodes, edges });

test('tour includes only direct neighbors while retaining their cross-links as context', () => {
  const input = graph(['root', 'a', 'b', 'far'].map((id) => node(id)), [
    edge('root-a', 'root', 'a'), edge('b-root', 'b', 'root'),
    edge('a-b', 'a', 'b'), edge('a-far', 'a', 'far'), edge('root-missing', 'root', 'missing'),
  ]);
  const tour = buildTopicRelationshipTour(input);
  assert.deepEqual(tour.nodes.map((n) => n.id), ['root', 'a', 'b']);
  assert.deepEqual(tour.edges.map((e) => e.id), ['root-a', 'b-root', 'a-b']);
  assert.deepEqual(tour.steps.flatMap((s) => s.relations.map((r) => r.edge.id)).sort(), ['b-root', 'root-a']);
  assert.equal(tour.steps[0].kind, 'intro');
  assert.equal(tour.steps.at(-1).kind, 'relationship');
});

test('sentences preserve type and direction, including the reverse containment meaning', () => {
  const tour = buildTopicRelationshipTour(graph(['root', 'place', 'region', 'saint', 'religion', 'work', 'subject'].map((id) => node(id)), [
    edge('contains', 'place', 'root', 'located_in'), edge('location', 'root', 'region', 'located_in'),
    edge('includes', 'saint', 'root', 'part_of_tradition'), edge('tradition', 'root', 'religion', 'part_of_tradition'),
    edge('subject', 'work', 'root', 'about'), edge('about', 'root', 'subject', 'about'),
  ]));
  const verbs = new Map(tour.steps.filter((s) => s.kind === 'relationship').map((s) => [s.relations[0].edge.id, s.verb]));
  assert.deepEqual(Object.fromEntries(verbs), {
    about: 'is about', includes: 'includes', contains: 'contains', location: 'is located in',
    tradition: 'belongs to the tradition of', subject: 'is the subject of',
  });
});

test('larger groups paginate deterministically without dropping or duplicating relationships', () => {
  const peers = Array.from({ length: 11 }, (_, i) => node(`n${i}`, `Name ${String(i).padStart(2, '0')}`));
  const edges = peers.map((n) => edge(`root-${n.id}`, 'root', n.id));
  const input = graph([node('root'), ...peers.reverse()], edges.reverse());
  const tour = buildTopicRelationshipTour(input);
  assert.deepEqual(tour.steps.slice(1).map((s) => s.relations.length), [4, 4, 3]);
  assert.deepEqual(tour.steps.slice(1).flatMap((s) => s.relations.map((r) => r.node.label)), peers.map((n) => n.label).sort());
  assert.equal(new Set(tour.steps.map((s) => s.id)).size, tour.steps.length);
});

test('isolated topics keep a readable introduction and missing roots return no tour', () => {
  const isolated = buildTopicRelationshipTour(graph([node('root')], []));
  assert.equal(isolated.steps.length, 1);
  assert.equal(isolated.steps[0].kind, 'intro');
  assert.deepEqual(buildTopicRelationshipTour(graph([node('other')], [])).steps, []);
});

test('mobile layouts keep full-size wrapped labels and node boxes within the graph without overlap', () => {
  const nodes = [node('root', 'Twelve Saints of Chittagong'), ...Array.from({ length: 15 }, (_, i) => node(`n${i}`, 'Hazrat Shah Suleiman Baghdadi (Fateh Ghazi)'))];
  for (const width of [220, 240, 288, 320, 440, 600]) {
    const layout = layoutTopicRelationshipGraph(nodes, 'root', width);
    assert.equal(layout.fontSize, 11);
    const boxes = [...layout.positions.values()].map((p) => ({ left: p.x - p.width / 2, right: p.x + p.width / 2, top: p.y - p.height / 2, bottom: p.y + p.height / 2 }));
    boxes.forEach((b) => { assert(b.left >= 0); assert(b.right <= width); assert(b.top >= 0); assert(b.bottom <= layout.height); });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    }
    for (const n of nodes) {
      assert.equal(layout.lines.get(n.id).join('').replace(/\s/g, ''), n.label.replace(/\s/g, ''));
      assert(layout.lines.get(n.id).every((line) => line.length * 6.6 <= layout.positions.get(n.id).width - 12));
    }
  }
});

test('directed edge paths handle cross-links, parallel relationships, and self loops', () => {
  const layout = layoutTopicRelationshipGraph(['root', 'a', 'b'].map((id) => node(id)), 'root', 440);
  for (const e of [edge('direct', 'root', 'a'), edge('cross', 'a', 'b'), edge('self', 'root', 'root')]) {
    const path = topicRelationshipEdgePath(e, layout, 'root');
    assert(path.startsWith('M '));
    assert(!/NaN|Infinity/.test(path));
  }
  assert.notEqual(topicRelationshipEdgePath(edge('one', 'root', 'a'), layout, 'root', -16), topicRelationshipEdgePath(edge('two', 'root', 'a'), layout, 'root', 16));
});

test('tour uses the shorter reading durations without an ending overview', () => {
  const peers = ['a', 'b', 'c', 'd', 'e'].map((id) => node(id));
  const tour = buildTopicRelationshipTour(graph([node('root'), ...peers], peers.map((n) => edge(`r-${n.id}`, 'root', n.id))));
  assert.deepEqual(tour.steps.map((step) => step.duration), [3000, 5000, 3500]);
  assert.equal(tour.steps.at(-1).kind, 'relationship');
});
