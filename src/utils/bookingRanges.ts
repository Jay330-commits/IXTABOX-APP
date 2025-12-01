/**
 * Booking Range Utilities
 * Functions for managing blocked date ranges and availability calculations
 */

// Note: mergeRanges from dates.ts is used in API routes, not here
// This file has its own mergeTwoRanges for internal use

export type DateRange = {
  start: Date;
  end: Date;
};

export type BookingData = {
  start_date: Date | string;
  end_date: Date | string;
};

/**
 * Converts booking data to date ranges
 */
function bookingToRange(booking: BookingData): DateRange {
  return {
    start: new Date(booking.start_date),
    end: new Date(booking.end_date),
  };
}

/**
 * Checks if two ranges overlap or are adjacent (within 1 day)
 */
function rangesOverlapOrAdjacent(range1: DateRange, range2: DateRange): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Check if ranges overlap
  if (range1.start <= range2.end && range1.end >= range2.start) {
    return true;
  }
  // Check if ranges are adjacent (within 1 day)
  const gap = Math.abs(range1.end.getTime() - range2.start.getTime());
  const gapReverse = Math.abs(range2.end.getTime() - range1.start.getTime());
  return gap <= oneDayMs || gapReverse <= oneDayMs;
}

/**
 * Merges two overlapping or adjacent ranges into one
 */
function mergeTwoRanges(range1: DateRange, range2: DateRange): DateRange {
  return {
    start: range1.start < range2.start ? range1.start : range2.start,
    end: range1.end > range2.end ? range1.end : range2.end,
  };
}

/**
 * Merges a list of ranges, combining overlapping or adjacent ones
 */
function mergeRangeList(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  // Sort ranges by start date
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: DateRange[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (rangesOverlapOrAdjacent(current, next)) {
      current = mergeTwoRanges(current, next);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Fetches all bookings for a given boxId and returns merged blocked ranges
 * 
 * @param boxId - The ID of the box to check
 * @returns Promise<DateRange[]> - Array of merged blocked date ranges
 */
export async function blockedRanges(boxId: string): Promise<DateRange[]> {
  try {
    const response = await fetch(`/api/boxes/${boxId}/bookings`);
    if (!response.ok) {
      // Error will be logged by the API route
      return [];
    }

    const data = await response.json();
    const bookings: BookingData[] = data.bookings || [];

    // Convert bookings to ranges
    const ranges = bookings.map(bookingToRange);

    // Merge overlapping/adjacent ranges
    const merged = mergeRangeList(ranges);

    return merged;
  } catch {
    // Error will be logged by the API route
    return [];
  }
}

/**
 * Fetches merged blocked ranges for all boxes of a specific model at a location
 * This combines bookings from all boxes of the same model to show when the model is fully booked
 * 
 * @param locationId - The ID of the location
 * @param model - The model type ('classic' or 'pro')
 * @returns Promise<DateRange[]> - Array of merged blocked date ranges for the entire model
 */
export async function modelBlockedRanges(locationId: string, model: 'classic' | 'pro'): Promise<DateRange[]> {
  try {
    const response = await fetch(`/api/locations/${locationId}/model-blocked-ranges?model=${model}`);
    if (!response.ok) {
      console.warn(`Failed to fetch model blocked ranges: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const ranges: Array<{ start: string; end: string }> = data.ranges || [];

    // Convert string dates to Date objects
    return ranges.map(r => ({
      start: new Date(r.start),
      end: new Date(r.end),
    }));
  } catch (error) {
    console.error('Error fetching model blocked ranges:', error);
    return [];
  }
}

/**
 * Checks if a date falls within any blocked range
 */
export function isDateBlocked(date: Date, blockedRanges: DateRange[]): boolean {
  return blockedRanges.some(range => {
    return date >= range.start && date <= range.end;
  });
}

/**
 * Checks if a date range overlaps with any blocked range
 */
export function isRangeBlocked(start: Date, end: Date, blockedRanges: DateRange[]): boolean {
  return blockedRanges.some(range => {
    return start <= range.end && end >= range.start;
  });
}

/**
 * Expands date ranges to individual dates for date picker
 */
export function expandRangesToDates(blockedRanges: DateRange[]): Date[] {
  const dates: Date[] = [];
  
  blockedRanges.forEach(range => {
    const current = new Date(range.start);
    const end = new Date(range.end);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });

  return dates;
}

/**
 * Finds the earliest available start date for a booking of specified length
 * 
 * @param blockedRanges - Array of blocked date ranges
 * @param fromDate - Start searching from this date
 * @param lengthDays - Number of days needed for the booking
 * @returns Date | null - Earliest available start date, or null if no availability
 */
export function earliestAvailableStart(
  blockedRanges: DateRange[],
  fromDate: Date,
  lengthDays: number
): Date | null {
  // If no blocked ranges, return fromDate
  if (blockedRanges.length === 0) {
    return fromDate;
  }

  // Sort blocked ranges by start date
  const sorted = [...blockedRanges].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Check if there's availability before the first blocked range
  const firstBlocked = sorted[0];
  if (fromDate < firstBlocked.start) {
    const daysUntilFirstBlocked = Math.ceil(
      (firstBlocked.start.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysUntilFirstBlocked >= lengthDays) {
      return fromDate;
    }
  }

  // Check gaps between blocked ranges
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].end;
    const nextStart = sorted[i + 1].start;
    
    // Skip if this gap doesn't start after fromDate
    if (nextStart <= fromDate) continue;

    // Calculate gap size in days
    const gapDays = Math.ceil(
      (nextStart.getTime() - currentEnd.getTime()) / (24 * 60 * 60 * 1000)
    ) - 1; // Subtract 1 because we want the gap between ranges (not including the end day)

    // If gap is large enough, check if we can fit the booking
    if (gapDays >= lengthDays) {
      const potentialStart = new Date(currentEnd);
      potentialStart.setDate(potentialStart.getDate() + 1);
      
      // Make sure potential start is after fromDate
      if (potentialStart >= fromDate) {
        return potentialStart;
      }
    }
  }

  // Check availability after the last blocked range
  const lastBlocked = sorted[sorted.length - 1];
  const afterLastStart = new Date(lastBlocked.end);
  afterLastStart.setDate(afterLastStart.getDate() + 1);
  
  if (afterLastStart >= fromDate) {
    return afterLastStart;
  }

  return null;
}

/**
 * Calculates the number of days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

