import 'server-only';
import { boxStatus, boxmodel } from '@prisma/client';
import { BaseService } from '../BaseService';
import { IglooService } from '../locations/IglooService';
import { BookingStatusService } from './BookingStatusService';
import { BookingValidationService } from './BookingValidationService';
import { BookingAvailabilityService } from './BookingAvailabilityService';
import { calculateBoxScore } from './BoxScoreUtils';

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
   * Calculate booking price based on box price and deposit
   * @deprecated Use BookingValidationService directly
   */
  calculateBookingPrice(
    days: number,
    boxPrice: number | string | null,
    deposit: number | string | null = null
  ): { 
    amount: number; 
    amountStr: string; 
    days: number; 
    pricePerDay: number; 
    deposit: number;
    subtotal: number;
    total: number;
  } {
    return this.validationService.calculateBookingPrice(days, boxPrice, deposit);
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
  async verifyBox(boxId: string): Promise<{ exists: boolean; box?: { id: string; status: boxStatus | null; model: boxmodel } }> {
    const box = await this.prisma.boxes.findUnique({
      where: { id: boxId },
      select: { id: true, status: true, model: true },
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
    model: import('@prisma/client').boxmodel
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
    model: import('@prisma/client').boxmodel
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
    model: import('@prisma/client').boxmodel
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
    }
  ) {
    const { boxId, startDate, endDate, startTime, endTime } = bookingData;

    console.log('📝 createBooking called with:', {
      paymentId,
      userId: userId || 'null',
      boxId: bookingData.boxId,
    });

    return await this.prisma.$transaction(async (tx) => {
      // Update payment with user_id and completed_at (payment is already verified since it exists in DB)
      // Note: user_id should already be set by PaymentProcessingService, but we ensure it's set here too
      const paymentBefore = await tx.payments.findUnique({
        where: { id: paymentId },
        select: { user_id: true },
      });
      
      console.log('📝 Payment before update in createBooking:', {
        paymentId,
        currentUserId: paymentBefore?.user_id || 'none',
        newUserId: userId || 'null',
      });
      
      const updatedPayment = await tx.payments.update({
        where: { id: paymentId },
        data: {
          user_id: userId, // Ensure user_id is set (should already be set, but ensure it)
          completed_at: new Date(),
        },
      });
      
      console.log('✅ Payment updated in createBooking transaction:', {
        paymentId,
        userId: updatedPayment.user_id || 'none',
        verified: updatedPayment.user_id === userId,
      });
      
      // Verify user_id was set correctly
      if (userId && updatedPayment.user_id !== userId) {
        console.error('❌ CRITICAL: Payment user_id mismatch in createBooking!', {
          expected: userId,
          actual: updatedPayment.user_id,
          paymentId,
        });
        throw new Error(`Payment user_id mismatch: expected ${userId}, got ${updatedPayment.user_id}`);
      }

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

      // Calculate box score based on rental duration (in hours)
      // Uses end_date since box hasn't been returned yet
      let boxScore: bigint;
      let durationHours: number;
      
      try {
        boxScore = calculateBoxScore(start, end);
        durationHours = Number(boxScore);
        console.log('Calculating box score for new booking:', {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          durationHours,
        });
      } catch (scoreError) {
        console.error('Failed to calculate box score for new booking:', scoreError);
        // Use a default score of 1 hour if calculation fails
        boxScore = BigInt(1);
        durationHours = 1;
        console.warn('Using default score of 1 hour due to calculation error');
      }

      // Generate display_id: YYMMDD-XXX format (e.g., 251222-001)
      // Format: 2-digit year (last 2 digits) + 2-digit month + 2-digit day - 3-digit sequence
      // Uses SELECT FOR UPDATE to prevent race conditions when multiple bookings are created simultaneously
      const generateDisplayId = async (): Promise<string> => {
        const now = new Date();
        const fullYear = now.getFullYear(); // e.g., 2025
        const year = String(fullYear).slice(-2); // Last 2 digits: "25"
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
        const day = String(now.getDate()).padStart(2, '0'); // 01-31
        const datePrefix = `${year}${month}${day}`; // e.g., "251222" for Dec 22, 2025
        
        // Find the highest sequence number for today using raw SQL with FOR UPDATE lock
        // This prevents race conditions by locking the row until transaction completes
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        
        // Use raw SQL with FOR UPDATE to lock the row and prevent concurrent access
        const result = await tx.$queryRaw<Array<{ display_id: string }>>`
          SELECT display_id 
          FROM public.bookings 
          WHERE created_at >= ${todayStart}::timestamp 
            AND created_at < ${todayEnd}::timestamp
            AND display_id LIKE ${datePrefix + '-%'}
          ORDER BY display_id DESC 
          LIMIT 1
          FOR UPDATE
        `;

        let sequence = 1;
        if (result && result.length > 0 && result[0]?.display_id) {
          // Extract sequence number from last booking (last 3 digits after hyphen)
          // Format: YYMMDD-XXX
          const parts = result[0].display_id.split('-');
          if (parts.length === 2) {
            const lastSequence = parseInt(parts[1], 10);
            if (!isNaN(lastSequence)) {
              sequence = lastSequence + 1;
            }
          }
        }

        // Ensure sequence doesn't exceed 999
        if (sequence > 999) {
          throw new Error(`Maximum bookings per day (999) exceeded for ${datePrefix}`);
        }

        const sequenceStr = String(sequence).padStart(3, '0'); // 001-999
        return `${datePrefix}-${sequenceStr}`; // e.g., "251222-001"
      };

      const displayId = await generateDisplayId();

      // Create booking with PIN
      try {
        const booking = await tx.bookings.create({
          data: {
            box_id: boxId,
            payment_id: paymentId,
            start_date: start,
            end_date: end,
            status: bookingStatus,
            lock_pin: lockPin, // Set the mandatory PIN
            display_id: displayId, // Required non-nullable display_id (YYMMDD + 3-digit sequence)
          },
        });

        // Update box score based on rental duration
        // Score represents the number of hours the box will be rented
        // Lower scores mean shorter rental periods (better availability)
        await tx.boxes.update({
          where: { id: boxId },
          data: {
            score: boxScore,
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
          boxScore: durationHours,
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
