import React from 'react';
import PriceBreakdown, { PriceBreakdownProps } from './PriceBreakdown';

export interface BookingDetailsSummaryProps {
  locationName?: string;
  standId?: string;
  modelId?: string;
  modelName?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pricePerDay: number;
  modelMultiplier?: number;
  currency?: string;
  className?: string;
}

/**
 * Reusable BookingDetailsSummary component that displays booking details
 * and price breakdown during the booking flow. Can be used in both customer
 * and guest booking flows.
 */
const BookingDetailsSummary: React.FC<BookingDetailsSummaryProps> = ({
  locationName,
  standId,
  modelId,
  modelName,
  startDate,
  endDate,
  startTime,
  endTime,
  pricePerDay,
  modelMultiplier = 1,
  currency = 'SEK',
  className = '',
}) => {
  // Calculate days
  const calculateDays = (): number => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      const ms = end.getTime() - start.getTime();
      return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const days = calculateDays();

  const formatDateTime = (dateStr?: string, timeStr?: string): string => {
    if (!dateStr) return '—';
    try {
      const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : dateStr;
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateStr;
      
      if (timeStr) {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Booking Details */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="text-sm sm:text-base font-semibold text-white mb-3">Booking Summary</h3>
        <div className="space-y-2 text-xs sm:text-sm">
          {locationName && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">Location:</span>
              <span className="text-white text-right font-medium">{locationName}</span>
            </div>
          )}
          {standId && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">Stand:</span>
              <span className="text-white text-right font-medium">#{standId}</span>
            </div>
          )}
          {modelName && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">Model:</span>
              <span className="text-white text-right font-medium capitalize">{modelName}</span>
            </div>
          )}
          {(startDate || endDate) && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-400 flex-shrink-0">Start:</span>
                <span className="text-white text-right font-medium">
                  {formatDateTime(startDate, startTime)}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-gray-400 flex-shrink-0">End:</span>
                <span className="text-white text-right font-medium">
                  {formatDateTime(endDate, endTime)}
                </span>
              </div>
              {days > 0 && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400 flex-shrink-0">Duration:</span>
                  <span className="text-white text-right font-medium">
                    {days} {days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

          {/* Price Breakdown */}
      {days > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <PriceBreakdown
            pricePerDay={pricePerDay}
            days={days}
            modelMultiplier={modelMultiplier}
            modelName={modelName}
            currency={currency}
            showModelDetails={!!modelName && modelMultiplier !== 1}
            variant="dark"
            className="bg-transparent p-0"
          />
        </div>
      )}
    </div>
  );
};

export default BookingDetailsSummary;

