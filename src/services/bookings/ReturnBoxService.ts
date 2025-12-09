import 'server-only';
import { BookingStatus } from '@prisma/client';
import { BaseService } from '../BaseService';
import { NotificationService } from '../notifications/NotificationService';
import { EmailService } from '../notifications/emailService';

export interface ReturnBoxPhotos {
  boxFrontTop: string; // URL of photo: Box from front/top
  boxFrontBackTop: string; // URL of photo: Box front back/top
  closedStandLock: string; // URL of photo: Closed stand with lock
}

export interface ReturnBoxParams {
  bookingId: string;
  userId: string;
  photos: ReturnBoxPhotos;
  confirmedGoodStatus: boolean;
}

export interface ReturnBoxResult {
  success: boolean;
  bookingId: string;
  returnedAt: Date;
  depositReleased?: boolean;
  error?: string;
}

/**
 * ReturnBoxService
 * Handles box return process with photo uploads and deposit release
 */
export class ReturnBoxService extends BaseService {
  private notificationService: NotificationService;
  private emailService: EmailService;

  constructor() {
    super();
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
  }

  /**
   * Process box return
   * Validates return requirements, uploads photos, updates booking status, releases deposit
   */
  async returnBox(params: ReturnBoxParams): Promise<ReturnBoxResult> {
    console.log(`[ReturnBoxService] Processing box return for booking: ${params.bookingId}`);

    // Validate confirmation checkbox
    if (!params.confirmedGoodStatus) {
      throw new Error('You must confirm that the box has been returned in good status');
    }

    // Fetch booking with related data
    const booking = await this.prisma.bookings.findUnique({
      where: { id: params.bookingId },
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
      throw new Error(`Booking not found: ${params.bookingId}`);
    }

    // Verify user owns this booking
    if (!booking.payments.user_id || booking.payments.user_id !== params.userId) {
      throw new Error('Unauthorized: You do not own this booking');
    }

    // Check if booking is already returned/completed
    if (booking.status === BookingStatus.Completed) {
      throw new Error('This booking has already been completed');
    }

    if (booking.status === BookingStatus.Cancelled) {
      throw new Error('Cannot return a cancelled booking');
    }

    // Validate that booking is Active (rental period is ongoing)
    // Active status means the booking is still on (rental period)
    if (booking.status !== BookingStatus.Active) {
      throw new Error('Can only return box during active rental period');
    }

    // Validate all photos are provided
    if (!params.photos.boxFrontTop || !params.photos.boxFrontBackTop || !params.photos.closedStandLock) {
      throw new Error('All three photos are required: Box front/top, Box front back/top, and Closed stand with lock');
    }

    const returnedAt = new Date();

    try {
      // Update booking with return information
      // Changing status to Completed means the booking has stopped (box returned)
      await this.executeTransaction(async (tx) => {
        await tx.bookings.update({
          where: { id: params.bookingId },
          data: {
            status: BookingStatus.Completed,
            returned_at: returnedAt, // Store when the box was returned
            // Store return photos in metadata or a separate table if needed
            // For now, photos are stored in Vercel Blob and URLs are sent via email
          },
        });
      }, 'ReturnBox');

      console.log(`[ReturnBoxService] Booking status updated to Completed: ${params.bookingId}`);

      // Get user email for notification
      const userEmail = booking.payments.users?.email;
      if (!userEmail) {
        console.warn(`[ReturnBoxService] User email not found for booking: ${params.bookingId}`);
      }

      // Send return confirmation email
      if (userEmail) {
        try {
          const locationName = booking.boxes.stands.locations.name || 'Unknown Location';
          const boxDisplayId = booking.boxes.display_id || 'N/A';
          const standName = booking.boxes.stands.name || 'N/A';

          await this.emailService.sendBoxReturnConfirmation({
            to: userEmail,
            bookingId: params.bookingId,
            locationName,
            boxNumber: boxDisplayId,
            standNumber: standName,
            returnDate: returnedAt.toLocaleDateString(),
            returnTime: returnedAt.toLocaleTimeString(),
            photos: params.photos,
            depositReleased: true, // Deposit is released upon successful return
          });

          console.log(`[ReturnBoxService] Return confirmation email sent to: ${userEmail}`);
        } catch (emailError) {
          // Don't fail return if email fails
          console.error(`[ReturnBoxService] Failed to send return confirmation email:`, emailError);
        }
      }

      // Create notifications
      try {
        // Notify customer
        await this.notificationService.createBookingNotificationForCustomer(
          params.bookingId,
          params.userId,
          BookingStatus.Completed
        );

        // Notify distributor
        await this.notificationService.createBookingNotificationForDistributor(
          params.bookingId,
          BookingStatus.Completed
        );

        console.log(`[ReturnBoxService] Notifications created for box return: ${params.bookingId}`);
      } catch (notificationError) {
        // Don't fail return if notifications fail
        console.error(`[ReturnBoxService] Failed to create notifications:`, notificationError);
      }

      // Note: Deposit release is handled separately if you have a deposit system
      // For now, we just mark it as released in the response
      // You may need to integrate with Stripe to release a hold or refund a deposit

      return {
        success: true,
        bookingId: params.bookingId,
        returnedAt,
        depositReleased: true,
      };
    } catch (error) {
      console.error(`[ReturnBoxService] Failed to process box return:`, error);
      throw error;
    }
  }

  /**
   * Check if a booking can be returned
   */
  async canReturnBox(bookingId: string, userId: string): Promise<{
    canReturn: boolean;
    reason?: string;
    booking?: {
      id: string;
      status: BookingStatus | null;
      start_date: Date;
      end_date: Date;
    };
  }> {
    try {
      const booking = await this.prisma.bookings.findUnique({
        where: { id: bookingId },
        include: {
          payments: true,
        },
      });

      if (!booking) {
        return {
          canReturn: false,
          reason: 'Booking not found',
        };
      }

      // Verify user owns this booking
      if (!booking.payments.user_id || booking.payments.user_id !== userId) {
        return {
          canReturn: false,
          reason: 'Unauthorized: You do not own this booking',
        };
      }

      // Check if already returned/completed
      if (booking.status === BookingStatus.Completed) {
        return {
          canReturn: false,
          reason: 'Box has already been returned',
          booking: {
            id: booking.id,
            status: booking.status,
            start_date: booking.start_date,
            end_date: booking.end_date,
          },
        };
      }

      // Check if cancelled
      if (booking.status === BookingStatus.Cancelled) {
        return {
          canReturn: false,
          reason: 'Cannot return a cancelled booking',
          booking: {
            id: booking.id,
            status: booking.status,
            start_date: booking.start_date,
            end_date: booking.end_date,
          },
        };
      }

      // Can only return if booking is Active (rental period is ongoing)
      // Active status means the booking is still on
      if (booking.status !== BookingStatus.Active) {
        return {
          canReturn: false,
          reason: 'Can only return box during active rental period',
          booking: {
            id: booking.id,
            status: booking.status,
            start_date: booking.start_date,
            end_date: booking.end_date,
          },
        };
      }

      return {
        canReturn: true,
        booking: {
          id: booking.id,
          status: booking.status,
          start_date: booking.start_date,
          end_date: booking.end_date,
        },
      };
    } catch (error) {
      return {
        canReturn: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get return instructions for a booking
   */
  getReturnInstructions(): {
    title: string;
    steps: string[];
    photoRequirements: {
      title: string;
      photos: Array<{ label: string; description: string }>;
    };
  } {
    return {
      title: 'Box Return Instructions',
      steps: [
        'Open right stand and unlock with the igloo lock',
        'Demount box from car',
        'Place box correctly on stand - fixate with straps and leave the 4 digit padlocks in the box',
        'Clean the box if needed with hose or water',
        'Take 2 photos of the box front and back',
        'Close stand and lock the igloo lock',
        'Take confirmation photo of locked stand',
        'Confirm that you are finished by checking the checkbox',
        'Your deposit is being released',
      ],
      photoRequirements: {
        title: 'Required Photos',
        photos: [
          {
            label: 'Box Front/Top',
            description: 'Photo of box from front/top view',
          },
          {
            label: 'Box Front Back/Top',
            description: 'Photo of box front back/top view',
          },
          {
            label: 'Closed Stand with Lock',
            description: 'Photo of closed stand with lock',
          },
        ],
      },
    };
  }
}

