import React from 'react';
import Image from 'next/image';
import PriceBreakdown from './PriceBreakdown';
import { TimePickerField } from '@/components/ui/TimePickerField';
import { calculateBookingDays, calculateBookingTotal } from '@/utils/bookingPrice';

// Helper functions for date handling
const isValidDateString = (dateStr: string | undefined): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr || !isValidDateString(dateStr)) return '';
  try {
    const date = new Date(dateStr);
    // If it's a date-only string (YYYY-MM-DD), add default time
    if (dateStr.length === 10) {
      return date.toISOString().slice(0, 16);
    }
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

const extractDatePart = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    // Validate it's a proper date string
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

// Helper function to format stand ID for display
const formatStandId = (id: string): string => {
  if (!id) return '';
  // Extract first 6 characters and make uppercase for a short, readable ID
  return id.substring(0, 6).toUpperCase();
};

interface StandDetailsProps {
  stand: {
    id: string;
    title: string;
    location: {
      address: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    pricePerDay: number;
    imageUrl?: string;
    status: 'available' | 'booked' | 'maintenance';
    availableModels?: {
      id: string;
      name: string;
    }[];
    nextAvailableDate?: string; // For booked stands
  };
  onBook?: (standId: string, modelId?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string) => void;
  onClose?: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
  initialModelId?: string;
}

const StandDetails: React.FC<StandDetailsProps> = ({ 
  stand, 
  onBook, 
  onClose,
  initialStartDate,
  initialEndDate,
  initialModelId,
}) => {
  const [activeTab, setActiveTab] = React.useState<'model' | 'dates'>(() => {
    // Start on dates tab if model is pre-selected
    return initialModelId ? 'dates' : 'model';
  });
  
  // Initialize with proper date formatting
  const getInitialStartDate = (): string => {
    return extractDatePart(initialStartDate);
  };

  const getInitialEndDate = (): string => {
    return extractDatePart(initialEndDate);
  };

  const getInitialStartTime = (): string => {
    const time = extractTimePart(initialStartDate);
    return time || getDefaultStartTime();
  };

  const getInitialEndTime = (): string => {
    const time = extractTimePart(initialEndDate);
    return time || getDefaultEndTime();
  };

  const [selectedModel, setSelectedModel] = React.useState<string>(initialModelId || '');
  const [startDate, setStartDate] = React.useState<string>(getInitialStartDate());
  const [endDate, setEndDate] = React.useState<string>(getInitialEndDate());
  const [startTime, setStartTime] = React.useState<string>(getInitialStartTime());
  const [endTime, setEndTime] = React.useState<string>(getInitialEndTime());

  // Refs for time picker fields to focus after date selection
  const startTimeRef = React.useRef<HTMLSelectElement>(null);
  const endTimeRef = React.useRef<HTMLSelectElement>(null);

  // Update state when initial values change
  React.useEffect(() => {
    const newStartDate = extractDatePart(initialStartDate);
    const newEndDate = extractDatePart(initialEndDate);
    
    if (newStartDate && isValidDateString(newStartDate)) {
      setStartDate(newStartDate);
      const time = extractTimePart(initialStartDate);
      // Set default time if date is provided but no time
      setStartTime(time || getDefaultStartTime());
    }
    
    if (newEndDate && isValidDateString(newEndDate)) {
      setEndDate(newEndDate);
      const time = extractTimePart(initialEndDate);
      // Set default time if date is provided but no time
      setEndTime(time || getDefaultEndTime());
    }
    
    if (initialModelId) {
      setSelectedModel(initialModelId);
    }
  }, [initialStartDate, initialEndDate, initialModelId]);

  // Automatically switch to dates tab when model is selected
  React.useEffect(() => {
    if (selectedModel && activeTab === 'model') {
      setActiveTab('dates');
    }
  }, [selectedModel, activeTab]);

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
      case 'booked':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-emerald-500';
      case 'booked':
        return 'text-red-500';
      case 'maintenance':
        return 'text-yellow-500';
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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
      {/* Status color bar */}
      <div className={`w-2 ${getStatusColor(stand.status)}`} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stand #{formatStandId(stand.id)}</h2>
              <p className="text-sm text-gray-600">{stand.location.address}</p>
            </div>
            <div className="flex items-start gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusTextColor(stand.status)} border border-current`}>
                {stand.status.charAt(0).toUpperCase() + stand.status.slice(1)}
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
          <div className="mt-2">
            <p className="text-lg font-semibold text-gray-900">
              {formatPrice(stand.pricePerDay)} per day
            </p>
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
            {stand.availableModels ? 'Select Model' : 'Details'}
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
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'model' && (
            <div className="p-4">
              {stand.availableModels && stand.availableModels.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {stand.availableModels.map((model) => {
                    // Determine dimensions and image width based on model
                    const is175cm = model.name.includes('175');
                    const dimension = is175cm ? '175 cm' : '190 cm';
                    const imageWidth = is175cm ? 100 : 150; // 175 cm box is shorter, 190 cm box is longer
                    const isSelected = selectedModel === model.id;
                    
                    return (
                      <label
                        key={model.id}
                        className={`relative flex flex-col p-4 rounded-lg cursor-pointer transition-all duration-200
                          ${isSelected 
                            ? 'border-2 border-emerald-500 bg-emerald-50/80 shadow-md shadow-emerald-500/20' 
                            : 'border-2 border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={model.id}
                          checked={isSelected}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="sr-only"
                        />
                        {/* Box Image */}
                        <div className="flex justify-center items-center mb-3 h-24">
                          <Image
                            src={encodeURI("/images/boxes/Screenshot 2025-11-12 120924.png")}
                            alt={`${model.name} box`}
                            width={imageWidth}
                            height={80}
                            className="object-contain"
                            style={{ width: `${imageWidth}px`, height: 'auto' }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 text-center">{model.name}</span>
                        <span className="text-xs font-medium text-gray-600 mt-1 text-center">{dimension}</span>
                        <span className="text-xs font-medium text-emerald-600 mt-1 text-center">
                        </span>
                        {isSelected && (
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
              ) : (
                <p className="text-sm text-gray-600">No models available for this stand.</p>
              )}
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
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
                    min={
                      stand.status === 'booked' && stand.nextAvailableDate
                        ? formatDateForInput(stand.nextAvailableDate).split('T')[0]
                        : new Date().toISOString().slice(0, 10)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
                  />
                  <TimePickerField
                    ref={startTimeRef}
                    value={startTime || null}
                    onChange={(v) => setStartTime(v ?? getDefaultStartTime())}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      setEndDate(dateValue);
                      // Automatically open time picker dropdown after date selection
                      if (dateValue && endTimeRef.current) {
                        setTimeout(() => {
                          endTimeRef.current?.focus();
                          // Try to open the dropdown by clicking on it
                          endTimeRef.current?.click();
                        }, 150);
                      }
                    }}
                    min={startDate || new Date().toISOString().slice(0, 10)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
                  />
                  <TimePickerField
                    ref={endTimeRef}
                    value={endTime || null}
                    onChange={(v) => setEndTime(v ?? getDefaultEndTime())}
                    className="w-full"
                  />
                </div>
              </div>

              {!isTimeOrderValid && (
                <p className="text-sm text-red-600">End time must be after start time.</p>
              )}
              {startDate && endDate && startTime && endTime && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900">
                    {formatDateTimeForDisplay(startDate, startTime)}{" "}
                    –{" "}
                    {formatDateTimeForDisplay(endDate, endTime)}
                  </p>
                </div>
              )}
              {stand.status === 'booked' && stand.nextAvailableDate && (
                <p className="text-sm text-gray-500">
                  Next available from: {new Date(stand.nextAvailableDate).toLocaleDateString()}
                </p>
              )}
              
              {/* Price Breakdown - Show when dates and model are selected */}
              {startDate && endDate && startTime && endTime && isTimeOrderValid && (
                <div className="mt-4">
                  {(() => {
                    const days = calculateBookingDays(startDate, endDate, startTime, endTime);
                    const selectedModelData = selectedModel 
                      ? stand.availableModels?.find(m => m.id === selectedModel)
                      : null;
                    const modelName = selectedModelData?.name;
                    
                    return (
                      <PriceBreakdown
                        pricePerDay={stand.pricePerDay}
                        days={days}
                        deposit={0}
                        modelName={modelName}
                        currency="SEK"
                        showDeposit={false}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Section - Always visible */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={() => {
              if (onBook) {
                onBook(stand.id, selectedModel, startDate, endDate);
              }
              const days = calculateBookingDays(startDate, endDate, startTime, endTime);
              const totalPrice = calculateBookingTotal(stand.pricePerDay, days, 0);
              
              // Redirect to payment page with stand details
              window.location.href = `/payment?amount=${totalPrice}&currency=sek&standId=${stand.id}&startDate=${startDate}&endDate=${endDate}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}${selectedModel ? `&modelId=${selectedModel}` : ''}`;
            }}
            disabled={
              stand.status === 'maintenance' ||
              !startDate ||
              !endDate ||
              !startTime ||
              !endTime ||
              !isTimeOrderValid ||
              (stand.availableModels && stand.availableModels.length > 0 && !selectedModel) ||
              (startDate && endDate && startTime && endTime ? new Date(`${endDate}T${endTime}`) <= new Date(`${startDate}T${startTime}`) : false)
            }
            className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white transition-colors
              ${
                stand.status !== 'maintenance' && 
                startDate && 
                endDate && 
                startTime && 
                endTime && 
                (!stand.availableModels || stand.availableModels.length === 0 || selectedModel) && 
                isTimeOrderValid &&
                (startDate && endDate && startTime && endTime ? new Date(`${endDate}T${endTime}`) > new Date(`${startDate}T${startTime}`) : false)
                  ? 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {stand.status === 'maintenance' 
              ? 'Under Maintenance' 
              : !startDate 
                ? 'Select start date'
                : !endDate
                  ? 'Select end date'
                : !startTime
                  ? 'Select start time'
                : !endTime
                  ? 'Select end time'
                : stand.availableModels && stand.availableModels.length > 0 && !selectedModel
                  ? 'Select a Model'
                  : !isTimeOrderValid
                    ? 'End time must be after start time'
                    : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StandDetails;