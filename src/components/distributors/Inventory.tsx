'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from '@react-google-maps/api';

interface DistributorLocation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  status: 'available' | 'maintenance' | 'inactive';
  stands: {
    id: string;
    name: string;
    capacity: number;
    boxes: {
      id: string;
      type: string;
      status: string;
      bookingStatus: string | null;
    }[];
  }[];
  inventoryStats: {
    totalBoxes: number;
    availableBoxes: number;
    rentedBoxes: number;
    reservedBoxes: number;
    maintenanceBoxes: number;
    totalStands: number;
  };
}

const DEFAULT_CENTER = { lat: 59.3293, lng: 18.0686 };

export default function Inventory() {
  const [locations, setLocations] = useState<DistributorLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DistributorLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places'],
    id: 'google-map-script',
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const authToken = localStorage.getItem('auth-token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/distributor/locations/map', { headers });
        
        if (response.status === 401) {
          setError('Unauthorized');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const data = await response.json();
        if (data.success) {
          setLocations(data.data);
          
          // Set initial map bounds to fit all locations
          if (data.data.length > 0 && mapRef.current && isLoaded) {
            const bounds = new google.maps.LatLngBounds();
            data.data.forEach((loc: DistributorLocation) => {
              bounds.extend({ lat: loc.lat, lng: loc.lng });
            });
            mapRef.current.fitBounds(bounds, 80);
          }
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      fetchLocations();
    }
  }, [isLoaded]);

  // Center map on selected location
  useEffect(() => {
    if (selectedLocation && mapRef.current && isLoaded) {
      // Pan smoothly to the selected location
      mapRef.current.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      
      // Slightly zoom in when a location is selected, but not too much
      setTimeout(() => {
        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom();
          if (currentZoom && currentZoom < 14) {
            mapRef.current.setZoom(Math.min(currentZoom + 2, 14));
          }
        }
      }, 300);
      
      setPanelOpen(true);
    } else {
      setPanelOpen(false);
    }
  }, [selectedLocation, isLoaded]);

  // Handle swipe to dismiss on mobile
  useEffect(() => {
    if (!isMobile || !panelRef.current || !panelOpen) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (panelRef.current && panelRef.current.scrollTop === 0 && e.touches[0].clientY < 100) {
        startY = e.touches[0].clientY;
        isDragging = true;
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !panelRef.current) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0) {
        e.preventDefault();
        panelRef.current.style.transform = `translate3d(0, ${diff}px, 0)`;
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging || !panelRef.current) return;
      isDragging = false;
      
      const diff = currentY - startY;
      if (diff > 100) {
        // Swiped down enough, close panel
        setSelectedLocation(null);
        panelRef.current.style.transform = '';
      } else {
        // Snap back
        panelRef.current.style.transform = '';
      }
      startY = 0;
      currentY = 0;
    };

    const panel = panelRef.current;
    panel.addEventListener('touchstart', handleTouchStart);
    panel.addEventListener('touchmove', handleTouchMove);
    panel.addEventListener('touchend', handleTouchEnd);

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, panelOpen]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc) => {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      });
      map.fitBounds(bounds, 80);
    }
  }, [locations]);

  // Update map bounds when locations change
  useEffect(() => {
    if (mapRef.current && locations.length > 0 && isLoaded) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc) => {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      });
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [locations, isLoaded]);

  const handleMarkerClick = useCallback((location: DistributorLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedLocation(null);
    setPanelOpen(false);
  }, []);

  const markerIcons = useMemo(() => {
    if (!isLoaded || !(window.google && google.maps)) {
      return { available: undefined, maintenance: undefined, inactive: undefined, selected: undefined };
    }
    const baseSize = new google.maps.Size(40, 40);
    const anchor = new google.maps.Point(20, 40);
    
    return {
      available: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green.png',
        scaledSize: baseSize,
        anchor,
      },
      maintenance: {
        url: 'http://maps.google.com/mapfiles/ms/icons/yellow.png',
        scaledSize: baseSize,
        anchor,
      },
      inactive: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red.png',
        scaledSize: baseSize,
        anchor,
      },
      selected: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue.png',
        scaledSize: baseSize,
        anchor,
      },
    };
  }, [isLoaded]);

  const getMarkerIcon = useCallback((location: DistributorLocation) => {
    if (selectedLocation?.id === location.id) {
      return markerIcons.selected;
    }
    return markerIcons[location.status] || markerIcons.available;
  }, [selectedLocation, markerIcons]);

  // Calculate overall inventory stats - must be before early returns
  const overallStats = useMemo(() => {
    return locations.reduce(
      (acc, loc) => ({
        totalLocations: acc.totalLocations + 1,
        totalStands: acc.totalStands + loc.inventoryStats.totalStands,
        totalBoxes: acc.totalBoxes + loc.inventoryStats.totalBoxes,
        availableBoxes: acc.availableBoxes + loc.inventoryStats.availableBoxes,
        rentedBoxes: acc.rentedBoxes + loc.inventoryStats.rentedBoxes,
        reservedBoxes: acc.reservedBoxes + loc.inventoryStats.reservedBoxes,
        maintenanceBoxes: acc.maintenanceBoxes + loc.inventoryStats.maintenanceBoxes,
      }),
      {
        totalLocations: 0,
        totalStands: 0,
        totalBoxes: 0,
        availableBoxes: 0,
        rentedBoxes: 0,
        reservedBoxes: 0,
        maintenanceBoxes: 0,
      }
    );
  }, [locations]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
        <div>
          <p className="font-semibold mb-2">Unable to load map</p>
          <p className="text-sm text-red-300/80">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
              ? 'Map API error. Please check your Google Maps API key configuration.'
              : 'Google Maps API key is missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.'}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-gray-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
          <p>Loading locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-300">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No locations found</p>
          <p className="text-sm text-gray-400">Add locations to see them on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col" style={{ height: 'calc(100vh - 80px)' }} id="map-container">
      {/* Top Overview Bar */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 z-[999]">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Locations:</span>
            <span className="font-semibold text-white">{overallStats.totalLocations}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Stands:</span>
            <span className="font-semibold text-cyan-300">{overallStats.totalStands}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Boxes:</span>
            <span className="font-semibold text-cyan-300">{overallStats.totalBoxes}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Available:</span>
            <span className="font-semibold text-green-400">{overallStats.availableBoxes}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Rented:</span>
            <span className="font-semibold text-blue-400">{overallStats.rentedBoxes}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Reserved:</span>
            <span className="font-semibold text-purple-400">{overallStats.reservedBoxes}</span>
          </div>
          {overallStats.maintenanceBoxes > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Maintenance:</span>
              <span className="font-semibold text-yellow-400">{overallStats.maintenanceBoxes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 w-full">
        {/* Map */}
        <GoogleMap
          onLoad={handleMapLoad}
          mapContainerStyle={{
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
          center={mapCenter}
          zoom={mapZoom}
          options={{
            disableDefaultUI: false,
            clickableIcons: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
          }}
        >
          {locations.map((location) => (
            <Marker
              key={location.id}
              position={{ lat: location.lat, lng: location.lng }}
              icon={getMarkerIcon(location)}
              onClick={() => handleMarkerClick(location)}
              title={location.name}
            />
          ))}
        </GoogleMap>
      </div>

      {/* Slide-in Information Panel */}
      {selectedLocation && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && panelOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-[1000]"
              onClick={handleClosePanel}
            />
          )}

          {/* Panel */}
          <div
            ref={panelRef}
            className={`
              absolute z-[1001] bg-gray-900 border border-white/10 shadow-2xl
              overflow-y-auto
              ${isMobile 
                ? 'bottom-0 left-0 right-0 max-h-[80vh] rounded-t-xl'
                : 'left-0 top-0 w-[400px] max-w-[90vw] border-r'
              }
            `}
            style={{
              ...(isMobile ? {} : {
                height: '100%',
              }),
              transform: panelOpen 
                ? 'translate3d(0, 0, 0)' 
                : isMobile 
                  ? 'translate3d(0, 100%, 0)' 
                  : 'translate3d(-100%, 0, 0)',
              transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {/* Panel Header - Google Maps Style */}
            <div className="sticky top-0 bg-gray-900/98 backdrop-blur-sm border-b border-white/10 z-10">
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white mb-1 truncate">
                      {selectedLocation.name}
                    </h2>
                    {selectedLocation.address && (
                      <p className="text-xs text-gray-400 truncate">
                        {selectedLocation.address}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleClosePanel}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                    aria-label="Close panel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedLocation.status === 'available'
                        ? 'bg-green-500/20 text-green-400'
                        : selectedLocation.status === 'maintenance'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {selectedLocation.status.charAt(0).toUpperCase() + selectedLocation.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Panel Content - Clean Google Maps Style */}
            <div className="p-3 space-y-4">
              {/* Image Placeholder */}
              <div className="w-full h-32 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                <span className="text-xs text-gray-500">Location Image</span>
              </div>

              {/* Key Metrics - Compact */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">Stands</div>
                  <div className="text-sm font-semibold text-cyan-300">
                    {selectedLocation.inventoryStats.totalStands}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">Boxes</div>
                  <div className="text-sm font-semibold text-white">
                    {selectedLocation.inventoryStats.totalBoxes}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">Available</div>
                  <div className="text-sm font-semibold text-green-400">
                    {selectedLocation.inventoryStats.availableBoxes}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">In Use</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {selectedLocation.inventoryStats.rentedBoxes + selectedLocation.inventoryStats.reservedBoxes}
                  </div>
                </div>
              </div>

              {/* Stands List - Simplified */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Stands ({selectedLocation.stands.length})</h3>
                <div className="space-y-2">
                  {selectedLocation.stands.map((stand) => {
                    const availableCount = stand.boxes.filter(b => b.status === 'available').length;
                    const inUseCount = stand.boxes.filter(b => b.status === 'rented' || b.status === 'reserved').length;
                    const utilizationRate = stand.capacity > 0 
                      ? Math.round((inUseCount / stand.capacity) * 100) 
                      : 0;

                    return (
                      <div
                        key={stand.id}
                        className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white text-sm">{stand.name}</h4>
                          <span className="text-xs text-gray-400">{stand.boxes.length} boxes</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">Capacity:</span>
                            <span className="font-medium text-gray-300">{stand.capacity}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">Available:</span>
                            <span className="font-medium text-green-400">{availableCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">Utilization:</span>
                            <span className="font-medium text-blue-400">{utilizationRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

