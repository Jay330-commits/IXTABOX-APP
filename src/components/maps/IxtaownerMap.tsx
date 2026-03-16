"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { scrollToMap } from "@/utils/scrollToMap";
import { useLocationModal } from "@/contexts/LocationModalContext";

/** Vague location: residence area shown as circle. Real address revealed after payment. */
export type VagueLocation = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  coverageRadiusM: number;
  type: "vague";
};

export type MapLocation = VagueLocation;

const DEFAULT_CENTER = { lat: 59.3293, lng: 18.0686 };

/** Multiply radius for display – 500m circles drawn larger for visibility; actual coverage unchanged */
const CIRCLE_DISPLAY_MULTIPLIER = 50;

/** Vague locations: 500m radius (meters) – displayed larger via multiplier */
const MOCK_VAGUE_LOCATIONS: VagueLocation[] = [
  { id: "v1", lat: 59.3293, lng: 18.0686, name: "Stockholm area", coverageRadiusM: 500, type: "vague" },
  { id: "v2", lat: 59.8586, lng: 17.6389, name: "Uppsala area", coverageRadiusM: 500, type: "vague" },
  { id: "v3", lat: 57.7089, lng: 11.9746, name: "Gothenburg area", coverageRadiusM: 500, type: "vague" },
  { id: "v4", lat: 55.6050, lng: 13.0038, name: "Malmö area", coverageRadiusM: 500, type: "vague" },
  { id: "v5", lat: 59.6110, lng: 16.5446, name: "Västerås area", coverageRadiusM: 500, type: "vague" },
];

/** Mock price per day (SEK) - no API */
const MOCK_PRICE_PER_DAY = 300;

/** Mock availability - always 1 box per model */
const MOCK_BOXES = [
  { id: "ixb-mock-1", model: "Pro 175" as const, displayId: "IXTA-001", compartment: 1 },
  { id: "ixb-mock-2", model: "Pro 190" as const, displayId: "IXTA-002", compartment: 2 },
];

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Mock owner availability – set by owner, shown as they define it */
const MOCK_OWNER_AVAILABILITY: Record<string, string> = {
  v1: "Weekdays 8–20, weekends by agreement",
  v2: "Flexible – message me for dates",
  v3: "Tue–Sat 10–19",
  v4: "Mon–Fri 8:30–17:30",
  v5: "Wed–Sun 9–18",
};

/** Mock owner contact (per location) – shown after payment */
const MOCK_OWNER_CONTACTS: Record<string, { name: string; phone: string; email: string; address: string }> = {
  v1: { name: "Anna K.", phone: "+46 70 123 4567", email: "anna.stockholm@example.com", address: "Storgatan 12, 111 23 Stockholm" },
  v2: { name: "Erik L.", phone: "+46 73 234 5678", email: "erik.uppsala@example.com", address: "Kungsgatan 8, 753 18 Uppsala" },
  v3: { name: "Maria S.", phone: "+46 76 345 6789", email: "maria.gothenburg@example.com", address: "Avenyn 45, 411 36 Göteborg" },
  v4: { name: "Johan M.", phone: "+46 72 456 7890", email: "johan.malmo@example.com", address: "Södergatan 3, 211 22 Malmö" },
  v5: { name: "Lisa P.", phone: "+46 70 567 8901", email: "lisa.vasteras@example.com", address: "Vasagatan 22, 722 11 Västerås" },
};

export type IxtaownerMapProps = {
  onLocationChosen?: (lat: number, lng: number) => void;
  chosenLocation?: { lat: number; lng: number } | null;
  fillViewport?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;
};

const MAX_ZOOM = 7;

/** Loader wrapper: useJsApiLoader is isolated here to avoid hook order issues. */
function IxtaownerMapLoader(props: IxtaownerMapProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    id: "google-map-script",
  });

  if (loadError) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
        <p className="text-sm">Unable to load map. Check your Google Maps API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center text-gray-300 animate-pulse">
        Loading map…
      </div>
    );
  }

  return <IxtaownerMapContent {...props} />;
}

/** Map content: only mounts when Google Maps script is loaded. All hooks here run consistently. */
function IxtaownerMapContent({
  onLocationChosen,
  chosenLocation,
  fillViewport = false,
  onFullscreenChange,
  className = "",
}: IxtaownerMapProps) {
  const [pickMode, setPickMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [activeTab, setActiveTab] = useState<"dates" | "model">("dates");
  const [selectedModel, setSelectedModel] = useState<"Pro 175" | "Pro 190">("Pro 175");
  const [startDate, setStartDate] = useState(() => getTodayISO());
  const [endDate, setEndDate] = useState(() => getTodayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isBooking, setIsBooking] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [showOwnerContact, setShowOwnerContact] = useState(false);
  const [mapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom] = useState(8);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastTapRef = useRef<number>(0);
  const { setLocationModalOpen } = useLocationModal();

  useEffect(() => {
    setLocationModalOpen(!!selectedLocation);
    return () => setLocationModalOpen(false);
  }, [selectedLocation, setLocationModalOpen]);

  const computedBounds = useMemo(() => {
    if (typeof window === "undefined" || !(window.google?.maps)) return null;
    const bounds = new google.maps.LatLngBounds();
    const displayRadius = (r: number) => r * CIRCLE_DISPLAY_MULTIPLIER;
    MOCK_VAGUE_LOCATIONS.forEach((loc) => {
      const r = displayRadius(loc.coverageRadiusM);
      const dLat = r / 111000;
      const dLng = r / (111000 * Math.cos((loc.lat * Math.PI) / 180));
      bounds.extend({ lat: loc.lat - dLat, lng: loc.lng - dLng });
      bounds.extend({ lat: loc.lat + dLat, lng: loc.lng + dLng });
    });
    if (chosenLocation) bounds.extend(chosenLocation);
    return bounds;
  }, [chosenLocation]);

  const fitBoundsWithMaxZoom = useCallback((map: google.maps.Map, bounds: google.maps.LatLngBounds, padding = 48) => {
    map.fitBounds(bounds, padding);
    setTimeout(() => {
      const z = map.getZoom();
      if (z != null && z > MAX_ZOOM) map.setZoom(MAX_ZOOM);
    }, 100);
  }, []);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (computedBounds && map) fitBoundsWithMaxZoom(map, computedBounds);
    },
    [computedBounds, fitBoundsWithMaxZoom]
  );

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(false);
    setInteractionEnabled(false);
    setSelectedLocation(null);
    setShowOwnerContact(false);
    setShowPaymentStep(false);
    onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!pickMode || !e.latLng || !onLocationChosen) return;
      onLocationChosen(e.latLng.lat(), e.latLng.lng());
      setPickMode(false);
    },
    [pickMode, onLocationChosen]
  );

  const chosenMarkerIcon = useMemo(() => ({
    url: "http://maps.google.com/mapfiles/ms/icons/blue.png",
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 40),
  }), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, handleCloseFullscreen]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate, startTime, endTime]);

  const totalPrice = days * MOCK_PRICE_PER_DAY;
  const availableBoxesForModel = MOCK_BOXES.filter((b) => b.model === selectedModel);
  const selectedBox = availableBoxesForModel[0] ?? null;

  const handlePay = useCallback(() => {
    if (!selectedLocation || !selectedBox || !startDate || !endDate) return;
    setShowPaymentStep(true);
  }, [selectedLocation, selectedBox, startDate, endDate]);

  const handleConfirmPayment = useCallback(async () => {
    setIsBooking(true);
    await new Promise((r) => setTimeout(r, 600));
    setShowPaymentStep(false);
    setShowOwnerContact(true);
    setIsBooking(false);
  }, []);

  const handleEnableMap = useCallback(() => {
    setInteractionEnabled(true);
    setFullscreen(true);
    onFullscreenChange?.(true);
    scrollToMap();
    setTimeout(() => {
      if (mapRef.current && computedBounds) fitBoundsWithMaxZoom(mapRef.current, computedBounds);
    }, 100);
  }, [computedBounds, fitBoundsWithMaxZoom, onFullscreenChange]);

  const computedContainerStyle: CSSProperties = fullscreen
    ? { width: "100%", height: "100%", position: "relative", margin: 0, padding: 0, overflow: "hidden" }
    : {
        width: "100%",
        height: fillViewport ? "calc(100vh - 80px)" : "100%",
        position: "relative",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        minHeight: fillViewport ? undefined : 320,
      };

  const mapContent = (
    <div
      className={`h-full w-full ${fillViewport ? "m-0 p-0" : ""} ${className}`}
      style={{
        position: "relative",
        minHeight: fullscreen ? undefined : 320,
        transform: fullscreen ? "none" : "translateZ(0)",
        contain: fullscreen ? "none" : "layout paint",
      }}
    >
      {fullscreen && (
        <div className="fixed right-4 z-[10000] flex flex-col gap-2" style={{ top: "100px", bottom: "20px" }}>
          {onLocationChosen && (
            <button
              type="button"
              onClick={() => setPickMode(!pickMode)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm whitespace-nowrap transition-all duration-200 ${
                pickMode ? "bg-amber-500/90 text-white border border-amber-400 shadow-amber-500/20" : "bg-slate-800/95 text-white border border-white/20 hover:bg-slate-700 hover:border-white/30"
              }`}
            >
              {pickMode ? "Click map to set" : "Choose your location"}
            </button>
          )}
          <button
            type="button"
            onClick={handleCloseFullscreen}
            className="rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium px-4 py-2.5 border border-white/20 hover:bg-slate-700 hover:border-white/30 shadow-lg whitespace-nowrap transition-all duration-200"
            title="Close map"
          >
            Close map
          </button>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: interactionEnabled ? "auto" : "none",
        }}
      >
      <GoogleMap
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onClick={handleMapClick}
        mapContainerStyle={computedContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        options={{
          disableDefaultUI: false,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: false,
          zoomControl: interactionEnabled,
          gestureHandling: interactionEnabled ? "cooperative" : "none",
          draggable: interactionEnabled,
          scrollwheel: interactionEnabled,
        }}
      >
        {MOCK_VAGUE_LOCATIONS.map((loc) => (
          <Circle
            key={loc.id}
            center={{ lat: loc.lat, lng: loc.lng }}
            radius={loc.coverageRadiusM * CIRCLE_DISPLAY_MULTIPLIER}
            options={{
              fillColor: "#f59e0b",
              fillOpacity: 0.2,
              strokeColor: "#f59e0b",
              strokeOpacity: 0.9,
              strokeWeight: 4,
              clickable: true,
            }}
            onClick={() => {
              scrollToMap();
              const next = selectedLocation?.id === loc.id ? null : loc;
              setSelectedLocation(next);
              if (next) {
                setShowOwnerContact(false);
                setShowPaymentStep(false);
              }
            }}
          />
        ))}
        {chosenLocation && (
          <>
            <Circle
              center={chosenLocation}
              radius={500 * CIRCLE_DISPLAY_MULTIPLIER}
              options={{
                fillColor: "#06b6d4",
                fillOpacity: 0.25,
                strokeColor: "#06b6d4",
                strokeOpacity: 0.8,
                strokeWeight: 3,
              }}
            />
            <Marker position={chosenLocation} icon={chosenMarkerIcon} title="Your location" />
          </>
        )}
      </GoogleMap>
      </div>

      {/* Lock overlay – renders on top of map when closed */}
      {!interactionEnabled && !fullscreen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Double-tap to open map"
          onDoubleClick={handleEnableMap}
          onTouchStart={(e) => {
            const now = Date.now();
            if (now - lastTapRef.current < 500) {
              e.preventDefault();
              handleEnableMap();
            }
            lastTapRef.current = now;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleEnableMap();
            }
          }}
          title="Double‑tap to open map"
          className="absolute inset-0 z-[9998] flex items-center justify-center select-none cursor-pointer"
          style={{
            background: "rgba(0,0,0,0.5)",
            pointerEvents: "auto",
            touchAction: "manipulation",
          }}
        >
          <div className="rounded-2xl bg-slate-900/95 border-2 border-cyan-500/40 px-6 py-4 text-center shadow-2xl shadow-black/50 max-w-[280px]">
            <p className="text-white font-semibold text-base mb-1">Tap map twice to open</p>
            <p className="text-cyan-200/90 text-sm">or double‑click on desktop</p>
          </div>
        </div>
      )}

      {selectedLocation && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop – click to close */}
          <div
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 2147483646 } as CSSProperties}
            onClick={() => { setSelectedLocation(null); setShowOwnerContact(false); setShowPaymentStep(false); }}
            aria-hidden
          />
          {/* Panel – above header via portal + high z-index */}
          <div
            className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[420px] rounded-xl border border-white/10 bg-slate-800/95 p-4 shadow-xl backdrop-blur-sm overflow-auto"
            style={
              {
                zIndex: 2147483647,
                maxHeight: "calc(100vh - 96px)",
                pointerEvents: "auto",
              } as CSSProperties
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="ixtaowner-location-panel-title"
          >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 id="ixtaowner-location-panel-title" className="font-semibold text-white">{selectedLocation.name}</h4>
              <p className="mt-0.5 text-xs text-gray-400">Exact address shared after you book</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedLocation(null); setShowOwnerContact(false); setShowPaymentStep(false); }}
              className="text-gray-400 hover:text-white shrink-0"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="mt-4">
            {showPaymentStep ? (
              /* Payment step – before contact */
              <div className="space-y-3 rounded-lg bg-slate-800/85 p-3">
                <p className="text-sm font-medium text-cyan-200">Payment</p>
                <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{days} {days === 1 ? "day" : "days"}</span>
                    <span className="font-semibold text-white">{totalPrice} SEK</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Card number"
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-gray-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-gray-500"
                    />
                    <input
                      type="text"
                      placeholder="CVC"
                      className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentStep(false)}
                    className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-300 hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isBooking}
                    className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {isBooking ? "Processing…" : "Confirm payment"}
                  </button>
                </div>
              </div>
            ) : showOwnerContact ? (
              /* Owner contact – shown after payment */
              <div className="space-y-3 rounded-lg bg-slate-800/85 p-3">
                <p className="text-sm font-medium text-cyan-200">Owner contact & pickup address</p>
                {(() => {
                  const owner = MOCK_OWNER_CONTACTS[selectedLocation.id] ?? {
                    name: "IXTAowner",
                    phone: "+46 70 000 0000",
                    email: "owner@example.com",
                    address: "Pickup address",
                  };
                  return (
                    <div className="space-y-2 text-sm text-gray-300">
                      <p><span className="text-gray-500">Name:</span> {owner.name}</p>
                      <p><span className="text-gray-500">Phone:</span> <a href={`tel:${owner.phone}`} className="text-cyan-400 hover:underline">{owner.phone}</a></p>
                      <p><span className="text-gray-500">Email:</span> <a href={`mailto:${owner.email}`} className="text-cyan-400 hover:underline">{owner.email}</a></p>
                      <p><span className="text-gray-500">Address:</span> {owner.address}</p>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => { setShowOwnerContact(false); setShowPaymentStep(true); }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  ← Back to payment
                </button>
              </div>
            ) : (
              <>
            {/* Availability only – location name & price are in header / summary below */}
            {(() => {
              const avail = MOCK_OWNER_AVAILABILITY[selectedLocation.id];
              return avail ? (
                <div className="mb-3 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2">
                  <p className="text-xs font-medium text-cyan-200">Available for rent</p>
                  <p className="text-xs text-gray-300">{avail}</p>
                </div>
              ) : null;
            })()}

            {/* Tabs: Select Dates | Select Model */}
            <div className="flex gap-1 rounded-lg bg-slate-900/60 p-0.5 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("dates")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "dates"
                    ? "bg-slate-700 text-cyan-200"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Select Dates
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("model")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "model"
                    ? "bg-slate-700 text-cyan-200"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Select Model
              </button>
            </div>

            {/* Dates tab */}
            {activeTab === "dates" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-400">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={getTodayISO()}
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="mt-0.5 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {/* Model tab */}
            {activeTab === "model" && (
              <div className="grid grid-cols-2 gap-2">
                {(["Pro 175", "Pro 190"] as const).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                      selectedModel === model
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : "border-white/10 bg-slate-800/80 text-gray-300 hover:bg-slate-700/80"
                    }`}
                  >
                    IXTAbox {model}
                  </button>
                ))}
              </div>
            )}

            {/* Total & Pay – single price line */}
            {startDate && endDate && (
              <div className="mt-4 rounded-lg bg-slate-800/85 p-3">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-400">{days} {days === 1 ? "day" : "days"} × {MOCK_PRICE_PER_DAY} SEK</span>
                  <span className="text-lg font-bold text-cyan-400">{totalPrice} SEK</span>
                </div>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!selectedBox || isBooking || days < 1}
                  className="mt-3 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isBooking ? "…" : "Pay"}
                </button>
              </div>
            )}
              </>
            )}
          </div>
          </div>
        </>,
        document.getElementById("portal-root") ?? document.body
      )}

    </div>
  );

  if (fullscreen && typeof document !== "undefined") {
    const fullscreenStyle: CSSProperties = {
      position: "fixed",
      top: "80px",
      left: 0,
      right: 0,
      bottom: 0,
      width: "100vw",
      height: "calc(100vh - 80px)",
      zIndex: 100002,
      overflow: "hidden",
      margin: 0,
      padding: 0,
    };
    return createPortal(
      <div style={fullscreenStyle} aria-hidden={false}>
        {mapContent}
      </div>,
      document.body
    );
  }

  return mapContent;
}

export default function IxtaownerMap(props: IxtaownerMapProps) {
  return <IxtaownerMapLoader {...props} />;
}
