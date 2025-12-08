import 'server-only';
import { boxStatus } from '@prisma/client';
import { BaseService } from '../BaseService';
import { IglooService } from '../locations/IglooService';
import { BookingStatusService } from './BookingStatusService';
import { BookingValidationService } from './BookingValidationService';
import { BookingAvailabilityService } from './BookingAvailabilityService';

/**
 * BookingService
 * Handles core booking operations (creation, metadata extraction)
 * Delegates validation, pricing, and availability to specialized services
 */
export class BookingService extends BaseService {
  private validationService: BookingValidationService;
  private availabilityService: BookingAvailabilityService;
  private statusService: BookingStatusService;

  constructor() {
    super();
    this.validationService = new BookingValidationService();
    this.availabilityService = new BookingAvailabilityService();
    this.statusService = new BookingStatusService();
  }

  // ============================================================================
  // Delegated Methods (for backward compatibility)
  // ============================================================================

  /**
   * Validate and parse booking dates
   * @deprecated Use BookingValidationService directly
   */
  validateBookingDates(
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string
  ): { start: Date; end: Date; isValid: boolean; error?: string } {
    return this.validationService.validateBookingDates(startDate, endDate, startTime, endTime);
  }

  /**
   * Calculate number of days for booking
   * @deprecated Use BookingValidationService directly
   */
  calculateBookingDays(start: Date, end: Date): number {
    return this.validationService.calculateBookingDays(start, end);
  }

  /**
   * Calculate booking price based on dates and model
   * @deprecated Use BookingValidationService directly
   */
  calculateBookingPrice(
    days: number,
    modelId: string | null,
    basePrice: number = 299.99
  ): { amount: number; amountStr: string; days: number; basePrice: number; multiplier: number } {
    return this.validationService.calculateBookingPrice(days, modelId, basePrice);
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
    return this.validationService.validateAndPrepareBooking(bookingData);
  }

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

  /**
   * Check if two date ranges overlap
   * @deprecated Use BookingAvailabilityService directly
   */
  hasDateOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return this.availabilityService.hasDateOverlap(start1, end1, start2, end2);
  }

  /**
   * Find bookings that conflict with the requested date range
   * @deprecated Use BookingAvailabilityService directly
   */
  findConflictingBookings(
    bookings: Array<{ start_date: Date; end_date: Date }>,
    requestedStart: Date,
    requestedEnd: Date
  ): Array<{ start_date: Date; end_date: Date }> {
    return this.availabilityService.findConflictingBookings(bookings, requestedStart, requestedEnd);
  }

  /**
   * Get the latest end date from a list of bookings
   * @deprecated Use BookingAvailabilityService directly
   */
  getLatestEndDate(bookings: Array<{ end_date: Date }>): Date | null {
    return this.availabilityService.getLatestEndDate(bookings);
  }

  /**
   * Calculate box availability based on bookings and requested dates
   * @deprecated Use BookingAvailabilityService directly
   */
  calculateAvailability(
    bookings: Array<{ start_date: Date; end_date: Date }>,
    requestedStartDate: string | null,
    requestedEndDate: string | null
  ): { isAvailable: boolean; nextAvailableDate: string | null } {
    return this.availabilityService.calculateAvailability(bookings, requestedStartDate, requestedEndDate);
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
    return this.availabilityService.getBoxAvailability(boxId, requestedStart, requestedEnd);
  }

  /**
   * Calculate model availability for a location
   */
  async calculateModelAvailability(
    locationId: string,
    model: import('@prisma/client').BoxModel
  ): Promise<{
    isFullyBooked: boolean;
    nextAvailableDate: Date | null;
    availableBoxes: number;
    totalBoxes: number;
  }> {
    return this.availabilityService.calculateModelAvailability(locationId, model);
  }

  /**
   * Get blocked date ranges for a specific box
   */
  async getBoxBlockedRanges(boxId: string): Promise<import('@/utils/dates').Range[]> {
    return this.availabilityService.getBoxBlockedRanges(boxId);
  }

  /**
   * Get merged blocked ranges for all boxes of a specific model at a location
   */
  async getModelBlockedRanges(
    locationId: string,
    model: import('@prisma/client').BoxModel
  ): Promise<{
    ranges: import('@/utils/dates').Range[];
    totalBookings: number;
    mergedRangesCount: number;
  }> {
    return this.availabilityService.getModelBlockedRanges(locationId, model);
  }

  /**
   * Merge blocked ranges (utility function)
   * @deprecated Use BookingAvailabilityService directly
   */
  mergeBlockedRanges(ranges: import('@/utils/dates').Range[]): import('@/utils/dates').Range[] {
    return this.availabilityService.mergeBlockedRanges(ranges);
  }

  /**
   * Get earliest available date for a box
   */
  async getEarliestAvailableDate(boxId: string): Promise<Date | null> {
    return this.availabilityService.getEarliestAvailableDate(boxId);
  }

  /**
   * Get earliest available date for a model at a location
   */
  async getEarliestAvailableDateForModel(
    locationId: string,
    model: import('@prisma/client').BoxModel
  ): Promise<Date | null> {
    return this.availabilityService.getEarliestAvailableDateForModel(locationId, model);
  }

  // ============================================================================
  // Core Booking Operations
  // ============================================================================

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
      // Update payment with user_id and completed_at (payment is already verified since it exists in DB)
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          user_id: userId,
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

      // Determine booking status based on dates using BookingStatusService
      const bookingStatus = this.statusService.calculateBookingStatus(start, end);
      
      console.log('Booking status determined:', {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        now: new Date().toISOString(),
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
