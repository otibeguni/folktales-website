import { useEffect, useRef, useState } from "react";

const ILLUSTRATIONS_API_URL =
  "https://otibeguni-illustrations-api.dry-glitter-f649.workers.dev/api/images?limit=500";

interface IllustrationItem {
  key: string;
  filename: string;
  thumbnailUrl: string;
  fullUrl: string;
}

interface GalleryResponse {
  items?: IllustrationItem[];
}

const VintageIllustrationsGallery = () => {
  const [items, setItems] = useState<IllustrationItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedItem = selectedIndex === null ? null : items[selectedIndex];

  useEffect(() => {
    const controller = new AbortController();

    const loadImages = async () => {
      try {
        const response = await fetch(ILLUSTRATIONS_API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Illustrations request failed: ${response.status}`);
        }

        const data = (await response.json()) as GalleryResponse;
        const nextItems = Array.isArray(data.items) ? data.items : [];

        setItems(nextItems);
        setStatus(nextItems.length > 0 ? "ready" : "empty");
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      }
    };

    void loadImages();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null || items.length === 0) {
            return currentIndex;
          }

          return currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        });
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => {
          if (currentIndex === null || items.length === 0) {
            return currentIndex;
          }

          return currentIndex === items.length - 1 ? 0 : currentIndex + 1;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [items.length, selectedItem]);

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
        Loading illustrations.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
        Illustrations could not be loaded.
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-600">
        No illustrations found.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className="group aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setSelectedIndex(index)}
            aria-label={`Open ${item.filename}`}
          >
            <img
              src={item.thumbnailUrl}
              alt={`Vintage illustration ${item.filename}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Vintage illustration ${selectedItem.filename}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIndex(null);
            }
          }}
        >
          <div className="relative flex max-h-full max-w-full items-center justify-center">
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-slate-950/80 text-lg font-semibold leading-none text-white shadow-sm transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close illustration"
              onClick={() => setSelectedIndex(null)}
            >
              x
            </button>
            <img
              src={selectedItem.fullUrl}
              alt={`Vintage illustration ${selectedItem.filename}`}
              className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg bg-white object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default VintageIllustrationsGallery;
