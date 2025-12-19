import 'server-only';
import { BookingStatus, boxmodel, boxStatus } from '@prisma/client';
import { BaseService } from '../BaseService';
import { mergeRanges, normalizeDate, type Range } from '@/utils/dates';

/**
 * BookingAvailabilityService
 * Handles booking availability checks, conflict detection, and blocked ranges
 * Separated from BookingService for better code organization
 */
export class BookingAvailabilityService extends BaseService {
  // ============================================================================
  // Date Overlap & Conflict Detection
  // ============================================================================

  /**
   * Check if two date ranges overlap
   */
  hasDateOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 <= end2 && end1 >= start2;
  }

  /**
   * Find bookings that conflict with the requested date range
   */
  findConflictingBookings(
    bookings: Array<{ start_date: Date; end_date: Date }>,
    requestedStart: Date,
    requestedEnd: Date
  ): Array<{ start_date: Date; end_date: Date }> {
    return bookings.filter((booking) =>
      this.hasDateOverlap(
        new Date(booking.start_date),
        new Date(booking.end_date),
        requestedStart,
        requestedEnd
      )
    );
  }

  /**
   * Get the latest end date from a list of bookings
   */
  getLatestEndDate(bookings: Array<{ end_date: Date }>): Date | null {
    if (bookings.length === 0) return null;

    return bookings.reduce((latest, booking) => {
      const bookingEnd = new Date(booking.end_date);
      return bookingEnd > latest ? bookingEnd : latest;
    }, new Date(0));
  }

  // ============================================================================
  // Availability Calculations
  // ============================================================================

  /**
   * Calculate box availability based on bookings and requested dates
   */
  calculateAvailability(
    bookings: Array<{ start_date: Date; end_date: Date }>,
    requestedStartDate: string | null,
    requestedEndDate: string | null
  ): { isAvailable: boolean; nextAvailableDate: string | null } {
    // If no bookings, box is available
    if (bookings.length === 0) {
      return { isAvailable: true, nextAvailableDate: null };
    }

    // If no dates specified, check all bookings
    if (!requestedStartDate || !requestedEndDate) {
      const latestEndDate = this.getLatestEndDate(bookings);
      return {
        isAvailable: false,
        nextAvailableDate: latestEndDate ? latestEndDate.toISOString() : null,
      };
    }

    // Check for conflicts with requested dates
    const requestedStart = new Date(requestedStartDate);
    const requestedEnd = new Date(requestedEndDate);
    const conflictingBookings = this.findConflictingBookings(bookings, requestedStart, requestedEnd);

    if (conflictingBookings.length === 0) {
      return { isAvailable: true, nextAvailableDate: null };
    }

    // Get the latest end date from conflicting bookings
    const latestEndDate = this.getLatestEndDate(conflictingBookings);
    return {
      isAvailable: false,
      nextAvailableDate: latestEndDate ? latestEndDate.toISOString() : null,
    };
  }

  /**
   * Get box availability with full booking details
   */
  async getBoxAvailability(
    boxId: string,
    requestedStart?: Date,
    requestedEnd?: Date
  ): Promise<{
    isAvailable: boolean;
    nextAvailableDate: Date | null;
    conflictingBookings: Array<{ start_date: Date; end_date: Date }>;
  }> {
    const bookings = await this.prisma.bookings.findMany({
      where: {
        box_id: boxId,
        status: {
          in: [BookingStatus.Upcoming, BookingStatus.Active],
        },
      },
      select: {
        start_date: true,
        end_date: true,
      },
    });

    if (requestedStart && requestedEnd) {
      const conflicting = this.findConflictingBookings(bookings, requestedStart, requestedEnd);
      const nextAvailable = this.getLatestEndDate(conflicting);

      return {
        isAvailable: conflicting.length === 0,
        nextAvailableDate: nextAvailable,
        conflictingBookings: conflicting,
      };
    }

    const nextAvailable = this.getLatestEndDate(bookings);
    return {
      isAvailable: bookings.length === 0,
      nextAvailableDate: nextAvailable,
      conflictingBookings: bookings,
    };
  }

  /**
   * Calculate model availability for a location
   */
  async calculateModelAvailability(
    locationId: string,
    model: boxmodel
  ): Promise<{
    isFullyBooked: boolean;
    nextAvailableDate: Date | null;
    availableBoxes: number;
    totalBoxes: number;
  }> {
    const location = await this.prisma.locations.findUnique({
      where: { id: locationId },
      include: {
        stands: {
          include: {
            boxes: {
              where: {
                model: model,
                status: boxStatus.Active,
              },
              include: {
                bookings: {
                  where: {
                    status: {
                      in: [BookingStatus.Upcoming, BookingStatus.Active],
                    },
                  },
                  select: {
                    end_date: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    let availableBoxes = 0;
    let totalBoxes = 0;
    const allEndDates: Date[] = [];

    location.stands.forEach((stand) => {
      stand.boxes.forEach((box) => {
        totalBoxes++;
        if (box.bookings.length === 0) {
          availableBoxes++;
        } else {
          box.bookings.forEach((booking) => {
            allEndDates.push(new Date(booking.end_date));
          });
        }
      });
    });

    const isFullyBooked = totalBoxes > 0 && availableBoxes === 0;
    const nextAvailableDate = allEndDates.length > 0
      ? allEndDates.reduce((latest, date) => (date > latest ? date : latest), new Date(0))
      : null;

    return {
      isFullyBooked,
      nextAvailableDate,
      availableBoxes,
      totalBoxes,
    };
  }

  // ============================================================================
  // Blocked Ranges
  // ============================================================================

  /**
   * Get blocked date ranges for a specific box
   */
  async getBoxBlockedRanges(boxId: string): Promise<Range[]> {
    const bookings = await this.prisma.bookings.findMany({
      where: {
        box_id: boxId,
        status: {
          in: [BookingStatus.Upcoming, BookingStatus.Active],
        },
      },
      select: {
        start_date: true,
        end_date: true,
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    return bookings.map((booking) => ({
      start: normalizeDate(booking.start_date),
      end: normalizeDate(booking.end_date),
    }));
  }

  /**
   * Get merged blocked ranges for all boxes of a specific model at a location
   */
  async getModelBlockedRanges(locationId: string, model: boxmodel): Promise<{
    ranges: Range[];
    totalBookings: number;
    mergedRangesCount: number;
  }> {
    const location = await this.prisma.locations.findUnique({
      where: { id: locationId },
      include: {
        stands: {
          include: {
            boxes: {
              where: {
                model: model,
                status: boxStatus.Active,
              },
              include: {
                bookings: {
                  where: {
                    status: {
                      in: [BookingStatus.Upcoming, BookingStatus.Active],
                    },
                  },
                  select: {
                    start_date: true,
                    end_date: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const allRanges: Range[] = [];

    location.stands.forEach((stand) => {
      stand.boxes.forEach((box) => {
        box.bookings.forEach((booking) => {
          allRanges.push({
            start: normalizeDate(booking.start_date),
            end: normalizeDate(booking.end_date),
          });
        });
      });
    });

    const mergedRanges = mergeRanges(allRanges);

    return {
      ranges: mergedRanges,
      totalBookings: allRanges.length,
      mergedRangesCount: mergedRanges.length,
    };
  }

  /**
   * Merge blocked ranges (utility function)
   */
  mergeBlockedRanges(ranges: Range[]): Range[] {
    return mergeRanges(ranges);
  }

  // ============================================================================
  // Earliest Available Date
  // ============================================================================

  /**
   * Get earliest available date for a box
   */
  async getEarliestAvailableDate(boxId: string): Promise<Date | null> {
    const availability = await this.getBoxAvailability(boxId);
    return availability.nextAvailableDate;
  }

  /**
   * Get earliest available date for a model at a location
   */
  async getEarliestAvailableDateForModel(locationId: string, model: boxmodel): Promise<Date | null> {
    const availability = await this.calculateModelAvailability(locationId, model);
    return availability.nextAvailableDate;
  }
}

