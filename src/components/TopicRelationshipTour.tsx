import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { TopicNeighborhoodEdge, TopicNeighborhoodGraph, TopicNeighborhoodNode } from '@/utils/content';
import {
  buildTopicRelationshipTour,
  layoutTopicRelationshipGraph,
  topicRelationshipEdgePath,
} from '@/utils/topic-relationship-tour.mjs';
import './TopicRelationshipTour.css';

interface Props {
  graph: TopicNeighborhoodGraph;
  accessibleLabel: string;
}

function TopicLink({ node }: { node: TopicNeighborhoodNode }) {
  return <a href={node.href}>{node.label}</a>;
}

export default function TopicRelationshipTour({ graph, accessibleLabel }: Props) {
  const tour = useMemo(() => buildTopicRelationshipTour(graph), [graph]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [graphWidth, setGraphWidth] = useState(440);
  const graphRef = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const step = tour.steps[index] ?? tour.steps[0];
  const nodesById = useMemo(() => {
    const nodes = new Map<string, TopicNeighborhoodNode>();
    if (tour.root) nodes.set(tour.root.id, tour.root);
    for (const { node } of step?.relations ?? []) nodes.set(node.id, node);
    return nodes;
  }, [tour.root, step]);
  const slideEdges = useMemo(() => step?.relations.map(({ edge }) => edge) ?? [], [step]);
  const layout = useMemo(
    () => layoutTopicRelationshipGraph([...nodesById.values()], graph.rootNodeId, graphWidth),
    [nodesById, graph.rootNodeId, graphWidth],
  );
  const edgeLanes = useMemo(() => {
    const pairs = new Map<string, TopicNeighborhoodEdge[]>();
    for (const edge of slideEdges) {
      const key = [edge.source, edge.target].sort().join('\0');
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key)!.push(edge);
    }
    const lanes = new Map<string, number>();
    for (const edges of pairs.values()) edges.forEach((edge, i) => {
      const direction = edge.source.localeCompare(edge.target) <= 0 ? 1 : -1;
      lanes.set(edge.id, (i - (edges.length - 1) / 2) * 16 * direction);
    });
    return lanes;
  }, [slideEdges]);

  useEffect(() => {
    const element = graphRef.current;
    if (!element) return;
    const resize = () => setGraphWidth(element.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setProgress(0);
    setFinished(false);
    elapsed.current = 0;
  }, [graph]);

  useEffect(() => {
    const onVisibilityChange = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!playing || !step) return;
    let frame = 0;
    let previous = performance.now();
    let lastPaint = previous;
    const tick = (now: number) => {
      elapsed.current = Math.min(step.duration, elapsed.current + now - previous);
      previous = now;
      if (now - lastPaint >= 100) {
        setProgress(elapsed.current / step.duration);
        lastPaint = now;
      }
      if (elapsed.current >= step.duration) {
        if (index < tour.steps.length - 1) {
          elapsed.current = 0;
          setProgress(0);
          setIndex((current) => current + 1);
        } else {
          setProgress(1);
          setPlaying(false);
          setFinished(true);
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, step, index, tour.steps.length]);

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(tour.steps.length - 1, next)));
    elapsed.current = 0;
    setProgress(0);
    setFinished(false);
  };
  const togglePlayback = () => {
    if (finished) go(0);
    setPlaying((current) => !current);
  };

  if (!tour.root || !step) return null;

  const rootLink = <TopicLink node={tour.root} />;
  const neighborLinks = step.relations.map(({ node, edge }, i) => (
    <Fragment key={edge.id}>
      {i > 0 && (i === step.relations.length - 1 ? (i === 1 ? ' and ' : ', and ') : ', ')}
      <TopicLink node={node} />
    </Fragment>
  ));

  return (
    <section className="topic-relationship-tour" aria-label={accessibleLabel}>
      <div className="trt-content">
        <div className="trt-graph" ref={graphRef}>
          <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" height={layout.height} role="group" aria-label={accessibleLabel}>
            <desc>{`Topics for the current slide around ${tour.root.label}. Choose a topic to visit its page.`}</desc>
            <g className="trt-edges">
              {slideEdges.map((edge) => (
                <path
                  key={edge.id}
                  className="trt-edge"
                  d={topicRelationshipEdgePath(edge, layout, graph.rootNodeId, edgeLanes.get(edge.id))}
                  fill="none"
                >
                  <title>{`${nodesById.get(edge.source)?.label} · ${edge.label} · ${nodesById.get(edge.target)?.label}`}</title>
                </path>
              ))}
            </g>
            <g>
              {Array.from(nodesById.values(), (node) => {
                const position = layout.positions.get(node.id)!;
                const lines = layout.lines.get(node.id) ?? [node.label];
                return (
                  <a key={node.id} href={node.href} aria-label={node.label} className={`trt-node ${node.id === graph.rootNodeId ? 'is-root' : ''}`}>
                    <g transform={`translate(${position.x},${position.y})`}>
                      <rect x={-position.width / 2} y={-position.height / 2} width={position.width} height={position.height} rx="9" />
                      <text textAnchor="middle" fontSize={layout.fontSize}>
                        {lines.map((line, i) => <tspan key={i} x="0" y={(i - (lines.length - 1) / 2) * 13 + 4}>{line}</tspan>)}
                      </text>
                      <title>{node.label}</title>
                    </g>
                  </a>
                );
              })}
            </g>
          </svg>
        </div>
        <div className="trt-reading" aria-live="polite" aria-atomic="true" onFocusCapture={() => setPlaying(false)}>
          {step.kind === 'relationship' && step.heading && <p className="trt-category">{step.heading}</p>}
          <p className="trt-sentence" key={step.id}>
            {step.kind === 'intro' ? (
              <>Explore the connections around {rootLink}.</>
            ) : (
              <>
                {step.sentence.prefix}
                {step.sentence.neighborsFirst ? neighborLinks : rootLink}
                {step.sentence.connector}
                {step.sentence.neighborsFirst ? rootLink : neighborLinks}.
              </>
            )}
          </p>
        </div>
      </div>
      {tour.steps.length > 1 && (
        <div className="trt-controls" onKeyDown={(event) => {
          if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
        }}>
          <nav className="trt-steps" aria-label="Relationship tour steps">
            {tour.steps.map((item, i) => (
              <button key={item.id} type="button" className={`trt-step ${i === index ? 'is-current' : ''}`} aria-label={`Step ${i + 1}: ${item.label}`} aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                <span className="trt-track" aria-hidden="true"><span style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} /></span>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </button>
            ))}
          </nav>
          <div className="trt-playback">
            <button type="button" className="trt-control" aria-label="Previous relationship" disabled={index === 0} onClick={() => go(index - 1)}>←</button>
            <button type="button" className="trt-control trt-play" aria-pressed={playing} onClick={togglePlayback}>{playing ? 'Pause' : finished ? 'Replay tour' : index || elapsed.current ? 'Play tour' : 'Start tour'}</button>
            <button type="button" className="trt-control" aria-label="Next relationship" disabled={index === tour.steps.length - 1} onClick={() => go(index + 1)}>→</button>
            <span className="trt-count">{index + 1} / {tour.steps.length}</span>
          </div>
        </div>
      )}
    </section>
  );
}
