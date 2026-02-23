"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { calculateBookingDays, calculateBookingTotal } from '@/utils/bookingPrice';
import Image from 'next/image';
import { logger } from '@/utils/logger';
import { TimePickerField } from '@/components/ui/TimePickerField';

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

// Helper function to normalize model ID to display format
const normalizeModelId = (modelId: string): string => {
  const normalized = modelId.toLowerCase().trim();
  if (normalized === 'pro_175' || normalized === 'pro 175' || normalized === 'classic') {
    return 'Pro 175';
  }
  if (normalized === 'pro_190' || normalized === 'pro 190' || normalized === 'pro') {
    return 'Pro 190';
  }
  // If already in display format, return as is
  if (modelId === 'Pro 175' || modelId === 'Pro 190') {
    return modelId;
  }
  // Default fallback
  return modelId;
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
    image?: string | null;
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
  const [activeTab, setActiveTab] = useState<'dates' | 'model'>(() => {
    return initialStartDate && initialEndDate ? 'model' : 'dates';
  });
  const [selectedModel, setSelectedModel] = useState<string>(normalizeModelId(initialModelId || ''));
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
    classic: { pricePerDay: number };
    pro: { pricePerDay: number };
  } | null>(null);
  const [, setLoadingPricing] = useState(false);

  // Refs for time picker fields to focus after date selection
  const startTimeRef = useRef<HTMLSelectElement>(null);
  const endTimeRef = useRef<HTMLSelectElement>(null);

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
      setSelectedModel(normalizeModelId(initialModelId));
    }
  }, [initialStartDate, initialEndDate, initialModelId]);

  // Track latest selected box without forcing re-fetch when it changes
  const selectedBoxRef = React.useRef<typeof selectedBox>(null);
  useEffect(() => {
    selectedBoxRef.current = selectedBox;
  }, [selectedBox]);
  

  // Fetch pricing data for the location
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoadingPricing(true);
        const response = await fetch(`/api/pricing/locations/${location.id}`);
        if (response.ok) {
          const data = await response.json();
          setPricing(data.pricing);
        } else {
          // Fallback to defaults if API fails
          setPricing({
            basePrice: 300,
            classic: { pricePerDay: 300 },
            pro: { pricePerDay: 300 },
          });
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Fallback to defaults on error
        setPricing({
          basePrice: 300,
          classic: { pricePerDay: 300 },
          pro: { pricePerDay: 300 },
        });
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, [location.id]);


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
        // selectedModel is now always normalized to 'Pro 175' or 'Pro 190'
        const modelParam = selectedModel;
        // URL encode the model parameter to handle spaces
        const encodedModel = encodeURIComponent(modelParam);
        const response = await fetch(
          `/api/locations/${location.id}/boxes?startDate=${startDate}&endDate=${endDate}&model=${encodedModel}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch available boxes');
        }

        const data = await response.json();
        const boxesByStand = data.availableBoxes || [];
        
        setAvailableBoxes(boxesByStand);
        
        // Check if currently selected box matches the new model
        if (selectedBoxRef.current) {
          const currentBoxModelNormalized = String(selectedBoxRef.current.model || '').replace(/_/g, ' ');
          if (currentBoxModelNormalized !== selectedModel) {
            // Clear selected box if it doesn't match the new model
            setSelectedBox(null);
            selectedBoxRef.current = null;
          }
        }
        
        // Auto-select first available box if none selected
        // Validate that the box model matches the selected model
        if (boxesByStand.length > 0 && !selectedBoxRef.current) {
          const firstStand = boxesByStand[0];
          if (firstStand.boxes.length > 0) {
            const firstBox = firstStand.boxes[0];
            // selectedModel is now always normalized to 'Pro 175' or 'Pro 190'
            // API now returns normalized model (with spaces), but normalize as safety measure
            const boxModelNormalized = String(firstBox.model || '').replace(/_/g, ' ');
            
            // Only auto-select if the box model matches the selected model
            if (boxModelNormalized === selectedModel) {
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
      return 'text-red-400 bg-red-500/20 border-red-500/50';
    }
    switch (location.status) {
      case 'available':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'maintenance':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'inactive':
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
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

  /**
   * Format time for display (HH:MM)
   */
  const formatTimeForDisplay = (timeStr: string | null): string => {
    if (!timeStr) return '';
    // If already in HH:MM format, return as is
    if (timeStr.match(/^\d{2}:\d{2}$/)) {
      return timeStr;
    }
    // If in HH:MM:SS format, extract HH:MM
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}/)) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
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
  // selectedModel is now always normalized to 'Pro 175' or 'Pro 190'
  const pricePerDay = 
    selectedModel === 'Pro 190'
      ? (pricing?.pro.pricePerDay ?? 300)
      : (pricing?.classic.pricePerDay ?? 300);
  
  const days = startDate && endDate
    ? calculateBookingDays(startDate, endDate, startTime, endTime)
    : 0;
  const totalPrice = calculateBookingTotal(pricePerDay, days, 0);

  const isBooked = location.isFullyBooked || false;

  // Log form status to server
  React.useEffect(() => {
    // Form status updated (logging removed for performance)
  }, [location.isFullyBooked, isBooked, location.name, location.availableBoxes, location.earliestNextAvailableDate, location.modelAvailability, location.status]);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Header Section - Always visible */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 border-b border-slate-600/30 flex-shrink-0 w-full shadow-xl backdrop-blur-sm" style={{ position: 'relative', zIndex: 1000 }}>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between w-full mb-1">
                <h2 className="text-lg font-bold text-white truncate drop-shadow-sm">{location.name}</h2>
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusTextColor()}`}>
                  {getDisplayStatus()}
                </span>
              </div>
              {location.address && (
                <p className="text-xs text-gray-300 truncate flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {location.address}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200 p-1.5 rounded-lg active:scale-95"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Always visible */}
      <div className="flex-shrink-0 bg-slate-800/95 border-b border-slate-700/20 z-[10001] backdrop-blur-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('dates')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-all duration-200 relative ${
              activeTab === 'dates'
                ? 'text-cyan-400 bg-slate-700/40'
                : 'text-gray-300 hover:text-white hover:bg-slate-700/20'
            }`}
          >
            <span className="relative z-10">Select Dates</span>
            {activeTab === 'dates' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-lg shadow-cyan-400/50" />
            )}
          </button>
          <button
            onClick={() => {
              if (!startTime || !endTime) {
                alert('Please select both start and end times before proceeding.');
                return;
              }
              setActiveTab('model');
            }}
            disabled={!startDate || !endDate || !startTime || !endTime}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-all duration-200 relative ${
              activeTab === 'model'
                ? 'text-cyan-400 bg-slate-700/40'
                : (!startDate || !endDate || !startTime || !endTime)
                ? 'text-gray-600 cursor-not-allowed opacity-50'
                : 'text-gray-300 hover:text-white hover:bg-slate-700/20'
            }`}
          >
            <span className="relative z-10">Select Model</span>
            {activeTab === 'model' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-lg shadow-cyan-400/50" />
            )}
          </button>
        </div>
        {/* Show selected date range and model when dates are chosen */}
        {startDate && endDate && (
          <div className="px-3 py-2 border-t border-slate-700/20">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-300 flex-wrap">
              <span className="text-gray-400">Selected:</span>
              <span className="font-medium text-white">
                {formatDateForDisplay(startDate)} {formatTimeForDisplay(startTime)}
              </span>
              <span className="text-gray-500">→</span>
              <span className="font-medium text-white">
                {formatDateForDisplay(endDate)} {formatTimeForDisplay(endTime)}
              </span>
              {days > 0 && (
                <span className="text-gray-400 ml-2">
                  ({days} {days === 1 ? 'day' : 'days'})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content area – flex-1, no scroll; image/overlays fill space */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Background image – cover: fills entire area */}
        <div
          className="absolute inset-0 bg-slate-800"
          style={
            location.image
              ? {
                  backgroundImage: `url(${location.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : undefined
          }
          role="img"
          aria-label={location.image ? location.name : undefined}
        />
        {!location.image && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">No Image Available</span>
          </div>
        )}
            
            {/* Date Inputs Overlay */}
            {activeTab === 'dates' && (
              <div className="absolute inset-0 flex items-center justify-center p-3 z-10">
                <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-2">
                  <div className="bg-black/35 rounded-lg p-3 border border-white/10 space-y-2">
                    <label className="block text-xs font-medium text-white mb-1.5">Start</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        setStartDate(dateValue);
                        // Automatically open time picker dropdown after date selection
                        if (dateValue && startTimeRef.current) {
                          setTimeout(() => {
                            startTimeRef.current?.focus();
                            // Try to open the dropdown by clicking on it
                            startTimeRef.current?.click();
                          }, 150);
                        }
                      }}
                      min={getMinDateTimeFromNow().split('T')[0]}
                      className={`block w-full px-3 py-2 text-sm border rounded-lg text-white bg-black/30 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 ${
                        startDate && !startTime ? 'border-yellow-500/50 border-2' : 'border-white/20'
                      }`}
                    />
                    <div>
                      <TimePickerField
                        ref={startTimeRef}
                        value={startTime || null}
                        onChange={(v) => setStartTime(v ?? getDefaultStartTime())}
                        className={`time-picker-field-dark w-full ${
                          startDate && !startTime ? 'ring-2 ring-yellow-500/50' : ''
                        }`}
                      />
                      {startDate && !startTime && (
                        <p className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Please select a start time</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/35 rounded-lg p-3 border border-white/10 space-y-2">
                    <label className="block text-xs font-medium text-white mb-1.5">End</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        const date = e.target.value;
                        setEndDate(date);
                        if (date && startDate && startTime && endTime) {
                          const startDateTime = new Date(`${startDate}T${startTime}`);
                          const endDateTime = new Date(`${date}T${endTime}`);
                          if (endDateTime <= startDateTime) {
                            alert('End date and time must be after start date and time.');
                          }
                        }
                        // Automatically open time picker dropdown after date selection
                        if (date && endTimeRef.current) {
                          setTimeout(() => {
                            endTimeRef.current?.focus();
                            // Try to open the dropdown by clicking on it
                            endTimeRef.current?.click();
                          }, 150);
                        }
                      }}
                      min={startDate || getMinDateTimeFromNow().split('T')[0]}
                      className={`block w-full px-3 py-2 text-sm border rounded-lg text-white bg-black/30 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 ${
                        endDate && !endTime ? 'border-yellow-500/50 border-2' : 'border-white/20'
                      }`}
                    />
                    <div>
                      <TimePickerField
                        ref={endTimeRef}
                        value={endTime || null}
                        onChange={(v) => {
                          const time = v ?? getDefaultEndTime();
                          setEndTime(time);
                          if (startDate && endDate && startTime && time) {
                            const startDateTime = new Date(`${startDate}T${startTime}`);
                            const endDateTime = new Date(`${endDate}T${time}`);
                            if (endDateTime <= startDateTime) {
                              alert('End date and time must be after start date and time.');
                            }
                          }
                        }}
                        className={`time-picker-field-dark w-full ${
                          endDate && !endTime ? 'ring-2 ring-yellow-500/50' : ''
                        }`}
                      />
                      {endDate && !endTime && (
                        <p className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Please select an end time</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Model Selection Overlay */}
            {activeTab === 'model' && startDate && endDate && (
              <div className="absolute inset-0 flex items-center justify-center p-3 z-10">
                <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-2">
                  {[
                    { id: 'pro_175', name: 'IXTAbox Pro 175', dimension: '175 cm' },
                    { id: 'pro_190', name: 'IXTAbox Pro 190', dimension: '190 cm' },
                  ].map((model) => {
                    const is175cm = model.name.includes('175');
                    const imageWidth = is175cm ? 85 : 100;
                    const modelBooked = isModelFullyBooked(model.id);
                    const modelAvailable = isModelAvailable(model.id);
                    const nextAvailableDate = getModelNextAvailableDate(model.id);
                    const normalizedModelId = normalizeModelId(model.id);
                    const isSelected = selectedModel === normalizedModelId;
                    
                    return (
                      <label
                        key={model.id}
                        className={`relative flex flex-col p-3 rounded-lg transition-all duration-200 cursor-pointer
                          ${isSelected 
                            ? 'bg-black/50 border-2 border-cyan-400 shadow-lg shadow-cyan-500/40'
                            : modelBooked
                            ? 'bg-black/35 cursor-not-allowed border border-white/10'
                            : 'bg-black/35 border border-white/10 hover:bg-black/45 hover:ring-1 hover:ring-cyan-500/30'
                          }`}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={model.id}
                          checked={selectedModel === model.id}
                          onChange={(e) => {
                            setSelectedModel(normalizeModelId(e.target.value));
                          }}
                          className="sr-only"
                        />
                        <div className="flex flex-col justify-center items-center mb-2 h-16">
                          {/* Dimension: arrows + 175/190 cm */}
                          <div className="flex items-center justify-center gap-1 mb-0 w-full">
                            <svg className="w-4 h-4 text-cyan-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 12H5M5 12l4-4M5 12l4 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-xs font-bold text-cyan-300 tabular-nums">{is175cm ? '175' : '190'} cm</span>
                            <svg className="w-4 h-4 text-cyan-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M19 12l-4-4M19 12l-4 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div className="flex-1 flex justify-center items-center min-h-0 w-full -mt-0.5">
                            <Image
                              src={encodeURI("/images/boxes/Screenshot 2025-11-12 120924.png")}
                              alt={`${model.name} box`}
                              width={imageWidth}
                              height={64}
                              className="object-contain w-full max-w-full opacity-100"
                              style={{ width: `${imageWidth}px`, height: 'auto', maxHeight: '52px', opacity: 1 }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold text-center break-words text-white">
                            {model.name}
                          </span>
                          {modelBooked && nextAvailableDate ? (
                            <span className="text-xs text-center font-medium leading-tight break-words px-1 text-yellow-400">
                              Available from: {formatDateForDisplay(nextAvailableDate)}
                            </span>
                          ) : modelAvailable ? (
                            <span className="text-xs text-center font-medium leading-tight break-words px-1 text-green-400">
                              Available now
                            </span>
                          ) : null}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-cyan-400/90 rounded-full p-1.5 shadow-md">
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            
        {/* Availability Details Overlay - Bottom of content area */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1.5 text-center z-10">
          <div className="flex items-center justify-center gap-3 text-[10px] text-white flex-wrap">
            <span>Pro 175: <span className="font-bold">{location.availableBoxes.classic}</span></span>
            <span>Pro 190: <span className="font-bold">{location.availableBoxes.pro}</span></span>
            <span>Total: <span className="font-bold">{location.availableBoxes.total}</span></span>
            <span>Available: <span className="font-bold text-emerald-400">{location.availableBoxes.total}</span></span>
          </div>
        </div>
      </div>

      {/* Box Selection - Hidden, runs in background */}
      {/* Action Section - Always visible at bottom, not part of scroll */}
      <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-700/20 bg-gradient-to-t from-slate-900 to-slate-800/90 backdrop-blur-sm z-20">
          {/* Show total price when dates are selected, always visible */}
          {startDate && endDate && (
            <div className="mb-2 text-center p-2 rounded-lg bg-slate-900/60">
              <span className="text-xs font-medium text-gray-400">Total: </span>
              <span className="text-lg font-bold text-cyan-400">{formatPrice(totalPrice)}</span>
              {days > 0 && (
                <span className="text-xs text-gray-400 ml-2">
                  ({days} {days === 1 ? 'day' : 'days'} × {formatPrice(pricePerDay)})
                </span>
              )}
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
                // selectedModel is now always normalized to 'Pro 175' or 'Pro 190'
                // selectedBox.model can be 'Pro_175', 'Pro 175', 'Pro_190', or 'Pro 190'
                const selectedBoxModel = selectedBox.model;
                const selectedBoxModelNormalized = String(selectedBoxModel || '').replace(/_/g, ' ');
                
                // Check if models match
                const modelsMatch = selectedBoxModelNormalized === selectedModel;
                
                if (!modelsMatch) {
                  alert(`Model mismatch: Selected box is ${selectedBoxModelNormalized} but you selected ${selectedModel}. Please select a box that matches your selected model.`);
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
            className={`w-full py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white transition-all duration-200
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
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 focus:ring-2 focus:ring-cyan-500/50 active:scale-[0.98] shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-600/50 cursor-not-allowed opacity-60'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`}
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
  );
};

export default LocationDetails;

