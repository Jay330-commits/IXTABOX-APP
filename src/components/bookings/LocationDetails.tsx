import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  blockedRanges,
  modelBlockedRanges,
  earliestAvailableStart,
  isRangeBlocked,
  isDateBlocked,
  daysBetween,
  type DateRange,
} from '@/utils/bookingRanges';
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
    model: 'Classic' | 'Pro';
    displayId: string;
    compartment: number | null;
    isAvailable: boolean;
    nextAvailableDate: string | null;
    blockedRanges?: DateRange[];
    earliestAvailableStart?: Date | null;
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
  const [isBooking, setIsBooking] = useState(false);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [boxBlockedRanges, setBoxBlockedRanges] = useState<Map<string, DateRange[]>>(new Map());
  const [modelBlockedRangesState, setModelBlockedRangesState] = useState<DateRange[]>([]);
  const [modelBlockedRangesMap, setModelBlockedRangesMap] = useState<Map<'classic' | 'pro', DateRange[]>>(new Map());
  const [loadingBlockedRanges, setLoadingBlockedRanges] = useState(false);
  const [allBoxes, setAllBoxes] = useState<AvailableBox[]>([]);
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
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    
    if (newStartDate && isValidDateString(newStartDate)) {
      const time = extractTimePart(initialStartDate) || getDefaultStartTime();
      const initialDateTime = new Date(`${newStartDate}T${time}`);
      
      // Only set if the initial datetime is at least 1 minute from now
      if (initialDateTime >= oneMinuteFromNow) {
      setStartDate(newStartDate);
        setStartTime(time);
      } else {
        // Set to minimum allowed datetime if initial value is too early
        const minDateTime = getMinDateTimeFromNow();
        const [minDate, minTime] = minDateTime.split('T');
        setStartDate(minDate);
        setStartTime(minTime || getDefaultStartTime());
      }
    }
    
    if (newEndDate && isValidDateString(newEndDate)) {
      const time = extractTimePart(initialEndDate) || getDefaultEndTime();
      const initialDateTime = new Date(`${newEndDate}T${time}`);
      
      // Only set if the initial datetime is at least 1 minute from now
      if (initialDateTime >= oneMinuteFromNow) {
      setEndDate(newEndDate);
        setEndTime(time);
      } else {
        // Set to minimum allowed datetime if initial value is too early
        const minDateTime = getMinDateTimeFromNow();
        const [minDate, minTime] = minDateTime.split('T');
        setEndDate(minDate);
        setEndTime(minTime || getDefaultEndTime());
      }
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
            basePrice: 299.99,
            classic: { pricePerDay: 299.99, multiplier: 1.0 },
            pro: { pricePerDay: 449.99, multiplier: 1.5 },
          });
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Fallback to defaults on error
        setPricing({
          basePrice: 299.99,
          classic: { pricePerDay: 299.99, multiplier: 1.0 },
          pro: { pricePerDay: 449.99, multiplier: 1.5 },
        });
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, [location.id]);

  // Fetch model-level blocked ranges for BOTH models when location marker is clicked (component mounts)
  // This provides early availability information for all models
  useEffect(() => {
    const fetchAllModelBlockedRanges = async () => {
      try {
        // Fetch blocked ranges for both models in parallel
        const [classicRanges, proRanges] = await Promise.all([
          modelBlockedRanges(location.id, 'classic'),
          modelBlockedRanges(location.id, 'pro'),
        ]);

        // Store both in a map for easy access
        const rangesMap = new Map<'classic' | 'pro', DateRange[]>();
        rangesMap.set('classic', classicRanges);
        rangesMap.set('pro', proRanges);
        setModelBlockedRangesMap(rangesMap);

        // Set the current model's ranges if a model is already selected
        if (selectedModel) {
          setModelBlockedRangesState(rangesMap.get(selectedModel as 'classic' | 'pro') || []);
        }

        // Model-level blocked ranges loaded
      } catch (error) {
        logger.error('[Booking Form] Error fetching model blocked ranges', {
          locationId: location.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setModelBlockedRangesMap(new Map());
        setModelBlockedRangesState([]);
      }
    };

    fetchAllModelBlockedRanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]); // Only fetch when location changes (when marker is clicked)

  // Update modelBlockedRangesState when selectedModel changes
  useEffect(() => {
    if (selectedModel && modelBlockedRangesMap.size > 0) {
      const ranges = modelBlockedRangesMap.get(selectedModel as 'classic' | 'pro') || [];
      setModelBlockedRangesState(ranges);
    } else {
      setModelBlockedRangesState([]);
    }
  }, [selectedModel, modelBlockedRangesMap]);

  // Automatically switch to box tab when dates are selected and boxes are loaded
  useEffect(() => {
    if (selectedModel && startDate && endDate && availableBoxes.length > 0 && activeTab === 'dates' && !selectedBox) {
      setActiveTab('box');
    }
  }, [selectedModel, startDate, endDate, availableBoxes.length, activeTab, selectedBox]);

  // Fetch all boxes (without blocked ranges initially) - ranges will be fetched lazily
  useEffect(() => {
    const fetchAllBoxes = async () => {
      setLoadingBlockedRanges(true);
      try {
        // Fetch all boxes for the location (without date filters)
        const response = await fetch(`/api/locations/${location.id}/boxes`);
        if (!response.ok) {
          throw new Error('Failed to fetch boxes');
        }
        
        const data = await response.json();
        const rawBoxes = data.availableBoxes || [];
        
        // Store boxes without fetching individual blocked ranges
        // We'll use model-level blocked ranges initially (already fetched)
        // Individual box ranges will be fetched only when needed (lazy loading)
        setAllBoxes(rawBoxes);
        
        // Boxes loaded (ranges will be lazy-loaded)
      } catch (error) {
        logger.error('[Booking Form] Error fetching boxes', {
          locationId: location.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoadingBlockedRanges(false);
      }
    };

    fetchAllBoxes();
  }, [location.id]);

  // Debounce timer ref for date/time processing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized function to process boxes with debouncing
  const processAvailableBoxes = useCallback(async () => {
    if (!selectedModel || !startDate || !endDate || !allBoxes.length) {
      setAvailableBoxes([]);
      setSelectedBox(null);
      return;
    }

      setLoadingBoxes(true);
      setBoxError(null);
    
      try {
      // Always check individual box blocked ranges for accurate availability
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      const bookingLength = daysBetween(start, end);
      
        // Filter allBoxes by selected model
      const filteredByModel = allBoxes
        .map((stand: AvailableBox) => ({
          ...stand,
          boxes: stand.boxes.filter(box => {
            const boxModel = box.model === 'Classic' ? 'classic' : 'pro';
            return boxModel === selectedModel;
          }),
        }))
        .filter((stand: AvailableBox) => stand.boxes.length > 0);
        
      // Always check individual box ranges for accurate availability
      // Model-level ranges are merged from all boxes, so we need individual box checks
      const boxesWithAvailability = await Promise.all(
        filteredByModel.map(async (stand: AvailableBox) => {
          const boxesWithData = await Promise.all(
            stand.boxes.map(async (box) => {
              // Always fetch individual box blocked ranges for accurate availability checking
              let boxRanges: DateRange[] = [];
              
              // Use cached ranges if available, otherwise fetch
              if (boxBlockedRanges.has(box.id)) {
                boxRanges = boxBlockedRanges.get(box.id) || [];
              } else {
                // Fetch individual box ranges for accurate availability
                boxRanges = await blockedRanges(box.id);
                // Cache the result
                setBoxBlockedRanges(prev => {
                  const newMap = new Map(prev);
                  newMap.set(box.id, boxRanges);
                  return newMap;
                });
              }
              
              // Check availability using individual box ranges (this is the accurate check)
              const isAvailableForDates = !isRangeBlocked(start, end, boxRanges);
              
              // Calculate earliest available start date using box-specific ranges
              const earliestStart = earliestAvailableStart(boxRanges, new Date(), bookingLength);
            
              return {
                ...box,
                isAvailable: isAvailableForDates,
                blockedRanges: boxRanges,
                earliestAvailableStart: earliestStart,
              };
            })
          );
          return {
            ...stand,
            boxes: boxesWithData,
          };
        })
      );
        
      // Filter boxes - only show boxes that are actually available for the selected dates
      // This prevents showing unavailable boxes as available
      const filteredBoxes = boxesWithAvailability
        .map((stand: AvailableBox) => ({
          ...stand,
          boxes: stand.boxes.filter((box) => {
            // Only show boxes that are actually available for the selected date range
            return box.isAvailable === true;
          }),
        }))
        .filter((stand: AvailableBox) => stand.boxes.length > 0);
        
      // Sort boxes (available first, then by earliest start)
        const sortedBoxes = filteredBoxes.map((stand: AvailableBox) => ({
          ...stand,
          boxes: stand.boxes.sort((a, b) => {
            if (a.isAvailable && !b.isAvailable) return -1;
            if (!a.isAvailable && b.isAvailable) return 1;
          if (a.isAvailable && b.isAvailable) return 0;
            if (a.earliestAvailableStart && b.earliestAvailableStart) {
              return a.earliestAvailableStart.getTime() - b.earliestAvailableStart.getTime();
            }
            if (a.earliestAvailableStart) return -1;
            if (b.earliestAvailableStart) return 1;
            return 0;
          }),
        }));
        
        setAvailableBoxes(sortedBoxes);
        
        // Auto-select first available box if none selected
        if (sortedBoxes.length > 0 && !selectedBoxRef.current) {
          const firstStand = sortedBoxes[0];
          if (firstStand.boxes.length > 0) {
            const firstBox = firstStand.boxes[0];
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
        logger.error('[Booking Form] Error processing available boxes', {
          locationId: location.id,
          model: selectedModel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setBoxError('Unable to check box availability. Please try again.');
        setAvailableBoxes([]);
      } finally {
        setLoadingBoxes(false);
      }
  }, [selectedModel, startDate, endDate, startTime, endTime, allBoxes, location.id, boxBlockedRanges]);

  // Debounced effect for processing boxes (300ms delay on mobile-friendly)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only process if we have required data
    if (!selectedModel || !startDate || !endDate || allBoxes.length === 0) {
      setAvailableBoxes([]);
      setSelectedBox(null);
      return;
    }

    // Debounce the processing to avoid excessive calculations on rapid date/time changes
    debounceTimerRef.current = setTimeout(() => {
      processAvailableBoxes();
    }, 300); // 300ms debounce - good balance for mobile

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }
    };
  }, [selectedModel, startDate, endDate, startTime, endTime, allBoxes.length, processAvailableBoxes]);

  const isTimeOrderValid = React.useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return true;
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
      
      // Check that start is at least 1 minute from now
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
      if (start < oneMinuteFromNow) return false;
      
      // Check that end is after start
      return end > start;
    } catch {
      return true;
    }
  }, [startDate, endDate, startTime, endTime]);


  // Check if selected date range is blocked (use model-level ranges if available, otherwise box-specific)
  const isSelectedRangeBlocked = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return false;
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      
      // Use model-level ranges if available, otherwise use box-specific ranges
      const rangesToCheck = selectedModel && modelBlockedRangesState.length > 0
        ? modelBlockedRangesState
        : selectedBox
        ? boxBlockedRanges.get(selectedBox.boxId) || []
        : [];
      
      return isRangeBlocked(start, end, rangesToCheck);
    } catch {
      return false;
    }
  }, [selectedBox, selectedModel, startDate, endDate, startTime, endTime, boxBlockedRanges, modelBlockedRangesState]);


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
    if (modelId === 'classic') {
      return location.modelAvailability.classic.isFullyBooked;
    }
    if (modelId === 'pro') {
      return location.modelAvailability.pro.isFullyBooked;
    }
    return false;
  };

  /**
   * Get next available date for a model
   */
  const getModelNextAvailableDate = (modelId: string): string | null => {
    if (!location.modelAvailability) return null;
    if (modelId === 'classic') {
      return location.modelAvailability.classic.nextAvailableDate;
    }
    if (modelId === 'pro') {
      return location.modelAvailability.pro.nextAvailableDate;
    }
    return null;
  };

  /**
   * Get earliest available date from merged blocked ranges for a model
   * If some boxes are available now, returns today
   * If all boxes are booked, finds when the FIRST box becomes available (earliest end date)
   */
  const getEarliestAvailableDateFromRanges = React.useCallback((modelId: string): Date | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if model has available boxes (not all booked)
    const hasAvailableBoxes = modelId === 'classic' 
      ? location.availableBoxes.classic > 0
      : location.availableBoxes.pro > 0;
    
    if (hasAvailableBoxes) {
      // Some boxes are available now, so model is available now
      return today;
    }
    
    // All boxes are booked - find the earliest date when ANY box becomes available
    const ranges = modelBlockedRangesMap.get(modelId as 'classic' | 'pro');
    if (!ranges || ranges.length === 0) {
      // This shouldn't happen if all boxes are booked, but return today as fallback
      return today;
    }

    // Sort ranges by END date to find the earliest end date (when first box becomes available)
    const sortedRanges = [...ranges].sort((a, b) => a.end.getTime() - b.end.getTime());
    
    // The earliest available date is the day after the earliest booking ends
    const earliestEnd = sortedRanges[0].end;
    const earliestAvailable = new Date(earliestEnd);
    earliestAvailable.setDate(earliestAvailable.getDate() + 1);
    earliestAvailable.setHours(0, 0, 0, 0);
    
    return earliestAvailable >= today ? earliestAvailable : today;
  }, [modelBlockedRangesMap, location.availableBoxes]);

  /**
   * Check if a model is available (has boxes available)
   */
  const isModelAvailable = (modelId: string): boolean => {
    if (modelId === 'classic') {
      return location.availableBoxes.classic > 0;
    }
    if (modelId === 'pro') {
      return location.availableBoxes.pro > 0;
    }
    return false;
  };

  /**
   * Get minimum datetime that's at least 1 minute from now
   */
  const getMinDateTimeFromNow = (): string => {
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // Add 1 minute
    return oneMinuteFromNow.toISOString().slice(0, 16);
  };

  /**
   * Get minimum date for date picker based on model and booking status
   * Ensures the date is always after today and at least 1 minute from now
   */
  const getMinDateForModel = (modelId: string): string => {
    const minFromNow = getMinDateTimeFromNow();
    const minFromNowDate = new Date(minFromNow);
    
    if (!modelId) {
      return minFromNow;
    }
    
    const nextAvailable = getModelNextAvailableDate(modelId);
    if (nextAvailable) {
      // Add 1 day after the booking ends
      const nextAvailableDate = new Date(new Date(nextAvailable).getTime() + 24 * 60 * 60 * 1000);
      // Ensure it's at least 1 minute from now
      const minDate = nextAvailableDate > minFromNowDate ? nextAvailableDate : minFromNowDate;
      return minDate.toISOString().slice(0, 16);
    }
    
    return minFromNow;
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

  // Get pricing from API or use defaults
  const pricePerDay = 
    selectedModel === 'pro' || selectedModel === 'Pro'
      ? (pricing?.pro.pricePerDay ?? 449.99)
      : (pricing?.classic.pricePerDay ?? 299.99);
  
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
              <span>Classic: </span>
              <span className={`font-semibold ${isBooked ? 'text-red-900' : 'text-gray-900'}`}>{location.availableBoxes.classic}</span>
            </div>
            <div>
              <span>Pro: </span>
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
            onClick={() => setActiveTab('model')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'model'
                ? isBooked
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Select Model
          </button>
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
          {activeTab === 'model' && (
            <div className="p-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'classic', name: 'IXTAbox Classic 175', dimension: '175 cm' },
                  { id: 'pro', name: 'IXTAbox Pro 190', dimension: '190 cm' },
                ].map((model) => {
                  const is175cm = model.name.includes('175');
                  const imageWidth = is175cm ? 60 : 75;
                  const modelBooked = isModelFullyBooked(model.id);
                  const modelAvailable = isModelAvailable(model.id);
                  // Get earliest available date from merged blocked ranges
                  const earliestAvailableDate = getEarliestAvailableDateFromRanges(model.id);
                  
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
                        {/* Show earliest available date from merged ranges - single display */}
                        {earliestAvailableDate && (
                          <span className={`text-xs text-center font-medium leading-tight break-words px-1 ${modelBooked ? (isBooked ? 'text-red-600' : 'text-amber-600') : (isBooked ? 'text-gray-600' : 'text-emerald-600')}`}>
                            {(() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const isAvailableNow = earliestAvailableDate.getTime() <= today.getTime();
                              
                              if (isAvailableNow && modelAvailable) {
                                return 'Available now';
                              } else if (modelBooked) {
                                // All boxes booked - show when first box becomes available
                                return `Available from: ${formatDateForDisplay(earliestAvailableDate.toISOString())}`;
                              } else {
                                // Some boxes available, but showing earliest date
                                return `Earliest: ${formatDateForDisplay(earliestAvailableDate.toISOString())}`;
                              }
                            })()}
                          </span>
                        )}
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

          {activeTab === 'dates' && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {selectedModel && isModelFullyBooked(selectedModel) && getModelNextAvailableDate(selectedModel) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    This model is currently fully booked
                  </p>
                  <p className="text-xs text-red-700">
                    Next available: {formatDateForDisplay(getModelNextAvailableDate(selectedModel))}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Please select dates after this date to book.
                  </p>
                </div>
              )}
              
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
                        const selectedDateTime = new Date(`${date}T${time || getDefaultStartTime()}`);
                        const now = new Date();
                        const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
                        
                        // Ensure selected datetime is at least 1 minute from now
                        if (selectedDateTime < oneMinuteFromNow) {
                          alert('Please select a date and time at least 1 minute from now.');
                          return;
                        }
                        
                        // Check if selected date is blocked (use model-level ranges if available, otherwise box-specific)
                        const rangesToCheck = selectedModel && modelBlockedRangesState.length > 0
                          ? modelBlockedRangesState
                          : selectedBox
                          ? boxBlockedRanges.get(selectedBox.boxId) || []
                          : [];
                        
                        if (rangesToCheck.length > 0 && isDateBlocked(selectedDateTime, rangesToCheck)) {
                          // Only log warnings, not every date change (performance optimization)
                          alert('This date is blocked by an existing booking. Please choose a different date.');
                          return;
                        }
                        
                        setStartDate(date || '');
                        setStartTime(time || getDefaultStartTime());
                      } else {
                        setStartDate('');
                        setStartTime('');
                      }
                    }}
                    min={selectedModel ? getMinDateForModel(selectedModel) : getMinDateTimeFromNow()}
                    disabled={!selectedModel}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${isBooked ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
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
                        const now = new Date();
                        const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
                        
                        // Ensure selected datetime is at least 1 minute from now
                        if (selectedDateTime < oneMinuteFromNow) {
                          alert('Please select a date and time at least 1 minute from now.');
                          return;
                        }
                        
                        // Check if selected date is blocked (use model-level ranges if available, otherwise box-specific)
                        const rangesToCheck = selectedModel && modelBlockedRangesState.length > 0
                          ? modelBlockedRangesState
                          : selectedBox
                          ? boxBlockedRanges.get(selectedBox.boxId) || []
                          : [];
                        
                        if (rangesToCheck.length > 0 && isDateBlocked(selectedDateTime, rangesToCheck)) {
                          // Only log warnings, not every date change (performance optimization)
                          alert('This date is blocked by an existing booking. Please choose a different date.');
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
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${isBooked ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
                  />
                </div>
              </div>
              {selectedBox && isSelectedRangeBlocked && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900">
                    Selected date range overlaps with existing bookings
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Please choose different dates to complete your booking.
                  </p>
                </div>
              )}

              {!isTimeOrderValid && (
                <p className="text-sm text-red-600">
                  {startDate && startTime && new Date(`${startDate}T${startTime}`) < new Date(new Date().getTime() + 60 * 1000)
                    ? 'Start date and time must be at least 1 minute from now.'
                    : 'End time must be after start time.'}
                </p>
              )}

              {startDate && endDate && startTime && endTime && (
                <div className={`p-3 rounded-lg ${isBooked ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className={`text-sm font-medium ${isBooked ? 'text-red-900' : 'text-emerald-900'}`}>
                    {formatDateTimeForDisplay(startDate, startTime)} – {formatDateTimeForDisplay(endDate, endTime)}
                  </p>
                </div>
              )}
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
                  {(loadingBoxes || loadingBlockedRanges) ? (
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
                                          // Removed logging for performance optimization
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
                                  {isBooked && box.nextAvailableDate && (
                                    <span className="text-xs text-amber-600 font-medium">
                                      Available: {formatDate(box.nextAvailableDate)}
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
                const rangesToCheck = selectedModel && modelBlockedRangesState.length > 0
                  ? modelBlockedRangesState
                  : selectedBox
                  ? boxBlockedRanges.get(selectedBox.boxId) || []
                  : [];
                
                if (rangesToCheck.length > 0 && isRangeBlocked(start, end, rangesToCheck)) {
                  logger.warn('[Booking Form] Booking attempt with blocked date range', {
                    boxId: selectedBox?.boxId || null,
                    model: selectedModel,
                    startDate: `${startDate}T${startTime}`,
                    endDate: `${endDate}T${endTime}`,
                    blockedRangesCount: rangesToCheck.length,
                    usingModelRanges: modelBlockedRangesState.length > 0,
                  });
                  alert('The selected date range overlaps with existing bookings. Please choose different dates.');
                  return;
                }
              }
              
              if (onBook && selectedBox && !isBooking) {
                setIsBooking(true);
                logger.info('[Booking Form] Booking submitted', {
                  locationId: location.id,
                  boxId: selectedBox.boxId,
                  standId: selectedBox.standId,
                  model: selectedModel,
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
              isSelectedRangeBlocked ||
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
              : isSelectedRangeBlocked
              ? 'Selected dates are blocked'
              : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationDetails;

