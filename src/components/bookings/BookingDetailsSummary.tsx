import React from 'react';
import PriceBreakdown, { PriceBreakdownProps } from './PriceBreakdown';
import { calculateBookingDays } from '@/utils/bookingPrice';

export interface BookingDetailsSummaryProps {
  locationName?: string;
  standId?: string;
  standName?: string;
  modelId?: string;
  modelName?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pricePerDay: number;
  deposit?: number;
  currency?: string;
  className?: string;
  /** When provided, use this for Total instead of calculating (single source of truth, e.g. from payment intent) */
  totalAmount?: number;
}

/**
 * Reusable BookingDetailsSummary component that displays booking details
 * and price breakdown during the booking flow. Can be used in both customer
 * and guest booking flows.
 */
const BookingDetailsSummary: React.FC<BookingDetailsSummaryProps> = ({
  locationName,
  standId,
  standName,
  modelId,
  modelName,
  startDate,
  endDate,
  startTime,
  endTime,
  pricePerDay,
  deposit = 0,
  currency = 'SEK',
  className = '',
  totalAmount,
}) => {
  const days = startDate && endDate
    ? calculateBookingDays(startDate, endDate, startTime, endTime)
    : 0;

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
          {(standName || standId) && (
            <div className="flex justify-between items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">Stand:</span>
              <span className="text-white text-right font-medium">
                {standName || (standId ? `Stand ${standId.substring(0, 6).toUpperCase()}` : '—')}
              </span>
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
            deposit={deposit}
            modelName={modelName}
            currency={currency}
            showDeposit={deposit > 0}
            variant="dark"
            className="bg-transparent p-0"
            totalAmount={totalAmount}
          />
        </div>
      )}
    </div>
  );
};

export default BookingDetailsSummary;

