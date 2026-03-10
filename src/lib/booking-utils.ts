/**
 * Check if the booking has started (current time is at or after the booking start).
 * Unlock code is only revealed when booking has started.
 */
export function hasBookingStarted(startDate: Date | string): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  return new Date() >= start;
}

/**
 * Check if lock PIN can be shown: booking has started AND a real PIN exists (not 0).
 * 0 is used as placeholder until the cron generates the PIN at booking start.
 */
export function canShowLockPin(startDate: Date | string, lockPin: number | null | undefined): boolean {
  return hasBookingStarted(startDate) && !!lockPin && lockPin > 0;
}
