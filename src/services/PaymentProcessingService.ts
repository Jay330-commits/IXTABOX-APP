import 'server-only';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { UserService } from './UserService';
import { BookingService } from './BookingService';


export class PaymentProcessingService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  /**
   * Get Stripe client instance
   */
  getStripe(): Stripe {
    return this.stripe;
  }

  /**
   * Create a payment intent with booking metadata
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency || 'sek',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: params.metadata,
      });

      console.log('Stripe payment intent created:', paymentIntent.id);
      return paymentIntent;
    } catch (stripeError) {
      console.error('Stripe API error:', {
        error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
        stack: stripeError instanceof Error ? stripeError.stack : undefined,
        type: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : undefined,
        code: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : undefined,
      });
      throw new Error(`Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'}`);
    }
  }

  /**
   * Retrieve payment intent from Stripe
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
    options?: { expand?: string[] }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        options || {}
      );
      return paymentIntent;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null) {
        const errWithCode = error as { code?: unknown };
        if (errWithCode.code === 'resource_missing') {
          throw new Error('Payment intent not found in Stripe');
        }
      }
      console.error('Error retrieving payment intent from Stripe:', error);
      throw error;
    }
  }

  /**
   * Verify payment intent exists and has valid status
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
    try {
      const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
      return {
        exists: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          livemode: paymentIntent.livemode,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Payment intent not found in Stripe') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Update payment intent metadata
   */
  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, {
        metadata,
      });
      console.log('Payment intent metadata updated:', paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Failed to update payment intent metadata:', error);
      throw error;
    }
  }

  /**
   * Extract billing details from payment intent
   */
  extractBillingDetails(paymentIntent: Stripe.PaymentIntent) {
    const paymentMethod = paymentIntent.payment_method as
      | Stripe.PaymentMethod
      | string
      | null
      | undefined;

    const billingDetails = typeof paymentMethod === 'object' && paymentMethod
      ? paymentMethod.billing_details
      : null;

    const email = billingDetails?.email || 
                 paymentIntent.receipt_email ||
                 paymentIntent.metadata?.customerEmail ||
                 null;
    
    const name = billingDetails?.name || 
                paymentIntent.metadata?.customerName ||
                'Guest User';

    const phone = billingDetails?.phone || 
                 paymentIntent.metadata?.customerPhone ||
                 null;

    const address = billingDetails?.address || null;

    return { email, name, phone, address };
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
   */
  async processPaymentSuccess(paymentIntentId: string) {
    // Fetch payment record and Stripe payment intent in parallel for better performance
    const [existingPayment, fullPaymentIntent] = await Promise.all([
      this.findPaymentRecord(paymentIntentId).catch(findError => {
        console.error('Payment record not found in database:', {
          paymentIntentId,
          error: findError instanceof Error ? findError.message : String(findError),
        });
        throw findError;
      }),
      this.retrievePaymentIntent(paymentIntentId, {
        expand: ['customer', 'payment_method'],
      }).then(intent => {
        console.log('Payment intent retrieved from Stripe:', {
          id: intent.id,
          status: intent.status,
          amount: intent.amount,
        });
        return intent;
      }).catch(retrieveError => {
        console.error('Failed to retrieve payment intent from Stripe:', {
          paymentIntentId,
          error: retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
        });
        throw retrieveError;
      })
    ]);

    console.log('Payment record found:', {
      paymentId: existingPayment.id,
      currentStatus: existingPayment.status,
      hasBooking: !!existingPayment.bookings,
      bookingId: existingPayment.bookings?.id,
    });

    // Extract billing details
    const { email, name, phone, address } = this.extractBillingDetails(fullPaymentIntent);

    // Check if already processed
    if (existingPayment.status === PaymentStatus.Completed) {
      console.log('Payment already processed, skipping duplicate processing:', {
        paymentIntentId,
        paymentId: existingPayment.id,
        existingStatus: existingPayment.status,
        completedAt: existingPayment.completed_at
      });
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
        // Still update payment status if it's not completed yet
        const currentStatus = existingPayment.status as PaymentStatus | null;
        if (currentStatus !== PaymentStatus.Completed) {
          await prisma.payments.update({
            where: { id: existingPayment.id },
            data: {
              status: PaymentStatus.Completed,
              completed_at: new Date(),
            },
          });
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

    // Get or create guest user
    const userId = await this.getOrCreateGuestUser(
      existingPayment.user_id,
      email,
      name,
      phone,
      address
    );

    // Create booking using BookingService
    const booking = await bookingService.createBooking(
      existingPayment.id,
      userId,
      bookingMetadata
    );

    return { booking };
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

export async function processPaymentSuccess(paymentIntentId: string) {
  return getPaymentProcessingService().processPaymentSuccess(paymentIntentId);
}

