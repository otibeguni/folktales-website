import { useEffect, useId, useRef, useState } from "react";
import AudioPlayer from "react-h5-audio-player";
import type { DialectMapEntry } from "@/data/dialect-map";
import "leaflet/dist/leaflet.css";
import "react-h5-audio-player/lib/styles.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

interface Props {
  entries: DialectMapEntry[];
  labels: {
    panelPrompt: string;
    markerCountLabel: string;
  };
}

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
const DEFAULT_ZOOM = 7;

const DialectMap = ({ entries, labels }: Props) => {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const mapId = useId().replace(/:/g, "");
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }

    let map: import("leaflet").Map | undefined;

    void (async () => {
      const L = await import("leaflet");

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

      map.setView(BANGLADESH_CENTER, DEFAULT_ZOOM);
      map.on("click", () => {
        setSelectedSlug(null);
      });

      const bounds = L.latLngBounds(entries.map((entry) => [entry.latitude, entry.longitude]));

      entries.forEach((entry) => {
        const marker = L.marker([entry.latitude, entry.longitude], {
          title: entry.name,
        });

        marker.bindTooltip(entry.name, {
          permanent: true,
          direction: "top",
          offset: [0, -28],
          className: "dialect-map-marker-label",
        });

        marker.on("click", () => {
          setSelectedSlug(entry.slug);
        });

        marker.addTo(map!);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.18), {
          maxZoom: 8,
          padding: [36, 36],
        });
      }
    })();

    return () => {
      map?.remove();
    };
  }, [entries, mapId]);

  const selectedEntry = entries.find((entry) => entry.slug === selectedSlug);
  const isPanelOpen = Boolean(selectedEntry);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const autoplayTimeout = window.setTimeout(() => {
      playerRef.current?.playAudioPromise();
    }, 80);

    return () => {
      window.clearTimeout(autoplayTimeout);
      playerRef.current?.audio.current?.pause();
    };
  }, [selectedEntry]);

  return (
    <>
      <section className="space-y-4">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Dialect Map
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {entries.length} {labels.markerCountLabel}
              </h2>
            </div>
            <p className="hidden max-w-sm text-right text-sm text-slate-500 md:block">
              {labels.panelPrompt}
            </p>
          </div>

          <div className="dialect-map-shell relative isolate z-0">
            <div
              id={mapId}
              className="dialect-map-canvas h-[28rem] w-full md:h-[34rem] lg:h-[42rem]"
            />

            <aside
              className={`pointer-events-none absolute inset-x-3 bottom-3 z-20 transition duration-300 ease-out md:max-w-md lg:inset-x-auto lg:bottom-4 lg:right-4 lg:w-[22rem] ${
                isPanelOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <div className="pointer-events-auto rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur">
                {selectedEntry ? (
                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold tracking-tight text-slate-900">
                        {selectedEntry.name}
                      </p>
                    </div>

                    <AudioPlayer
                      ref={playerRef}
                      key={selectedEntry.slug}
                      autoPlay
                      autoPlayAfterSrcChange
                      src={selectedEntry.audioUrl}
                      showJumpControls={false}
                      layout="stacked-reverse"
                      customAdditionalControls={[]}
                      className="dialect-audio-player"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 px-5 py-6 text-center text-sm leading-6 text-slate-500">
                    {labels.panelPrompt}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <style>{`
        .dialect-map-shell .leaflet-pane,
        .dialect-map-shell .leaflet-top,
        .dialect-map-shell .leaflet-bottom {
          z-index: 1;
        }

        .dialect-map-shell .leaflet-tooltip.dialect-map-marker-label {
          border: 0;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.88);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 0.4rem 0.7rem;
          white-space: nowrap;
        }

        .dialect-map-shell .leaflet-tooltip-top.dialect-map-marker-label::before {
          border-top-color: rgba(15, 23, 42, 0.88);
        }

        .dialect-audio-player.rhap_container {
          background: transparent;
          box-shadow: none;
          padding: 1rem;
        }

        .dialect-audio-player .rhap_main-controls-button,
        .dialect-audio-player .rhap_volume-button {
          color: rgb(15 23 42);
        }

        .dialect-audio-player .rhap_progress-filled,
        .dialect-audio-player .rhap_progress-indicator,
        .dialect-audio-player .rhap_volume-filled,
        .dialect-audio-player .rhap_volume-indicator {
          background: rgb(15 23 42);
        }
      `}</style>
    </>
  );
};

export default DialectMap;
