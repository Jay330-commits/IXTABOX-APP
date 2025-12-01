import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { UserService } from './UserService';
import { IglooService } from './IglooService';

/**
 * Get Stripe client instance
 */
function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

/**
 * Extract billing details from payment intent
 */
export function extractBillingDetails(paymentIntent: Stripe.PaymentIntent) {
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
export async function findPaymentRecord(paymentIntentId: string) {
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
export async function getOrCreateGuestUser(
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
 * Extract and validate booking metadata
 */
export function extractBookingMetadata(
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

/**
 * Create booking record in database
 */
export async function createBooking(
  paymentId: string,
  userId: string | null,
  bookingData: {
    boxId: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    amountStr: string;
  }
) {
  const { boxId, startDate, endDate, startTime, endTime, amountStr } = bookingData;

  return await prisma.$transaction(async (tx) => {
    // Update payment status
    await tx.payments.update({
      where: { id: paymentId },
      data: {
        user_id: userId,
        status: PaymentStatus.Completed,
        completed_at: new Date(),
      },
    });

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

    // Determine booking status based on start date
    // If booking starts in the future → Pending
    // If booking starts now or in the past → Active
    const now = new Date();
    const bookingStatus = start > now ? BookingStatus.Pending : BookingStatus.Active;
    
    console.log('📅 Booking status determined:', {
      startDate: start.toISOString(),
      now: now.toISOString(),
      isFuture: start > now,
      status: bookingStatus,
    });

    // Generate lock PIN using Igloo API (mandatory)
    // Use the shared function from IglooService
    let lockPin: number;
    try {
      const iglooService = new IglooService();
      lockPin = await iglooService.generateAndParseBookingPin(start, end, 'Customer');
    } catch (pinError) {
      console.error('❌ Failed to generate lock PIN:', {
        error: pinError,
        message: pinError instanceof Error ? pinError.message : String(pinError),
      });
      // PIN is mandatory - fail booking creation if PIN generation fails
      throw new Error(`Failed to generate mandatory lock PIN: ${pinError instanceof Error ? pinError.message : String(pinError)}`);
    }

    // Create booking with PIN
    try {
      const booking = await tx.bookings.create({
        data: {
          box_id: boxId,
          payment_id: paymentId,
          start_date: start,
          end_date: end,
          total_amount: amountStr,
          status: bookingStatus,
          lock_pin: lockPin, // Set the mandatory PIN
        },
      });

      console.log('✅ Booking created after payment succeeded:', {
        bookingId: booking.id,
        boxId,
        paymentId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: bookingStatus,
        lockPin: lockPin,
      });

      return booking;
    } catch (dbError) {
      console.error('❌ Failed to create booking in database:', {
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
 * Process successful payment and create booking
 * This is the main function used by both webhooks and local payment success
 */
export async function processPaymentSuccess(paymentIntentId: string) {
  const stripe = getStripe();
  
  // Fetch full payment intent with billing details
  let fullPaymentIntent: Stripe.PaymentIntent;
  try {
    fullPaymentIntent = (await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['customer', 'payment_method'],
    })) as Stripe.PaymentIntent;
    console.log('✅ Payment intent retrieved from Stripe:', {
      id: fullPaymentIntent.id,
      status: fullPaymentIntent.status,
      amount: fullPaymentIntent.amount,
    });
  } catch (retrieveError) {
    console.error('❌ Failed to retrieve payment intent from Stripe:', {
      paymentIntentId,
      error: retrieveError instanceof Error ? retrieveError.message : String(retrieveError),
    });
    throw retrieveError;
  }

  // Extract billing details
  const { email, name, phone, address } = extractBillingDetails(fullPaymentIntent);

  // Find payment record
  let existingPayment;
  try {
    existingPayment = await findPaymentRecord(paymentIntentId);
    console.log('✅ Payment record found:', {
      paymentId: existingPayment.id,
      currentStatus: existingPayment.status,
      hasBooking: !!existingPayment.bookings,
      bookingId: existingPayment.bookings?.id,
    });
  } catch (findError) {
    console.error('❌ Payment record not found in database:', {
      paymentIntentId,
      error: findError instanceof Error ? findError.message : String(findError),
    });
    throw findError;
  }

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

  // Extract booking metadata
  let bookingMetadata;
  try {
    bookingMetadata = extractBookingMetadata(
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

  console.log('✅ Booking metadata extracted:', {
    boxId: bookingMetadata.boxId,
    startDate: bookingMetadata.startDate,
    endDate: bookingMetadata.endDate,
    startTime: bookingMetadata.startTime,
    endTime: bookingMetadata.endTime,
    amountStr: bookingMetadata.amountStr,
  });

  // Get or create guest user
  const userId = await getOrCreateGuestUser(
    existingPayment.user_id,
    email,
    name,
    phone,
    address
  );

  // Create booking
  const booking = await createBooking(
    existingPayment.id,
    userId,
    bookingMetadata
  );

  return { booking };
}

