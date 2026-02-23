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
  image: string | null;
  stands: {
    id: string;
    name: string;
    capacity: number;
    boxes: {
      id: string;
      display_id: string;
      model: string;
      type: string;
      status: string;
      compartment: number | null;
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

interface Stand {
  id: string;
  name: string;
  capacity: number;
  location_id: string;
}

interface Box {
  id: string;
  model: string;
  status: string;
  compartment: number | null;
  stand_id: string;
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

  // Editing state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DistributorLocation | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', status: 'available' });
  
  const [showStandModal, setShowStandModal] = useState(false);
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [standForm, setStandForm] = useState({ name: '', capacity: 1, locationId: '' });
  
  const [updatingBoxes, setUpdatingBoxes] = useState<Set<string>>(new Set());
  
  const [showMoveBoxModal, setShowMoveBoxModal] = useState(false);
  const [moveBoxConfirmation, setMoveBoxConfirmation] = useState('');
  const [boxToMove, setBoxToMove] = useState<{ boxId: string; boxDisplayId: string; currentStandName: string; newStandId: string; newStandName: string } | null>(null);
  
  const [showDeleteBoxModal, setShowDeleteBoxModal] = useState(false);
  const [deleteBoxConfirmation, setDeleteBoxConfirmation] = useState('');
  const [boxToDelete, setBoxToDelete] = useState<{ boxId: string; boxDisplayId: string } | null>(null);
  
  const [stands, setStands] = useState<Stand[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const getAuthHeaders = () => {
    const authToken = localStorage.getItem('auth-token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/distributor/locations/map', { headers: getAuthHeaders() });
      
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
          fitBoundsWithMaxZoom(mapRef.current, bounds);
        }

        // Update selected location if it still exists
        if (selectedLocation) {
          const updatedLocation = data.data.find((loc: DistributorLocation) => loc.id === selectedLocation.id);
          if (updatedLocation) {
            setSelectedLocation(updatedLocation);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stands for editing
  const fetchStands = async () => {
    try {
      const response = await fetch('/api/distributor/stands', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch stands');
      const data = await response.json();
      if (data.success) {
        setStands(data.data.map((stand: Stand) => ({
          id: stand.id,
          name: stand.name,
          capacity: stand.capacity,
          location_id: stand.location_id,
        })));
      }
    } catch (err) {
      console.error('Error fetching stands:', err);
    }
  };

  useEffect(() => {
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

  const MAX_ZOOM = 14;
  const fitBoundsWithMaxZoom = useCallback((map: google.maps.Map, bounds: google.maps.LatLngBounds, padding = 80) => {
    map.fitBounds(bounds, padding);
    setTimeout(() => {
      const z = map.getZoom();
      if (z != null && z > MAX_ZOOM) {
        map.setZoom(MAX_ZOOM);
      }
    }, 100);
  }, []);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc) => {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      });
      fitBoundsWithMaxZoom(map, bounds);
    }
  }, [locations, fitBoundsWithMaxZoom]);

  // Update map bounds when locations change
  useEffect(() => {
    if (mapRef.current && locations.length > 0 && isLoaded) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc) => {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      });
      fitBoundsWithMaxZoom(mapRef.current, bounds);
    }
  }, [locations, isLoaded, fitBoundsWithMaxZoom]);

  const handleMarkerClick = useCallback((location: DistributorLocation) => {
    setSelectedLocation(location);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedLocation(null);
    setPanelOpen(false);
  }, []);

  const handleUploadLocationImage = async (locationId: string, file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/distributor/admin/locations/${locationId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeaders()['Authorization'] || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (data.success) {
        await fetchLocations();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Location editing handlers
  const openLocationModal = (location: DistributorLocation) => {
    setEditingLocation(location);
    setLocationForm({ 
      name: location.name, 
      address: location.address || '', 
      status: location.status 
    });
    setShowLocationModal(true);
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;
    try {
      setLoadingAction(true);
      const response = await fetch(`/api/distributor/admin/locations/${editingLocation.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationForm),
      });
      if (!response.ok) throw new Error('Failed to update location');
      await fetchLocations();
      setShowLocationModal(false);
      setEditingLocation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setLoadingAction(false);
    }
  };

  // Stand editing handlers
  const openStandModal = async (standId: string, locationId: string) => {
    await fetchStands();
    const stand = stands.find(s => s.id === standId) || {
      id: standId,
      name: selectedLocation?.stands.find(s => s.id === standId)?.name || '',
      capacity: selectedLocation?.stands.find(s => s.id === standId)?.capacity || 1,
      location_id: locationId,
    };
    setEditingStand(stand);
    setStandForm({ 
      name: stand.name, 
      capacity: stand.capacity, 
      locationId: stand.location_id 
    });
    setShowStandModal(true);
  };

  const handleUpdateStand = async () => {
    if (!editingStand) return;
    try {
      setLoadingAction(true);
      const response = await fetch(`/api/distributor/admin/stands/${editingStand.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(standForm),
      });
      if (!response.ok) throw new Error('Failed to update stand');
      await fetchLocations();
      setShowStandModal(false);
      setEditingStand(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stand');
    } finally {
      setLoadingAction(false);
    }
  };

  // Box editing handlers - inline editing
  const handleBoxModelChange = async (boxId: string, newModel: string, currentStandId: string) => {
    try {
      setUpdatingBoxes(prev => new Set(prev).add(boxId));
      const modelValue = newModel === 'Pro_175' ? 'Pro 175' : 
                        newModel === 'Pro_190' ? 'Pro 190' : 
                        newModel;
      
      const response = await fetch(`/api/distributor/admin/boxes/${boxId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          model: modelValue,
        }),
      });
      if (!response.ok) throw new Error('Failed to update box model');
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update box model');
    } finally {
      setUpdatingBoxes(prev => {
        const next = new Set(prev);
        next.delete(boxId);
        return next;
      });
    }
  };

  const handleBoxStatusChange = async (boxId: string, newStatus: string, currentStandId: string) => {
    try {
      setUpdatingBoxes(prev => new Set(prev).add(boxId));
      
      const response = await fetch(`/api/distributor/admin/boxes/${boxId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      if (!response.ok) throw new Error('Failed to update box status');
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update box status');
    } finally {
      setUpdatingBoxes(prev => {
        const next = new Set(prev);
        next.delete(boxId);
        return next;
      });
    }
  };

  const handleMoveBox = async (boxId: string, currentStandId: string, newStandId: string) => {
    await fetchStands();
    const currentStand = selectedLocation?.stands.find(s => s.id === currentStandId);
    const newStand = stands.find(s => s.id === newStandId);
    const box = currentStand?.boxes.find(b => b.id === boxId);
    
    if (box && newStand) {
      setBoxToMove({
        boxId,
        boxDisplayId: box.display_id || box.id.slice(0, 6),
        currentStandName: currentStand?.name || '',
        newStandId,
        newStandName: newStand.name || '',
      });
      setMoveBoxConfirmation('');
      setShowMoveBoxModal(true);
    }
  };

  const confirmMoveBox = async () => {
    if (!boxToMove) return;
    
    if (moveBoxConfirmation !== 'MOVE') {
      setError('Please type MOVE to confirm moving the box');
      return;
    }

    try {
      setLoadingAction(true);
      const response = await fetch(`/api/distributor/admin/boxes/${boxToMove.boxId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          standId: boxToMove.newStandId,
        }),
      });
      if (!response.ok) throw new Error('Failed to move box');
      await fetchLocations();
      setShowMoveBoxModal(false);
      setBoxToMove(null);
      setMoveBoxConfirmation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move box');
    } finally {
      setLoadingAction(false);
    }
  };

  const openDeleteBoxModal = (boxId: string, standId: string) => {
    const stand = selectedLocation?.stands.find(s => s.id === standId);
    const box = stand?.boxes.find(b => b.id === boxId);
    
    if (box) {
      setBoxToDelete({
        boxId,
        boxDisplayId: box.display_id || box.id.slice(0, 6),
      });
      setDeleteBoxConfirmation('');
      setShowDeleteBoxModal(true);
    }
  };

  const confirmDeleteBox = async () => {
    if (!boxToDelete) return;
    
    if (deleteBoxConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm deletion');
      return;
    }

    try {
      setLoadingAction(true);
      const response = await fetch(`/api/distributor/admin/boxes/${boxToDelete.boxId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete box');
      await fetchLocations();
      setShowDeleteBoxModal(false);
      setBoxToDelete(null);
      setDeleteBoxConfirmation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete box');
    } finally {
      setLoadingAction(false);
    }
  };

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
                : 'left-0 top-0 w-[50vw] max-w-[800px] min-w-[500px] border-r'
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
                    <div className="flex items-center justify-between w-full mb-1">
                      <h2 className="text-lg font-semibold text-white truncate">
                        {selectedLocation.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedLocation.status === 'available'
                              ? 'bg-green-500/20 text-green-400'
                              : selectedLocation.status === 'maintenance'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {selectedLocation.status.charAt(0).toUpperCase() + selectedLocation.status.slice(1)}
                        </span>
                        <button
                          onClick={() => openLocationModal(selectedLocation)}
                          className="px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/20 transition-colors"
                        >
                          Edit Location
                        </button>
                      </div>
                    </div>
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
              </div>
            </div>

            {/* Panel Content - Clean Google Maps Style */}
            <div className="p-3 space-y-4">
              {/* Location Image */}
              <div className="-mx-3 -mt-3 w-full aspect-video bg-white/5 border-x-0 border-t-0 border-b border-white/10 flex items-center justify-center relative overflow-hidden">
                {selectedLocation.image ? (
                  <img
                    src={selectedLocation.image}
                    alt={selectedLocation.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs text-gray-500">No Image</span>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors opacity-0 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload location image"
                >
                  {uploadingImage ? (
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-cyan-500/20 border-t-cyan-500"></div>
                  ) : (
                    <span className="text-xs text-white font-medium">Upload Image</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedLocation) {
                      await handleUploadLocationImage(selectedLocation.id, file);
                    }
                    if (e.target) {
                      e.target.value = '';
                    }
                  }}
                />
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

              {/* Stands List */}
              <div>
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{stand.boxes.length} boxes</span>
                            <button
                              onClick={() => openStandModal(stand.id, selectedLocation.id)}
                              className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                              title="Edit stand"
                            >
                              Edit
                            </button>
                          </div>
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
                        
                        {/* Boxes Table */}
                        {stand.boxes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <h5 className="text-xs font-medium text-gray-400 mb-2">Boxes ({stand.boxes.length})</h5>
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-700/50">
                                <thead className="bg-gray-900/80 backdrop-blur-sm">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Model</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                                  {stand.boxes.map((box) => {
                                    const isUpdating = updatingBoxes.has(box.id);
                                    // Map model to enum format for select
                                    const boxModel = box.model === 'Pro 175' || box.model === 'Pro_175' ? 'Pro_175' :
                                                    box.model === 'Pro 190' || box.model === 'Pro_190' ? 'Pro_190' :
                                                    'Pro_175';
                                    // Map status - schema has Active, Inactive, Upcoming
                                    const boxStatus = box.status === 'available' || box.status === 'Active' ? 'Active' : 
                                                     box.status === 'Inactive' ? 'Inactive' : 
                                                     box.status === 'Upcoming' ? 'Upcoming' : 
                                                     'Active';
                                    
                                    return (
                                      <tr key={box.id} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-300">{box.display_id || '-'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <select
                                            value={boxModel}
                                            onChange={(e) => handleBoxModelChange(box.id, e.target.value, stand.id)}
                                            disabled={isUpdating}
                                            className="text-xs text-white bg-gray-700/50 border border-gray-600 rounded px-2 py-1 hover:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <option value="Pro_175">Pro 175</option>
                                            <option value="Pro_190">Pro 190</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <select
                                            value={boxStatus}
                                            onChange={(e) => handleBoxStatusChange(box.id, e.target.value, stand.id)}
                                            disabled={isUpdating}
                                            className="text-xs bg-gray-700/50 border border-gray-600 rounded px-2 py-1 hover:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                                              boxStatus === 'Active' ? 'text-green-300' :
                                              boxStatus === 'Inactive' ? 'text-red-400' :
                                              'text-yellow-400'
                                            }"
                                          >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                            <option value="Upcoming">Upcoming</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                                          <button
                                            onClick={() => openDeleteBoxModal(box.id, stand.id)}
                                            disabled={isUpdating}
                                            className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Delete box"
                                          >
                                            Delete
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Location</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={locationForm.status}
                  onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value as 'available' | 'maintenance' | 'inactive' })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLocation}
                disabled={loadingAction}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingAction ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stand Modal */}
      {showStandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100]">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Stand</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={standForm.name}
                  onChange={(e) => setStandForm({ ...standForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={standForm.capacity}
                  onChange={(e) => setStandForm({ ...standForm, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowStandModal(false);
                  setEditingStand(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStand}
                disabled={loadingAction}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingAction ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Box Confirmation Modal */}
      {showMoveBoxModal && boxToMove && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Move Box</h3>
              <p className="text-sm text-gray-400 mb-4">
                You are about to move box <span className="text-white font-semibold">&quot;{boxToMove.boxDisplayId}&quot;</span> from <span className="text-white font-semibold">&quot;{boxToMove.currentStandName}&quot;</span> to <span className="text-white font-semibold">&quot;{boxToMove.newStandName}&quot;</span>.
              </p>
              <p className="text-sm text-gray-400 mb-2">
                This action cannot be undone. Type <span className="text-white font-semibold">&quot;MOVE&quot;</span> to confirm:
              </p>
              <input
                type="text"
                value={moveBoxConfirmation}
                onChange={(e) => {
                  setMoveBoxConfirmation(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && moveBoxConfirmation === 'MOVE') {
                    confirmMoveBox();
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                placeholder="Type MOVE to confirm"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMoveBoxModal(false);
                  setBoxToMove(null);
                  setMoveBoxConfirmation('');
                  setError(null);
                }}
                className="px-5 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600/50"
              >
                Cancel
              </button>
              <button
                onClick={confirmMoveBox}
                disabled={moveBoxConfirmation !== 'MOVE' || loadingAction}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-cyan-700"
              >
                {loadingAction ? 'Moving...' : 'Move Box'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Box Confirmation Modal */}
      {showDeleteBoxModal && boxToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Delete Box</h3>
              <p className="text-sm text-gray-400 mb-4">
                This action cannot be undone. This will permanently delete box <span className="text-white font-semibold">&quot;{boxToDelete.boxDisplayId}&quot;</span>.
              </p>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type <span className="text-white font-semibold">&quot;DELETE&quot;</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteBoxConfirmation}
                onChange={(e) => {
                  setDeleteBoxConfirmation(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteBoxConfirmation === 'DELETE') {
                    confirmDeleteBox();
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                placeholder="Type DELETE to confirm"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteBoxModal(false);
                  setBoxToDelete(null);
                  setDeleteBoxConfirmation('');
                  setError(null);
                }}
                className="px-5 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600/50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBox}
                disabled={deleteBoxConfirmation !== 'DELETE' || loadingAction}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-600 disabled:hover:to-red-700"
              >
                {loadingAction ? 'Deleting...' : 'Delete Box'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

