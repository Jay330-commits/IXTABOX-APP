import 'server-only';
import { BookingStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

/**
 * BookingStatusService
 * Handles booking status calculation and synchronization
 * Separated from BookingService for better code organization
 */
export class BookingStatusService extends BaseService {
  // ============================================================================
  // Status Calculation
  // ============================================================================

  /**
   * Calculate booking status based on dates
   * Pure function - can be used on both client and server
   * 
   * @param startDate - Booking start date
   * @param endDate - Booking end date
   * @param currentDate - Current date (defaults to now)
   * @returns Calculated booking status
   */
  calculateBookingStatus(
    startDate: Date | string,
    endDate: Date | string,
    currentDate?: Date
  ): BookingStatus {
    const now = currentDate || new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid dates provided to calculateBookingStatus', { startDate, endDate });
      return BookingStatus.Upcoming;
    }
    
    // Completed: end date has passed
    if (end < now) {
      return BookingStatus.Completed;
    }
    
    // Active: currently between start and end date
    if (start <= now && end >= now) {
      return BookingStatus.Active;
    }
    
    // Upcoming: start date is in the future
    return BookingStatus.Upcoming;
  }

  // ============================================================================
  // Status Updates
  // ============================================================================

  /**
   * Batch update booking statuses in database
   * Only updates if status actually changed
   * 
   * @param updates - Array of booking ID and new status pairs
   * @returns Number of bookings updated
   */
  async updateBookingStatuses(
    updates: Array<{ bookingId: string; newStatus: BookingStatus }>
  ): Promise<{ updated: number }> {
    if (updates.length === 0) {
      return { updated: 0 };
    }

    console.log(`[BookingStatusService] Updating ${updates.length} booking statuses`);

    const updatePromises = updates.map(({ bookingId, newStatus }) =>
      this.prisma.bookings.updateMany({
        where: {
          id: bookingId,
          status: {
            not: newStatus, // Only update if status changed
          },
        },
        data: { status: newStatus },
      })
    );

    const results = await Promise.all(updatePromises);
    const updated = results.reduce((sum, result) => sum + result.count, 0);

    console.log(`[BookingStatusService] Updated ${updated} booking statuses`);

    return { updated };
  }

  /**
   * Sync booking statuses for a user
   * Finds all bookings that need status updates and updates them
   * 
   * @param userId - User ID to sync bookings for
   * @returns Number of bookings updated
   */
  async syncUserBookingStatuses(userId: string): Promise<{ updated: number }> {
    console.log(`[BookingStatusService] Syncing booking statuses for user: ${userId}`);

    // Get user's bookings
    const user = await this.prisma.public_users.findUnique({
      where: { id: userId },
      include: {
        payments: {
          include: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.Upcoming, BookingStatus.Active],
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.warn(`[BookingStatusService] User not found: ${userId}`);
      return { updated: 0 };
    }

    const now = new Date();
    const updates: Array<{ bookingId: string; newStatus: BookingStatus }> = [];

    // Collect all bookings that need status updates
    user.payments.forEach((payment) => {
      if (payment.bookings) {
        const booking = payment.bookings;
        const calculatedStatus = this.calculateBookingStatus(
          booking.start_date,
          booking.end_date,
          now
        );

        if (calculatedStatus !== booking.status) {
          updates.push({
            bookingId: booking.id,
            newStatus: calculatedStatus,
          });
        }
      }
    });

    if (updates.length === 0) {
      console.log(`[BookingStatusService] No status updates needed for user: ${userId}`);
      return { updated: 0 };
    }

    console.log(`[BookingStatusService] Found ${updates.length} bookings needing status updates`);

    return await this.updateBookingStatuses(updates);
  }

  /**
   * Sync booking statuses for multiple bookings by IDs
   * Useful for syncing specific bookings
   * 
   * @param bookingIds - Array of booking IDs to sync
   * @returns Number of bookings updated
   */
  async syncBookingStatusesByIds(bookingIds: string[]): Promise<{ updated: number }> {
    if (bookingIds.length === 0) {
      return { updated: 0 };
    }

    console.log(`[BookingStatusService] Syncing ${bookingIds.length} booking statuses by IDs`);

    const bookings = await this.prisma.bookings.findMany({
      where: {
        id: {
          in: bookingIds,
        },
        status: {
          in: [BookingStatus.Upcoming, BookingStatus.Active],
        },
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        status: true,
      },
    });

    if (bookings.length === 0) {
      return { updated: 0 };
    }

    const now = new Date();
    const updates: Array<{ bookingId: string; newStatus: BookingStatus }> = [];

    bookings.forEach((booking) => {
      const calculatedStatus = this.calculateBookingStatus(
        booking.start_date,
        booking.end_date,
        now
      );

      if (calculatedStatus !== booking.status) {
        updates.push({
          bookingId: booking.id,
          newStatus: calculatedStatus,
        });
      }
    });

    if (updates.length === 0) {
      return { updated: 0 };
    }

    return await this.updateBookingStatuses(updates);
  }
}

