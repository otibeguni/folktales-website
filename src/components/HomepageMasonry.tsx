import { useEffect, useRef, useState, type CSSProperties } from "react";
import type Muuri from "muuri";

import type { HomepageResolvedTile } from "@/types/homepage";
import "@/styles/homepage-masonry.css";

type HomepageMasonryProps = {
  tiles: HomepageResolvedTile[];
  editable?: boolean;
  onEdit?: (tileId: string) => void;
  onRemove?: (tileId: string) => void;
  onReorder?: (tileIds: string[]) => void;
};

export default function HomepageMasonry({
  tiles,
  editable = false,
  onEdit,
  onRemove,
  onReorder,
}: HomepageMasonryProps) {
  const gridElementRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Muuri | null>(null);
  const onReorderRef = useRef(onReorder);
  const enteredRef = useRef(false);
  const [isMuuriActive, setIsMuuriActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const tileOrderKey = tiles.map((tile) => tile.id).join("|");
  const tileContentKey = tiles
    .map((tile) => `${tile.id}:${tile.title}:${tile.description}:${tile.image ?? ""}`)
    .join("|");

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    const gridElement = gridElementRef.current;
    if (!gridElement) return;

    let cancelled = false;
    let grid: Muuri | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: number | undefined;

    void import("muuri").then(({ default: MuuriConstructor }) => {
      if (cancelled) return;

      // Muuri can temporarily move elements outside React's expected order
      // during a drag. Remove any obsolete or duplicate nodes before creating
      // the next grid instance so a simultaneous edit cannot leave a ghost tile.
      const expectedTileIds = new Set(tiles.map((tile) => tile.id));
      const mountedTileIds = new Set<string>();
      gridElement.querySelectorAll<HTMLElement>(".homepage-masonry-item").forEach((item) => {
        const tileId = item.dataset.tileId;
        if (!tileId || !expectedTileIds.has(tileId) || mountedTileIds.has(tileId)) {
          item.remove();
          return;
        }
        mountedTileIds.add(tileId);
      });

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gridElement.classList.add("is-muuri");
      setIsMuuriActive(true);
      grid = new MuuriConstructor(gridElement, {
        items: ".homepage-masonry-item",
        dragEnabled: editable,
        dragHandle: ".homepage-tile-shell",
        dragStartPredicate: (item, event) => {
          const target = event.srcEvent?.target;
          if (target instanceof Element && target.closest(".homepage-tile-actions")) {
            return false;
          }
          return MuuriConstructor.ItemDrag.defaultStartPredicate(item, event, {
            distance: 5,
            delay: 0,
          });
        },
        dragSort: true,
        dragSortPredicate: {
          threshold: 50,
          action: "move",
        },
        dragRelease: {
          duration: reducedMotion ? 0 : 260,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
        layout: {
          fillGaps: false,
          horizontal: false,
          alignRight: false,
          alignBottom: false,
          rounding: false,
        },
        layoutDuration: reducedMotion ? 0 : 360,
        layoutEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
        layoutOnResize: 120,
      });

      gridRef.current = grid;

      const markReady = () => {
        if (!enteredRef.current) {
          enteredRef.current = true;
          setIsReady(true);
        }
      };

      grid.on("layoutEnd", markReady);
      grid.on("dragEnd", () => {
        if (!grid) return;
        grid.synchronize();
        const nextOrder = grid.getItems().flatMap((item) => {
          const id = item.getElement()?.getAttribute("data-tile-id");
          return id ? [id] : [];
        });
        onReorderRef.current?.(nextOrder);
      });

      grid.refreshItems().layout(true, markReady);

      // The site navigation changes the content column width without resizing
      // the browser window. Muuri only observes window resizes itself, so watch
      // the grid as well and recompute item widths after its container settles.
      if (typeof ResizeObserver !== "undefined") {
        let previousWidth = gridElement.getBoundingClientRect().width;
        resizeObserver = new ResizeObserver(([entry]) => {
          const nextWidth = entry?.contentRect.width ?? 0;
          if (!grid || Math.abs(nextWidth - previousWidth) < 0.5) return;
          previousWidth = nextWidth;
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            grid?.refreshItems().layout();
          }, 100);
        });
        resizeObserver.observe(gridElement);
      }
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.clearTimeout(resizeTimer);
      // Keep React-owned elements in the DOM. Removing them here leaves React
      // holding stale nodes with Muuri transforms after an effect restart.
      grid?.destroy();
      gridRef.current = null;
      gridElement.classList.remove("is-muuri");
    };
  }, [editable, tileOrderKey]);

  useEffect(() => {
    gridRef.current?.refreshItems().layout();
  }, [tileContentKey]);

  const refreshLayout = () => {
    gridRef.current?.refreshItems().layout();
  };

  if (tiles.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center text-slate-600">
        No homepage tiles have been selected yet.
      </div>
    );
  }

  return (
    <div
      ref={gridElementRef}
      className={`homepage-masonry-grid${isMuuriActive ? " is-muuri" : ""}${isReady ? " is-ready" : ""}`}
      aria-label="Featured Otibeguni content"
    >
      {tiles.map((tile, index) => (
        <div
          key={tile.id}
          className="homepage-masonry-item"
          data-tile-id={tile.id}
          style={{ "--tile-enter-index": Math.min(index, 8) } as CSSProperties}
        >
          <article
            className={`homepage-tile-shell${editable && !tile.image ? " homepage-tile-shell-no-image" : ""}`}
          >
            {editable && (
              <div className="homepage-tile-actions" aria-label={`Edit ${tile.title}`}>
                <button
                  type="button"
                  className="homepage-tile-action-button"
                  onClick={() => onEdit?.(tile.id)}
                  aria-label={`Edit ${tile.title}`}
                  title="Edit tile"
                >
                  <i className="fa-solid fa-pen" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="homepage-tile-action-button homepage-tile-remove-button"
                  onClick={() => onRemove?.(tile.id)}
                  aria-label={`Remove ${tile.title}`}
                  title="Remove tile"
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </div>
            )}

            <a
              href={tile.href}
              target={tile.isExternal ? "_blank" : undefined}
              rel={tile.isExternal ? "noreferrer noopener" : undefined}
              className="homepage-tile-card group"
            >
              {tile.image && (
                <div className="homepage-tile-image-frame">
                  <img
                    src={tile.image}
                    alt=""
                    loading={index < 3 ? "eager" : "lazy"}
                    className="homepage-tile-image"
                    onLoad={refreshLayout}
                    onError={refreshLayout}
                  />
                </div>
              )}

              <div className="homepage-tile-body">
                <h2 className="homepage-tile-title">{tile.title}</h2>
                <p className="homepage-tile-description">{tile.description}</p>
              </div>
            </a>
          </article>
        </div>
      ))}
    </div>
  );
}
