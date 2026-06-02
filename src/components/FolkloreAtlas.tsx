import { useEffect, useId, useState } from "react";
import type { AtlasEntry } from "@/utils/content";
import { sortTopicTags } from "@/utils/topic-tags";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

interface Props {
  entries: AtlasEntry[];
  labels: {
    relatedStoriesTitle: string;
    relatedResourcesTitle: string;
    noStoriesLabel: string;
    panelPrompt: string;
    markerCountLabel: string;
  };
}

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
const BANGLADESH_ZOOM = 7;

const FolkloreAtlas = ({ entries, labels }: Props) => {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const mapId = useId().replace(/:/g, "");

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }

    let map: import("leaflet").Map | undefined;

    void (async () => {
      const L = await import("leaflet");
      await import("leaflet.markercluster/dist/leaflet.markercluster-src.js");

      const defaultIcon = L.icon({
        iconRetinaUrl: markerIcon2x.src,
        iconUrl: markerIcon.src,
        shadowUrl: markerShadow.src,
        iconAnchor: [12, 41],
        iconSize: [25, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.Marker.prototype.options.icon = defaultIcon;

      map = L.map(mapId, {
        scrollWheelZoom: false,
        zoomControl: true,
        zoomSnap: 0.5,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      map.setView(BANGLADESH_CENTER, BANGLADESH_ZOOM);

      map.on("click", () => {
        setSelectedSlug(null);
      });

      const markerClusterGroupFactory = (
        L as typeof L & {
          markerClusterGroup?: (options?: {
            disableClusteringAtZoom?: number;
            maxClusterRadius?: number;
            showCoverageOnHover?: boolean;
            spiderfyOnMaxZoom?: boolean;
          }) => import("leaflet").LayerGroup;
        }
      ).markerClusterGroup;

      const clusterGroup = markerClusterGroupFactory
        ? markerClusterGroupFactory({
            disableClusteringAtZoom: 10,
            maxClusterRadius: 40,
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
          })
        : L.layerGroup();

      entries.forEach((entry) => {
        const marker = L.marker([entry.latitude, entry.longitude], {
          title: entry.item,
        });

        marker.on("click", () => {
          setSelectedSlug(entry.slug);
        });

        clusterGroup.addLayer(marker);
      });

      clusterGroup.addTo(map);
    })();

    return () => {
      map?.remove();
    };
  }, [entries, mapId]);

  const selectedEntry = entries.find((entry) => entry.slug === selectedSlug);
  const sortedTags = selectedEntry ? sortTopicTags(selectedEntry.types) : [];
  const isPanelOpen = Boolean(selectedEntry);

  return (
    <>
      <section className="space-y-4">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Folklore Atlas
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {entries.length} {labels.markerCountLabel}
              </h2>
            </div>
            <p className="hidden max-w-sm text-right text-sm text-slate-500 md:block">
              {labels.panelPrompt}
            </p>
          </div>

          <div className="folklore-atlas-shell relative isolate z-0">
            <div
              id={mapId}
              className="folklore-atlas-map h-[28rem] w-full md:h-[34rem] lg:h-[42rem]"
            />

            <aside
              className={`pointer-events-none absolute inset-x-3 bottom-3 z-20 transition duration-300 ease-out lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:w-[24rem] ${
                isPanelOpen
                  ? "translate-y-0 opacity-100 lg:translate-x-0"
                  : "translate-y-full opacity-0 lg:translate-x-[calc(100%+1rem)] lg:translate-y-0"
              }`}
            >
              <div className="pointer-events-auto flex h-full max-h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/15">
                {selectedEntry ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        {sortedTags.map((tag) => (
                          <span key={tag} className="badge badge-soft badge-primary">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        aria-label="Close details panel"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                        onClick={() => setSelectedSlug(null)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          className="h-5 w-5 stroke-current"
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

                    <div className="mt-4 flex-1 overflow-y-auto pr-1">
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                          {selectedEntry.item}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                          {selectedEntry.description}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-col gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {labels.relatedStoriesTitle}
                        </h4>
                      {selectedEntry.relatedStories.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {selectedEntry.relatedStories.map((story) => (
                            <a
                                key={story.slug}
                                href={story.href}
                                className="rounded-2xl border border-slate-200 px-4 py-3 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                <span className="block text-base font-semibold text-slate-900">
                                  {story.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm leading-6 text-slate-500">
                          {labels.noStoriesLabel}
                        </p>
                      )}
                    </div>

                    {selectedEntry.relatedResources.length > 0 ? (
                      <div className="mt-6 flex flex-col gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {labels.relatedResourcesTitle}
                        </h4>
                        <div className="flex flex-col gap-3">
                          {selectedEntry.relatedResources.map((resource) => (
                            <a
                              key={resource.slug}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-2xl border border-slate-200 px-4 py-3 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <span className="block text-base font-semibold text-slate-900">
                                {resource.title}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                  <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-8 text-center text-sm leading-6 text-slate-500">
                    {labels.panelPrompt}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <style>{`
        .folklore-atlas-shell .leaflet-pane,
        .folklore-atlas-shell .leaflet-top,
        .folklore-atlas-shell .leaflet-bottom {
          z-index: 1;
        }

        .folklore-atlas-shell .leaflet-popup-pane {
          z-index: 5;
        }
      `}</style>
    </>
  );
};

export default FolkloreAtlas;
