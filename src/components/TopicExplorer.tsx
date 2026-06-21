import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, Stylesheet } from 'cytoscape';

import type { TopicExplorerGraph, TopicExplorerNode } from '@/utils/content';

const TOGGLEABLE_ENTITY_TYPES = ['story', 'resource', 'book'] as const;
const ALL_VISIBLE_TOGGLEABLES = [...TOGGLEABLE_ENTITY_TYPES];

type ToggleableEntityType = (typeof TOGGLEABLE_ENTITY_TYPES)[number];

type ExplorerState = {
  searchQuery: string;
  focusedNodeId: string | null;
  selectedEntities: ToggleableEntityType[];
};

type VisibleGraph = {
  visibleNodeIds: Set<string>;
  visibleEdgeIds: Set<string>;
  visibleNodeCount: number;
  visibleEdgeCount: number;
};

interface Props {
  graphDataId: string;
  labels: {
    browseTitle: string;
    graphTitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchHelperText: string;
    graphSummaryLabel: string;
    visibleNodesLabel: string;
    visibleEdgesLabel: string;
    clearFiltersLabel: string;
    clearFocusLabel: string;
    entityTypesLabel: string;
    topicEntityLabel: string;
    storyEntityLabel: string;
    resourceEntityLabel: string;
    bookEntityLabel: string;
    noMatchingTopicsLabel: string;
    noVisibleResultsLabel: string;
    openItemLabel: string;
  };
}

const loadGraphFromDom = (graphDataId: string): TopicExplorerGraph => {
  if (typeof document === 'undefined') {
    return { nodes: [], edges: [] };
  }

  const graphScript = document.getElementById(graphDataId);

  if (!graphScript?.textContent) {
    return { nodes: [], edges: [] };
  }

  try {
    return JSON.parse(graphScript.textContent) as TopicExplorerGraph;
  } catch (_error) {
    return { nodes: [], edges: [] };
  }
};

const getEntityLabel = (labels: Props['labels']) => ({
  topic: labels.topicEntityLabel,
  story: labels.storyEntityLabel,
  resource: labels.resourceEntityLabel,
  book: labels.bookEntityLabel,
});

const parseTopicExplorerState = ({
  search,
  validNodeIds,
}: {
  search: string;
  validNodeIds: Set<string>;
}): ExplorerState => {
  const params = new URLSearchParams(search);
  const selectedEntities = params
    .getAll('entity')
    .filter((value, index, allValues) => {
      return (
        TOGGLEABLE_ENTITY_TYPES.includes(value as ToggleableEntityType) &&
        allValues.indexOf(value) === index
      );
    }) as ToggleableEntityType[];
  const focusedNodeId = params.get('node');

  return {
    searchQuery: params.get('q')?.trim() ?? '',
    focusedNodeId: focusedNodeId && validNodeIds.has(focusedNodeId) ? focusedNodeId : null,
    selectedEntities:
      selectedEntities.length > 0 ? selectedEntities : [...ALL_VISIBLE_TOGGLEABLES],
  };
};

const matchesNodeFilters = (node: TopicExplorerNode, state: ExplorerState) => {
  if (node.type === 'topic') {
    return true;
  }

  return state.selectedEntities.includes(node.type as ToggleableEntityType);
};

const deriveVisibleGraph = (
  graph: TopicExplorerGraph,
  state: ExplorerState,
): VisibleGraph => {
  const visibleNodeIds = new Set(
    graph.nodes.filter((node) => matchesNodeFilters(node, state)).map((node) => node.id),
  );
  const visibleEdgeIds = new Set<string>();

  for (const edge of graph.edges) {
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      continue;
    }

    visibleEdgeIds.add(edge.id);
  }

  return {
    visibleNodeIds,
    visibleEdgeIds,
    visibleNodeCount: visibleNodeIds.size,
    visibleEdgeCount: visibleEdgeIds.size,
  };
};

const TopicExplorer = ({ graphDataId, labels }: Props) => {
  const graph = useMemo(() => loadGraphFromDom(graphDataId), [graphDataId]);
  const entityLabels = getEntityLabel(labels);
  const searchableNodes = useMemo(
    () => [...graph.nodes].sort((left, right) => left.label.localeCompare(right.label)),
    [graph.nodes],
  );
  const getInitialState = () =>
    parseTopicExplorerState({
      search: typeof window === 'undefined' ? '' : window.location.search,
      validNodeIds: new Set(searchableNodes.map((node) => node.id)),
    });
  const initialState = getInitialState();
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(initialState.focusedNodeId);
  const [selectedEntities, setSelectedEntities] = useState<ToggleableEntityType[]>(
    initialState.selectedEntities,
  );
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(Boolean(initialState.searchQuery));
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const visibleGraph = deriveVisibleGraph(graph, {
    searchQuery,
    focusedNodeId,
    selectedEntities,
  });
  const selectedNode =
    focusedNodeId && visibleGraph.visibleNodeIds.has(focusedNodeId)
      ? graph.nodes.find((node) => node.id === focusedNodeId) ?? null
      : null;
  const cyRef = useRef<Core | null>(null);
  const graphId = useId().replace(/:/g, '');
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const nodeSuggestions = searchableNodes
    .filter((node) => {
      if (!normalizedSearchQuery) {
        return false;
      }

      const searchableText = [node.label, node.slug].join(' ').toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    })
    .slice(0, 8);

  useEffect(() => {
    if (!graphContainerRef.current) {
      return;
    }

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((node) => ({
        data: {
          ...node,
          nodeType: node.type,
        },
      })),
      ...graph.edges.map((edge) => ({
        data: {
          ...edge,
          edgeType: edge.type,
        },
      })),
    ];

    const stylesheet: Stylesheet[] = [
      {
        selector: 'node',
        style: {
          'background-color': '#0f172a',
          'border-color': '#ffffff',
          'border-width': 2,
          height: 18,
          label: '',
          opacity: 1,
          'overlay-opacity': 0,
          shape: 'ellipse',
          width: 18,
        },
      },
      {
        selector: 'node[nodeType = "topic"]',
        style: {
          'background-color': '#01abf2',
          height: 28,
          label: 'data(label)',
          color: '#0f172a',
          'font-size': 10,
          'font-weight': 700,
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.92,
          'text-background-padding': 3,
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -22,
          'text-wrap': 'wrap',
          'text-max-width': 120,
          width: 28,
        },
      },
      {
        selector: 'node[nodeType = "story"]',
        style: {
          'background-color': '#ffe306',
          color: '#0f172a',
          'font-size': 9,
          'font-weight': 600,
          label: 'data(label)',
          shape: 'round-rectangle',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.9,
          'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -18,
          'text-max-width': 110,
          'text-wrap': 'wrap',
        },
      },
      {
        selector: 'node[nodeType = "resource"]',
        style: {
          'background-color': '#fb2398',
          color: '#0f172a',
          'font-size': 9,
          'font-weight': 600,
          label: 'data(label)',
          shape: 'diamond',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.9,
          'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -18,
          'text-max-width': 110,
          'text-wrap': 'wrap',
        },
      },
      {
        selector: 'node[nodeType = "book"]',
        style: {
          'background-color': '#7811a7',
          color: '#0f172a',
          'font-size': 9,
          'font-weight': 600,
          label: 'data(label)',
          shape: 'rectangle',
          'text-background-color': '#ffffff',
          'text-background-opacity': 0.9,
          'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -18,
          'text-max-width': 110,
          'text-wrap': 'wrap',
        },
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'bezier',
          'line-color': '#cbd5e1',
          opacity: 0.85,
          'target-arrow-shape': 'none',
          width: 1.8,
        },
      },
      {
        selector: 'edge[edgeType = "topic_relation"]',
        style: {
          'line-color': '#64748b',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          width: 2.2,
        },
      },
      {
        selector: '.is-hidden',
        style: {
          display: 'none',
        },
      },
      {
        selector: '.is-dimmed',
        style: {
          opacity: 0.1,
        },
      },
      {
        selector: '.is-selected',
        style: {
          'border-color': '#0f172a',
          'border-width': 4,
          opacity: 1,
        },
      },
      {
        selector: '.is-neighbor',
        style: {
          opacity: 1,
        },
      },
      {
        selector: '.is-labeled',
        style: {
          label: '',
        },
      },
    ];

    const cy = cytoscape({
      container: graphContainerRef.current,
      elements,
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 96,
        spacingFactor: 1.35,
        nodeOverlap: 28,
        nodeRepulsion: 5200,
        idealEdgeLength: 180,
        edgeElasticity: 80,
        componentSpacing: 140,
        gravity: 0.7,
        numIter: 1400,
        },
      maxZoom: 2.4,
      minZoom: 0.2,
      selectionType: 'single',
      style: stylesheet,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      wheelSensitivity: 0.18,
    });

    cy.on('tap', 'node', (event) => {
      const tappedNode = event.target;
      const label = String(tappedNode.data('label') ?? '');

      setFocusedNodeId(tappedNode.id());
      setSearchQuery(label);
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        setFocusedNodeId(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, graphId]);

  useEffect(() => {
    const cy = cyRef.current;

    if (!cy) {
      return;
    }

    const activeFocusNodeId =
      focusedNodeId && visibleGraph.visibleNodeIds.has(focusedNodeId) ? focusedNodeId : null;

    cy.batch(() => {
      cy.elements().removeClass('is-hidden is-dimmed is-selected is-neighbor is-labeled');

      cy.nodes().forEach((node) => {
        if (!visibleGraph.visibleNodeIds.has(node.id())) {
          node.addClass('is-hidden');
        }
      });

      cy.edges().forEach((edge) => {
        if (!visibleGraph.visibleEdgeIds.has(edge.id())) {
          edge.addClass('is-hidden');
        }
      });

      if (activeFocusNodeId) {
        const focusNode = cy.getElementById(activeFocusNodeId);
        const focusNeighborhood = focusNode
          .closedNeighborhood()
          .filter((element) =>
            element.isNode()
              ? visibleGraph.visibleNodeIds.has(element.id())
              : visibleGraph.visibleEdgeIds.has(element.id()),
          );

        cy.elements(':visible').difference(focusNeighborhood).addClass('is-dimmed');
        focusNeighborhood.nodes().addClass('is-neighbor');
        focusNode.addClass('is-selected');
      }
    });

    const focusCollection = activeFocusNodeId
      ? cy.getElementById(activeFocusNodeId).closedNeighborhood(':visible')
      : null;
    const fitCollection =
      focusCollection && focusCollection.length > 0 ? focusCollection : cy.elements(':visible');

    if (fitCollection.length > 0) {
      cy.fit(fitCollection, 84);
    }
  }, [focusedNodeId, visibleGraph]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    if (focusedNodeId) {
      params.set('node', focusedNodeId);
    }

    if (selectedEntities.length !== TOGGLEABLE_ENTITY_TYPES.length) {
      selectedEntities.forEach((value) => params.append('entity', value));
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [focusedNodeId, searchQuery, selectedEntities]);

  useEffect(() => {
    if (!isSuggestionsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isSuggestionsOpen]);

  useEffect(() => {
    if (!isSuggestionsOpen || !normalizedSearchQuery || nodeSuggestions.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSuggestionsOpen(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [isSuggestionsOpen, nodeSuggestions.length, normalizedSearchQuery]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = getInitialState();

      setSearchQuery(nextState.searchQuery);
      setFocusedNodeId(nextState.focusedNodeId);
      setSelectedEntities(nextState.selectedEntities);
      setIsSuggestionsOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchableNodes]);

  const toggleEntity = (entity: ToggleableEntityType) => {
    setSelectedEntities((current) =>
      current.includes(entity)
        ? current.filter((value) => value !== entity)
        : [...current, entity],
    );
  };

  const clearFocus = () => {
    setFocusedNodeId(null);
    setSearchQuery('');
    setIsSuggestionsOpen(false);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {labels.browseTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {labels.searchHelperText}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm self-start md:self-auto"
              disabled={selectedEntities.length === TOGGLEABLE_ENTITY_TYPES.length}
              onClick={() => setSelectedEntities([...ALL_VISIBLE_TOGGLEABLES])}
            >
              {labels.clearFiltersLabel}
            </button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <label className="form-control w-full">
              <span className="mb-2 text-sm font-medium text-slate-700">
                {labels.searchLabel}
              </span>
              <div ref={searchContainerRef} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsSuggestionsOpen(true);
                  }}
                  onFocus={() => {
                    if (normalizedSearchQuery) {
                      setIsSuggestionsOpen(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsSuggestionsOpen(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && nodeSuggestions[0]) {
                      event.preventDefault();
                      setFocusedNodeId(nodeSuggestions[0].id);
                      setSearchQuery(nodeSuggestions[0].label);
                      setIsSuggestionsOpen(false);
                    }
                  }}
                  className="input input-bordered w-full"
                  placeholder={labels.searchPlaceholder}
                />
                {isSuggestionsOpen && nodeSuggestions.length > 0 && (
                  <div className="bg-base-100 absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-base-300 shadow-lg">
                    {nodeSuggestions.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="hover:bg-base-200 flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setFocusedNodeId(node.id);
                          setSearchQuery(node.label);
                          setIsSuggestionsOpen(false);
                        }}
                      >
                        <span className="font-medium leading-snug text-slate-900">
                          {node.label}
                        </span>
                        <span className="text-sm text-slate-500">
                          {entityLabels[node.type]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {normalizedSearchQuery && nodeSuggestions.length === 0 && (
                <span className="mt-2 text-sm text-slate-500">
                  {labels.noMatchingTopicsLabel}
                </span>
              )}
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                {labels.entityTypesLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="badge border px-3 py-3 text-slate-700">
                  {entityLabels.topic}
                </span>
                {TOGGLEABLE_ENTITY_TYPES.map((entity) => {
                  const isSelected = selectedEntities.includes(entity);

                  return (
                    <button
                      key={entity}
                      type="button"
                      className={`badge cursor-pointer border px-3 py-3 transition ${
                        isSelected
                          ? 'badge-primary text-primary-content'
                          : 'badge-soft badge-primary'
                      }`}
                      onClick={() => toggleEntity(entity)}
                    >
                      {entityLabels[entity]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {focusedNodeId && (
          <div className="flex justify-end border-b border-slate-200 px-5 py-4">
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFocus}>
              {labels.clearFocusLabel}
            </button>
          </div>
        )}
        {!focusedNodeId && false && (
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {labels.graphTitle}
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {visibleGraph.visibleNodeCount} {labels.visibleNodesLabel}
              {' '}•{' '}
              {visibleGraph.visibleEdgeCount} {labels.visibleEdgesLabel}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {focusedNodeId && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFocus}>
                {labels.clearFocusLabel}
              </button>
            )}
            <span className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500">
              {labels.graphSummaryLabel}
            </span>
          </div>
        </div>
        )}

        <div className="relative min-h-[32rem] lg:min-h-[46rem]">
          <div id={graphId} ref={graphContainerRef} className="h-[32rem] w-full lg:h-[46rem]" />
          {selectedNode && selectedNode.href && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex justify-end lg:bottom-6 lg:left-auto lg:right-6">
              <div className="pointer-events-auto w-full max-w-sm rounded-[1.5rem] border border-slate-200 bg-white/96 p-4 shadow-xl shadow-slate-900/10 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {entityLabels[selectedNode.type]}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-900">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-label="Close selection"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                    onClick={() => setFocusedNodeId(null)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 stroke-current"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M6 6l12 12M6 18L18 6"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4">
                  <a
                    href={selectedNode.href}
                    className="inline-flex items-center rounded-full border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-900 hover:text-white"
                  >
                    {labels.openItemLabel}
                  </a>
                </div>
              </div>
            </div>
          )}
          {visibleGraph.visibleNodeCount === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 px-6 py-5 text-center text-sm leading-6 text-slate-500">
                {labels.noVisibleResultsLabel}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TopicExplorer;
