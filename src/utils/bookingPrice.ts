/**
 * Centralized booking price and duration calculations.
 * Single source of truth - all components should use these functions
 * instead of duplicating calculation logic.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculate number of days between start and end.
 * Uses date+time when provided for accurate day count across time boundaries.
 */
export function calculateBookingDays(
  startDate: Date | string,
  endDate: Date | string,
  startTime?: string,
  endTime?: string
): number {
  const start = typeof startDate === 'string'
    ? (startTime ? new Date(`${startDate}T${startTime}`) : new Date(startDate))
    : startDate;
  const end = typeof endDate === 'string'
    ? (endTime ? new Date(`${endDate}T${endTime}`) : new Date(endDate))
    : endDate;
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
}

/**
 * Calculate booking total from price per day, days, and optional deposit.
 * Use this when you need to compute the total locally.
 * When total comes from API (e.g. payment intent), use that value directly.
 */
export function calculateBookingTotal(
  pricePerDay: number,
  days: number,
  deposit: number = 0
): number {
  const subtotal = pricePerDay * days;
  return subtotal + deposit;
}
