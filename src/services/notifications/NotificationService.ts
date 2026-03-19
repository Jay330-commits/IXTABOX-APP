import 'server-only';
import { prisma } from '@/lib/prisma/prisma';
import { NotificationType, BookingStatus } from '@prisma/client';
import { BaseService } from '../BaseService';
import { EmailService } from './emailService';

export interface CreateBookingNotificationParams {
  bookingId: string;
  bookingStatus: BookingStatus;
  customerUserId?: string | null; // Optional: for customer notifications
  sendEmailToCustomer?: boolean; // Whether to send email notification to customer
}

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string; // e.g., 'booking', 'feedback', etc.
  entityId?: string; // ID of the related entity
}

/**
 * NotificationService
 * Handles all notification-related operations
 * Separated from payment/booking processing for better code organization
 */
export class NotificationService extends BaseService {
  /**
   * Create a notification for a distributor about a booking
   * This is the main notification - distributors should be notified about bookings on their locations
   */
  async createBookingNotificationForDistributor(
    bookingId: string,
    bookingStatus: BookingStatus
  ): Promise<void> {
    // Fetch booking details with location and distributor info
    const bookingWithDetails = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: {
                  include: {
                    distributors: {
                      include: {
                        users: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            users: true, // Customer who made the booking
          },
        },
      },
    });

    if (!bookingWithDetails) {
      throw new Error(`Booking ${bookingId} not found for notification`);
    }

    const stand = bookingWithDetails.boxes.stands;
    if (!stand || !stand.locations) {
      throw new Error(`Booking ${bookingId} is missing stand/location relation for notification`);
    }

    const location = stand.locations;
    const distributor = location.distributors;
    const distributorUserId = distributor?.user_id;
    const box = bookingWithDetails.boxes;
    const customer = bookingWithDetails.payments.users;

    if (!distributorUserId) {
      throw new Error(`Distributor user_id not found for location ${location.id}`);
    }

    // Format dates for notification message
    const formatDate = (date: Date): string => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatTime = (date: Date): string => {
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Create notification message based on status
    let title = '';
    let message = '';

    switch (bookingStatus) {
      case BookingStatus.Confirmed:
        title = 'New Booking Confirmed';
        message = `A new booking has been confirmed at ${location.name} (Box ${box.display_id}, Stand ${stand.display_id}). ` +
          `Start: ${formatDate(bookingWithDetails.start_date)} at ${formatTime(bookingWithDetails.start_date)}. ` +
          `End: ${formatDate(bookingWithDetails.end_date)} at ${formatTime(bookingWithDetails.end_date)}. ` +
          (customer ? `Customer: ${customer.full_name || customer.email}` : '');
        break;
      case BookingStatus.Active:
        title = 'Booking Active';
        message = `A booking at ${location.name} (Box ${box.display_id}) is now active. ` +
          `Start: ${formatDate(bookingWithDetails.start_date)} at ${formatTime(bookingWithDetails.start_date)}.`;
        break;
      case BookingStatus.Cancelled:
        title = 'Booking Cancelled';
        message = `A booking at ${location.name} (Box ${box.display_id}) has been cancelled. ` +
          (customer ? `Customer: ${customer.full_name || customer.email}` : '');
        break;
      case BookingStatus.Completed:
        title = 'Booking Completed';
        message = `A booking at ${location.name} (Box ${box.display_id}) has been completed. ` +
          `Ended: ${formatDate(bookingWithDetails.end_date)} at ${formatTime(bookingWithDetails.end_date)}.`;
        break;
      default:
        title = 'Booking Update';
        message = `A booking at ${location.name} status has been updated to ${bookingStatus}.`;
    }

    // Create notification for distributor
    await prisma.notifications.create({
      data: {
        user_id: distributorUserId,
        type: NotificationType.Email,
        title,
        message,
        entity_type: 'booking',
        entity_id: bookingId,
        read: false,
      },
    });

    // Always send email to distributor when a new booking is confirmed
    if (bookingStatus === BookingStatus.Confirmed) {
      const distributorEmail = distributor.users?.email;
      if (distributorEmail) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL
            || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
            || 'https://ixtarent.com';
          const dashboardUrl = `${baseUrl}/distributor`;

          const emailService = new EmailService();
          await emailService.sendBookingNotificationToDistributor({
            to: distributorEmail,
            locationName: location.name,
            boxNumber: box.display_id,
            standNumber: stand.display_id,
            startDate: formatDate(bookingWithDetails.start_date),
            endDate: formatDate(bookingWithDetails.end_date),
            startTime: formatTime(bookingWithDetails.start_date),
            endTime: formatTime(bookingWithDetails.end_date),
            customerName: customer?.full_name || undefined,
            customerEmail: customer?.email || undefined,
            dashboardUrl,
          });
          console.log('Booking notification email sent to distributor:', distributorEmail);
        } catch (emailError) {
          console.error('Failed to send booking email to distributor:', emailError instanceof Error ? emailError.message : String(emailError));
          // Don't throw - email failure shouldn't break notification creation
        }
      } else {
        console.warn('Distributor has no email - skipping booking notification email for location:', location.name);
      }
    }
  }

  /**
   * Create notification and send email to all admins when a new booking is confirmed
   */
  async createBookingNotificationForAdmins(
    bookingId: string,
    bookingStatus: BookingStatus
  ): Promise<void> {
    if (bookingStatus !== BookingStatus.Confirmed) return;

    const bookingWithDetails = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: true,
              },
            },
          },
        },
        payments: {
          include: { users: true },
        },
      },
    });

    if (!bookingWithDetails) return;

    const stand = bookingWithDetails.boxes.stands;
    if (!stand || !stand.locations) return;

    const location = stand.locations;
    const box = bookingWithDetails.boxes;
    const customer = bookingWithDetails.payments?.users ?? null;

    const formatDate = (date: Date): string => {
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    const formatTime = (date: Date): string => {
      const d = new Date(date);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const admins = await prisma.admins.findMany({
      include: { users: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
      || 'https://ixtarent.com';
    const dashboardUrl = `${baseUrl}/admin`;

    const emailService = new EmailService();
    const emailParams = {
      locationName: location.name,
      boxNumber: box.display_id,
      standNumber: stand.display_id,
      startDate: formatDate(bookingWithDetails.start_date),
      endDate: formatDate(bookingWithDetails.end_date),
      startTime: formatTime(bookingWithDetails.start_date),
      endTime: formatTime(bookingWithDetails.end_date),
      customerName: customer?.full_name || undefined,
      customerEmail: customer?.email || undefined,
      dashboardUrl,
    };

    for (const admin of admins) {
      const adminUserId = admin.user_id;
      const adminEmail = admin.users?.email;

      try {
        await prisma.notifications.create({
          data: {
            user_id: adminUserId,
            type: NotificationType.Email,
            title: 'New Booking Confirmed',
            message: `A new booking at ${location.name} (Box ${box.display_id}, Stand ${stand.display_id}). ` +
              `Start: ${formatDate(bookingWithDetails.start_date)} at ${formatTime(bookingWithDetails.start_date)}. ` +
              (customer ? `Customer: ${customer.full_name || customer.email}` : ''),
            entity_type: 'booking',
            entity_id: bookingId,
            read: false,
          },
        });
      } catch (notifErr) {
        console.error('Failed to create admin notification:', notifErr);
      }

      if (adminEmail) {
        try {
          await emailService.sendBookingNotificationToDistributor({
            ...emailParams,
            to: adminEmail,
          });
          console.log('Booking notification email sent to admin:', adminEmail);
        } catch (emailError) {
          console.error('Failed to send booking email to admin:', adminEmail, emailError);
        }
      }
    }
  }

  /**
   * Create a notification for a customer about their booking
   * Optional: Can be used if you want customers to also receive in-app notifications
   */
  async createBookingNotificationForCustomer(
    bookingId: string,
    customerUserId: string,
    bookingStatus: BookingStatus
  ): Promise<void> {
    // Fetch booking details
    const bookingWithDetails = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
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

    if (!bookingWithDetails) {
      throw new Error(`Booking ${bookingId} not found for notification`);
    }

    const stand = bookingWithDetails.boxes.stands;
    if (!stand || !stand.locations) {
      throw new Error(`Booking ${bookingId} is missing stand/location relation for notification`);
    }

    const location = stand.locations;
    const box = bookingWithDetails.boxes;

    // Format dates for notification message
    const formatDate = (date: Date): string => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatTime = (date: Date): string => {
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Create notification message based on status
    let title = '';
    let message = '';

    switch (bookingStatus) {
      case BookingStatus.Confirmed:
        title = 'Booking Confirmed';
        message = `Your booking at ${location.name} (Box ${box.display_id}, Stand ${stand.display_id}) has been confirmed. ` +
          `Start: ${formatDate(bookingWithDetails.start_date)} at ${formatTime(bookingWithDetails.start_date)}. ` +
          `End: ${formatDate(bookingWithDetails.end_date)} at ${formatTime(bookingWithDetails.end_date)}. ` +
          `Your unlock code will be sent by email when your booking starts.`;
        break;
      case BookingStatus.Active:
        title = 'Booking Active';
        message = bookingWithDetails.lock_pin && bookingWithDetails.lock_pin > 0
          ? `Your booking at ${location.name} is now active. Use PIN ${bookingWithDetails.lock_pin} to access your box.`
          : `Your booking at ${location.name} is now active. Check your email for your unlock code.`;
        break;
      case BookingStatus.Cancelled:
        title = 'Booking Cancelled';
        message = `Your booking at ${location.name} has been cancelled.`;
        break;
      case BookingStatus.Completed:
        title = 'Booking Completed';
        message = `Your booking at ${location.name} has been completed. Thank you for using IXTAbox!`;
        break;
      default:
        title = 'Booking Update';
        message = `Your booking at ${location.name} status has been updated to ${bookingStatus}.`;
    }

    // Create notification for customer
    console.log('📝 Creating notification in database with user_id:', customerUserId, 'for booking:', bookingId);
    const notification = await prisma.notifications.create({
      data: {
        user_id: customerUserId,
        type: NotificationType.Email,
        title,
        message,
        entity_type: 'booking',
        entity_id: bookingId,
        read: false,
      },
    });
    console.log('Notification created successfully with id:', notification.id, 'user_id:', notification.user_id);
  }

  /**
   * Create a general notification
   */
  async createNotification(data: NotificationData): Promise<void> {
    await prisma.notifications.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        entity_type: data.entityType,
        entity_id: data.entityId,
        read: false,
      },
    });
  }
}

