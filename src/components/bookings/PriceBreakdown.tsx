import React from 'react';

export interface PriceBreakdownProps {
  pricePerDay: number;
  days: number;
  deposit?: number;
  modelName?: string;
  currency?: string;
  className?: string;
  showDeposit?: boolean;
  variant?: 'light' | 'dark';
}

/**
 * Reusable PriceBreakdown component that displays a detailed price breakdown
 * for bookings. Can be used in both customer and guest booking flows.
 */
const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  pricePerDay,
  days,
  deposit = 0,
  modelName,
  currency = 'SEK',
  className = '',
  showDeposit = true,
  variant = 'light',
}) => {
  const subtotal = pricePerDay * days;
  const total = subtotal + deposit;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const isDark = variant === 'dark';
  const bgClass = isDark ? 'bg-transparent' : 'bg-gray-50';
  const textPrimaryClass = isDark ? 'text-white' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const textTertiaryClass = isDark ? 'text-gray-500' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const borderStrongClass = isDark ? 'border-white/20' : 'border-gray-300';
  const totalColorClass = isDark ? 'text-cyan-400' : 'text-emerald-600';

  return (
    <div className={`${bgClass} rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className={`text-sm font-semibold ${textPrimaryClass} mb-3`}>Price Breakdown</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className={`text-sm ${textSecondaryClass}`}>Price per day</span>
          <span className={`text-sm font-medium ${textPrimaryClass}`}>{formatPrice(pricePerDay)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`text-sm ${textSecondaryClass}`}>Number of days</span>
          <span className={`text-sm font-medium ${textPrimaryClass}`}>{days} {days === 1 ? 'day' : 'days'}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`text-sm ${textSecondaryClass}`}>Subtotal ({days} {days === 1 ? 'day' : 'days'})</span>
          <span className={`text-sm font-medium ${textPrimaryClass}`}>{formatPrice(subtotal)}</span>
        </div>
        
        {showDeposit && deposit > 0 && (
          <div className={`pt-2 border-t ${borderClass}`}>
            {modelName && (
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm ${textSecondaryClass}`}>Model: {modelName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className={`text-xs ${textTertiaryClass}`}>Deposit</span>
              <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatPrice(deposit)}
              </span>
            </div>
          </div>
        )}
        
        <div className={`pt-2 border-t-2 ${borderStrongClass} flex justify-between items-center`}>
          <span className={`text-base font-semibold ${textPrimaryClass}`}>Total</span>
          <span className={`text-lg font-bold ${totalColorClass}`}>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdown;

