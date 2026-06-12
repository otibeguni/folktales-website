import { useEffect, useMemo, useRef, useState } from "react";

type PanelPoint = {
  x: number;
  y: number;
};

type ComicPage = {
  id: string;
  src: string;
  width: number;
  height: number;
};

type ComicPanel = {
  id: string;
  pageId: string;
  order: number;
  points: PanelPoint[];
  label?: string;
};

type ComicManifest = {
  slug: string;
  title: string;
  pages: ComicPage[];
  panels: ComicPanel[];
};

type ComicReaderProps = {
  comic: ComicManifest;
};

type FrameSize = {
  width: number;
  height: number;
};

type SwipeState = {
  startX: number;
  startY: number;
};

const PREVIEW_FRAME_PADDING = 0.18;
const PREVIEW_MIN_PADDING_X = 0.05;
const PREVIEW_MIN_PADDING_Y = 0.05;
const SWIPE_THRESHOLD = 48;
const SWIPE_VERTICAL_LOCK = 36;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function roundCoord(value: number) {
  return Number(value.toFixed(6));
}

function sortPanels(panels: ComicPanel[]) {
  return [...panels].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function getPageById(pages: ComicPage[], pageId: string) {
  return pages.find((page) => page.id === pageId);
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

function getBoundsInPixels(
  bounds: { left: number; top: number; right: number; bottom: number },
  page: ComicPage,
) {
  return {
    left: bounds.left * page.width,
    top: bounds.top * page.height,
    width: (bounds.right - bounds.left) * page.width,
    height: (bounds.bottom - bounds.top) * page.height,
  };
}

function getPolygonPath(points: PanelPoint[], page: ComicPage) {
  return points
    .map((point, index) => {
      const x = roundCoord(point.x * page.width);
      const y = roundCoord(point.y * page.height);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function ComicReader({ comic }: ComicReaderProps) {
  const orderedPanels = useMemo(() => sortPanels(comic.panels), [comic.panels]);
  const [activeIndex, setActiveIndex] = useState(0);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const swipeStartRef = useRef<SwipeState | null>(null);

  const activePanel = orderedPanels[activeIndex];
  const activePage = activePanel ? getPageById(comic.pages, activePanel.pageId) : undefined;

  useEffect(() => {
    const frameElement = frameRef.current;

    if (!frameElement) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setFrameSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(frameElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => Math.min(current + 1, orderedPanels.length - 1));
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedPanels.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [comic.slug]);

  if (!activePanel || !activePage) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600 shadow-sm">
        No panel metadata is available for this comic yet.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#081224] text-white shadow-[0_30px_80px_-45px_rgba(8,18,36,0.95)]">
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div
          ref={frameRef}
          className="relative flex h-[58vh] min-h-[360px] items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#020817] sm:h-[72vh] sm:min-h-[520px]"
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];

            if (!touch) {
              return;
            }

            swipeStartRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
            };
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            const swipeStart = swipeStartRef.current;
            swipeStartRef.current = null;

            if (!touch || !swipeStart) {
              return;
            }

            const deltaX = touch.clientX - swipeStart.startX;
            const deltaY = touch.clientY - swipeStart.startY;

            if (Math.abs(deltaY) > SWIPE_VERTICAL_LOCK || Math.abs(deltaX) < SWIPE_THRESHOLD) {
              return;
            }

            if (deltaX < 0) {
              setActiveIndex((current) => Math.min(current + 1, orderedPanels.length - 1));
              return;
            }

            setActiveIndex((current) => Math.max(current - 1, 0));
          }}
        >
          {frameSize.width > 0 && frameSize.height > 0 ? (
            <PreviewViewport page={activePage} panel={activePanel} frameSize={frameSize} />
          ) : null}
        </div>
      </div>

      <div className="flex justify-center border-t border-white/10 px-5 py-5 sm:px-8">
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-slate-400"
            disabled={activeIndex <= 0}
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            disabled={activeIndex >= orderedPanels.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(current + 1, orderedPanels.length - 1))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function PreviewViewport({
  page,
  panel,
  frameSize,
}: {
  page: ComicPage;
  panel: ComicPanel;
  frameSize: FrameSize;
}) {
  const polygonBounds = getPolygonBounds(panel.points);
  const paddedBounds = expandBounds(polygonBounds, PREVIEW_FRAME_PADDING);
  const previewBounds = getBoundsInPixels(paddedBounds, page);
  const viewportAspectRatio = previewBounds.width / previewBounds.height;
  const frameAspectRatio = frameSize.width / frameSize.height;
  const viewportWidth =
    viewportAspectRatio >= frameAspectRatio ? frameSize.width : frameSize.height * viewportAspectRatio;
  const viewportHeight =
    viewportAspectRatio >= frameAspectRatio ? frameSize.width / viewportAspectRatio : frameSize.height;
  const scale = viewportWidth / previewBounds.width;
  const translateX = -previewBounds.left * scale;
  const translateY = -previewBounds.top * scale;
  const polygonPath = getPolygonPath(panel.points, page);
  const maskPath = `M0 0 H${page.width} V${page.height} H0 Z ${polygonPath} Z`;

  return (
    <div
      className="relative overflow-hidden rounded-[1.4rem] bg-[#020617]"
      style={{
        width: viewportWidth,
        height: viewportHeight,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: page.width,
          height: page.height,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: "top left",
          transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <img
          src={page.src}
          alt={page.id}
          draggable={false}
          className="absolute inset-0 block max-w-none select-none"
          style={{
            width: page.width,
            height: page.height,
          }}
        />
        <svg
          viewBox={`0 0 ${page.width} ${page.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 block"
          style={{
            width: page.width,
            height: page.height,
          }}
        >
          <path d={maskPath} fill="rgba(2, 6, 23, 0.88)" fillRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

export default ComicReader;
