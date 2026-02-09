import 'server-only';
import { BaseService } from '../BaseService';
import { BookingStatus, boxStatus } from '@prisma/client';
import { BookingValidationService } from './BookingValidationService';
import { BookingAvailabilityService } from './BookingAvailabilityService';
import { IglooService } from '../locations/IglooService';

interface ExtensionCalculation {
  canExtend: boolean;
  additionalDays: number;
  additionalCost: number;
  pricePerDay: number;
  reason?: string;
  error?: string;
}

interface ExtensionRequestResult {
  success: boolean;
  extensionRequest?: {
    id: string;
    bookingId: string;
    requestedEndDate: Date;
    status: string;
  };
  error?: string;
  reason?: string;
}

/**
 * ExtensionRequestService
 * Handles booking extension requests from customers
 */
export class ExtensionRequestService extends BaseService {
  private validationService: BookingValidationService;
  private availabilityService: BookingAvailabilityService;

  constructor() {
    super();
    this.validationService = new BookingValidationService();
    this.availabilityService = new BookingAvailabilityService();
  }

  /**
   * Calculate extension cost and validate if extension is possible
   */
  async calculateExtension(
    bookingId: string,
    userId: string,
    newEndDate: string,
    newEndTime: string
  ): Promise<ExtensionCalculation> {
    // Fetch booking with payment and box details
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          include: {
            bookings: true,
          },
        },
        boxes: {
          include: {
            stands: {
              include: {
                locations: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return {
        canExtend: false,
        additionalDays: 0,
        additionalCost: 0,
        pricePerDay: 0,
        error: 'Booking not found',
      };
    }

    // Verify user owns this booking
    if (booking.payments.user_id !== userId) {
      return {
        canExtend: false,
        additionalDays: 0,
        additionalCost: 0,
        pricePerDay: 0,
        error: 'Unauthorized: You do not own this booking',
      };
    }

    // Check if booking can be extended
    if (booking.status === BookingStatus.Cancelled) {
      return {
        canExtend: false,
        additionalDays: 0,
        additionalCost: 0,
        pricePerDay: 0,
        error: 'Cannot extend a cancelled booking',
      };
    }

    if (booking.status === BookingStatus.Completed) {
      return {
        canExtend: false,
        additionalDays: 0,
        additionalCost: 0,
        pricePerDay: 0,
        error: 'Cannot extend a completed booking',
      };
    }

    // Parse dates
    const currentEndDate = new Date(booking.end_date);
    const requestedEndDate = new Date(`${newEndDate}T${newEndTime}`);

    // Validate new end date is after current end date
    if (requestedEndDate <= currentEndDate) {
      return {
        canExtend: false,
        additionalDays: 0,
        additionalCost: 0,
        pricePerDay: 0,
        error: 'New end date must be after current end date',
      };
    }

    // Note: We allow extensions even if there are conflicting bookings
    // The requestExtension method will automatically reassign conflicting bookings to other boxes

    // Calculate additional days
    const additionalDays = this.validationService.calculateBookingDays(
      currentEndDate,
      requestedEndDate
    );

    // Get price per day from box or location pricing
    const boxPrice = booking.boxes.price
      ? Number(booking.boxes.price)
      : null;

    let pricePerDay = boxPrice || 300; // Default to 300 SEK if no price set

    // Try to get location-specific pricing
    if (booking.boxes.stands?.locations?.id) {
      try {
        const { LocationPricingService } = await import('../locations/LocationPricingService');
        const pricingService = new LocationPricingService();
        // Calculate week number for the extension period
        const weekNumber = pricingService.getWeekNumber(newEndDate, booking.start_date);
        const pricingRules = await pricingService.getPricingByLocation(booking.boxes.stands.locations.id);
        
        if (pricingRules && pricingRules.length > 0) {
          // Find pricing rule for the specific week
          const weekPricing = pricingRules.find(p => p.week === weekNumber);
          if (weekPricing) {
            pricePerDay = Number(weekPricing.actual_price) || pricePerDay;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch location pricing, using box price:', error);
      }
    }

    // Calculate additional cost
    const additionalCost = additionalDays * pricePerDay;

    return {
      canExtend: true,
      additionalDays,
      additionalCost,
      pricePerDay,
      reason: `Extension will add ${additionalDays} ${additionalDays === 1 ? 'day' : 'days'} to your booking`,
    };
  }

  /**
   * Request a booking extension
   * Automatically processes the extension and reassigns conflicting bookings
   */
  async requestExtension(
    bookingId: string,
    userId: string,
    newEndDate: string,
    newEndTime: string,
    paymentId?: string | null
  ): Promise<ExtensionRequestResult> {
    return await this.executeTransaction(async (tx) => {
      // First validate the extension
      const calculation = await this.calculateExtension(
        bookingId,
        userId,
        newEndDate,
        newEndTime
      );

      if (!calculation.canExtend) {
        return {
          success: false,
          error: calculation.error || 'Cannot extend booking',
          reason: calculation.reason,
        };
      }

      // Fetch booking details
      const booking = await tx.bookings.findUnique({
        where: { id: bookingId },
        include: {
          payments: {
            include: {
              users: true,
            },
          },
          boxes: {
            include: {
              stands: {
                include: {
                  locations: true,
                },
              },
            },
          },
        },
      });

      if (!booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      const requestedEndDate = new Date(`${newEndDate}T${newEndTime}`);
      const currentEndDate = new Date(booking.end_date);

      // Find conflicting bookings (next customer's booking on the same box)
      const conflictingBookings = await tx.bookings.findMany({
        where: {
          box_id: booking.box_id,
          id: {
            not: bookingId,
          },
          status: {
            in: [BookingStatus.Upcoming, BookingStatus.Active, BookingStatus.Confirmed],
          },
          AND: [
            {
              start_date: {
                lt: requestedEndDate,
              },
            },
            {
              end_date: {
                gt: currentEndDate,
              },
            },
          ],
        },
        include: {
          payments: {
            include: {
              users: true,
            },
          },
          boxes: {
            include: {
              stands: {
                include: {
                  locations: true,
                },
              },
            },
          },
        },
      });

      // Process each conflicting booking - reassign to another box
      for (const conflictingBooking of conflictingBookings) {
        // Find an alternative box with the same model at the same location
        const alternativeBoxes = await tx.boxes.findMany({
          where: {
            stands: {
              location_id: booking.boxes.stands.locations.id,
            },
            model: booking.boxes.model,
            status: 'Active',
            id: {
              not: booking.box_id, // Exclude the current box
            },
          },
          include: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.Upcoming, BookingStatus.Active, BookingStatus.Confirmed],
                },
              },
              select: {
                start_date: true,
                end_date: true,
              },
            },
          },
          orderBy: {
            score: 'asc', // Prefer boxes with lower scores
          },
        });

        // Check if there are any boxes at all at this location
        if (alternativeBoxes.length === 0) {
          return {
            success: false,
            error: 'Cannot extend booking: No alternative boxes available at this location',
            reason: 'There are no other boxes of the same model available at this location to reassign the next customer.',
          };
        }

        // Find an available box for the conflicting booking period
        let alternativeBox = null;
        for (const box of alternativeBoxes) {
          const hasConflict = box.bookings.some((b: { start_date: Date; end_date: Date }) => {
            const bookingStart = new Date(b.start_date);
            const bookingEnd = new Date(b.end_date);
            const conflictStart = new Date(conflictingBooking.start_date);
            const conflictEnd = new Date(conflictingBooking.end_date);
            return conflictStart < bookingEnd && conflictEnd > bookingStart;
          });

          if (!hasConflict) {
            alternativeBox = box;
            break;
          }
        }

        if (alternativeBox) {
          // Reassign the conflicting booking to the alternative box
          await tx.bookings.update({
            where: { id: conflictingBooking.id },
            data: {
              box_id: alternativeBox.id,
            },
          });

          // Notify the customer whose booking was reassigned
          await tx.notifications.create({
            data: {
              user_id: conflictingBooking.payments.user_id,
              title: 'Box Assignment Changed',
              message: `Your booking ${conflictingBooking.display_id} has been reassigned to box ${alternativeBox.display_id} at the same location. This change was made to accommodate another customer's extension request.`,
              type: 'Email',
              entity_type: 'booking',
              entity_id: conflictingBooking.id,
              read: false,
            },
          });
        } else {
          // No alternative box available - cannot extend
          return {
            success: false,
            error: 'Cannot extend booking: No available boxes at this location',
            reason: `The next customer's booking (${conflictingBooking.display_id}) cannot be reassigned as all alternative boxes at this location are already booked for that period.`,
          };
        }
      }

      // Store current values before extension
      const previousEndDate = new Date(booking.end_date);
      const previousLockPin = booking.lock_pin;
      const boxStatusAtExtension = booking.boxes.status;

      // Generate new lock PIN based on the extended booking dates
      let newLockPin: number;
      try {
        const iglooService = new IglooService();
        const bookingStartDate = new Date(booking.start_date);
        newLockPin = await iglooService.generateAndParseBookingPin(
          bookingStartDate,
          requestedEndDate,
          'Customer'
        );
        console.log('New lock PIN generated for extended booking:', newLockPin);
      } catch (pinError) {
        console.error('Failed to generate new lock PIN for extension:', {
          error: pinError,
          message: pinError instanceof Error ? pinError.message : String(pinError),
        });
        // PIN generation is mandatory - fail extension if PIN generation fails
        throw new Error(`Failed to generate mandatory lock PIN for extension: ${pinError instanceof Error ? pinError.message : String(pinError)}`);
      }

      // Calculate additional days
      const additionalDays = this.validationService.calculateBookingDays(
        previousEndDate,
        requestedEndDate
      );

      // Use provided payment ID (from extension completion) or null if not provided
      const extensionPaymentId = paymentId || null;

      // Create extension history record BEFORE updating booking
      await tx.booking_extensions.create({
        data: {
          booking_id: bookingId,
          previous_end_date: previousEndDate,
          new_end_date: requestedEndDate,
          previous_lock_pin: previousLockPin,
          new_lock_pin: newLockPin,
          additional_days: additionalDays,
          additional_cost: calculation.additionalCost.toString(), // Convert to string for Decimal type
          payment_id: extensionPaymentId,
          box_status_at_extension: boxStatusAtExtension,
        },
      });

      // Update booking end date and lock PIN only; extension count / original end come from joins
      const updatedBooking = await tx.bookings.update({
        where: { id: bookingId },
        data: {
          end_date: requestedEndDate,
          lock_pin: newLockPin,
        },
      });

      // Verify the update was successful
      if (!updatedBooking || updatedBooking.lock_pin !== newLockPin) {
        console.error('[ExtensionRequestService] Booking update verification failed:', {
          bookingId,
          expectedLockPin: newLockPin,
          actualLockPin: updatedBooking?.lock_pin,
        });
        throw new Error('Failed to update booking with new lock PIN');
      }

      console.log('[ExtensionRequestService] Booking updated successfully:', {
        bookingId,
        newEndDate: requestedEndDate.toISOString(),
        newLockPin,
      });

      // Create notification for the extending customer
      await tx.notifications.create({
        data: {
          user_id: userId,
          title: 'Booking Extended',
          message: `Your booking ${booking.display_id} has been extended until ${requestedEndDate.toLocaleDateString()}. Your new lock PIN is ${newLockPin}. Additional cost: SEK ${calculation.additionalCost.toFixed(2)}.`,
          type: 'Email',
          entity_type: 'booking',
          entity_id: bookingId,
          read: false,
        },
      });

      return {
        success: true,
        extensionRequest: {
          id: bookingId,
          bookingId,
          requestedEndDate,
          status: 'approved',
        },
      };
    }, 'ExtensionRequestService.requestExtension');
  }
}
