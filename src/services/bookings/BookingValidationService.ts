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
   * Calculate booking price based on box price and deposit
   * @param days Number of days for the booking
   * @param boxPrice Price per day from the box (Decimal or number)
   * @param deposit Deposit amount from the box (Decimal or number, optional)
   * @returns Price calculation result
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
    // Convert Decimal to number if needed
    const pricePerDay = boxPrice 
      ? (typeof boxPrice === 'string' ? parseFloat(boxPrice) : Number(boxPrice))
      : 300; // Default fallback
    
    const depositAmount = deposit 
      ? (typeof deposit === 'string' ? parseFloat(deposit) : Number(deposit))
      : 0;
    
    const subtotal = pricePerDay * days;
    const total = subtotal + depositAmount;
    
    return {
      amount: total,
      amountStr: total.toFixed(2),
      days,
      pricePerDay,
      deposit: depositAmount,
      subtotal,
      total,
    };
  }

  /**
   * Validate and prepare booking with price calculation using box price and deposit
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
    pricePerDay: number;
    deposit: number;
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

    // Fetch box to get price and deposit
    const box = await this.prisma.boxes.findUnique({
      where: { id: bookingData.boxId },
      select: { price: true, deposit: true },
    });

    if (!box) {
      throw new Error(`Box with id ${bookingData.boxId} not found`);
    }

    // Convert Prisma Decimal to number or string for calculateBookingPrice
    // Prisma Decimal type needs explicit conversion - use Number() or toString()
    const boxPrice: number | string | null = box.price 
      ? (typeof box.price === 'string' 
          ? box.price 
          : typeof box.price === 'number' 
            ? box.price 
            : Number(box.price as unknown as number | string) || String(box.price))
      : null;
    const boxDeposit: number | string | null = box.deposit 
      ? (typeof box.deposit === 'string' 
          ? box.deposit 
          : typeof box.deposit === 'number' 
            ? box.deposit 
            : Number(box.deposit as unknown as number | string) || String(box.deposit))
      : null;

    const { start, end } = dateValidation;
    const days = this.calculateBookingDays(start, end);
    const priceCalculation = this.calculateBookingPrice(
      days,
      boxPrice,
      boxDeposit
    );

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
      pricePerDay: priceCalculation.pricePerDay.toString(),
      deposit: priceCalculation.deposit.toString(),
      source: 'ixtabox-app',
    };

    return {
      amount: priceCalculation.amount,
      amountStr: priceCalculation.amountStr,
      metadata,
      validatedDates: { start, end },
      pricePerDay: priceCalculation.pricePerDay,
      deposit: priceCalculation.deposit,
    };
  }
}

