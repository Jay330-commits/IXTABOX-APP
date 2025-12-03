import 'server-only';
import { BookingStatus, PaymentStatus, BoxModel, boxStatus } from '@prisma/client';
import { BaseService } from './BaseService';
import { IglooService } from './IglooService';
import { mergeRanges, normalizeDate, type Range } from '@/utils/dates';

/**
 * BookingService
 * Handles all booking-related operations
 * Separated from payment processing for better code organization
 */
export class BookingService extends BaseService {
  // ============================================================================
  // Date Validation & Parsing
  // ============================================================================

  /**
   * Validate and parse booking dates
   */
  validateBookingDates(
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string
  ): { start: Date; end: Date; isValid: boolean; error?: string } {
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          start,
          end,
          isValid: false,
          error: 'Invalid date or time format',
        };
      }

      if (end <= start) {
        return {
          start,
          end,
          isValid: false,
          error: 'End date must be after start date',
        };
      }

      return { start, end, isValid: true };
    } catch (error) {
      return {
        start: new Date(),
        end: new Date(),
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid date format',
      };
    }
  }

  /**
   * Calculate number of days for booking
   */
  calculateBookingDays(start: Date, end: Date): number {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // ============================================================================
  // Price Calculation
  // ============================================================================

  /**
   * Calculate booking price based on dates and model
   */
  calculateBookingPrice(
    days: number,
    modelId: string | null,
    basePrice: number = 299.99
  ): { amount: number; amountStr: string; days: number; basePrice: number; multiplier: number } {
    const multiplier = modelId === 'pro' || modelId === 'Pro' ? 1.5 : 1.0;
    const amount = basePrice * multiplier * days;
    const amountStr = amount.toFixed(2);

    return {
      amount,
      amountStr,
      days,
      basePrice,
      multiplier,
    };
  }

  /**
   * Validate and prepare booking with price calculation
   */
  async validateAndPrepareBooking(bookingData: {
    locationId: string;
    boxId: string;
    standId: string;
    modelId?: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    locationDisplayId?: string;
    compartment?: string;
  }): Promise<{
    amount: number;
    amountStr: string;
    metadata: Record<string, string>;
    validatedDates: { start: Date; end: Date };
  }> {
    // Validate dates
    const dateValidation = this.validateBookingDates(
      bookingData.startDate,
      bookingData.endDate,
      bookingData.startTime,
      bookingData.endTime
    );

    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error || 'Invalid booking dates');
    }

    const { start, end } = dateValidation;
    const days = this.calculateBookingDays(start, end);
    const priceCalculation = this.calculateBookingPrice(days, bookingData.modelId || null);

    // Prepare metadata
    const metadata: Record<string, string> = {
      locationId: bookingData.locationId,
      boxId: bookingData.boxId,
      standId: bookingData.standId,
      modelId: bookingData.modelId || '',
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      locationDisplayId: bookingData.locationDisplayId || bookingData.locationId,
      compartment: bookingData.compartment || '',
      amount: priceCalculation.amountStr,
      source: 'ixtabox-app',
    };

    return {
      amount: priceCalculation.amount,
      amountStr: priceCalculation.amountStr,
      metadata,
      validatedDates: { start, end },
    };
  }

  // ============================================================================
  // Box Verification
  // ============================================================================

  /**
   * Verify box exists and is available
   */
  async verifyBox(boxId: string): Promise<{ exists: boolean; box?: { id: string; status: boxStatus | null } }> {
    const box = await this.prisma.boxes.findUnique({
      where: { id: boxId },
      select: { id: true, status: true },
    });

    if (!box) {
      return { exists: false };
    }

    return { exists: true, box };
  }

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
          in: [BookingStatus.Pending, BookingStatus.Active],
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
    model: BoxModel
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
                      in: [BookingStatus.Pending, BookingStatus.Active],
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
          in: [BookingStatus.Pending, BookingStatus.Active],
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
  async getModelBlockedRanges(locationId: string, model: BoxModel): Promise<{
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
                      in: [BookingStatus.Pending, BookingStatus.Active],
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
  async getEarliestAvailableDateForModel(locationId: string, model: BoxModel): Promise<Date | null> {
    const availability = await this.calculateModelAvailability(locationId, model);
    return availability.nextAvailableDate;
  }
  /**
   * Create booking record in database
   * Generates lock PIN and handles all booking creation logic
   */
  async createBooking(
    paymentId: string,
    userId: string | null,
    bookingData: {
      boxId: string;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      amountStr: string;
    }
  ) {
    const { boxId, startDate, endDate, startTime, endTime, amountStr } = bookingData;

    return await this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          user_id: userId,
          status: PaymentStatus.Completed,
          completed_at: new Date(),
        },
      });

      // Parse dates
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Invalid date format: start=${startDate}T${startTime}, end=${endDate}T${endTime}`);
      }

      // Verify box exists
      const box = await tx.boxes.findUnique({
        where: { id: boxId },
      });

      if (!box) {
        throw new Error(`Box with id ${boxId} not found`);
      }

      // Determine booking status based on start date
      const now = new Date();
      const bookingStatus = start > now ? BookingStatus.Pending : BookingStatus.Active;
      
      console.log('Booking status determined:', {
        startDate: start.toISOString(),
        now: now.toISOString(),
        isFuture: start > now,
        status: bookingStatus,
      });

      // Generate lock PIN using Igloo API (mandatory)
      let lockPin: number;
      try {
        const iglooService = new IglooService();
        lockPin = await iglooService.generateAndParseBookingPin(start, end, 'Customer');
      } catch (pinError) {
        console.error('Failed to generate lock PIN:', {
          error: pinError,
          message: pinError instanceof Error ? pinError.message : String(pinError),
        });
        // PIN is mandatory - fail booking creation if PIN generation fails
        throw new Error(`Failed to generate mandatory lock PIN: ${pinError instanceof Error ? pinError.message : String(pinError)}`);
      }

      // Create booking with PIN
      try {
        const booking = await tx.bookings.create({
          data: {
            box_id: boxId,
            payment_id: paymentId,
            start_date: start,
            end_date: end,
            total_amount: amountStr,
            status: bookingStatus,
            lock_pin: lockPin, // Set the mandatory PIN
          },
        });

        console.log('Booking created after payment succeeded:', {
          bookingId: booking.id,
          boxId,
          paymentId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status: bookingStatus,
          lockPin: lockPin,
        });

        return booking;
      } catch (dbError) {
        console.error('Failed to create booking in database:', {
          error: dbError,
          errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
          errorStack: dbError instanceof Error ? dbError.stack : undefined,
          boxId,
          paymentId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          lockPin,
          bookingStatus,
        });
        throw dbError;
      }
    });
  }

  /**
   * Extract and validate booking metadata from payment intent metadata
   */
  extractBookingMetadata(
    metadata: Record<string, string>,
    amount: number
  ) {
    const boxId = metadata.boxId;
    const startDate = metadata.startDate;
    const endDate = metadata.endDate;
    const startTime = metadata.startTime;
    const endTime = metadata.endTime;
    const amountStr = metadata.amount 
      ? parseFloat(metadata.amount).toFixed(2)
      : (amount / 100).toFixed(2);

    if (!boxId || !startDate || !endDate) {
      throw new Error('Missing booking details in payment metadata');
    }

    return {
      boxId,
      startDate,
      endDate,
      startTime: startTime || '00:00',
      endTime: endTime || '23:59',
      amountStr,
    };
  }
}

