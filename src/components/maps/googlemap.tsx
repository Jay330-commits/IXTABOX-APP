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
import LocationDetails from "../bookings/LocationDetails";
import LoadingSpinner from "../loading/LoadingSpinner";

export type MapProps = {
  locations: {
    id: string;
    lat: number;
    lng: number;
    name: string;
    address: string;
    status: "available" | "maintenance" | "inactive";
    availableBoxes: {
      classic: number;
      pro: number;
      total: number;
    };
    isFullyBooked?: boolean;
    earliestNextAvailableDate?: string | null;
    modelAvailability?: {
      classic: {
        isFullyBooked: boolean;
        nextAvailableDate: string | null;
      };
      pro: {
        isFullyBooked: boolean;
        nextAvailableDate: string | null;
      };
    };
  }[];
  filterForm?: React.ReactNode;
  filterValues?: {
    startDate?: string;
    endDate?: string;
    boxModel?: string;
  };
  onFullscreenChange?: (isFullscreen: boolean) => void;
};

type DirectionsResult = google.maps.DirectionsResult;

const DEFAULT_CENTER = { lat: 59.3293, lng: 18.0686 };

export default function Map({ locations, filterForm, filterValues, onFullscreenChange }: MapProps) {
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapProps["locations"][number] | null>(null);
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

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ["places"],
    id: "google-map-script",
  });

  // Log API key status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!googleMapsApiKey) {
        console.warn('Google Maps API key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file');
      }
    }
  }, [googleMapsApiKey]);

  const computedBounds = useMemo(() => {
    if (
      !locations.length ||
      !isLoaded ||
      typeof window === "undefined" ||
      !(window.google && window.google.maps)
    ) {
      return null;
    }
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    return bounds;
  }, [locations, isLoaded]);

  useEffect(() => {
    if (mapRef.current && computedBounds) {
      mapRef.current.fitBounds(computedBounds, 32);
    } else if (locations.length) {
      setMapCenter({ lat: locations[0].lat, lng: locations[0].lng });
      setMapZoom(12);
    }
  }, [computedBounds, locations]);

  // Center map on selected location when a marker is clicked
  useEffect(() => {
    if (selectedLocation && mapRef.current && isLoaded) {
      // Pan to the selected location to ensure it's centered
      mapRef.current.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
  }, [selectedLocation, isLoaded]);

  // Notify parent when fullscreen state changes
  useEffect(() => {
    onFullscreenChange?.(fullscreen);
  }, [fullscreen, onFullscreenChange]);

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

  const getNearestLocation = useCallback(
    (origin: google.maps.LatLngLiteral | null) => {
      if (!origin) return null;
      let nearest: MapProps["locations"][number] | null = null;
      let bestDistance = Infinity;
      for (const location of locations) {
        const distance = haversine(origin.lat, origin.lng, location.lat, location.lng);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = location;
        }
      }
      return nearest;
    },
    [locations],
  );

  const handleDirections = useCallback(
    async (origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) => {
      try {
        if (!isLoaded || !(window.google && google.maps)) {
          return;
        }
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
      } catch (error) {
        console.warn('Directions service error:', error);
        // Don't throw, just fail silently
      }
    },
    [isLoaded],
  );

  const handleLocate = useCallback(async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check prerequisites
    if (!mapRef.current) {
      console.warn('Map ref not available');
      return;
    }

    if (!isLoaded) {
      console.warn('Google Maps not loaded yet');
      return;
    }

    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not available');
      return;
    }

    setIsLoadingLocation(true);
    setRoutePanelOpen(false);
    setDirections(null);

    try {
      // Get user location
      const userPos = await acquireLocation();
      if (!userPos) {
        console.warn('Could not acquire user location');
        setIsLoadingLocation(false);
        return;
      }

      // Set user location marker
      setUserLocation(userPos);

      // Find nearest location
      const nearest = getNearestLocation(userPos);
      if (!nearest) {
        console.warn('No nearest location found');
        setIsLoadingLocation(false);
        return;
      }

      // Fit bounds to show all locations + user location + nearest location
      // This ensures all markers remain visible
      if (mapRef.current && window.google && window.google.maps) {
        const bounds = new google.maps.LatLngBounds();
        
        // Add user location
        bounds.extend(userPos);
        
        // Add nearest location (highlight it)
        bounds.extend({ lat: nearest.lat, lng: nearest.lng });
        
        // Add all other locations to ensure they're visible
        locations.forEach((loc) => {
          bounds.extend({ lat: loc.lat, lng: loc.lng });
        });
        
        // Fit bounds with padding and max zoom to prevent zooming in too much
        mapRef.current.fitBounds(bounds, 80); // Add padding so markers aren't at the edge
        
        // Ensure we don't zoom in too much - set a max zoom after fitting
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom && currentZoom > 14) {
          mapRef.current.setZoom(14);
        }
      }

      // Optionally show directions (non-blocking)
      if (isLoaded && window.google && window.google.maps) {
        try {
          await handleDirections(userPos, { lat: nearest.lat, lng: nearest.lng });
        } catch (dirError) {
          // Directions are optional, don't fail if they error
          console.warn('Could not load directions:', dirError);
        }
      }
    } catch (error) {
      console.error('Error in handleLocate:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [acquireLocation, getNearestLocation, handleDirections, isLoaded, locations]);

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

  const handleBookLocation = useCallback(
    async (locationId: string, boxId: string, standId: string, modelId?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string, locationDisplayId?: string, compartment?: number | null) => {
      try {
        // Create secure payment session server-side
        // Booking details are stored securely, only payment intent ID is returned
        const response = await fetch('/api/payments/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId,
            boxId,
            standId,
            modelId,
            startDate,
            endDate,
            startTime,
            endTime,
            locationDisplayId,
            compartment: compartment !== null && compartment !== undefined ? compartment.toString() : undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create payment session');
        }

        const { paymentIntentId } = await response.json();
      
        // Navigate to payment page with ONLY payment intent ID (no sensitive data)
        // Use replace to prevent back button issues
        // Don't close modal immediately - let it stay open until navigation completes
        router.replace(`/payment?payment_intent=${paymentIntentId}`);
        // Modal will close automatically when component unmounts after navigation
      } catch (error) {
        console.error('Failed to create payment session:', error);
        alert('Failed to start payment. Please try again.');
      }
    },
    [router],
  );

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(false);
    setInteractionEnabled(false);
    setDirections(null);
    setRoutePanelOpen(false);
    onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  const markerIcons = useMemo(() => {
    if (!isLoaded || !(window.google && google.maps)) {
      return { available: undefined, fullyBooked: undefined };
    }
    return {
      available: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green.png',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      },
      fullyBooked: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red.png',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      },
    };
  }, [isLoaded]);

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
    console.error('Google Maps load error:', loadError);
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
        <div>
          <p className="font-semibold mb-2">Unable to load map</p>
          <p className="text-sm text-red-300/80">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
              ? 'Map API error. Please check your Google Maps API key configuration.'
              : 'Google Maps API key is missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-red-300/60 mt-2">
              Error: {loadError.message || String(loadError)}
            </p>
          )}
        </div>
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
      {selectedLocation && (
        <div
          className="fixed inset-0 z-[1003] bg-black/50 flex items-center justify-center px-4 py-4"
          // Modal only closes via X button - no onClick handler to prevent closing on backdrop click
        >
          <div
            className="max-w-lg w-full max-h-[calc(100vh-80px)] overflow-y-auto bg-white rounded-lg shadow-xl"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            onClick={(e) => {
              // Prevent clicks inside modal from bubbling up to backdrop
              e.stopPropagation();
            }}
          >
            <LocationDetails
              location={{
                id: selectedLocation.id,
                name: selectedLocation.name,
                address: selectedLocation.address,
                  coordinates: {
                  lat: selectedLocation.lat,
                  lng: selectedLocation.lng,
                  },
                status: selectedLocation.status,
                availableBoxes: selectedLocation.availableBoxes,
                isFullyBooked: selectedLocation.isFullyBooked,
                earliestNextAvailableDate: selectedLocation.earliestNextAvailableDate,
                modelAvailability: selectedLocation.modelAvailability,
              }}
              initialStartDate={filterValues?.startDate}
              initialEndDate={filterValues?.endDate}
              initialModelId={filterValues?.boxModel && filterValues.boxModel !== 'all' ? filterValues.boxModel : undefined}
              onBook={handleBookLocation}
              onClose={() => setSelectedLocation(null)}
            />
          </div>
        </div>
      )}

      {!interactionEnabled && !fullscreen && (
        <div
          onDoubleClick={() => {
            setInteractionEnabled(true);
            setFullscreen(true);
            onFullscreenChange?.(true);
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
              onFullscreenChange?.(true);
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
        {locations.map((location) => {
          const icon = location.isFullyBooked ? markerIcons.fullyBooked : markerIcons.available;
          return (
          <Marker
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
              icon={icon}
            onClick={(e) => {
              e.domEvent.stopPropagation();
              setSelectedLocation(location);
            }}
            title={location.name}
          />
          );
        })}
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
