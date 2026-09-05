import { useEffect, useId, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, Stylesheet } from 'cytoscape';

import type { TopicNeighborhoodGraph } from '@/utils/content';

type GraphHeight = 'compact' | 'standard';

interface Props {
  graph: TopicNeighborhoodGraph;
  accessibleLabel: string;
  height?: GraphHeight;
}

const HEIGHT_CLASSES: Record<GraphHeight, string> = {
  compact: 'h-[52rem] md:h-[48rem]',
  standard: 'h-[60rem] md:h-[56rem]',
};

const normalizePathname = (pathname: string) => {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
};

const getNodeDimensions = (label: string, isRoot: boolean, isNarrow: boolean) => {
  const fontSize = isRoot ? (isNarrow ? 17 : 15) : (isNarrow ? 16 : 13);
  const maximumTextWidth = isRoot ? 160 : (isNarrow ? 120 : 144);
  const minimumTextWidth = isRoot ? 96 : 72;
  const estimatedTextWidth = label.length * fontSize * 0.56;
  const width = Math.min(maximumTextWidth, Math.max(minimumTextWidth, estimatedTextWidth));
  const lineCount = Math.max(1, Math.ceil(estimatedTextWidth / maximumTextWidth));

  return {
    nodeHeight: Math.ceil(lineCount * fontSize * 1.25),
    nodeWidth: Math.ceil(width),
  };
};

const fitGraph = (cy: Core, scope: 'root-neighborhood' | 'all' = 'root-neighborhood') => {
  if (cy.destroyed() || cy.elements().length === 0) return;

  const isNarrow = (cy.container()?.clientWidth ?? 0) < 520;
  const rootNeighborhood = cy
    .nodes()
    .filter((node) => Number(node.data('depth')) <= 1);
  const elements = scope === 'all' || rootNeighborhood.length === 0
    ? cy.elements()
    : rootNeighborhood;
  cy.fit(elements, isNarrow ? 24 : 56);

  const maximumInitialZoom = isNarrow ? 1.4 : 1.6;
  if (cy.zoom() > maximumInitialZoom) {
    cy.zoom(maximumInitialZoom);
    cy.center(elements);
  }
};

const RelatedTopicGraphCanvas = ({
  graph,
  accessibleLabel,
  height = 'standard',
}: Props) => {
  const cyRef = useRef<Core | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const graphId = useId().replace(/:/g, '');

  useEffect(() => {
    const container = graphContainerRef.current;

    if (!container || graph.nodes.length === 0) return;

    const isNarrow = container.clientWidth < 520;

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((node) => ({
        data: {
          ...node,
          ...getNodeDimensions(node.label, node.isRoot, isNarrow),
        },
        classes: node.isRoot ? 'is-root' : '',
      })),
      ...graph.edges.map((edge) => ({
        data: edge,
      })),
    ];
    const stylesheet: Stylesheet[] = [
      {
        selector: 'node',
        style: {
          'background-color': '#01abf2',
          'border-color': '#ffffff',
          'border-width': 3,
          color: '#0f172a',
          'font-size': isNarrow ? 16 : 13,
          'font-weight': 700,
          height: 'data(nodeHeight)',
          label: 'data(label)',
          'overlay-opacity': 0,
          padding: isNarrow ? 10 : 9,
          shape: 'roundrectangle',
          'text-halign': 'center',
          'text-margin-y': 0,
          'text-max-width': isNarrow ? 120 : 144,
          'text-valign': 'center',
          'text-wrap': 'wrap',
          width: 'data(nodeWidth)',
        },
      },
      {
        selector: 'node.is-root',
        style: {
          'background-color': '#7811a7',
          'border-color': '#ffe306',
          'border-width': 5,
          color: '#ffffff',
          'font-size': isNarrow ? 17 : 15,
          padding: isNarrow ? 13 : 12,
          'text-max-width': 160,
        },
      },
      {
        selector: 'node:active',
        style: {
          'overlay-color': '#01abf2',
          'overlay-opacity': 0.12,
          'overlay-padding': 8,
        },
      },
      {
        selector: 'edge',
        style: {
          'arrow-scale': 0.9,
          color: '#475569',
          'curve-style': 'bezier',
          'font-size': isNarrow ? 12 : 11,
          'font-weight': 600,
          label: 'data(label)',
          'line-color': '#94a3b8',
          'source-distance-from-node': 3,
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'target-distance-from-node': 3,
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.96,
          'text-background-padding': 3,
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -7,
          'text-rotation': 'autorotate',
          width: 1.8,
        },
      },
    ];
    const maximumDepth = Math.max(...graph.nodes.map((node) => node.depth), 0);
    const cy = cytoscape({
      container,
      elements,
      layout: {
        name: 'concentric',
        animate: false,
        avoidOverlap: true,
        concentric: (node) => maximumDepth - Number(node.data('depth')),
        fit: true,
        levelWidth: () => 1,
        minNodeSpacing: isNarrow ? 26 : 42,
        padding: isNarrow ? 12 : 40,
        spacingFactor: isNarrow ? 0.88 : 1.05,
        startAngle: -Math.PI / 2,
      },
      maxZoom: 2.5,
      minZoom: 0.25,
      selectionType: 'single',
      style: stylesheet,
      userPanningEnabled: true,
      userZoomingEnabled: true,
    });

    fitGraph(cy);

    cy.on('tap', 'node', (event) => {
      const href = String(event.target.data('href') ?? '');

      if (!href) return;

      const destination = new URL(href, window.location.href);
      const isCurrentPage =
        destination.origin === window.location.origin &&
        normalizePathname(destination.pathname) === normalizePathname(window.location.pathname);

      if (!isCurrentPage) window.location.assign(destination.href);
    });
    cy.on('mouseover', 'node', () => {
      container.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', () => {
      container.style.cursor = 'grab';
    });

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (cy.destroyed()) return;
        cy.resize();
        fitGraph(cy);
      });
    });

    container.style.cursor = 'grab';
    resizeObserver.observe(container);
    cyRef.current = cy;

    return () => {
      resizeObserver.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  const resetView = () => {
    const cy = cyRef.current;
    if (cy) fitGraph(cy);
  };

  const showAll = () => {
    const cy = cyRef.current;
    if (cy) fitGraph(cy, 'all');
  };

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    const container = cy?.container();

    if (!cy || !container) return;

    cy.zoom({
      level: Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor)),
      renderedPosition: {
        x: container.clientWidth / 2,
        y: container.clientHeight / 2,
      },
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <p className="text-sm leading-6 text-slate-500">
          Select a topic to open it. Drag to pan; use the wheel or pinch to zoom.
        </p>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={showAll}>
            Show all
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetView}>
            Reset view
          </button>
        </div>
      </div>
      <div className="relative">
        <div
          id={graphId}
          ref={graphContainerRef}
          className={`w-full ${HEIGHT_CLASSES[height]}`}
          role="img"
          aria-label={accessibleLabel}
        />
        <div
          className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
          role="group"
          aria-label="Graph zoom controls"
        >
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm rounded-none text-xl"
            onClick={() => zoomBy(1.25)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <span aria-hidden="true">+</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm rounded-none border-t border-slate-200 text-xl"
            onClick={() => zoomBy(0.8)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <span aria-hidden="true">−</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatedTopicGraphCanvas;
