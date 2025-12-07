import 'server-only';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { UserService } from '../user/UserService';
import { BookingService } from './BookingService';
import { StripeService } from '../payments/StripeService';
import { EmailService } from '../notifications/emailService';
import { NotificationService } from '../notifications/NotificationService';

/**
 * PaymentProcessingService
 * Handles booking-specific payment processing logic
 * Uses StripeService for general Stripe operations
 */
export class PaymentProcessingService {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  /**
   * Get Stripe client instance (delegates to StripeService)
   */
  getStripe(): Stripe {
    return this.stripeService.getStripe();
  }

  /**
   * Create a payment intent with booking metadata
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
    });
  }

  /**
   * Retrieve payment intent from Stripe (delegates to StripeService)
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
    options?: { expand?: string[] }
  ): Promise<Stripe.PaymentIntent> {
    return this.stripeService.retrievePaymentIntent(paymentIntentId, options);
  }

  /**
   * Verify payment intent exists and has valid status (delegates to StripeService)
   */
  async verifyPaymentIntent(paymentIntentId: string): Promise<{
    exists: boolean;
    paymentIntent?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      livemode: boolean;
    };
  }> {
    return this.stripeService.verifyPaymentIntent(paymentIntentId);
  }

  /**
   * Update payment intent metadata (delegates to StripeService)
   */
  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    return this.stripeService.updatePaymentIntentMetadata(paymentIntentId, metadata);
  }

  /**
   * Extract billing details from payment intent (booking-specific logic)
   * Uses StripeService for base extraction, adds metadata fallbacks
   */
  extractBillingDetails(paymentIntent: Stripe.PaymentIntent) {
    // Use StripeService for base extraction (checks receipt_email, payment_method, metadata)
    const baseDetails = this.stripeService.extractBillingDetails(paymentIntent);
    
    // Add metadata fallbacks for name and phone
    const email = baseDetails.email || paymentIntent.metadata?.customerEmail || null;
    const name = baseDetails.name || paymentIntent.metadata?.customerName || 'Guest User';
    const phone = baseDetails.phone || paymentIntent.metadata?.customerPhone || null;

    return { email, name, phone, address: baseDetails.address };
  }

  /**
   * Find and validate payment record
   */
  async findPaymentRecord(paymentIntentId: string) {
    const payment = await prisma.payments.findUnique({
      where: {
        stripe_payment_intent_id: paymentIntentId,
      },
      include: {
        bookings: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment record not found for payment intent: ${paymentIntentId}`);
    }

    return payment;
  }


  /**
   * Create or find guest user
   */
  async getOrCreateGuestUser(
    existingUserId: string | null,
    email: string | null,
    name: string,
    phone: string | null,
    address: Stripe.Address | null
  ): Promise<string | null> {
    if (existingUserId) {
      return existingUserId;
    }

    if (!email) {
      return null;
    }

    try {
      const userService = new UserService();
      const guestUser = await userService.findOrCreateGuestUser({
        email,
        fullName: name,
        phone: phone || undefined,
        billingAddress: address ? {
          line1: address.line1 ?? undefined,
          line2: address.line2 ?? undefined,
          city: address.city ?? undefined,
          state: address.state ?? undefined,
          postal_code: address.postal_code ?? undefined,
          country: address.country ?? undefined,
        } : undefined,
      });
      return guestUser.id;
    } catch (userError) {
      console.error('Failed to create guest user:', userError);
      return null;
    }
  }


  /**
   * Process successful payment and create booking
   * This is the main function used by both webhooks and local payment success
   * @param paymentIntentId - The Stripe payment intent ID
   * @param providedEmail - Optional email from frontend (from contact form) - takes priority over Stripe extraction
   */
  async processPaymentSuccess(paymentIntentId: string, providedEmail?: string | null) {
    // Fetch payment record first
    const existingPayment = await this.findPaymentRecord(paymentIntentId).catch(findError => {
      console.error('Payment record not found in database:', {
        paymentIntentId,
        error: findError instanceof Error ? findError.message : String(findError),
      });
      throw findError;
    });

    // Retrieve payment intent from Stripe
    const fullPaymentIntent = await this.retrievePaymentIntent(paymentIntentId, {
      expand: ['customer', 'payment_method'],
    });

    console.log('Payment record found:', {
      paymentId: existingPayment.id,
      currentStatus: existingPayment.status,
      hasBooking: !!existingPayment.bookings,
      bookingId: existingPayment.bookings?.id,
    });

    // Extract billing details - use provided email if available (from contact form)
    const extractedDetails = this.extractBillingDetails(fullPaymentIntent);
    
    // Use provided email from frontend if available, otherwise use extracted email
    const email = providedEmail || extractedDetails.email;
    const name = extractedDetails.name;
    const phone = extractedDetails.phone;
    const address = extractedDetails.address;
    
    if (providedEmail) {
      console.log('📧 Using email from form:', providedEmail);
    } else if (extractedDetails.email) {
      console.log('📧 Using email from Stripe:', extractedDetails.email);
    } else {
      console.log('📧 No email available');
    }

    // Check if already processed
    if (existingPayment.status === PaymentStatus.Completed) {
      console.log('Payment already processed, checking if email needs to be sent:', {
        paymentIntentId,
        paymentId: existingPayment.id,
        existingStatus: existingPayment.status,
        completedAt: existingPayment.completed_at,
        hasBooking: !!existingPayment.bookings,
        hasEmail: !!email,
      });
      
      // Still try to send email if booking exists and email is available
      if (existingPayment.bookings && email) {
        try {
          await this.sendBookingConfirmationEmail(existingPayment.bookings.id, email);
        } catch (emailError) {
          console.error('Failed to send email for already processed payment:', emailError);
        }
      }
      
      return { alreadyProcessed: true, booking: existingPayment.bookings };
    }

    // Check if booking exists
    if (existingPayment.bookings) {
      const bookingStatus = existingPayment.bookings.status;
      if (bookingStatus === BookingStatus.Confirmed || bookingStatus === BookingStatus.Active) {
        console.log('Booking already confirmed, skipping duplicate processing:', {
          bookingId: existingPayment.bookings.id,
          bookingStatus: bookingStatus
        });
        
        // Get the correct customer user_id - DON'T use existingPayment.user_id which might be wrong
        let userId: string | null = null;
        try {
          const { getCurrentUser } = await import('@/lib/supabase-auth');
          const supabaseUser = await getCurrentUser();
          if (supabaseUser?.email) {
            const authenticatedUser = await prisma.public_users.findUnique({
              where: { email: supabaseUser.email },
            });
            if (authenticatedUser) {
              userId = authenticatedUser.id;
            }
          }
        } catch {
          // Ignore auth errors - guest booking flow
        }

        // If still no userId, try to get/create from email
        // Never use existingPayment.user_id as it might be distributor's ID
        if (!userId && email) {
          userId = await this.getOrCreateGuestUser(null, email, name, phone, address);
        }

        // Update payment with correct user_id if it's different
        const currentStatus = existingPayment.status as PaymentStatus | null;
        const needsUpdate = (userId && existingPayment.user_id !== userId) || (currentStatus !== PaymentStatus.Completed);
        
        if (needsUpdate) {
          await prisma.payments.update({
            where: { id: existingPayment.id },
            data: {
              ...(userId && existingPayment.user_id !== userId ? { user_id: userId } : {}),
              ...(currentStatus !== PaymentStatus.Completed ? {
                status: PaymentStatus.Completed,
                completed_at: new Date(),
              } : {}),
            },
          });
          if (userId && existingPayment.user_id !== userId) {
            console.log('✅ Updated payment user_id to customer:', userId);
          }
        }
        
        return { alreadyConfirmed: true, booking: existingPayment.bookings };
      }
    }

    // Extract booking metadata using BookingService
    const bookingService = new BookingService();
    let bookingMetadata;
    try {
      bookingMetadata = bookingService.extractBookingMetadata(
        fullPaymentIntent.metadata,
        fullPaymentIntent.amount
      );
    } catch (metadataError) {
      console.error('Missing booking details in payment metadata:', {
        paymentIntentId: fullPaymentIntent.id,
        allMetadata: fullPaymentIntent.metadata,
      });
      // Still update payment status even if booking can't be created
      await prisma.payments.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.Completed,
          completed_at: new Date(),
        },
      });
      throw metadataError;
    }

    console.log('Booking metadata extracted:', {
      boxId: bookingMetadata.boxId,
      startDate: bookingMetadata.startDate,
      endDate: bookingMetadata.endDate,
      startTime: bookingMetadata.startTime,
      endTime: bookingMetadata.endTime,
      amountStr: bookingMetadata.amountStr,
    });

    // Get the correct customer user_id (NOT from existingPayment.user_id which might be wrong)
    // Always determine customer user_id from authenticated user or email, not from payment
    let userId: string | null = null;
    
    // First, try to get authenticated user (if customer is logged in)
    try {
      const { getCurrentUser } = await import('@/lib/supabase-auth');
      const supabaseUser = await getCurrentUser();
      if (supabaseUser?.email) {
        const authenticatedUser = await prisma.public_users.findUnique({
          where: { email: supabaseUser.email },
        });
        if (authenticatedUser) {
          userId = authenticatedUser.id;
          console.log('✅ Using authenticated customer user:', authenticatedUser.id, authenticatedUser.email);
        }
      }
    } catch (authError) {
      console.log('No authenticated user or error checking auth:', authError instanceof Error ? authError.message : String(authError));
    }

    // If no authenticated user, get or create guest user from email
    // Don't use existingPayment.user_id as it might be distributor's ID
    if (!userId) {
      if (!email) {
        console.error('❌ No email provided and no authenticated user - cannot create guest user');
        throw new Error('Email is required to create guest user for booking');
      }
      
      console.log('👤 Creating/finding guest user with email:', email);
      try {
        userId = await this.getOrCreateGuestUser(
          null, // Don't use existingPayment.user_id - always create/find from email
          email,
          name,
          phone,
          address
        );
        if (!userId) {
          console.error('❌ Failed to create/find guest user - getOrCreateGuestUser returned null');
          throw new Error('Failed to create or find guest user');
        }
        console.log('✅ Guest user created/found:', userId);
      } catch (userError) {
        console.error('❌ Error creating guest user:', userError instanceof Error ? userError.message : String(userError));
        console.error('Error stack:', userError instanceof Error ? userError.stack : undefined);
        throw new Error(`Failed to create guest user: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    if (!userId) {
      throw new Error('User ID is required to create booking');
    }

    console.log('🔑 Customer user ID for payment:', userId);

    // Update payment with the correct user_id (the customer paying, not the distributor)
    // Always update to ensure payment is linked to the correct user
    await prisma.payments.update({
      where: { id: existingPayment.id },
      data: {
        user_id: userId,
        status: PaymentStatus.Completed,
        completed_at: new Date(),
      },
    });
    console.log('✅ Updated payment user_id to customer:', userId);

    // Create booking using BookingService
    const booking = await bookingService.createBooking(
      existingPayment.id,
      userId,
      bookingMetadata
    );

    // Create notifications for both distributor and customer
    const notificationService = new NotificationService();
    
    // Create notification for the distributor (location owner) about the new booking
    try {
      await notificationService.createBookingNotificationForDistributor(booking.id, BookingStatus.Confirmed);
      console.log('🔔 Booking notification created for distributor');
    } catch (notificationError) {
      console.error('❌ Failed to create booking notification for distributor:', notificationError instanceof Error ? notificationError.message : String(notificationError));
      // Don't throw - notification failure shouldn't break booking creation
    }

    // Create notification for the customer about their booking (only if customer user_id exists)
    if (userId) {
      try {
        console.log('🔔 Creating customer notification with user_id:', userId, 'for booking:', booking.id);
        await notificationService.createBookingNotificationForCustomer(booking.id, userId, BookingStatus.Confirmed);
        console.log('✅ Booking notification created for customer with user_id:', userId);
      } catch (notificationError) {
        console.error('❌ Failed to create booking notification for customer:', notificationError instanceof Error ? notificationError.message : String(notificationError));
        console.error('Customer user_id that failed:', userId);
        // Don't throw - notification failure shouldn't break booking creation
      }
    } else {
      console.warn('⚠️ No userId found - skipping customer notification creation');
    }

    // Send booking confirmation email if email is available
    if (email) {
      try {
        await this.sendBookingConfirmationEmail(booking.id, email);
        console.log('📧 Email sent to:', email);
      } catch (emailError) {
        console.error('📧 Failed to send email:', emailError instanceof Error ? emailError.message : String(emailError));
      }
    } else {
      console.log('📧 No email - skipping email send');
    }

    return { booking };
  }


  /**
   * Send booking confirmation email (extracted to reusable method)
   */
  private async sendBookingConfirmationEmail(bookingId: string, email: string): Promise<void> {
    // Fetch booking details with box, stand, and location information
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
      throw new Error(`Booking ${bookingId} not found`);
    }

    const box = bookingWithDetails.boxes;
    const stand = box.stands;
    const location = stand.locations;

    // Format dates (DD/MM/YYYY format)
    const formatDate = (date: Date): string => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Format time (HH:MM format)
    const formatTime = (date: Date): string => {
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const emailService = new EmailService();
    const emailResult = await emailService.sendBookingConfirmation({
      to: email,
      boxNumber: box.display_id,
      standNumber: stand.display_id,
      locationName: location.name,
      startDate: formatDate(bookingWithDetails.start_date),
      endDate: formatDate(bookingWithDetails.end_date),
      startTime: formatTime(bookingWithDetails.start_date),
      endTime: formatTime(bookingWithDetails.end_date),
      unlockCode: String(bookingWithDetails.lock_pin),
      padlockCode: String(bookingWithDetails.lock_pin), // Using same code for now, can be updated later
      helpUrl: 'https://ixtarent.com/help',
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Email sending failed');
    }
  }
}

// Export singleton instance and convenience functions for backward compatibility
let paymentProcessingServiceInstance: PaymentProcessingService | null = null;

function getPaymentProcessingService(): PaymentProcessingService {
  if (!paymentProcessingServiceInstance) {
    paymentProcessingServiceInstance = new PaymentProcessingService();
  }
  return paymentProcessingServiceInstance;
}

// Export convenience functions for backward compatibility
export function getStripe(): Stripe {
  return getPaymentProcessingService().getStripe();
}

export async function processPaymentSuccess(paymentIntentId: string, providedEmail?: string | null) {
  return getPaymentProcessingService().processPaymentSuccess(paymentIntentId, providedEmail);
}

