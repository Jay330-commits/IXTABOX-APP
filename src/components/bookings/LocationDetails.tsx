import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { logger } from '@/utils/logger';

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
  };
  onBook?: (locationId: string, boxId: string, standId: string, modelId?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string, locationDisplayId?: string, compartment?: number | null) => Promise<void> | void;
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
    model: 'Pro 175' | 'Pro 190';
    displayId: string;
    compartment: number | null;
    isAvailable: boolean;
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
  const [activeTab, setActiveTab] = useState<'dates' | 'model' | 'box'>(() => {
    return initialStartDate && initialEndDate ? 'model' : 'dates';
  });
  
  const [selectedModel, setSelectedModel] = useState<string>(initialModelId || '');
  const [startDate, setStartDate] = useState<string>(extractDatePart(initialStartDate));
  const [endDate, setEndDate] = useState<string>(extractDatePart(initialEndDate));
  const [startTime, setStartTime] = useState<string>(extractTimePart(initialStartDate) || getDefaultStartTime());
  const [endTime, setEndTime] = useState<string>(extractTimePart(initialEndDate) || getDefaultEndTime());
  
  const [availableBoxes, setAvailableBoxes] = useState<AvailableBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<{ boxId: string; standId: string; standName: string; model: string; compartment: number | null } | null>(null);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{
    basePrice: number;
    classic: { pricePerDay: number; multiplier: number };
    pro: { pricePerDay: number; multiplier: number };
  } | null>(null);
  const [, setLoadingPricing] = useState(false);

  // Update state when initial values change
  useEffect(() => {
    const newStartDate = extractDatePart(initialStartDate);
    const newEndDate = extractDatePart(initialEndDate);
    
    if (newStartDate && isValidDateString(newStartDate)) {
      const time = extractTimePart(initialStartDate) || getDefaultStartTime();
      setStartDate(newStartDate);
        setStartTime(time);
    }
    
    if (newEndDate && isValidDateString(newEndDate)) {
      const time = extractTimePart(initialEndDate) || getDefaultEndTime();
      setEndDate(newEndDate);
        setEndTime(time);
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

  // Track previous selected model to detect changes
  const previousSelectedModelRef = React.useRef<string | null>(null);
  
  // Auto-switch when model is selected
  useEffect(() => {
    // Only auto-switch if model just changed from empty to selected (not if user clicks back to model tab)
    if (selectedModel && !previousSelectedModelRef.current) {
      // Use setTimeout to ensure this happens after any manual tab clicks
      const timer = setTimeout(() => {
        setActiveTab((currentTab) => {
          // Only switch if we're currently on the model tab
          if (currentTab === 'model') {
            // If dates are already selected, go directly to box tab
            // Otherwise go to dates tab
            return (startDate && endDate) ? 'box' : 'dates';
          }
          return currentTab;
        });
      }, 0);
      previousSelectedModelRef.current = selectedModel;
      return () => clearTimeout(timer);
    } else if (!selectedModel) {
      previousSelectedModelRef.current = null;
    }
  }, [selectedModel, startDate, endDate]);

  // Fetch pricing data for the location
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoadingPricing(true);
        const response = await fetch(`/api/locations/${location.id}/pricing`);
        if (response.ok) {
          const data = await response.json();
          setPricing(data.pricing);
        } else {
          // Fallback to defaults if API fails
          setPricing({
            basePrice: 300,
            classic: { pricePerDay: 300, multiplier: 1.0 },
            pro: { pricePerDay: 300, multiplier: 1.0 },
          });
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Fallback to defaults on error
        setPricing({
          basePrice: 300,
          classic: { pricePerDay: 300, multiplier: 1.0 },
          pro: { pricePerDay: 300, multiplier: 1.0 },
        });
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, [location.id]);

  // Automatically switch to box tab when boxes are loaded and we're on dates tab
  useEffect(() => {
    if (selectedModel && startDate && endDate && availableBoxes.length > 0 && activeTab === 'dates' && !selectedBox) {
      const timer = setTimeout(() => {
      setActiveTab('box');
      }, 300); // Small delay to ensure boxes are rendered
      return () => clearTimeout(timer);
    }
  }, [selectedModel, startDate, endDate, availableBoxes.length, activeTab, selectedBox]);

  // Fetch available boxes when dates and model are selected

  // Debounce timer ref for API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available boxes when dates and model are selected
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only fetch if we have required data
    if (!startDate || !endDate || !selectedModel) {
      setAvailableBoxes([]);
      setSelectedBox(null);
      return;
    }

    // Debounce the API call to avoid excessive requests
    debounceTimerRef.current = setTimeout(async () => {
      setLoadingBoxes(true);
      setBoxError(null);
    
      try {
        // Simple API call with dates and model - server handles filtering
        const modelParam = selectedModel === 'classic' || selectedModel === 'pro_175' ? 'Pro 175' : 'Pro 190';
        const response = await fetch(
          `/api/locations/${location.id}/boxes?startDate=${startDate}&endDate=${endDate}&model=${modelParam}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch available boxes');
        }

        const data = await response.json();
        const boxesByStand = data.availableBoxes || [];
        
        setAvailableBoxes(boxesByStand);
        
        // Auto-select first available box if none selected
        // Validate that the box model matches the selected model
        if (boxesByStand.length > 0 && !selectedBoxRef.current) {
          const firstStand = boxesByStand[0];
          if (firstStand.boxes.length > 0) {
            const firstBox = firstStand.boxes[0];
            const expectedModel = selectedModel === 'classic' || selectedModel === 'pro_175' ? 'Pro 175' : 'Pro 190';
            
            // Only auto-select if the box model matches the selected model
            if (firstBox.model === expectedModel) {
            setSelectedBox({
              boxId: firstBox.id,
              standId: firstStand.standId,
              standName: firstStand.standName,
              model: firstBox.model,
              compartment: firstBox.compartment ?? null,
            });
            }
          }
        }
      } catch (error) {
        logger.error('[Booking Form] Error fetching available boxes', {
          locationId: location.id,
          model: selectedModel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setBoxError('Unable to check box availability. Please try again.');
        setAvailableBoxes([]);
      } finally {
        setLoadingBoxes(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
    };
  }, [startDate, endDate, selectedModel, location.id]);

  const isTimeOrderValid = React.useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return true;
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      
      // Check that end is after start
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
  
  // ============================================================================
  // Helper Functions - Status & Availability
  // ============================================================================

  /**
   * Get the display status for the location
   */
  const getDisplayStatus = (): string => {
    if (location.isFullyBooked) {
      return 'Booked';
    }
    return location.status.charAt(0).toUpperCase() + location.status.slice(1);
  };

  /**
   * Get status color based on availability
   */
  const getStatusColor = (): string => {
    if (location.isFullyBooked) {
      return 'bg-red-500';
    }
    switch (location.status) {
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

  /**
   * Get status text color based on availability
   */
  const getStatusTextColor = (): string => {
    if (location.isFullyBooked) {
      return 'text-red-700 bg-red-100 border-red-300';
    }
    switch (location.status) {
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

  /**
   * Check if a model is fully booked
   */
  const isModelFullyBooked = (modelId: string): boolean => {
    if (!location.modelAvailability) return false;
    if (modelId === 'classic' || modelId === 'pro_175') {
      return location.modelAvailability.classic.isFullyBooked;
    }
    if (modelId === 'pro' || modelId === 'pro_190') {
      return location.modelAvailability.pro.isFullyBooked;
    }
    return false;
  };

  /**
   * Get next available date for a model
   */
  const getModelNextAvailableDate = (modelId: string): string | null => {
    if (!location.modelAvailability) return null;
    if (modelId === 'classic' || modelId === 'pro_175') {
      return location.modelAvailability.classic.nextAvailableDate;
    }
    if (modelId === 'pro' || modelId === 'pro_190') {
      return location.modelAvailability.pro.nextAvailableDate;
    }
    return null;
  };


  /**
   * Check if a model is available (has boxes available)
   */
  const isModelAvailable = (modelId: string): boolean => {
    if (modelId === 'classic' || modelId === 'pro_175') {
      return location.availableBoxes.classic > 0;
    }
    if (modelId === 'pro' || modelId === 'pro_190') {
      return location.availableBoxes.pro > 0;
    }
    return false;
  };

  /**
   * Get minimum datetime (current time)
   */
  const getMinDateTimeFromNow = (): string => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };


  /**
   * Format date for display
   */
  const formatDateForDisplay = (dateStr: string | null): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
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

  // Get pricing from API or use defaults - all models are 300 per day
  const pricePerDay = 
    selectedModel === 'pro' || selectedModel === 'Pro' || selectedModel === 'pro_190' || selectedModel === 'Pro 190'
      ? (pricing?.pro.pricePerDay ?? 300)
      : (pricing?.classic.pricePerDay ?? 300);
  
  const days = startDate && endDate 
    ? Math.max(1, Math.ceil((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalPrice = pricePerDay * days;

  const isBooked = location.isFullyBooked || false;

  // Log form status to server
  React.useEffect(() => {
    // Form status updated (logging removed for performance)
  }, [location.isFullyBooked, isBooked, location.name, location.availableBoxes, location.earliestNextAvailableDate, location.modelAvailability, location.status]);

  return (
    <div className={`rounded-lg shadow-lg overflow-hidden flex flex-col ${isBooked ? 'bg-red-50 border-2 border-red-200' : 'bg-white'}`} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Status color bar */}
      <div className={`w-2 ${getStatusColor()}`} />
      
      <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header Section */}
        <div className={`p-4 border-b flex-shrink-0 ${isBooked ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-lg font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{location.name}</h2>
              <p className={`text-sm ${isBooked ? 'text-red-700' : 'text-gray-600'}`}>{location.address}</p>
            </div>
            <div className="flex items-start gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusTextColor()} border border-current`}>
                {getDisplayStatus()}
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
          <div className={`mt-2 flex gap-4 text-sm ${isBooked ? 'text-red-800' : 'text-gray-600'}`}>
            <div>
              <span>Pro 175: </span>
              <span className={`font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{location.availableBoxes.classic}</span>
            </div>
            <div>
              <span>Pro 190: </span>
              <span className={`font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{location.availableBoxes.pro}</span>
            </div>
            <div>
              <span>Total: </span>
              <span className={`font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{location.availableBoxes.total}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b flex-shrink-0 ${isBooked ? 'border-red-200' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('dates')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dates'
                ? isBooked
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Dates
          </button>
          <button
            onClick={() => setActiveTab('model')}
            disabled={!startDate || !endDate}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'model'
                ? isBooked
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : (!startDate || !endDate)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Model
          </button>
          <button
            onClick={() => setActiveTab('box')}
            disabled={!selectedModel || !startDate || !endDate || availableBoxes.length === 0}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'box'
                ? isBooked
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : (!selectedModel || !startDate || !endDate || availableBoxes.length === 0)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Box
          </button>
        </div>

        {/* Tab Content */}
        <div className={`flex-1 overflow-hidden min-h-0 ${isBooked ? 'bg-red-50/30' : 'bg-white'}`} style={{ flex: '1 1 0%', minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
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
                    min={getMinDateTimeFromNow()}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900 bg-white ${isBooked ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
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
                        const selectedDateTime = new Date(`${date}T${time || getDefaultEndTime()}`);
                        const startDateTime = startDate && startTime ? new Date(`${startDate}T${startTime}`) : null;
                        
                        // Ensure end is after start
                        if (startDateTime && selectedDateTime <= startDateTime) {
                          alert('End date and time must be after start date and time.');
                          return;
                        }
                        
                        setEndDate(date || '');
                        setEndTime(time || getDefaultEndTime());
                      } else {
                        setEndDate('');
                        setEndTime('');
                      }
                    }}
                    min={startDate && startTime ? `${startDate}T${startTime}` : getMinDateTimeFromNow()}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900 bg-white ${isBooked ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="p-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'pro_175', name: 'IXTAbox Pro 175', dimension: '175 cm' },
                  { id: 'pro_190', name: 'IXTAbox Pro 190', dimension: '190 cm' },
                ].map((model) => {
                  const is175cm = model.name.includes('175');
                  const imageWidth = is175cm ? 60 : 75;
                  const modelBooked = isModelFullyBooked(model.id);
                  const modelAvailable = isModelAvailable(model.id);
                  const nextAvailableDate = getModelNextAvailableDate(model.id);
                  
                  return (
                    <label
                      key={model.id}
                      className={`relative flex flex-col p-3 border-2 rounded-lg transition-colors cursor-pointer
                        ${isBooked
                          ? 'hover:border-red-400'
                          : 'hover:border-emerald-500'
                        }
                        ${selectedModel === model.id 
                          ? isBooked
                            ? 'border-red-500 bg-red-50'
                            : 'border-emerald-500 bg-emerald-50'
                          : modelBooked
                          ? isBooked
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-red-200 bg-red-50/30'
                          : 'border-gray-200'
                        }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => {
                          // Removed logging for performance (reduces overhead on mobile)
                          setSelectedModel(e.target.value);
                        }}
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
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-semibold text-center break-words ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>
                          {model.name}
                        </span>
                        <span className="text-xs font-medium text-gray-600 text-center">{model.dimension}</span>
                        {/* Show availability status */}
                        {modelBooked && nextAvailableDate ? (
                          <span className={`text-xs text-center font-medium leading-tight break-words px-1 ${isBooked ? 'text-red-600' : 'text-amber-600'}`}>
                            Available from: {formatDateForDisplay(nextAvailableDate)}
                          </span>
                        ) : modelAvailable ? (
                          <span className={`text-xs text-center font-medium leading-tight break-words px-1 ${isBooked ? 'text-gray-600' : 'text-emerald-600'}`}>
                            Available now
                          </span>
                        ) : null}
                      </div>
                      {selectedModel === model.id && (
                        <div className="absolute top-2 right-2">
                          <svg className={`w-5 h-5 ${modelBooked ? 'text-red-500' : isBooked ? 'text-red-500' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 20 20">
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

          {activeTab === 'box' && (
            <div className={`p-4 space-y-4 flex-1 overflow-y-auto min-h-0 ${isBooked ? 'bg-red-50/30' : ''}`} style={{ maxHeight: '100%' }}>
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
                            {stand.boxes.map((box) => {
                              const isBooked = !box.isAvailable;
                              const modelId = box.model.toLowerCase();
                              const nextAvailableDate = getModelNextAvailableDate(modelId);
                              const formatDate = (dateStr: string | null): string => {
                                if (!dateStr) return '';
                                try {
                                  const date = new Date(dateStr);
                                  return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  });
                                } catch {
                                  return '';
                                }
                              };

                              return (
                              <label
                                key={box.id}
                                  className={`flex flex-col gap-1 p-2 rounded border transition-colors ${
                                    isBooked
                                      ? 'opacity-75 cursor-not-allowed border-gray-300 bg-gray-50'
                                      : selectedBox?.boxId === box.id
                                      ? isBooked
                                        ? 'border-red-500 bg-red-50 cursor-pointer'
                                        : 'border-emerald-500 bg-emerald-50 cursor-pointer'
                                      : isBooked
                                      ? 'border-gray-200 hover:border-red-300 cursor-pointer'
                                      : 'border-gray-200 hover:border-emerald-300 cursor-pointer'
                                }`}
                              >
                                  <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="box"
                                  value={box.id}
                                  checked={selectedBox?.boxId === box.id}
                                  onChange={() => {
                                        if (!isBooked) {
                                          // Validate that the box model matches the selected model
                                          const expectedModel = selectedModel === 'classic' || selectedModel === 'pro_175' ? 'Pro 175' : 'Pro 190';
                                          if (box.model !== expectedModel) {
                                            alert(`This box is ${box.model} but you selected ${selectedModel === 'classic' || selectedModel === 'pro_175' ? 'Pro 175' : 'Pro 190'}. Please select a box that matches your selected model.`);
                                            return;
                                          }
                                          
                                          setSelectedBox({
                                            boxId: box.id,
                                            standId: stand.standId,
                                            standName: stand.standName,
                                            model: box.model,
                                            compartment: box.compartment,
                                          });
                                        }
                                  }}
                                      disabled={isBooked}
                                      className={`${isBooked ? 'text-red-500 focus:ring-red-500' : 'text-emerald-500 focus:ring-emerald-500'} flex-shrink-0 disabled:opacity-50`}
                                />
                                    <span className={`text-xs sm:text-sm truncate ${isBooked ? 'text-gray-500' : 'text-gray-900'}`}>
                                  Box {box.displayId}
                                </span>
                                  </div>
                                  {isBooked && nextAvailableDate && (
                                    <span className="text-xs text-amber-600 font-medium">
                                      Available: {formatDate(nextAvailableDate)}
                                    </span>
                                  )}
                              </label>
                              );
                            })}
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
        <div className={`px-4 py-4 border-t flex-shrink-0 ${isBooked ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          {totalPrice > 0 && (
            <div className="mb-3 text-center">
              <span className={`text-sm ${isBooked ? 'text-red-700' : 'text-gray-600'}`}>Total: </span>
              <span className={`text-lg font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{formatPrice(totalPrice)}</span>
            </div>
          )}
          <button
            onClick={async () => {
              // Validate booking against blocked ranges (use model-level ranges if available)
              if (startDate && endDate && startTime && endTime) {
                const start = new Date(`${startDate}T${startTime}`);
                const end = new Date(`${endDate}T${endTime}`);
                
                // Use model-level ranges if available, otherwise use box-specific ranges
                // Availability is already checked by the API when fetching boxes
                // No need to check again here
              }
              
              if (onBook && selectedBox && !isBooking) {
                // Validate that the selected box's model matches the selected model
                const selectedBoxModel = selectedBox.model; // This is 'Pro 175' or 'Pro 190' from database
                const expectedModel = selectedModel === 'classic' || selectedModel === 'pro_175' ? 'Pro 175' : 'Pro 190'; // Convert frontend model to database format
                
                if (selectedBoxModel !== expectedModel) {
                  alert(`Model mismatch: Selected box is ${selectedBoxModel} but you selected ${selectedModel}. Please select a box that matches your selected model.`);
                  setIsBooking(false);
                  return;
              }
              
                setIsBooking(true);
                logger.info('[Booking Form] Booking submitted', {
                  locationId: location.id,
                  boxId: selectedBox.boxId,
                  standId: selectedBox.standId,
                  model: selectedModel,
                  boxModel: selectedBoxModel,
                  startDate: `${startDate}T${startTime}`,
                  endDate: `${endDate}T${endTime}`,
                  compartment: selectedBox.compartment,
                });
                try {
                  const result = onBook(
                  location.id,
                  selectedBox.boxId,
                  selectedBox.standId,
                  selectedModel,
                  startDate,
                  endDate,
                  startTime,
                    endTime,
                    location.id, // locationDisplayId - using location.id as display id for now
                    selectedBox.compartment
                  );
                  if (result instanceof Promise) {
                    await result;
                  }
                } catch (error) {
                  console.error('Booking error:', error);
                  setIsBooking(false);
                  alert('Failed to create booking. Please try again.');
                }
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
              loadingBoxes ||
              isBooking
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
                  ? isBooked
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                    : 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {isBooking
              ? 'Processing...'
              : location.status === 'maintenance' 
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

