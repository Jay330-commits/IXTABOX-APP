import 'server-only';
import { BaseService } from '../BaseService';

/**
 * BookingValidationService
 * Handles booking validation, date parsing, and price calculation
 * Separated from BookingService for better code organization
 */
export class BookingValidationService extends BaseService {
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
}

