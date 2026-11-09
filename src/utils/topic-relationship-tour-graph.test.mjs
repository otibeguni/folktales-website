import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTopicRelationshipTour, layoutTopicRelationshipGraph, topicRelationshipEdgePath } from './topic-relationship-tour.mjs';

const node = (id, label = id) => ({ id, slug: id, label, href: `/topics/${id}`, category: 'Region', depth: 0, isRoot: id === 'root' });
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

test('sentences preserve which topic is the place, tradition, or work from either endpoint', () => {
  const tour = buildTopicRelationshipTour(graph(['root', 'place', 'region', 'saint', 'religion', 'work', 'subject'].map((id) => node(id)), [
    edge('contains', 'place', 'root', 'located_in'), edge('location', 'root', 'region', 'located_in'),
    edge('includes', 'saint', 'root', 'part_of_tradition'), edge('tradition', 'root', 'religion', 'part_of_tradition'),
    edge('subject', 'work', 'root', 'about'), edge('about', 'root', 'subject', 'about'),
  ]));
  const sentences = Object.fromEntries(tour.steps.filter((s) => s.kind === 'relationship').map((step) => {
    const neighbor = step.relations[0].node.label;
    const { prefix = '', connector, neighborsFirst } = step.sentence;
    const [first, second] = neighborsFirst ? [neighbor, 'root'] : ['root', neighbor];
    return [step.relations[0].edge.id, `${prefix}${first}${connector}${second}.`];
  }));
  assert.deepEqual(sentences, {
    about: 'Read about subject in root.',
    includes: 'saint is a region associated with root.',
    contains: 'Find place in root.',
    location: 'Find root in region.',
    tradition: 'root is a region associated with religion.',
    subject: 'Read about root in work.',
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

test('the tour groups symmetric links by neighbor category and reads a shrine link in reverse', () => {
  const tour = buildTopicRelationshipTour(graph([
    node('root'), node('left'), node('right'), node('shrine'),
    { ...node('being'), category: 'Supernatural being' },
  ], [
    edge('left-link', 'left', 'root'),
    edge('right-link', 'root', 'right'),
    edge('being-link', 'root', 'being'),
    edge('shrine-link', 'shrine', 'root', 'commemorates'),
  ]));
  const associations = tour.steps.filter((step) => step.label.startsWith('Related to'));
  assert.deepEqual(associations.map((step) => step.label), ['Related to · Region', 'Related to · Supernatural being']);
  assert.deepEqual(associations.map((step) => step.relations.map(({ node }) => node.id)), [['left', 'right'], ['being']]);
  const shrine = tour.steps.find((step) => step.sentence?.connector === ' is commemorated at ');
  assert.equal(shrine.relations[0].node.id, 'shrine');
});

test('a group slide lists its members as the subjects of one sentence', () => {
  const tour = buildTopicRelationshipTour(graph([
    { ...node('root'), category: 'Group' },
    { ...node('first'), category: 'Person' },
    { ...node('second'), category: 'Person' },
  ], [
    edge('first-member', 'first', 'root', 'member_of'),
    edge('second-member', 'second', 'root', 'member_of'),
  ]));
  const members = tour.steps.find((step) => step.kind === 'relationship');
  assert.equal(members.label, 'Members');
  assert.equal(members.sentence.neighborsFirst, true);
  assert.equal(members.sentence.connector, ' are members of the group ');
  assert.deepEqual(members.relations.map(({ node }) => node.id), ['first', 'second']);
});

test('tradition slides use category-specific sentences without a heading', () => {
  const tour = buildTopicRelationshipTour(graph([
    { ...node('root'), category: 'Tradition' },
    { ...node('deity'), category: 'Deity' },
    { ...node('group'), category: 'Group' },
    { ...node('spirit'), category: 'Supernatural being', beingKind: 'class' },
    { ...node('angel'), category: 'Supernatural being', beingKind: 'individual' },
    { ...node('person'), category: 'Person' },
    { ...node('another-person'), category: 'Person' },
    node('place'),
    { ...node('ritual'), category: 'Tradition' },
    { ...node('vedas', 'Vedas'), category: 'Work', subtype: 'Scripture' },
    { ...node('text'), category: 'Work' },
  ], [
    edge('deity-link', 'deity', 'root', 'part_of_tradition'),
    edge('group-link', 'group', 'root', 'part_of_tradition'),
    edge('spirit-link', 'spirit', 'root', 'part_of_tradition'),
    edge('angel-link', 'angel', 'root', 'part_of_tradition'),
    edge('person-link', 'person', 'root', 'part_of_tradition'),
    edge('another-person-link', 'another-person', 'root', 'part_of_tradition'),
    edge('place-link', 'place', 'root', 'part_of_tradition'),
    edge('ritual-link', 'ritual', 'root', 'part_of_tradition'),
    edge('scripture-link', 'vedas', 'root', 'part_of_tradition'),
    edge('text-link', 'text', 'root', 'part_of_tradition'),
  ]));
  const slides = tour.steps.slice(1);
  assert.deepEqual(slides.map((step) => [step.sentence.prefix, step.sentence.connector, step.relations.map(({ node }) => node.id)]), [
    [undefined, ' are a class of supernatural beings in ', ['spirit']],
    [undefined, ' is a deity in ', ['deity']],
    ['The ', ' are a group associated with ', ['group']],
    [undefined, ' is a supernatural being in ', ['angel']],
    [undefined, ' are significant figures in ', ['another-person', 'person']],
    [undefined, ' is a region associated with ', ['place']],
    ['The ', ' are sacred texts in ', ['vedas']],
    [undefined, ' is part of the tradition of ', ['ritual']],
    ['Works associated with ', ' include ', ['text']],
  ]);
  assert.ok(slides.every((step) => step.heading === undefined));
});

test('place slides use explicit categories and preserve plural tradition text', () => {
  const tradition = { ...node('root'), category: 'Tradition' };
  const river = { ...node('river'), category: 'Landscape', subtype: 'River' };
  const hill = { ...node('hill'), category: 'Landscape', subtype: 'Hill or mountain' };
  const shrine = { ...node('shrine'), category: 'Site', subtype: 'Shrine / mazar' };
  const community = { ...node('community'), category: 'Group' };
  const links = [
    edge('river-tradition', 'river', 'root', 'part_of_tradition'),
    edge('hill-tradition', 'hill', 'root', 'part_of_tradition'),
    edge('shrine-tradition', 'shrine', 'root', 'part_of_tradition'),
    edge('community-river', 'community', 'river'),
  ];
  const input = graph([tradition, river, hill, shrine, community], links);
  const slides = buildTopicRelationshipTour(input).steps.slice(1);
  assert.deepEqual(slides.map((step) => [step.label, step.sentence.connector]), [
    ['Associated with this tradition · Landscape', ' are natural features associated with '],
    ['Associated with this tradition · Site', ' is a site associated with '],
  ]);
  const riverSlides = buildTopicRelationshipTour({ ...input, rootNodeId: 'river' }).steps;
  const communitySlide = riverSlides.find((step) => step.heading === 'Related to · Group');
  assert.equal(communitySlide.sentence.connector, ' is associated with ');
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
