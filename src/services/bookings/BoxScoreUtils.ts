/**
 * Utility functions for calculating box scores based on rental duration
 */

/**
 * Calculate rental duration in hours
 * Uses returned_at if available, otherwise defaults to end_date
 * 
 * @param startDate - Booking start date
 * @param endDate - Booking end date (used if returned_at is not provided)
 * @param returnedAt - Optional return date (if box has been returned)
 * @returns Rental duration in hours (minimum 1 hour)
 * @throws Error if dates are invalid or duration is negative
 */
export function calculateRentalDurationHours(
  startDate: Date | string,
  endDate: Date | string,
  returnedAt?: Date | string | null
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Validate dates
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start date: ${startDate}`);
  }
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid end date: ${endDate}`);
  }
  
  // Use returned_at if available, otherwise use end_date
  const actualEndDate = returnedAt 
    ? (typeof returnedAt === 'string' ? new Date(returnedAt) : returnedAt)
    : end;
  
  // Validate actual end date
  if (isNaN(actualEndDate.getTime())) {
    throw new Error(`Invalid return date: ${returnedAt}`);
  }
  
  // Calculate duration in milliseconds
  const durationMs = actualEndDate.getTime() - start.getTime();
  
  // Ensure duration is not negative (shouldn't happen in normal flow)
  if (durationMs < 0) {
    console.warn(`[BoxScoreUtils] Negative duration detected: start=${start.toISOString()}, end=${actualEndDate.toISOString()}, duration=${durationMs}ms`);
    // Return minimum score of 1 hour for edge cases
    return 1;
  }
  
  // Convert to hours and ensure minimum of 1 hour
  const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
  
  return durationHours;
}

/**
 * Calculate box score based on rental duration
 * Score represents rental duration in hours
 * Lower scores mean shorter rental periods (better availability)
 * 
 * @param startDate - Booking start date
 * @param endDate - Booking end date (used if returned_at is not provided)
 * @param returnedAt - Optional return date (if box has been returned)
 * @returns Box score (rental duration in hours as BigInt, compatible with Prisma BigInt type)
 * @throws Error if dates are invalid
 */
export function calculateBoxScore(
  startDate: Date | string,
  endDate: Date | string,
  returnedAt?: Date | string | null
): bigint {
  const durationHours = calculateRentalDurationHours(startDate, endDate, returnedAt);
  
  // Ensure the value is safe for BigInt conversion
  // BigInt can handle very large numbers, but we ensure it's a valid integer
  if (!Number.isInteger(durationHours) || durationHours < 1) {
    throw new Error(`Invalid duration hours for BigInt conversion: ${durationHours}`);
  }
  
  // Convert to BigInt (Prisma expects BigInt for BigInt fields)
  // This is safe because durationHours is guaranteed to be >= 1 and an integer
  return BigInt(durationHours);
}

