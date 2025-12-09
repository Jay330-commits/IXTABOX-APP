import 'server-only';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { BaseService } from '../BaseService';
import { StripeService } from '../payments/StripeService';
import { NotificationService } from '../notifications/NotificationService';
import { BookingStatusService } from './BookingStatusService';

export interface CancellationResult {
  success: boolean;
  bookingId: string;
  refundAmount: number;
  refundPercentage: number;
  reason: string;
  cancelledAt: Date;
  error?: string;
}

export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  transactionFee: number;
  reason: string;
  eligible: boolean;
}

/**
 * CancelBookingService
 * Handles booking cancellations and refund calculations based on cancellation policies
 */
export class CancelBookingService extends BaseService {
  private stripeService: StripeService;
  private notificationService: NotificationService;
  private statusService: BookingStatusService;

  // Transaction fee (fixed amount subtracted from 100% refunds)
  private readonly TRANSACTION_FEE_SEK = 29.00; // 29 SEK transaction fee

  constructor() {
    super();
    this.stripeService = new StripeService();
    this.notificationService = new NotificationService();
    this.statusService = new BookingStatusService();
  }

  /**
   * Calculate refund amount based on cancellation rules
   * 
   * Rules:
   * - Rentals up to 3 days: 50% refund if cancelled within 24 hours, 100% minus transaction cost before 24 hours
   * - Rentals over 3 days: 75% refund if cancelled within 48 hours, 100% minus transaction cost before 48 hours
   * - During rental period (active): No refund allowed
   * 
   * @param booking - Booking to calculate refund for
   * @param cancellationTime - When the cancellation is requested (defaults to now)
   * @returns Refund calculation details
   */
  calculateRefund(
    booking: {
      id: string;
      start_date: Date;
      end_date: Date;
      total_amount: { toString: () => string } | string | number;
      status: BookingStatus | null;
      created_at: Date | null;
    },
    cancellationTime: Date = new Date()
  ): RefundCalculation {
    const totalAmount = typeof booking.total_amount === 'string'
      ? parseFloat(booking.total_amount)
      : typeof booking.total_amount === 'number'
      ? booking.total_amount
      : parseFloat(booking.total_amount.toString());

    // Check if booking is active (during rental period)
    const currentStatus = this.statusService.calculateBookingStatus(
      booking.start_date,
      booking.end_date,
      cancellationTime
    );

    if (currentStatus === BookingStatus.Active) {
      // Allow cancellation during active period (box return), but no refund
      return {
        refundAmount: 0,
        refundPercentage: 0,
        transactionFee: 0,
        reason: 'Booking is currently active. Box can be returned but no refund will be issued.',
        eligible: true, // Allow cancellation, just no refund
      };
    }

    // Check if booking is already completed or cancelled
    if (currentStatus === BookingStatus.Completed || booking.status === BookingStatus.Cancelled) {
      return {
        refundAmount: 0,
        refundPercentage: 0,
        transactionFee: 0,
        reason: booking.status === BookingStatus.Cancelled 
          ? 'Booking has already been cancelled.'
          : 'Booking has already been completed. No refund available.',
        eligible: false,
      };
    }

    const bookingStartDate = new Date(booking.start_date);
    const bookingEndDate = new Date(booking.end_date);

    // Calculate rental duration in days
    const rentalDays = Math.ceil(
      (bookingEndDate.getTime() - bookingStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate time until booking starts (hours before rental period)
    const hoursUntilStart = (bookingStartDate.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);

    let refundPercentage: number;
    let reason: string;
    let transactionFee = 0;

    if (rentalDays <= 3) {
      // Rentals up to 3 days
      if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
        // Cancelled within 24 hours before start: 50% refund
        refundPercentage = 50;
        reason = 'Cancelled within 24 hours of rental start time. 50% refund applied.';
      } else if (hoursUntilStart > 24) {
        // Cancelled more than 24 hours before start: 100% minus transaction fee
        refundPercentage = 100;
        transactionFee = this.TRANSACTION_FEE_SEK;
        reason = 'Cancelled more than 24 hours before rental period. Full refund minus transaction fee.';
      } else {
        // Already past start time (should have been caught by Active status check, but handle anyway)
        refundPercentage = 0;
        reason = 'Cannot cancel: rental period has started.';
      }
    } else {
      // Rentals over 3 days
      if (hoursUntilStart > 0 && hoursUntilStart <= 48) {
        // Cancelled within 48 hours before start: 75% refund
        refundPercentage = 75;
        reason = 'Cancelled within 48 hours of rental start time. 75% refund applied.';
      } else if (hoursUntilStart > 48) {
        // Cancelled more than 48 hours before start: 100% minus transaction fee
        refundPercentage = 100;
        transactionFee = this.TRANSACTION_FEE_SEK;
        reason = 'Cancelled more than 48 hours before rental period. Full refund minus transaction fee.';
      } else {
        // Already past start time (should have been caught by Active status check, but handle anyway)
        refundPercentage = 0;
        reason = 'Cannot cancel: rental period has started.';
      }
    }

    // Calculate refund amount
    const refundAmount = Math.max(0, (totalAmount * refundPercentage / 100) - transactionFee);

    return {
      refundAmount: Math.round(refundAmount * 100) / 100, // Round to 2 decimal places
      refundPercentage,
      transactionFee,
      reason,
      eligible: true,
    };
  }

  /**
   * Cancel a booking and process refund
   * 
   * @param bookingId - ID of booking to cancel
   * @param userId - ID of user requesting cancellation (for authorization)
   * @param cancellationTime - When cancellation is requested (defaults to now)
   * @returns Cancellation result with refund details
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    cancellationTime: Date = new Date()
  ): Promise<CancellationResult> {
    console.log(`[CancelBookingService] Starting cancellation for booking: ${bookingId}`);

    // Fetch booking with payment details
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          include: {
            bookings: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Verify user owns this booking
    if (booking.payments.user_id !== userId) {
      throw new Error('Unauthorized: You do not own this booking');
    }

    // Check if booking is already cancelled
    if (booking.status === BookingStatus.Cancelled) {
      return {
        success: false,
        bookingId,
        refundAmount: 0,
        refundPercentage: 0,
        reason: 'Booking has already been cancelled.',
        cancelledAt: booking.created_at || new Date(),
        error: 'Booking already cancelled',
      };
    }

    // Calculate refund
    const refundCalc = this.calculateRefund(
      {
        id: booking.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: booking.total_amount,
        status: booking.status,
        created_at: booking.created_at,
      },
      cancellationTime
    );

    console.log(`[CancelBookingService] Refund calculation:`, {
      bookingId,
      totalAmount: booking.total_amount.toString(),
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      reason: refundCalc.reason,
    });

    // Process refund if eligible and amount > 0
    let refundProcessed = false;
    let stripeRefundId: string | null = null;
    let actualRefundAmount = refundCalc.refundAmount;

    // Check Stripe first - Stripe is the source of truth for payment status
    if (refundCalc.eligible && refundCalc.refundAmount > 0) {
      try {
        const payment = booking.payments;
        
        if (!payment.charge_id) {
          throw new Error('Payment charge ID not found. Cannot process refund.');
        }

        // Retrieve charge details from Stripe - this confirms the real payment status
        const stripe = this.stripeService.getStripe();
        const charge = await stripe.charges.retrieve(payment.charge_id);
        
        // Calculate available refund amount from Stripe
        const chargeAmount = charge.amount / 100; // Convert from cents
        const alreadyRefunded = charge.amount_refunded / 100; // Convert from cents
        const availableToRefund = chargeAmount - alreadyRefunded;
        const paymentStatusInDb = booking.payments.status;
        
        console.log(`[CancelBookingService] Checking Stripe charge status:`, {
          chargeId: payment.charge_id,
          chargeAmount,
          alreadyRefundedInStripe: alreadyRefunded,
          availableToRefund,
          requestedRefund: refundCalc.refundAmount,
          dbPaymentStatus: paymentStatusInDb,
        });

        // Adjust refund amount if it exceeds available amount
        actualRefundAmount = Math.min(refundCalc.refundAmount, availableToRefund);
        
        if (actualRefundAmount <= 0 || alreadyRefunded >= chargeAmount) {
          // Stripe confirms charge is already fully refunded
          // Update DB to match Stripe's status (may be out of sync)
          console.log(`[CancelBookingService] Stripe confirms charge is already fully refunded (${alreadyRefunded.toFixed(2)} kr of ${chargeAmount.toFixed(2)} kr). DB status: '${paymentStatusInDb}'. Will update DB to match Stripe status.`);
          refundProcessed = false; // No new refund needed - Stripe already refunded it
          actualRefundAmount = 0;
          refundCalc.reason = `Payment was already refunded in Stripe. Booking cancelled and DB status synchronized.`;
        } else {
          if (actualRefundAmount < refundCalc.refundAmount) {
            console.warn(`[CancelBookingService] Refund amount adjusted from ${refundCalc.refundAmount.toFixed(2)} to ${actualRefundAmount.toFixed(2)} kr (available amount)`);
          }

          // Create refund via Stripe using charge_id directly
          const refund = await stripe.refunds.create({
            charge: payment.charge_id,
            amount: Math.round(actualRefundAmount * 100), // Convert to cents
            reason: 'requested_by_customer',
            metadata: {
              booking_id: bookingId,
              user_id: userId,
              cancellation_reason: refundCalc.reason,
              refund_percentage: refundCalc.refundPercentage.toString(),
              original_refund_amount: refundCalc.refundAmount.toFixed(2),
              adjusted_refund_amount: actualRefundAmount.toFixed(2),
            },
          });

          refundProcessed = true;
          stripeRefundId = refund.id;

          console.log(`[CancelBookingService] Refund processed:`, {
            refundId: refund.id,
            requestedAmount: refundCalc.refundAmount,
            actualAmount: actualRefundAmount,
            status: refund.status,
          });
          
          // Update refund calculation with actual refunded amount
          if (actualRefundAmount < refundCalc.refundAmount) {
            refundCalc.refundAmount = actualRefundAmount;
            refundCalc.reason = `${refundCalc.reason} Note: Refund adjusted to ${actualRefundAmount.toFixed(2)} kr due to available charge balance.`;
          }
        }
      } catch (refundError) {
        console.error(`[CancelBookingService] Failed to process refund:`, refundError);
        throw new Error(
          `Failed to process refund: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`
        );
      }
    } else if (!refundCalc.eligible) {
      console.log(`[CancelBookingService] Refund not eligible: ${refundCalc.reason}`);
    }

    // Update booking status to Cancelled and mark payment as refunded (if refund was processed)
    try {
      await this.executeTransaction(async (tx) => {
        // Update booking status to Cancelled
        await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.Cancelled,
          },
        });
        
        // Update payment status to Refunded when booking is cancelled
        // Mark as refunded even if refund amount is 0 (booking cancelled but no refund issued)
        if (booking.payments) {
          await tx.payments.update({
            where: { id: booking.payments.id },
            data: {
              status: PaymentStatus.Refunded,
            },
          });
          console.log(`[CancelBookingService] Payment status updated to Refunded for booking: ${bookingId}${refundProcessed ? ' (refund processed)' : ' (no refund issued)'}`);
        }
      }, 'CancelBooking');

      console.log(`[CancelBookingService] Booking status updated to Cancelled: ${bookingId}`);
    } catch (updateError) {
      console.error(`[CancelBookingService] Failed to update booking status:`, updateError);
      
      // If refund was processed but booking update failed, this is a critical error
      if (refundProcessed) {
        throw new Error(
          'Refund was processed but booking status update failed. Please contact support with refund ID: ' + stripeRefundId
        );
      }
      throw updateError;
    }

    // Create notifications
    try {
      // Notify customer
      await this.notificationService.createBookingNotificationForCustomer(
        bookingId,
        userId,
        BookingStatus.Cancelled
      );

      // Notify distributor
      await this.notificationService.createBookingNotificationForDistributor(
        bookingId,
        BookingStatus.Cancelled
      );

      console.log(`[CancelBookingService] Notifications created for booking cancellation: ${bookingId}`);
    } catch (notificationError) {
      // Don't fail cancellation if notifications fail
      console.error(`[CancelBookingService] Failed to create notifications:`, notificationError);
    }

    return {
      success: true,
      bookingId,
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      reason: refundCalc.reason,
      cancelledAt: cancellationTime,
    };
  }

  /**
   * Check if a booking can be cancelled
   * 
   * @param bookingId - ID of booking to check
   * @param userId - ID of user requesting cancellation check
   * @returns Whether booking can be cancelled and refund calculation
   */
  async canCancelBooking(
    bookingId: string,
    userId: string
  ): Promise<{ canCancel: boolean; refundCalculation?: RefundCalculation; error?: string }> {
    try {
      const booking = await this.prisma.bookings.findUnique({
        where: { id: bookingId },
        include: {
          payments: true,
        },
      });

      if (!booking) {
        return {
          canCancel: false,
          error: 'Booking not found',
        };
      }

      // Verify user owns this booking
      if (booking.payments.user_id !== userId) {
        return {
          canCancel: false,
          error: 'Unauthorized: You do not own this booking',
        };
      }

      // Check if already cancelled
      if (booking.status === BookingStatus.Cancelled) {
        return {
          canCancel: false,
          error: 'Booking has already been cancelled',
        };
      }

      // Calculate refund to see if cancellation is eligible
      const refundCalc = this.calculateRefund({
        id: booking.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: booking.total_amount,
        status: booking.status,
        created_at: booking.created_at,
      });

      return {
        canCancel: refundCalc.eligible || refundCalc.refundAmount === 0, // Allow cancellation even if no refund
        refundCalculation: refundCalc,
      };
    } catch (error) {
      return {
        canCancel: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

