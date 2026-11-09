import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import HomepageMasonry from "@/components/HomepageMasonry";
import type {
  HomepageCatalogItem,
  HomepageConfig,
  HomepageContentType,
  HomepageResolvedTile,
  HomepageSource,
  HomepageTileConfig,
} from "@/types/homepage";

const ILLUSTRATIONS_API_URL =
  "https://otibeguni-illustrations-api.dry-glitter-f649.workers.dev/api/images?limit=500";

const TYPE_OPTIONS: Array<{ value: "all" | HomepageContentType; label: string }> = [
  { value: "all", label: "All content" },
  { value: "story", label: "Stories" },
  { value: "book", label: "Books" },
  { value: "sourceText", label: "Source texts" },
  { value: "topic", label: "Topics" },
  { value: "mazarTradition", label: "Mazar traditions" },
  { value: "resource", label: "Resources" },
  { value: "storyCollection", label: "Story collections" },
  { value: "publication", label: "Publications" },
  { value: "blogPost", label: "Blog posts" },
  { value: "illustration", label: "Illustrations" },
];

type IllustrationResponse = {
  items?: Array<{
    key: string;
    filename: string;
    thumbnailUrl: string;
    fullUrl: string;
  }>;
};

function getSourceKey(source: HomepageSource) {
  if (source.type === "story") {
    return `story:${source.language}:${source.slug}`;
  }
  if (source.type === "illustration") {
    return `illustration:${source.key}`;
  }
  return `${source.type}:${source.slug}`;
}

function cloneConfig(config: HomepageConfig): HomepageConfig {
  return JSON.parse(JSON.stringify(config)) as HomepageConfig;
}

function sourceToTileId(source: HomepageSource) {
  return getSourceKey(source).replace(/[^A-Za-z0-9_-]+/g, "-");
}

function makeIllustrationCatalogItem(
  item: NonNullable<IllustrationResponse["items"]>[number],
): HomepageCatalogItem {
  const source: HomepageSource = {
    type: "illustration",
    key: item.key,
    filename: item.filename,
    thumbnailUrl: item.thumbnailUrl,
    fullUrl: item.fullUrl,
  };
  const title = item.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return {
    sourceKey: getSourceKey(source),
    type: "illustration",
    typeLabel: "Illustration",
    source,
    title: title || item.filename,
    description: "Vintage illustration from the Otibeguni archive",
    image: item.thumbnailUrl,
    href: "/vintage-illustrations",
    searchText: `${title} ${item.filename} ${item.key}`.toLowerCase(),
  };
}

function resolveDraftTiles(
  config: HomepageConfig,
  catalog: HomepageCatalogItem[],
  initialTiles: HomepageResolvedTile[],
): HomepageResolvedTile[] {
  const catalogByKey = new Map(catalog.map((item) => [item.sourceKey, item]));
  const initialByKey = new Map(initialTiles.map((item) => [item.sourceKey, item]));

  return config.tiles.flatMap((tile) => {
    const sourceKey = getSourceKey(tile.source);
    const catalogItem = catalogByKey.get(sourceKey);
    const initialTile = initialByKey.get(sourceKey);
    let sourceItem = catalogItem ?? initialTile;

    if (!sourceItem && tile.source.type === "illustration") {
      sourceItem = makeIllustrationCatalogItem(tile.source);
    }

    if (!sourceItem) return [];

    const defaults = catalogItem ? undefined : initialTile;
    const defaultTitle = defaults ? defaults.defaultTitle : sourceItem.title;
    const defaultDescription = defaults ? defaults.defaultDescription : sourceItem.description;
    const defaultImage = defaults ? defaults.defaultImage : sourceItem.image;

    return [
      {
        ...sourceItem,
        id: tile.id,
        defaultTitle,
        defaultDescription,
        defaultImage,
        title: tile.titleOverride ?? defaultTitle,
        description: tile.descriptionOverride ?? defaultDescription,
        image: tile.imageOverride ?? defaultImage,
        titleOverride: tile.titleOverride,
        descriptionOverride: tile.descriptionOverride,
        imageOverride: tile.imageOverride,
      },
    ];
  });
}

export default function HomepageEditor({
  initialConfig,
  initialTiles,
  catalog,
}: {
  initialConfig: HomepageConfig;
  initialTiles: HomepageResolvedTile[];
  catalog: HomepageCatalogItem[];
}) {
  const [savedConfig, setSavedConfig] = useState(() => cloneConfig(initialConfig));
  const [draftConfig, setDraftConfig] = useState(() => cloneConfig(initialConfig));
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | HomepageContentType>("all");
  const [illustrations, setIllustrations] = useState<HomepageCatalogItem[]>([]);
  const [illustrationStatus, setIllustrationStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">(
    "idle",
  );
  const [uploadMessage, setUploadMessage] = useState("");
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());
  const allCatalog = useMemo(() => [...catalog, ...illustrations], [catalog, illustrations]);
  const resolvedTiles = useMemo(
    () => resolveDraftTiles(draftConfig, allCatalog, initialTiles),
    [allCatalog, draftConfig, initialTiles],
  );
  const selectedSourceKeys = useMemo(
    () => new Set(draftConfig.tiles.map((tile) => getSourceKey(tile.source))),
    [draftConfig.tiles],
  );
  const isDirty = JSON.stringify(draftConfig) !== JSON.stringify(savedConfig);
  const editingTile = editingTileId
    ? draftConfig.tiles.find((tile) => tile.id === editingTileId) ?? null
    : null;
  const editingResolvedTile = editingTileId
    ? resolvedTiles.find((tile) => tile.id === editingTileId) ?? null
    : null;

  const availableCatalog = useMemo(() => {
    return allCatalog
      .filter((item) => !selectedSourceKeys.has(item.sourceKey))
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => !deferredSearch || item.searchText.includes(deferredSearch))
      .slice(0, 100);
  }, [allCatalog, deferredSearch, selectedSourceKeys, typeFilter]);

  useEffect(() => {
    if (drawerMode !== "add" || illustrationStatus !== "idle") return;

    const controller = new AbortController();
    setIllustrationStatus("loading");

    fetch(ILLUSTRATIONS_API_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Illustrations request failed: ${response.status}`);
        return response.json() as Promise<IllustrationResponse>;
      })
      .then((data) => {
        setIllustrations((data.items ?? []).map(makeIllustrationCatalogItem));
        setIllustrationStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIllustrationStatus("error");
      });

    return () => controller.abort();
  }, [drawerMode, illustrationStatus]);

  useEffect(() => {
    if (!drawerMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerMode(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerMode]);

  const openAddDrawer = () => {
    setEditingTileId(null);
    setDrawerMode("add");
    setSearchQuery("");
    setTypeFilter("all");
    setSaveMessage("");
  };

  const openEditDrawer = useCallback((tileId: string) => {
    setEditingTileId(tileId);
    setDrawerMode("edit");
    setUploadMessage("");
  }, []);

  const addTile = (item: HomepageCatalogItem) => {
    const tile: HomepageTileConfig = {
      id: sourceToTileId(item.source),
      source: item.source,
    };
    setDraftConfig((current) => ({ ...current, tiles: [...current.tiles, tile] }));
    setEditingTileId(tile.id);
    setDrawerMode("edit");
  };

  const patchTile = (tileId: string, patch: Partial<HomepageTileConfig>) => {
    setDraftConfig((current) => ({
      ...current,
      tiles: current.tiles.map((tile) =>
        tile.id === tileId ? { ...tile, ...patch } : tile,
      ),
    }));
    setSaveStatus("idle");
  };

  const reorderTiles = useCallback((tileIds: string[]) => {
    setDraftConfig((current) => {
      if (tileIds.length !== current.tiles.length) return current;
      const tilesById = new Map(current.tiles.map((tile) => [tile.id, tile]));
      const tiles = tileIds.flatMap((id) => {
        const tile = tilesById.get(id);
        return tile ? [tile] : [];
      });
      return tiles.length === current.tiles.length ? { ...current, tiles } : current;
    });
    setSaveStatus("idle");
  }, []);

  const removeTileById = useCallback((tileId: string) => {
    setDraftConfig((current) => ({
      ...current,
      tiles: current.tiles.filter((tile) => tile.id !== tileId),
    }));
    if (editingTileId === tileId) {
      setDrawerMode(null);
      setEditingTileId(null);
    }
    setSaveStatus("idle");
  }, [editingTileId]);

  const removeEditingTile = () => {
    if (editingTileId) removeTileById(editingTileId);
  };

  const save = async () => {
    setSaveStatus("saving");
    setSaveMessage("");
    try {
      const response = await fetch("/__local-content/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftConfig),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Could not save the homepage configuration");
      }
      setSavedConfig(cloneConfig(draftConfig));
      setSaveStatus("saved");
      setSaveMessage("Homepage saved to the repository.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Could not save the homepage");
    }
  };

  const discard = () => {
    setDraftConfig(cloneConfig(savedConfig));
    setDrawerMode(null);
    setEditingTileId(null);
    setSaveStatus("idle");
    setSaveMessage("Draft changes discarded.");
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingTileId) return;

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read the selected image"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/__local-content/homepage/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        result?: {
          path?: string;
        };
        error?: string;
      };
      const uploadedPath = result.result?.path;
      if (!response.ok || !result.ok || !uploadedPath) {
        throw new Error(result.error || "Could not upload the image");
      }
      patchTile(editingTileId, { imageOverride: uploadedPath });
      setUploadStatus("idle");
      setUploadMessage("Image copied to public/images/homepage. Save to use it.");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Could not upload the image");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div>
      {!isPreviewing && (
        <div className="mb-4 flex justify-end">
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm"
            role="toolbar"
            aria-label="Homepage editor controls"
          >
            <button
              type="button"
              className="btn btn-sm btn-square btn-ghost"
              onClick={() => {
                setDrawerMode(null);
                setEditingTileId(null);
                setIsPreviewing(true);
              }}
              aria-label="Preview homepage"
              title="Preview homepage"
            >
              <i className="fa-solid fa-eye" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-square btn-ghost"
              onClick={openAddDrawer}
              aria-label="Add tile"
              title="Add tile"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-square btn-ghost"
              onClick={discard}
              disabled={!isDirty}
              aria-label="Discard changes"
              title="Discard changes"
            >
              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-square btn-primary"
              onClick={save}
              disabled={!isDirty || saveStatus === "saving"}
              aria-label={saveStatus === "saving" ? "Saving homepage" : "Save homepage"}
              title={saveStatus === "saving" ? "Saving homepage" : "Save homepage"}
            >
              <i
                className={`fa-solid ${saveStatus === "saving" ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
                aria-hidden="true"
              />
            </button>
            <span className="sr-only" aria-live="polite">
              {isDirty && saveStatus !== "saving" ? "Unsaved changes. " : ""}
              {saveMessage}
            </span>
          </div>
        </div>
      )}

      <HomepageMasonry
        tiles={resolvedTiles}
        editable={!isPreviewing}
        onEdit={isPreviewing ? undefined : openEditDrawer}
        onRemove={isPreviewing ? undefined : removeTileById}
        onReorder={isPreviewing ? undefined : reorderTiles}
      />

      {isPreviewing && (
        <button
          type="button"
          className="btn btn-primary fixed bottom-6 right-6 z-[110] shadow-xl"
          onClick={() => setIsPreviewing(false)}
        >
          Exit preview
        </button>
      )}

      {!isPreviewing && drawerMode && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/45" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close homepage editor"
            onClick={() => setDrawerMode(null)}
          />
          <aside
            className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-editor-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  Homepage editor
                </p>
                <h2 id="homepage-editor-title" className="mt-1 text-2xl font-bold text-slate-900">
                  {drawerMode === "add" ? "Add a tile" : "Edit tile"}
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setDrawerMode(null)}
              >
                Close
              </button>
            </div>

            {drawerMode === "add" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-[1fr_12rem] sm:px-7">
                  <label className="form-control">
                    <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Search
                    </span>
                    <input
                      type="search"
                      className="input input-bordered w-full"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Title, slug, or description"
                      autoFocus
                    />
                  </label>
                  <label className="form-control">
                    <span className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Type
                    </span>
                    <select
                      className="select select-bordered w-full"
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(event.target.value as "all" | HomepageContentType)
                      }
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                  {typeFilter === "illustration" && illustrationStatus === "loading" && (
                    <p className="mb-4 text-sm text-slate-500">Loading illustrations…</p>
                  )}
                  {typeFilter === "illustration" && illustrationStatus === "error" && (
                    <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      Illustrations could not be loaded. Other content remains available.
                    </p>
                  )}
                  <div className="space-y-3">
                    {availableCatalog.map((item) => (
                      <button
                        key={item.sourceKey}
                        type="button"
                        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        onClick={() => addTile(item)}
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
                              {item.typeLabel}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-indigo-600">
                            {item.typeLabel}{item.language ? ` · ${item.language.toUpperCase()}` : ""}
                          </div>
                          <div className="mt-1 font-semibold leading-snug text-slate-900">{item.title}</div>
                          <div className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                            {item.description}
                          </div>
                        </div>
                        <span className="text-xl text-slate-400" aria-hidden="true">+</span>
                      </button>
                    ))}
                    {availableCatalog.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                        No available content matches these filters.
                      </div>
                    )}
                  </div>
                  {availableCatalog.length === 100 && (
                    <p className="mt-4 text-center text-xs text-slate-500">
                      Showing the first 100 matches. Refine the search to narrow the list.
                    </p>
                  )}
                </div>
              </div>
            ) : editingTile && editingResolvedTile ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                <div className="space-y-6">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                      {editingResolvedTile.typeLabel}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {editingResolvedTile.defaultTitle}
                    </div>
                    <div className="mt-1 break-all text-xs text-slate-500">
                      {editingResolvedTile.sourceKey}
                    </div>
                  </div>

                  <label className="form-control">
                    <span className="mb-2 font-semibold text-slate-800">Title</span>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editingResolvedTile.title}
                      onChange={(event) => {
                        const value = event.target.value;
                        patchTile(editingTile.id, {
                          titleOverride:
                            value.trim() && value !== editingResolvedTile.defaultTitle
                              ? value
                              : undefined,
                        });
                      }}
                    />
                    {editingTile.titleOverride && (
                      <button
                        type="button"
                        className="mt-2 self-start text-sm font-semibold text-indigo-700 hover:underline"
                        onClick={() => patchTile(editingTile.id, { titleOverride: undefined })}
                      >
                        Reset to content title
                      </button>
                    )}
                  </label>

                  <label className="form-control">
                    <span className="mb-2 font-semibold text-slate-800">Description</span>
                    <textarea
                      className="textarea textarea-bordered min-h-32 w-full leading-6"
                      value={editingResolvedTile.description}
                      onChange={(event) => {
                        const value = event.target.value;
                        patchTile(editingTile.id, {
                          descriptionOverride:
                            value.trim() && value !== editingResolvedTile.defaultDescription
                              ? value
                              : undefined,
                        });
                      }}
                    />
                    {editingTile.descriptionOverride && (
                      <button
                        type="button"
                        className="mt-2 self-start text-sm font-semibold text-indigo-700 hover:underline"
                        onClick={() => patchTile(editingTile.id, { descriptionOverride: undefined })}
                      >
                        Reset to content description
                      </button>
                    )}
                  </label>

                  <div>
                    <div className="font-semibold text-slate-800">Cover image</div>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {editingResolvedTile.image ? (
                        <img
                          src={editingResolvedTile.image}
                          alt="Current tile cover"
                          className="aspect-[16/9] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[16/9] items-center justify-center text-sm text-slate-500">
                          This content has no default cover.
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="btn btn-sm btn-outline">
                        {uploadStatus === "uploading" ? "Uploading…" : "Upload replacement"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="sr-only"
                          disabled={uploadStatus === "uploading"}
                          onChange={uploadImage}
                        />
                      </label>
                      {editingTile.imageOverride && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => patchTile(editingTile.id, { imageOverride: undefined })}
                        >
                          Reset to content cover
                        </button>
                      )}
                    </div>
                    {uploadMessage && (
                      <p
                        className={`mt-2 text-sm ${
                          uploadStatus === "error" ? "text-red-700" : "text-emerald-700"
                        }`}
                        aria-live="polite"
                      >
                        {uploadMessage}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <button type="button" className="btn btn-error btn-outline" onClick={removeEditingTile}>
                      Remove tile
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-7 text-sm text-slate-500">This tile is no longer available.</div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
