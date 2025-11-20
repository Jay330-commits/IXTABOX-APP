"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import {
  Circle,
  DirectionsRenderer,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import StandDetails from "../bookings/stand";
import LoadingSpinner from "../loading/LoadingSpinner";

export type MapProps = {
  stands: {
    id: string;
    lat: number;
    lng: number;
    title: string;
    address: string;
    description?: string;
    size?: {
      area: number;
      unit: string;
      capacity?: number;
    };
    pricePerDay?: number;
    imageUrl?: string;
    status?: "available" | "booked" | "maintenance";
  }[];
  filterForm?: React.ReactNode;
  filterValues?: {
    startDate?: string;
    endDate?: string;
    boxModel?: string;
  };
};

type DirectionsResult = google.maps.DirectionsResult;

const DEFAULT_CENTER = { lat: 59.3293, lng: 18.0686 };

export default function Map({ stands, filterForm, filterValues }: MapProps) {
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedStand, setSelectedStand] = useState<MapProps["stands"][number] | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const router = useRouter();
  const [exitHintVisible, setExitHintVisible] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const routePanelRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const exitHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: ["places"],
  });

  const computedBounds = useMemo(() => {
    if (
      !stands.length ||
      !isLoaded ||
      typeof window === "undefined" ||
      !(window.google && window.google.maps)
    ) {
      return null;
    }
    const bounds = new google.maps.LatLngBounds();
    stands.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    return bounds;
  }, [stands, isLoaded]);

  useEffect(() => {
    if (mapRef.current && computedBounds) {
      mapRef.current.fitBounds(computedBounds, 32);
    } else if (stands.length) {
      setMapCenter({ lat: stands[0].lat, lng: stands[0].lng });
      setMapZoom(12);
    }
  }, [computedBounds, stands]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setOptions({
      gestureHandling: interactionEnabled ? "greedy" : "none",
      draggable: interactionEnabled,
      scrollwheel: interactionEnabled,
      keyboardShortcuts: interactionEnabled,
    });
  }, [interactionEnabled]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (fullscreen && interactionEnabled) {
      document.body.style.overflow = "hidden";
      // Scroll to show the map section when going fullscreen
      // This ensures buttons are accessible even if user scrolled down before opening map
      setTimeout(() => {
        const mapElement = document.getElementById('map');
        if (mapElement) {
          // Scroll to the map section to ensure it's in view
          mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Then scroll a bit more to account for header
          setTimeout(() => {
            window.scrollTo({ top: Math.max(0, window.scrollY - 80), behavior: 'smooth' });
          }, 300);
        }
      }, 50);
    } else {
      document.body.style.overflow = originalOverflow || "";
    }
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [fullscreen, interactionEnabled]);

  useEffect(() => {
    if (!fullscreen) {
      setExitHintVisible(false);
      if (exitHintTimeoutRef.current) {
        clearTimeout(exitHintTimeoutRef.current);
        exitHintTimeoutRef.current = null;
      }
      return;
    }

    setExitHintVisible(true);
    if (exitHintTimeoutRef.current) {
      clearTimeout(exitHintTimeoutRef.current);
    }
    exitHintTimeoutRef.current = setTimeout(() => {
      setExitHintVisible(false);
    }, 4500);

    return () => {
      if (exitHintTimeoutRef.current) {
        clearTimeout(exitHintTimeoutRef.current);
        exitHintTimeoutRef.current = null;
      }
    };
  }, [fullscreen]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (computedBounds) {
      map.fitBounds(computedBounds, 32);
    }
  }, [computedBounds]);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const acquireLocation = useCallback(async () => {
    function getPosition(options: PositionOptions) {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation unsupported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    }

    try {
      const accurate = await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      return {
        lat: accurate.coords.latitude,
        lng: accurate.coords.longitude,
      };
    } catch {
      try {
        const fallback = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 });
        return {
          lat: fallback.coords.latitude,
          lng: fallback.coords.longitude,
        };
      } catch {
        return null;
      }
    }
  }, []);

  const getNearestStand = useCallback(
    (origin: google.maps.LatLngLiteral | null) => {
      if (!origin) return null;
      let nearest: MapProps["stands"][number] | null = null;
      let bestDistance = Infinity;
      for (const stand of stands) {
        const distance = haversine(origin.lat, origin.lng, stand.lat, stand.lng);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = stand;
        }
      }
      return nearest;
    },
    [stands],
  );

  const handleDirections = useCallback(
    async (origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) => {
      if (!isLoaded || !(window.google && google.maps)) return;
      const service = new google.maps.DirectionsService();
      const result = await service.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      });
      setDirections(result);
      setRoutePanelOpen(true);
      if (routePanelRef.current) {
        const leg = result.routes?.[0]?.legs?.[0];
        const summaryLines = [
          leg?.start_address,
          leg?.end_address,
          leg?.duration?.text ? `Duration: ${leg.duration.text}` : undefined,
          leg?.distance?.text ? `Distance: ${leg.distance.text}` : undefined,
        ].filter(Boolean);
        routePanelRef.current.innerHTML = summaryLines.map((line) => `<div>${line}</div>`).join("");
      }
    },
    [isLoaded],
  );

  const handleLocate = useCallback(async () => {
    if (!mapRef.current) return;
    setIsLoadingLocation(true);
    setRoutePanelOpen(false);
    try {
      const location = await acquireLocation();
      if (!location) return;
      setUserLocation(location);
      const nearest = getNearestStand(location);
      if (nearest) {
        await handleDirections(location, { lat: nearest.lat, lng: nearest.lng });
      }
      mapRef.current.panTo(location);
      mapRef.current.setZoom(13);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [acquireLocation, getNearestStand, handleDirections]);

  const computedContainerStyle = useMemo<CSSProperties>(
    () => ({
      width: fullscreen ? "100vw" : "100%",
      height: fullscreen ? "calc(100vh - 80px)" : "500px",
      position: fullscreen ? "fixed" : "relative",
      top: fullscreen ? "80px" : undefined,
      left: fullscreen ? 0 : undefined,
      right: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 999 : 0,
    }),
    [fullscreen],
  );

  const handleBookStand = useCallback(
    (standId: string, modelId?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      params.set("standId", standId);
      if (modelId) params.set("modelId", modelId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      router.push(`/guest/bookings?${params.toString()}`);
      setSelectedStand(null);
    },
    [router],
  );

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(false);
    setInteractionEnabled(false);
    setDirections(null);
    setRoutePanelOpen(false);
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen, handleCloseFullscreen]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
        Unable to load map right now. Please try again later.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex h-full items-center justify-center text-gray-300">Loading map…</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Filter Form Overlay */}
      {filterForm && (
        <div className="absolute top-0 left-0 z-[1001] pointer-events-none" style={{ width: '100%', maxWidth: '28rem' }}>
          <div className="pointer-events-auto">
            {filterForm}
          </div>
        </div>
      )}
      
      {isLoadingLocation && <LoadingSpinner text="Finding your location..." />}
      {selectedStand && (
        <div
          className="fixed inset-0 z-[1003] bg-black/50 flex items-start justify-center pt-24 px-4 pb-4"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedStand(null);
          }}
        >
          <div
            className="max-w-lg w-full max-h-[calc(100vh-120px)] overflow-y-auto bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <StandDetails
              stand={{
                id: selectedStand.id,
                title: selectedStand.title,
                location: {
                  coordinates: {
                    lat: selectedStand.lat,
                    lng: selectedStand.lng,
                  },
                  address: selectedStand.address,
                },
                pricePerDay: selectedStand.pricePerDay || 299.99,
                imageUrl: selectedStand.imageUrl,
                status: selectedStand.status || "available",
                availableModels: [
                  {
                    id: "classic",
                    name: "IXTAbox pro 175",
                    priceMultiplier: 1.0,
                  },
                  {
                    id: "pro",
                    name: "IXTAbox Pro 190",
                    priceMultiplier: 1.5,
                  },
                ],
                nextAvailableDate:
                  selectedStand.status === "booked"
                    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    : undefined,
              }}
              initialStartDate={filterValues?.startDate}
              initialEndDate={filterValues?.endDate}
              initialModelId={filterValues?.boxModel && filterValues.boxModel !== 'all' ? filterValues.boxModel : undefined}
              onBook={handleBookStand}
              onClose={() => setSelectedStand(null)}
            />
          </div>
        </div>
      )}

      {!interactionEnabled && !fullscreen && (
        <div
          onDoubleClick={() => {
            setInteractionEnabled(true);
            setFullscreen(true);
            setTimeout(() => {
              if (mapRef.current && computedBounds) {
                mapRef.current.fitBounds(computedBounds, 32);
              }
            }, 100);
          }}
          onTouchStart={(e) => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              e.preventDefault();
              setInteractionEnabled(true);
              setFullscreen(true);
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
        <div className="fixed right-4 z-[1002] flex flex-col gap-2" style={{ top: "100px", bottom: "20px" }}>
          <button
            type="button"
            onClick={handleLocate}
            className="rounded-lg bg-cyan-600/95 backdrop-blur-sm text-white text-xs px-4 py-2 border border-white/20 hover:bg-cyan-500 shadow-lg whitespace-nowrap"
          >
            Use my location
          </button>
          <button
            type="button"
            onClick={handleCloseFullscreen}
            className="rounded-lg bg-black/80 backdrop-blur-sm text-white text-xs px-4 py-2 border border-white/20 hover:bg-black/90 shadow-lg whitespace-nowrap"
            title="Exit fullscreen"
          >
            Close
          </button>
        </div>
      )}

      {fullscreen && exitHintVisible && (
        <div className="pointer-events-none fixed inset-x-0 top-[96px] z-[1001] flex justify-center">
          <div className="rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-white/80 shadow-lg">
            Press Esc or tap Close to leave the map
          </div>
        </div>
      )}

      <GoogleMap
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        mapContainerStyle={computedContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        options={{
          disableDefaultUI: false,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: interactionEnabled,
          gestureHandling: interactionEnabled ? "greedy" : "none",
        }}
      >
        {stands.map((stand) => (
          <Marker
            key={stand.id}
            position={{ lat: stand.lat, lng: stand.lng }}
            onClick={(e) => {
              e.domEvent.stopPropagation();
              setSelectedStand(stand);
            }}
            title={stand.title}
          />
        ))}
        {userLocation && (
          <>
            <Marker
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#06b6d4",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
              title="You are here"
            />
            <Circle
              center={userLocation}
              radius={60}
              options={{
                fillColor: "#06b6d4",
                fillOpacity: 0.2,
                strokeColor: "#06b6d4",
                strokeOpacity: 0.6,
                strokeWeight: 2,
              }}
            />
          </>
        )}
        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
      </GoogleMap>

      {fullscreen && directions && (
        <button
          type="button"
          onClick={() => setRoutePanelOpen((open) => !open)}
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

      {fullscreen && (
        <div
          ref={routePanelRef}
          className="fixed bg-black/80 text-white border-l border-white/10 p-4 overflow-auto z-[1000]"
          style={{
            top: "88px",
            bottom: "20px",
            right: 0,
            width: "320px",
            maxWidth: "90vw",
            transform: routePanelOpen ? "translateX(0%)" : "translateX(100%)",
            transition: "transform 200ms ease",
          }}
        />
      )}
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
