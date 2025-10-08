"use client";  // <-- THIS IS REQUIRED
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Tooltip } from "react-leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import LoadingSpinner from "../loading/LoadingSpinner";

// Fix for default icon (handle Next/Turbopack asset shapes)
// Import as strings; some bundlers return objects. We'll resolve at runtime.
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
// Create custom icon for user location
const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

function resolveAssetUrl(asset: unknown): string {
  if (typeof asset === "string") return asset;
  if (asset && typeof asset === "object") {
    const maybe = asset as Record<string, unknown>;
    if (typeof maybe.src === "string") return maybe.src as string;
    if (typeof maybe.default === "string") return (maybe.default as string);
  }
  return "";
}

// Ensure Leaflet has default icon URLs set globally
L.Icon.Default.mergeOptions({
  iconRetinaUrl: resolveAssetUrl(iconRetina),
  iconUrl: resolveAssetUrl(iconUrl),
  shadowUrl: resolveAssetUrl(iconShadow),
});



type MapProps = {
  stands: { id: number; lat: number; lng: number; title: string; address: string }[];
};

export default function Map({ stands }: MapProps) {
  // Center tightly on Stockholm
  const position = [59.3293, 18.0686];
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<L.LatLngLiteral | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.Control | null>(null);
  const lastTapRef = useRef<number>(0);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);

  function handleDoubleActivate() {
    setInteractionEnabled(true);
    setFullscreen(true);
    // Fit all stands when opening fullscreen after a short tick to ensure layout is ready
    setTimeout(() => {
      if (mapRef.current) {
        const bounds = L.latLngBounds(stands.map((s) => L.latLng(s.lat, s.lng)));
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
      }
    }, 100);
  }

  function styleRoutingPanel(open: boolean) {
    const control = routeRef.current as unknown as { getContainer?: () => HTMLElement } | null;
    const container = control?.getContainer ? control.getContainer() : null;
    if (!container) return;
    // Position the instructions container and slide it in/out
    container.style.position = "fixed";
    container.style.right = "0px";
    container.style.top = "88px"; // below header
    container.style.bottom = "20px";
    container.style.width = "320px";
    container.style.maxWidth = "90vw";
    container.style.overflow = "auto";
    container.style.zIndex = "1000";
    container.style.background = "rgba(0,0,0,0.85)";
    container.style.color = "#fff";
    container.style.borderLeft = "1px solid rgba(255,255,255,0.15)";
    container.style.transform = open ? "translateX(0%)" : "translateX(100%)";
    container.style.transition = "transform 200ms ease";
    setRoutePanelOpen(open);
  }

  function removeRouteSafely() {
    try {
      const control = routeRef.current as unknown as (L.Control & { remove?: () => void; _map?: L.Map | null }) | null;
      const map = mapRef.current;
      if (!control) return;
      // Prefer map.removeControl to avoid internal null map access
      if (map && typeof (map.removeControl as unknown) === "function" && control._map) {
        map.removeControl(control);
      } else if (typeof control.remove === "function" && control._map) {
        control.remove();
      }
    } catch {
      // no-op
    } finally {
      routeRef.current = null;
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {isLoadingLocation && <LoadingSpinner text="Finding your location..." />}
      {!interactionEnabled && !fullscreen && (
        <div
          onDoubleClick={handleDoubleActivate}
          onTouchStart={(e) => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              e.preventDefault();
              handleDoubleActivate();
            }
            lastTapRef.current = now;
          }}
          title="Double‑click to enable map"
          className="absolute inset-0 z-[1] flex items-center justify-center select-none cursor-zoom-in"
          style={{ background: "transparent" }}
        >
          <span className="rounded-full bg-black/50 text-white text-xs px-3 py-1 border border-white/20">
            Double‑click to enable map
          </span>
        </div>
      )}
      {fullscreen && (
        <div className="fixed right-3 z-[1000] flex gap-2" style={{ top: "88px" }}>
          <button
            type="button"
            onClick={async () => {
              if (!mapRef.current) return;
              setIsLoadingLocation(true);
              try {
                // Acquire location with robust retry strategy
                const ll = await acquireLocation();
                if (!ll || !mapRef.current) return;
                
                setUserLocation(ll);
                // Choose nearest stand by straight-line distance
                const nearest = getNearestStand(ll, stands);
                if (nearest && mapRef.current) {
                  if (routeRef.current) {
                    removeRouteSafely();
                  }
                  type LeafletRouting = { control: (options: unknown) => L.Control & { remove: () => void } };
                  const Routing = (L as unknown as { Routing?: LeafletRouting }).Routing;
                  if (Routing) {
                    try {
                      type OsrmRouterFactory = (options: { serviceUrl: string; timeout?: number; useHints?: boolean }) => unknown;
                      const osrmv1 = (Routing as unknown as { osrmv1?: OsrmRouterFactory }).osrmv1;
                      routeRef.current = Routing.control({
                        waypoints: [L.latLng(ll.lat, ll.lng), L.latLng(nearest.lat, nearest.lng)],
                        router: osrmv1 ? osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1", timeout: 10000, useHints: false }) : undefined,
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true,
                        show: true,
                        routeWhileDragging: false,
                        showAlternatives: false,
                        lineOptions: { styles: [{ color: "#06b6d4", opacity: 0.9, weight: 5 }] },
                      }).addTo(mapRef.current!);
                      setTimeout(() => styleRoutingPanel(false), 0);
                    } catch {
                      // If routing fails, just fit bounds as fallback
                      const b = L.latLngBounds([
                        L.latLng(ll.lat, ll.lng),
                        L.latLng(nearest.lat, nearest.lng),
                      ]);
                      mapRef.current!.fitBounds(b, { padding: [32, 32] });
                    }
                  } else {
                    const b = L.latLngBounds([
                      L.latLng(ll.lat, ll.lng),
                      L.latLng(nearest.lat, nearest.lng),
                    ]);
                    mapRef.current.fitBounds(b, { padding: [32, 32] });
                  }
                }
              } catch (error) {
                console.error('Failed to get location:', error);
              } finally {
                setIsLoadingLocation(false);
              }
            }}
            className="rounded-md bg-cyan-600 text-white text-xs px-3 py-1 border border-white/10 hover:bg-cyan-500"
          >
            Use my location
          </button>
          <button
            type="button"
            onClick={() => {
              setFullscreen(false);
              setInteractionEnabled(false);
              // Remove route on close
              if (routeRef.current) {
                removeRouteSafely();
              }
            }}
            className="rounded-md bg-black/60 text-white text-xs px-3 py-1 border border-white/20 hover:bg-black/70"
            title="Exit fullscreen"
          >
            Close
          </button>
        </div>
      )}
      <MapContainer
        center={position as L.LatLngExpression}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        style={{
          height: fullscreen ? "calc(100vh - 80px)" : "500px",
          width: fullscreen ? "100vw" : "100%",
          position: fullscreen ? ("fixed" as const) : ("relative" as const),
          left: fullscreen ? 0 : undefined,
          right: fullscreen ? 0 : undefined,
          top: fullscreen ? "80px" : undefined,
          zIndex: fullscreen ? 999 : 0,
        }}
      >
        <MapRefBinder onMap={(m) => { mapRef.current = m; }} />
        <InteractionToggler enabled={interactionEnabled} fullscreen={fullscreen} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stands.map((s) => (
        <Marker 
          key={s.id} 
          position={[s.lat, s.lng]}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="custom-tooltip">
            <strong>{s.title}</strong>
            <br />
            {s.address}
          </Tooltip>
          <Popup>
            <b>{s.title}</b>
            <br />
            {s.address}
            <br />
            {`Lat: ${s.lat}, Lng: ${s.lng}`}
          </Popup>
        </Marker>
      ))}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle center={userLocation} radius={60} pathOptions={{ color: "#ff0000", fillColor: "#ff0000", fillOpacity: 0.3 }} />
          </>
        )}
      </MapContainer>
      {fullscreen && routeRef.current && (
        <button
          type="button"
          onClick={() => styleRoutingPanel(!routePanelOpen)}
          className="fixed z-[1001] bg-black/70 text-white border border-white/20 rounded-l px-2 py-1"
          style={{
            right: routePanelOpen ? 320 : 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          aria-label="Toggle directions panel"
          title="Toggle directions"
        >
          {routePanelOpen ? "»" : "«"}
        </button>
      )}
    </div>
  );
}

function getNearestStand(origin: L.LatLngLiteral, stands: { id: number; lat: number; lng: number; title: string }[]) {
  let best = null as null | { id: number; lat: number; lng: number; title: string };
  let bestD = Infinity;
  for (const s of stands) {
    const d = haversine(origin.lat, origin.lng, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geo unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function acquireLocation(): Promise<L.LatLngLiteral | null> {
  try {
    // Prefer high accuracy first (GPS)
    const accurate = await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    return { lat: accurate.coords.latitude, lng: accurate.coords.longitude };
  } catch {
    try {
      // Fallback: low accuracy, but only if recent
      const fast = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });
      return { lat: fast.coords.latitude, lng: fast.coords.longitude };
    } catch {
      return null;
    }
  }
}

// Removed: using straight-line distance for nearest selection to avoid long detours
/* async function getNearestStandByOsrm(origin: L.LatLngLiteral, stands: { id: number; lat: number; lng: number; title: string }[]) {
  try {
    if (stands.length === 0) return null;
    // OSRM expects lon,lat
    const coords = [[origin.lng, origin.lat], ...stands.map((s) => [s.lng, s.lat])]
      .map((p) => p.join(","))
      .join(";");
    const destinations = stands.map((_, i) => i + 1).join(";");
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${destinations}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("osrm table failed");
    const data = await res.json() as { durations?: number[][] };
    const row = data.durations?.[0];
    if (!row || row.length !== stands.length) throw new Error("invalid osrm response");
    let bestIdx = 0;
    let bestVal = Number.POSITIVE_INFINITY;
    for (let i = 0; i < row.length; i++) {
      const d = row[i];
      if (typeof d === "number" && isFinite(d) && d < bestVal) {
        bestVal = d;
        bestIdx = i;
      }
    }
    return stands[bestIdx] ?? null;
  } catch {
    return null;
  }
} */

function InteractionToggler({ enabled, fullscreen }: { enabled: boolean; fullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    // Lock/unlock handlers explicitly
    if (enabled) {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } else {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }

    // Prevent body scroll when fullscreen active
    const original = document.body.style.overflow;
    if (fullscreen && enabled) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }

    return () => {
      document.body.style.overflow = original || "";
    };
  }, [map, enabled, fullscreen]);
  return null;
}

function MapRefBinder({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}
