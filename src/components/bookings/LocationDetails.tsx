import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// Helper functions for date handling
const isValidDateString = (dateStr: string | undefined): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const extractDatePart = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    if (isValidDateString(dateStr)) {
      return new Date(dateStr).toISOString().split('T')[0];
    }
    return '';
  } catch {
    return '';
  }
};

const extractTimePart = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('T')) {
      const timePart = dateStr.split('T')[1];
      return timePart ? timePart.slice(0, 5) : '';
    }
    return '';
  } catch {
    return '';
  }
};

const getDefaultStartTime = (): string => {
  return '09:00';
};

const getDefaultEndTime = (): string => {
  return '17:00';
};

interface LocationDetailsProps {
  location: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    status: 'available' | 'maintenance' | 'inactive';
    availableBoxes: {
      classic: number;
      pro: number;
      total: number;
    };
  };
  onBook?: (locationId: string, boxId: string, standId: string, modelId?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string) => void;
  onClose?: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
  initialModelId?: string;
}

type AvailableBox = {
  standId: string;
  standName: string;
  boxes: Array<{
    id: string;
    model: 'Classic' | 'Pro';
    displayId: string;
    compartment: number | null;
  }>;
};

const LocationDetails: React.FC<LocationDetailsProps> = ({ 
  location, 
  onBook, 
  onClose,
  initialStartDate,
  initialEndDate,
  initialModelId,
}) => {
  const [activeTab, setActiveTab] = useState<'model' | 'dates' | 'box'>(() => {
    return initialModelId ? 'dates' : 'model';
  });
  
  const [selectedModel, setSelectedModel] = useState<string>(initialModelId || '');
  const [startDate, setStartDate] = useState<string>(extractDatePart(initialStartDate));
  const [endDate, setEndDate] = useState<string>(extractDatePart(initialEndDate));
  const [startTime, setStartTime] = useState<string>(extractTimePart(initialStartDate) || getDefaultStartTime());
  const [endTime, setEndTime] = useState<string>(extractTimePart(initialEndDate) || getDefaultEndTime());
  
  const [availableBoxes, setAvailableBoxes] = useState<AvailableBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<{ boxId: string; standId: string; standName: string; model: string; compartment: number | null } | null>(null);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [boxError, setBoxError] = useState<string | null>(null);

  // Update state when initial values change
  useEffect(() => {
    const newStartDate = extractDatePart(initialStartDate);
    const newEndDate = extractDatePart(initialEndDate);
    
    if (newStartDate && isValidDateString(newStartDate)) {
      setStartDate(newStartDate);
      const time = extractTimePart(initialStartDate);
      setStartTime(time || getDefaultStartTime());
    }
    
    if (newEndDate && isValidDateString(newEndDate)) {
      setEndDate(newEndDate);
      const time = extractTimePart(initialEndDate);
      setEndTime(time || getDefaultEndTime());
    }
    
    if (initialModelId) {
      setSelectedModel(initialModelId);
    }
  }, [initialStartDate, initialEndDate, initialModelId]);

  // Track latest selected box without forcing re-fetch when it changes
  const selectedBoxRef = React.useRef<typeof selectedBox>(null);
  useEffect(() => {
    selectedBoxRef.current = selectedBox;
  }, [selectedBox]);

  // Automatically switch to dates tab when model is first selected (only when model changes, not when tab is clicked)
  const previousSelectedModelRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    // Only auto-switch if model just changed from empty to selected (not if user clicks back to model tab)
    if (selectedModel && !previousSelectedModelRef.current) {
      // Use setTimeout to ensure this happens after any manual tab clicks
      const timer = setTimeout(() => {
        setActiveTab((currentTab) => {
          // Only switch if we're currently on the model tab
          return currentTab === 'model' ? 'dates' : currentTab;
        });
      }, 0);
      previousSelectedModelRef.current = selectedModel;
      return () => clearTimeout(timer);
    } else if (!selectedModel) {
      previousSelectedModelRef.current = null;
    }
  }, [selectedModel]);

  // Automatically switch to box tab when dates are selected and boxes are loaded
  useEffect(() => {
    if (selectedModel && startDate && endDate && availableBoxes.length > 0 && activeTab === 'dates' && !selectedBox) {
      setActiveTab('box');
    }
  }, [selectedModel, startDate, endDate, availableBoxes.length, activeTab, selectedBox]);

  // Fetch available boxes when model and dates are selected
  useEffect(() => {
    if (!selectedModel || !startDate || !endDate) {
      setAvailableBoxes([]);
      setSelectedBox(null);
      return;
    }

    const fetchAvailableBoxes = async () => {
      setLoadingBoxes(true);
      setBoxError(null);
      try {
        const params = new URLSearchParams({
          model: selectedModel === 'classic' ? 'Classic' : 'Pro',
          startDate: `${startDate}T${startTime}`,
          endDate: `${endDate}T${endTime}`,
        });
        
        const response = await fetch(`/api/locations/${location.id}/boxes?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch available boxes');
        }
        
        const data = await response.json();
        console.log('=== API Response ===');
        console.log('Full response:', JSON.stringify(data, null, 2));
        console.log('Available boxes:', data.availableBoxes);
        if (data.availableBoxes && data.availableBoxes.length > 0) {
          console.log('First stand:', data.availableBoxes[0]);
          if (data.availableBoxes[0].boxes && data.availableBoxes[0].boxes.length > 0) {
            console.log('First box:', data.availableBoxes[0].boxes[0]);
            console.log('First box compartment:', data.availableBoxes[0].boxes[0].compartment);
            console.log('First box compartment type:', typeof data.availableBoxes[0].boxes[0].compartment);
          }
        }
        setAvailableBoxes(data.availableBoxes || []);
        
        // Auto-select first available box if none selected
        if (data.availableBoxes && data.availableBoxes.length > 0 && !selectedBoxRef.current) {
          const firstStand = data.availableBoxes[0];
          if (firstStand.boxes.length > 0) {
            const firstBox = firstStand.boxes[0];
            console.log('=== Setting Selected Box ===');
            console.log('Box compartment value:', firstBox.compartment);
            console.log('Box compartment type:', typeof firstBox.compartment);
            console.log('Is null?', firstBox.compartment === null);
            console.log('Is undefined?', firstBox.compartment === undefined);
            setSelectedBox({
              boxId: firstBox.id,
              standId: firstStand.standId,
              standName: firstStand.standName,
              model: firstBox.model,
              compartment: firstBox.compartment ?? null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching available boxes:', error);
        setBoxError('Unable to check box availability. Please try again.');
        setAvailableBoxes([]);
      } finally {
        setLoadingBoxes(false);
      }
    };

    fetchAvailableBoxes();
  }, [location.id, selectedModel, startDate, endDate, startTime, endTime]);

  const isTimeOrderValid = React.useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return true;
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      return end > start;
    } catch {
      return true;
    }
  }, [startDate, endDate, startTime, endTime]);

  const formatDateTimeForDisplay = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return '';
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-emerald-500';
      case 'maintenance':
        return 'text-yellow-500';
      case 'inactive':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const basePrice = 299.99;
  const modelMultiplier = selectedModel === 'pro' || selectedModel === 'Pro' ? 1.5 : 1.0;
  const days = startDate && endDate 
    ? Math.max(1, Math.ceil((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalPrice = basePrice * modelMultiplier * days;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
      {/* Status color bar */}
      <div className={`w-2 ${getStatusColor(location.status)}`} />
      
      <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header Section */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{location.name}</h2>
              <p className="text-sm text-gray-600">{location.address}</p>
            </div>
            <div className="flex items-start gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusTextColor(location.status)} border border-current`}>
                {location.status.charAt(0).toUpperCase() + location.status.slice(1)}
              </span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <div>
              <span className="text-gray-600">Classic: </span>
              <span className="font-semibold text-gray-900">{location.availableBoxes.classic}</span>
            </div>
            <div>
              <span className="text-gray-600">Pro: </span>
              <span className="font-semibold text-gray-900">{location.availableBoxes.pro}</span>
            </div>
            <div>
              <span className="text-gray-600">Total: </span>
              <span className="font-semibold text-gray-900">{location.availableBoxes.total}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'model'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Model
          </button>
          <button
            onClick={() => setActiveTab('dates')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dates'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Dates
          </button>
          <button
            onClick={() => setActiveTab('box')}
            disabled={!selectedModel || !startDate || !endDate || availableBoxes.length === 0}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'box'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : (!selectedModel || !startDate || !endDate || availableBoxes.length === 0)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Box
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden min-h-0" style={{ flex: '1 1 0%', minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'model' && (
            <div className="p-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'classic', name: 'IXTAbox Classic 175', dimension: '175 cm', available: location.availableBoxes.classic > 0 },
                  { id: 'pro', name: 'IXTAbox Pro 190', dimension: '190 cm', available: location.availableBoxes.pro > 0 },
                ].map((model) => {
                  const is175cm = model.name.includes('175');
                  const imageWidth = is175cm ? 60 : 75;
                  
                  return (
                    <label
                      key={model.id}
                      className={`relative flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-colors
                        ${!model.available ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500'}
                        ${selectedModel === model.id 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={!model.available}
                        className="sr-only"
                      />
                      <div className="flex justify-center items-center mb-2 h-16">
                        <Image
                          src={encodeURI("/images/boxes/Screenshot 2025-11-12 120924.png")}
                          alt={`${model.name} box`}
                          width={imageWidth}
                          height={50}
                          className="object-contain"
                          style={{ width: `${imageWidth}px`, height: 'auto', maxHeight: '50px' }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 text-center">{model.name}</span>
                      <span className="text-xs font-medium text-gray-600 mt-1 text-center">{model.dimension}</span>
                      {!model.available && (
                        <span className="text-xs text-red-600 mt-1 text-center">Not available</span>
                      )}
                      {selectedModel === model.id && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={startDate && startTime ? `${startDate}T${startTime}` : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const [date, time] = value.split('T');
                        setStartDate(date || '');
                        setStartTime(time || getDefaultStartTime());
                      } else {
                        setStartDate('');
                        setStartTime('');
                      }
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                               focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={endDate && endTime ? `${endDate}T${endTime}` : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const [date, time] = value.split('T');
                        setEndDate(date || '');
                        setEndTime(time || getDefaultEndTime());
                      } else {
                        setEndDate('');
                        setEndTime('');
                      }
                    }}
                    min={startDate && startTime ? `${startDate}T${startTime}` : new Date().toISOString().slice(0, 16)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                               focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
                  />
                </div>
              </div>

              {!isTimeOrderValid && (
                <p className="text-sm text-red-600">End time must be after start time.</p>
              )}

              {startDate && endDate && startTime && endTime && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900">
                    {formatDateTimeForDisplay(startDate, startTime)} – {formatDateTimeForDisplay(endDate, endTime)}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'box' && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '100%' }}>
              {!selectedModel || !startDate || !endDate ? (
                <div className="text-sm text-gray-600 text-center py-8">
                  Please select a model and dates first.
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex-shrink-0">Available Boxes</h3>
                  {loadingBoxes ? (
                    <div className="text-sm text-gray-600">Checking availability...</div>
                  ) : boxError ? (
                    <div className="text-sm text-red-600">{boxError}</div>
                  ) : availableBoxes.length === 0 ? (
                    <div className="text-sm text-gray-600">No boxes available for the selected dates and model.</div>
                  ) : (
                    <div className="space-y-2">
                      {availableBoxes.map((stand) => {
                        // Get the model from the first box (all boxes in a stand group should have the same model after filtering)
                        const standModel = stand.boxes.length > 0 ? stand.boxes[0].model : null;
                        // Get compartment from selected box if this stand is selected
                        const selectedBoxFromStand = selectedBox?.standId === stand.standId ? selectedBox : null;
                        return (
                        <div key={stand.standId} className="border border-gray-200 rounded-lg p-3">
                          <div className="font-medium text-sm text-gray-900 mb-2">
                            {stand.standName}
                            {standModel && (
                              <span className="ml-2 text-gray-600 font-normal">• {standModel}</span>
                            )}
                            {selectedBoxFromStand?.compartment !== null && selectedBoxFromStand?.compartment !== undefined && (
                              <span className="ml-2 text-gray-600 font-normal">• C{selectedBoxFromStand.compartment}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {stand.boxes.map((box) => (
                              <label
                                key={box.id}
                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                  selectedBox?.boxId === box.id
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:border-emerald-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="box"
                                  value={box.id}
                                  checked={selectedBox?.boxId === box.id}
                                  onChange={() => {
                                    console.log('=== Box Selected ===');
                                    console.log('Box ID:', box.id);
                                    console.log('Box compartment:', box.compartment);
                                    console.log('Box compartment type:', typeof box.compartment);
                                    console.log('Full box object:', box);
                                    setSelectedBox({
                                      boxId: box.id,
                                      standId: stand.standId,
                                      standName: stand.standName,
                                      model: box.model,
                                      compartment: box.compartment,
                                    });
                                  }}
                                  className="text-emerald-500 focus:ring-emerald-500 flex-shrink-0"
                                />
                                <span className="text-xs sm:text-sm text-gray-900 truncate">
                                  Box {box.displayId}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          {totalPrice > 0 && (
            <div className="mb-3 text-center">
              <span className="text-sm text-gray-600">Total: </span>
              <span className="text-lg font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
            </div>
          )}
          <button
            onClick={() => {
              if (onBook && selectedBox) {
                onBook(
                  location.id,
                  selectedBox.boxId,
                  selectedBox.standId,
                  selectedModel,
                  startDate,
                  endDate,
                  startTime,
                  endTime
                );
              }
            }}
            disabled={
              location.status === 'maintenance' ||
              location.status === 'inactive' ||
              !startDate ||
              !endDate ||
              !startTime ||
              !endTime ||
              !isTimeOrderValid ||
              !selectedModel ||
              !selectedBox ||
              loadingBoxes
            }
            className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white transition-colors
              ${
                location.status !== 'maintenance' && 
                location.status !== 'inactive' &&
                startDate && 
                endDate && 
                startTime && 
                endTime && 
                selectedModel && 
                selectedBox &&
                isTimeOrderValid &&
                !loadingBoxes
                  ? 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {location.status === 'maintenance' 
              ? 'Under Maintenance' 
              : location.status === 'inactive'
              ? 'Location Inactive'
              : !selectedModel
              ? 'Select a Model'
              : !startDate
              ? 'Select start date'
              : !endDate
              ? 'Select end date'
              : !startTime
              ? 'Select start time'
              : !endTime
              ? 'Select end time'
              : !selectedBox
              ? 'Select a Box'
              : loadingBoxes
              ? 'Checking availability...'
              : !isTimeOrderValid
              ? 'End time must be after start time'
              : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationDetails;

