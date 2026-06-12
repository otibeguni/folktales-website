import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type ComicSummary = {
  slug: string;
  title: string;
  pageCount: number;
  panelCount: number;
};

type ComicPage = {
  id: string;
  src: string;
  width: number;
  height: number;
};

type PanelPoint = {
  x: number;
  y: number;
};

type ComicPanel = {
  id: string;
  pageId: string;
  order: number;
  points: PanelPoint[];
  label?: string;
  notes?: string;
};

type ComicManifest = {
  slug: string;
  title: string;
  pages: ComicPage[];
  panels: ComicPanel[];
};

type ImportFormState = {
  slug: string;
  title: string;
  dpi: string;
};

type DragState =
  | {
      mode: "move-panel";
      panelId: string;
      pageId: string;
      startX: number;
      startY: number;
      originPoints: PanelPoint[];
    }
  | {
      mode: "move-point";
      panelId: string;
      pageId: string;
      pointIndex: number;
    };

const MIN_PANEL_SIZE = 0.02;
const PREVIEW_FRAME_PADDING = 0.18;
const PREVIEW_MIN_PADDING_X = 0.05;
const PREVIEW_MIN_PADDING_Y = 0.05;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function roundCoord(value: number) {
  return Number(value.toFixed(6));
}

function normalizePoint(point: PanelPoint) {
  return {
    x: roundCoord(clamp(point.x)),
    y: roundCoord(clamp(point.y)),
  };
}

function normalizePoints(points: PanelPoint[]) {
  return points.map(normalizePoint);
}

function getPanelPoints(panel: ComicPanel) {
  return normalizePoints(panel.points);
}

function sortPanels(panels: ComicPanel[]) {
  return [...panels].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function resequencePanels(panels: ComicPanel[]) {
  return sortPanels(panels).map((panel, index) => ({
    ...panel,
    order: index + 1,
  }));
}

function nextPanelId(panels: ComicPanel[]) {
  const usedNumbers = panels
    .map((panel) => {
      const match = panel.id.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => Number.isFinite(value));

  const nextNumber = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
  return `panel-${String(nextNumber).padStart(3, "0")}`;
}

function getPageById(manifest: ComicManifest | null, pageId: string | null) {
  if (!manifest || !pageId) {
    return undefined;
  }

  return manifest.pages.find((page) => page.id === pageId);
}

function getPanelById(manifest: ComicManifest | null, panelId: string | null) {
  if (!manifest || !panelId) {
    return undefined;
  }

  return manifest.panels.find((panel) => panel.id === panelId);
}

function getPolygonBounds(points: PanelPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

function expandBounds(bounds: { left: number; top: number; right: number; bottom: number }, padding: number) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const insetX = Math.max(width * padding, PREVIEW_MIN_PADDING_X);
  const insetY = Math.max(height * padding, PREVIEW_MIN_PADDING_Y);

  return {
    left: clamp(bounds.left - insetX),
    top: clamp(bounds.top - insetY),
    right: clamp(bounds.right + insetX),
    bottom: clamp(bounds.bottom + insetY),
  };
}

function normalizePanelForSave(panel: ComicPanel) {
  return {
    id: panel.id,
    pageId: panel.pageId,
    order: panel.order,
    points: getPanelPoints(panel),
    label: panel.label,
    notes: panel.notes,
  };
}

function normalizeManifestForSave(manifest: ComicManifest) {
  return {
    slug: manifest.slug,
    title: manifest.title,
    pages: manifest.pages.map((page) => ({
      id: page.id,
      src: page.src,
      width: page.width,
      height: page.height,
    })),
    panels: resequencePanels(manifest.panels.map(normalizePanelForSave)),
  };
}

function getPolygonBoundsInPixels(points: PanelPoint[], page: ComicPage) {
  const bounds = getPolygonBounds(points);

  return {
    left: bounds.left * page.width,
    top: bounds.top * page.height,
    right: bounds.right * page.width,
    bottom: bounds.bottom * page.height,
    width: (bounds.right - bounds.left) * page.width,
    height: (bounds.bottom - bounds.top) * page.height,
  };
}

function getBoundsInPixels(
  bounds: { left: number; top: number; right: number; bottom: number },
  page: ComicPage,
) {
  return {
    left: bounds.left * page.width,
    top: bounds.top * page.height,
    right: bounds.right * page.width,
    bottom: bounds.bottom * page.height,
    width: (bounds.right - bounds.left) * page.width,
    height: (bounds.bottom - bounds.top) * page.height,
  };
}

function getPolygonPointString(points: PanelPoint[], page: ComicPage) {
  return points
    .map((point) => `${roundCoord(point.x * page.width)},${roundCoord(point.y * page.height)}`)
    .join(" ");
}

function translatePoints(points: PanelPoint[], deltaX: number, deltaY: number) {
  const bounds = getPolygonBounds(points);
  const limitedDeltaX = clamp(deltaX, -bounds.left, 1 - bounds.right);
  const limitedDeltaY = clamp(deltaY, -bounds.top, 1 - bounds.bottom);

  return points.map((point) => ({
    x: roundCoord(point.x + limitedDeltaX),
    y: roundCoord(point.y + limitedDeltaY),
  }));
}

function isValidDraftPolygon(points: PanelPoint[]) {
  if (points.length < 3) {
    return false;
  }

  const bounds = getPolygonBounds(points);
  return bounds.right - bounds.left >= MIN_PANEL_SIZE && bounds.bottom - bounds.top >= MIN_PANEL_SIZE;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "Unexpected API error.");
  }

  return payload as T;
}

function App() {
  const [comics, setComics] = useState<ComicSummary[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ComicManifest | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [editorZoom, setEditorZoom] = useState(100);
  const [status, setStatus] = useState("Loading comics...");
  const [isBusy, setIsBusy] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importForm, setImportForm] = useState<ImportFormState>({
    slug: "",
    title: "",
    dpi: "144",
  });
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [draftPoints, setDraftPoints] = useState<PanelPoint[]>([]);
  const [draftHoverPoint, setDraftHoverPoint] = useState<PanelPoint | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageOuterRef = useRef<HTMLDivElement | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const [stageOuterWidth, setStageOuterWidth] = useState(960);

  const orderedPanels = useMemo(() => resequencePanels(manifest?.panels || []), [manifest?.panels]);
  const selectedPage = getPageById(manifest, selectedPageId);
  const selectedPanel = getPanelById(manifest, selectedPanelId);
  const selectedPagePanels = useMemo(
    () => orderedPanels.filter((panel) => panel.pageId === selectedPageId),
    [orderedPanels, selectedPageId],
  );
  const previewPanel = orderedPanels[previewIndex];
  const previewPage = getPageById(manifest, previewPanel?.pageId || null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setStageOuterWidth(entry.contentRect.width);
    });

    if (stageOuterRef.current) {
      observer.observe(stageOuterRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadComics().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Unable to load comics.");
    });
  }, []);

  useEffect(() => {
    if (!manifest) {
      return;
    }

    if (!selectedPageId || !manifest.pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(manifest.pages[0]?.id || null);
    }

    if (!selectedPanelId || !manifest.panels.some((panel) => panel.id === selectedPanelId)) {
      setSelectedPanelId(manifest.panels[0]?.id || null);
    }
  }, [manifest, selectedPageId, selectedPanelId]);

  useEffect(() => {
    if (!selectedPanelId) {
      setPreviewIndex(0);
      return;
    }

    const index = orderedPanels.findIndex((panel) => panel.id === selectedPanelId);
    setPreviewIndex(index >= 0 ? index : 0);
  }, [orderedPanels, selectedPanelId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
        cancelDraftPolygon();
      }

      if (event.key === "ArrowRight") {
        setPreviewIndex((current) => Math.min(current + 1, Math.max(orderedPanels.length - 1, 0)));
      }

      if (event.key === "ArrowLeft") {
        setPreviewIndex((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedPanels.length, isDrawingPolygon]);

  useEffect(() => {
    if (!manifest || isBusy || isDrawingPolygon) {
      return;
    }

    const nextSnapshot = JSON.stringify(normalizeManifestForSave(manifest));

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistManifest(manifest, true);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [manifest, isBusy, isDrawingPolygon]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDrag = dragState;

    function onPointerMove(event: PointerEvent) {
      if (!selectedPage || !stageRef.current || activeDrag.pageId !== selectedPage.id) {
        return;
      }

      const nextPoint = getNormalizedPointer(event, stageRef.current);

      setManifest((currentManifest) => {
        if (!currentManifest) {
          return currentManifest;
        }

        const panels = currentManifest.panels.map((panel) => {
          if (panel.id !== activeDrag.panelId) {
            return panel;
          }

          if (activeDrag.mode === "move-panel") {
            const deltaX = nextPoint.x - activeDrag.startX;
            const deltaY = nextPoint.y - activeDrag.startY;

            return {
              ...panel,
              points: translatePoints(activeDrag.originPoints, deltaX, deltaY),
            };
          }

          return {
            ...panel,
            points: panel.points.map((point, pointIndex) =>
              pointIndex === activeDrag.pointIndex ? normalizePoint(nextPoint) : point,
            ),
          };
        });

        return {
          ...currentManifest,
          panels,
        };
      });
    }

    function onPointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, selectedPage]);

  async function loadComics(preferredSlug?: string) {
    const payload = await fetchJson<{ comics: ComicSummary[] }>("/api/comics");
    setComics(payload.comics);

    const nextSlug = preferredSlug || activeSlug || payload.comics[0]?.slug || null;
    setActiveSlug(nextSlug);

    if (nextSlug) {
      await loadComic(nextSlug);
      return;
    }

    setManifest(null);
    setStatus("No comics yet. Import a PDF to start annotating.");
  }

  async function loadComic(slug: string) {
    const payload = await fetchJson<ComicManifest>(`/api/comics/${slug}`);
    setManifest(payload);
    lastSavedSnapshotRef.current = JSON.stringify(normalizeManifestForSave(payload));
    setActiveSlug(slug);
    setSelectedPageId(payload.pages[0]?.id || null);
    setSelectedPanelId(payload.panels[0]?.id || null);
    setImportForm((current) => ({
      ...current,
      slug: payload.slug,
      title: payload.title,
    }));
    cancelDraftPolygon();
    setStatus(`Loaded ${payload.title}.`);
  }

  async function persistManifest(nextManifest: ComicManifest, isAutoSave = false) {
    const normalizedManifest = normalizeManifestForSave(nextManifest);
    const nextSnapshot = JSON.stringify(normalizedManifest);

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setIsBusy(true);
    setStatus(isAutoSave ? "Autosaving..." : "Saving manifest...");

    try {
      const payload = await fetchJson<{ comic: ComicManifest; comics: ComicSummary[] }>(
        `/api/comics/${normalizedManifest.slug}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(normalizedManifest),
        },
      );

      setManifest(payload.comic);
      setComics(payload.comics);
      lastSavedSnapshotRef.current = JSON.stringify(normalizeManifestForSave(payload.comic));
      setStatus(isAutoSave ? `All changes saved for ${payload.comic.title}.` : `Saved ${payload.comic.title}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Unable to ${isAutoSave ? "autosave" : "save"} comic.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    if (!manifest) {
      return;
    }

    await persistManifest(manifest, false);
  }

  async function handlePreparePdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!importForm.slug || !selectedPdfFile) {
      setStatus("Slug and PDF file are required.");
      return;
    }

    setIsBusy(true);
    setStatus("Preparing PDF...");

    try {
      const response = await fetch("/api/prepare-pdf", {
        method: "POST",
        headers: {
          "Content-Type": selectedPdfFile.type || "application/pdf",
          "X-Comic-Slug": importForm.slug,
          "X-Comic-Title": importForm.title,
          "X-Comic-Dpi": String(Number(importForm.dpi || "144")),
          "X-Comic-File-Name": selectedPdfFile.name,
        },
        body: selectedPdfFile,
      });
      const payload = (await response.json()) as { comic?: ComicManifest; comics?: ComicSummary[]; error?: string };

      if (!response.ok || !payload.comic || !payload.comics) {
        throw new Error(payload.error || "Unable to prepare PDF.");
      }

      setComics(payload.comics);
      setManifest(payload.comic);
      lastSavedSnapshotRef.current = JSON.stringify(normalizeManifestForSave(payload.comic));
      setActiveSlug(payload.comic.slug);
      setSelectedPageId(payload.comic.pages[0]?.id || null);
      setSelectedPanelId(payload.comic.panels[0]?.id || null);
      setSelectedPdfFile(null);
      cancelDraftPolygon();
      setStatus(`Prepared ${payload.comic.pages.length} page(s) for ${payload.comic.title}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to prepare PDF.");
    } finally {
      setIsBusy(false);
    }
  }

  function setPanelField<K extends keyof ComicPanel>(key: K, value: ComicPanel[K]) {
    if (!manifest || !selectedPanelId) {
      return;
    }

    setManifest({
      ...manifest,
      panels: manifest.panels.map((panel) => (panel.id === selectedPanelId ? { ...panel, [key]: value } : panel)),
    });
  }

  function reorderPanel(panelId: string, direction: -1 | 1) {
    if (!manifest) {
      return;
    }

    const panels = sortPanels(manifest.panels);
    const index = panels.findIndex((panel) => panel.id === panelId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= panels.length) {
      return;
    }

    const nextPanels = [...panels];
    const [panel] = nextPanels.splice(index, 1);
    nextPanels.splice(nextIndex, 0, panel);

    setManifest({
      ...manifest,
      panels: resequencePanels(nextPanels),
    });
    setSelectedPanelId(panelId);
  }

  function deleteSelectedPanel() {
    if (!manifest || !selectedPanelId) {
      return;
    }

    const nextPanels = resequencePanels(manifest.panels.filter((panel) => panel.id !== selectedPanelId));
    setManifest({
      ...manifest,
      panels: nextPanels,
    });
    setSelectedPanelId(nextPanels[0]?.id || null);
    setStatus(`Deleted ${selectedPanelId}.`);
  }

  function beginDraftPolygon() {
    if (!selectedPage) {
      setStatus("Select a page before drawing a polygon.");
      return;
    }

    setIsDrawingPolygon(true);
    setDraftPoints([]);
    setDraftHoverPoint(null);
    setSelectedPanelId(null);
    setStatus(`Polygon drawing started for ${selectedPage.id}. Click to add points, then finish.`);
  }

  function cancelDraftPolygon() {
    setIsDrawingPolygon(false);
    setDraftPoints([]);
    setDraftHoverPoint(null);
  }

  function finishDraftPolygon() {
    if (!manifest || !selectedPage || !isValidDraftPolygon(draftPoints)) {
      setStatus("A polygon needs at least three points and a non-zero area.");
      return;
    }

    const panelId = nextPanelId(manifest.panels);
    const nextPanel: ComicPanel = {
      id: panelId,
      pageId: selectedPage.id,
      order: manifest.panels.length + 1,
      points: normalizePoints(draftPoints),
    };

    setManifest({
      ...manifest,
      panels: resequencePanels([...manifest.panels, nextPanel]),
    });
    setSelectedPanelId(panelId);
    cancelDraftPolygon();
    setStatus(`Created ${panelId}.`);
  }

  function handleStagePointerDown(event: ReactPointerEvent<SVGRectElement>) {
    if (!isDrawingPolygon || !selectedPage || !stageRef.current) {
      return;
    }

    const point = getNormalizedPointer(event.nativeEvent, stageRef.current);
    setDraftPoints((current) => [...current, normalizePoint(point)]);
  }

  function handleStagePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isDrawingPolygon || !stageRef.current) {
      return;
    }

    setDraftHoverPoint(getNormalizedPointer(event.nativeEvent, stageRef.current));
  }

  function handlePolygonPointerDown(event: ReactPointerEvent<SVGPolygonElement>, panel: ComicPanel) {
    if (!stageRef.current || isDrawingPolygon) {
      return;
    }

    event.stopPropagation();
    const point = getNormalizedPointer(event.nativeEvent, stageRef.current);
    setSelectedPanelId(panel.id);
    setSelectedPageId(panel.pageId);
    setDragState({
      mode: "move-panel",
      panelId: panel.id,
      pageId: panel.pageId,
      startX: point.x,
      startY: point.y,
      originPoints: panel.points,
    });
  }

  function handleVertexPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    panel: ComicPanel,
    pointIndex: number,
  ) {
    if (!stageRef.current || isDrawingPolygon) {
      return;
    }

    event.stopPropagation();
    setSelectedPanelId(panel.id);
    setSelectedPageId(panel.pageId);
    setDragState({
      mode: "move-point",
      panelId: panel.id,
      pageId: panel.pageId,
      pointIndex,
    });
  }

  const fitScale = selectedPage ? Math.min((stageOuterWidth - 32) / selectedPage.width, 1) : 1;
  const displayScale = fitScale * (editorZoom / 100);
  const stageStyle = selectedPage
    ? {
        width: selectedPage.width * displayScale,
        height: selectedPage.height * displayScale,
      }
    : undefined;
  const draftPreviewPoints =
    isDrawingPolygon && draftHoverPoint && draftPoints.length > 0
      ? [...draftPoints, draftHoverPoint]
      : draftPoints;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Comic Author</h1>
          <p>Annotate freeform panel polygons and preview the panel-by-panel reading flow.</p>
        </div>
        <div className="topbar-actions">
          <label className="field">
            <span>Comic</span>
            <select
              value={activeSlug || ""}
              onChange={(event) => {
                const slug = event.target.value;
                if (slug) {
                  loadComic(slug).catch((error) =>
                    setStatus(error instanceof Error ? error.message : "Unable to load comic."),
                  );
                }
              }}
            >
              <option value="">Select a comic</option>
              {comics.map((comic) => (
                <option key={comic.slug} value={comic.slug}>
                  {comic.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="primary-button" disabled={!manifest || isBusy} onClick={handleSave}>
            {isBusy ? "Working..." : "Save Metadata"}
          </button>
        </div>
      </header>

      <section className="status-bar">{status}</section>

      <section className="import-card">
        <form className="import-grid" onSubmit={handlePreparePdf}>
          <label className="field">
            <span>Slug</span>
            <input
              value={importForm.slug}
              onChange={(event) => setImportForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="my-comic"
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              value={importForm.title}
              onChange={(event) => setImportForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Comic title"
            />
          </label>
          <label className="field field-wide">
            <span>PDF File</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                setSelectedPdfFile(event.target.files?.[0] || null);
              }}
            />
          </label>
          <label className="field">
            <span>DPI</span>
            <input
              value={importForm.dpi}
              onChange={(event) => setImportForm((current) => ({ ...current, dpi: event.target.value }))}
              placeholder="144"
            />
          </label>
          <button type="submit" className="secondary-button" disabled={isBusy}>
            Prepare PDF
          </button>
        </form>
        <p className="import-hint">
          {selectedPdfFile ? `Selected file: ${selectedPdfFile.name}` : "Choose a local PDF file to import."}
        </p>
      </section>

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h2>Pages</h2>
            {manifest?.pages.length ? (
              <div className="page-list">
                {manifest.pages.map((page) => (
                  <button
                    type="button"
                    key={page.id}
                    className={`page-list-item ${selectedPageId === page.id ? "is-active" : ""}`}
                    onClick={() => {
                      setSelectedPageId(page.id);
                      cancelDraftPolygon();
                    }}
                  >
                    <strong>{page.id}</strong>
                    <span>
                      {page.width} x {page.height}
                    </span>
                    <span>{orderedPanels.filter((panel) => panel.pageId === page.id).length} panels</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">No pages yet.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h2>Reading Order</h2>
            {orderedPanels.length ? (
              <div className="panel-list">
                {orderedPanels.map((panel, index) => (
                  <button
                    type="button"
                    key={panel.id}
                    className={`panel-list-item ${selectedPanelId === panel.id ? "is-active" : ""}`}
                    onClick={() => {
                      setSelectedPanelId(panel.id);
                      setSelectedPageId(panel.pageId);
                      cancelDraftPolygon();
                    }}
                  >
                    <strong>
                      {index + 1}. {panel.label || panel.id}
                    </strong>
                    <span>{panel.pageId}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">Draw panel polygons to build the reading order.</p>
            )}
          </div>
        </aside>

        <section className="editor">
          <div className="editor-toolbar">
            <div>
              <strong>{manifest?.title || "No comic loaded"}</strong>
              <span>{selectedPage ? `${selectedPage.id} editing surface` : "Import or load a comic to begin."}</span>
            </div>
            <div className="editor-toolbar-actions">
              <label className="field compact-field">
                <span>Zoom</span>
                <input
                  type="range"
                  min="25"
                  max="250"
                  value={editorZoom}
                  onChange={(event) => setEditorZoom(Number(event.target.value))}
                />
                <strong>{editorZoom}%</strong>
              </label>
              <button
                type="button"
                className="secondary-button"
                disabled={!selectedPage || isDrawingPolygon}
                onClick={beginDraftPolygon}
              >
                New Polygon
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!isDrawingPolygon || !isValidDraftPolygon(draftPoints)}
                onClick={finishDraftPolygon}
              >
                Finish Polygon
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!isDrawingPolygon}
                onClick={cancelDraftPolygon}
              >
                Cancel
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!orderedPanels.length}
                onClick={() => setIsPreviewOpen(true)}
              >
                Open Preview
              </button>
            </div>
          </div>
          <p className="editor-hint">
            Start a polygon, click to add each point, then finish it. Drag a polygon to move it or drag its points to
            reshape it.
          </p>

          <div className="editor-stage-outer" ref={stageOuterRef}>
            {selectedPage ? (
              <div className="editor-stage" ref={stageRef} style={stageStyle}>
                <img src={selectedPage.src} alt={selectedPage.id} className="page-image" draggable={false} />
                <svg
                  className="polygon-layer"
                  viewBox={`0 0 ${selectedPage.width} ${selectedPage.height}`}
                  preserveAspectRatio="none"
                  onPointerMove={handleStagePointerMove}
                >
                  <rect
                    x="0"
                    y="0"
                    width={selectedPage.width}
                    height={selectedPage.height}
                    className={`draw-surface-svg ${isDrawingPolygon ? "is-drawing" : ""}`}
                    onPointerDown={handleStagePointerDown}
                  />

                  {selectedPagePanels.map((panel) => (
                    <g key={panel.id}>
                      <polygon
                        points={getPolygonPointString(panel.points, selectedPage)}
                        className={`panel-polygon ${selectedPanelId === panel.id ? "is-selected" : ""} ${
                          isDrawingPolygon ? "is-disabled" : ""
                        }`}
                        onPointerDown={(event) => handlePolygonPointerDown(event, panel)}
                        onClick={() => {
                          if (!isDrawingPolygon) {
                            setSelectedPanelId(panel.id);
                          }
                        }}
                      />
                      {selectedPanelId === panel.id &&
                        panel.points.map((point, pointIndex) => (
                          <circle
                            key={`${panel.id}-point-${pointIndex}`}
                            cx={point.x * selectedPage.width}
                            cy={point.y * selectedPage.height}
                            r="12"
                            className="panel-vertex"
                            onPointerDown={(event) => handleVertexPointerDown(event, panel, pointIndex)}
                          />
                        ))}
                    </g>
                  ))}

                  {draftPreviewPoints.length > 0 && (
                    <polyline
                      points={getPolygonPointString(draftPreviewPoints, selectedPage)}
                      className="draft-polyline"
                    />
                  )}
                  {draftPoints.length >= 3 && (
                    <polygon
                      points={getPolygonPointString(draftPoints, selectedPage)}
                      className="draft-polygon"
                    />
                  )}
                </svg>
              </div>
            ) : (
              <div className="empty-stage">Prepare a PDF or select an existing comic to annotate panels.</div>
            )}
          </div>
        </section>

        <aside className="inspector">
          <div className="inspector-section">
            <h2>Selected Panel</h2>
            {selectedPanel ? (
              <>
                <label className="field">
                  <span>Label</span>
                  <input
                    value={selectedPanel.label || ""}
                    onChange={(event) => setPanelField("label", event.target.value)}
                    placeholder="Optional panel label"
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    value={selectedPanel.notes || ""}
                    onChange={(event) => setPanelField("notes", event.target.value)}
                    rows={4}
                    placeholder="Optional annotation notes"
                  />
                </label>
                <dl className="panel-metrics">
                  <div>
                    <dt>Page</dt>
                    <dd>{selectedPanel.pageId}</dd>
                  </div>
                  <div>
                    <dt>Points</dt>
                    <dd>{selectedPanel.points.length}</dd>
                  </div>
                  <div>
                    <dt>Polygon</dt>
                    <dd>{selectedPanel.points.map((point) => `(${point.x}, ${point.y})`).join(", ")}</dd>
                  </div>
                </dl>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={() => reorderPanel(selectedPanel.id, -1)}>
                    Move Earlier
                  </button>
                  <button type="button" className="secondary-button" onClick={() => reorderPanel(selectedPanel.id, 1)}>
                    Move Later
                  </button>
                  <button type="button" className="danger-button" onClick={deleteSelectedPanel}>
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <p className="empty-state">Select or draw a polygon to inspect it.</p>
            )}
          </div>

          <div className="inspector-section">
            <div className="preview-header">
              <h2>Preview</h2>
              <span>
                {orderedPanels.length ? `${previewIndex + 1} / ${orderedPanels.length}` : "0 / 0"}
              </span>
            </div>
            <p className="preview-copy">
              Open the modal preview to see the panel-by-panel reading flow with the rest of the page dimmed.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                disabled={!orderedPanels.length}
                onClick={() => setIsPreviewOpen(true)}
              >
                Open Preview
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={previewIndex <= 0}
                onClick={() => setPreviewIndex((current) => Math.max(current - 1, 0))}
              >
                Previous
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={previewIndex >= orderedPanels.length - 1}
                onClick={() => setPreviewIndex((current) => Math.min(current + 1, orderedPanels.length - 1))}
              >
                Next
              </button>
            </div>
          </div>
        </aside>
      </main>

      {isPreviewOpen && (
        <div className="preview-modal-backdrop" onClick={() => setIsPreviewOpen(false)}>
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="preview-modal-header">
              <div>
                <h2>Comic Preview</h2>
                <p>
                  {previewPanel ? `Panel ${previewIndex + 1} of ${orderedPanels.length}` : "No panels available yet."}
                </p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsPreviewOpen(false)}>
                Close
              </button>
            </div>

            <div className="preview-modal-frame">
              {previewPanel && previewPage ? (
                <PreviewViewport page={previewPage} panel={previewPanel} />
              ) : (
                <div className="empty-preview">Preview appears once you have at least one panel.</div>
              )}
            </div>

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                disabled={previewIndex <= 0}
                onClick={() => setPreviewIndex((current) => Math.max(current - 1, 0))}
              >
                Previous
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={previewIndex >= orderedPanels.length - 1}
                onClick={() => setPreviewIndex((current) => Math.min(current + 1, orderedPanels.length - 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getNormalizedPointer(event: PointerEvent, element: HTMLElement) {
  const rect = element.getBoundingClientRect();

  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
}

function PreviewViewport({ page, panel }: { page: ComicPage; panel: ComicPanel }) {
  const maxViewportWidth = 960;
  const maxViewportHeight = 720;
  const polygonBounds = getPolygonBounds(panel.points);
  const paddedBounds = expandBounds(polygonBounds, PREVIEW_FRAME_PADDING);
  const previewBounds = getBoundsInPixels(paddedBounds, page);
  const panelAspectRatio = previewBounds.width / previewBounds.height;
  const maxViewportAspectRatio = maxViewportWidth / maxViewportHeight;
  const viewportWidth =
    panelAspectRatio >= maxViewportAspectRatio
      ? maxViewportWidth
      : maxViewportHeight * panelAspectRatio;
  const viewportHeight =
    panelAspectRatio >= maxViewportAspectRatio
      ? maxViewportWidth / panelAspectRatio
      : maxViewportHeight;
  const scale = viewportWidth / previewBounds.width;
  const translateX = -previewBounds.left * scale;
  const translateY = -previewBounds.top * scale;
  const polygonPoints = getPanelPoints(panel).map((point) => ({
    x: roundCoord(point.x * page.width),
    y: roundCoord(point.y * page.height),
  }));
  const polygonPath = polygonPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const maskPath = `M0 0 H${page.width} V${page.height} H0 Z ${polygonPath} Z`;

  return (
    <div
      className="preview-viewport preview-viewport-large"
      style={{
        width: viewportWidth,
        height: viewportHeight,
      }}
    >
      <div
        className="preview-scene preview-scene-large"
        style={{
          width: page.width,
          height: page.height,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <img
          src={page.src}
          alt={page.id}
          draggable={false}
          className="preview-image"
          style={{
            width: page.width,
            height: page.height,
          }}
        />
        <svg
          className="preview-mask-svg"
          viewBox={`0 0 ${page.width} ${page.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            width: page.width,
            height: page.height,
          }}
        >
          <path
            d={maskPath}
            fill="rgba(2, 6, 23, 0.9)"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

export default App;
