import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { UserService } from '@/services/UserService';

/**
 * Get Stripe client instance
 * Lazy initialization to avoid build-time errors
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
 * Stripe Webhook Handler
 * Handles payment confirmation and automatically generates unlock codes
 * POST /api/webhooks/stripe
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Validate payment intent ID exists - no payment record without valid intent ID
      if (!paymentIntent || !paymentIntent.id) {
        console.error('Invalid payment intent: Missing payment intent ID');
        return NextResponse.json({ received: true });
      }

      const stripe = getStripe();

      try {
        // Fetch full payment intent details to get billing information
        // Cast to Stripe.PaymentIntent because stripe.paymentIntents.retrieve
        // returns a Stripe.Response<Stripe.PaymentIntent> wrapper in newer SDKs
        const fullPaymentIntent = (await stripe.paymentIntents.retrieve(paymentIntent.id, {
          expand: ['customer', 'payment_method'],
        })) as Stripe.PaymentIntent;

        // Extract billing details from payment method (preferred source of truth)
        const paymentMethod = fullPaymentIntent.payment_method as
          | Stripe.PaymentMethod
          | string
          | null
          | undefined;

        const billingDetails = typeof paymentMethod === 'object' && paymentMethod
          ? paymentMethod.billing_details
          : null;

        const email = billingDetails?.email || 
                     fullPaymentIntent.receipt_email ||
                     fullPaymentIntent.metadata?.customerEmail ||
                     null;
        
        const name = billingDetails?.name || 
                    fullPaymentIntent.metadata?.customerName ||
                    'Guest User';

        const phone = billingDetails?.phone || 
                     fullPaymentIntent.metadata?.customerPhone ||
                     null;

        // Extract address from billing details, normalizing nulls to undefined
        const address = billingDetails?.address
          ? {
              line1: billingDetails.address.line1 ?? undefined,
              line2: billingDetails.address.line2 ?? undefined,
              city: billingDetails.address.city ?? undefined,
              state: billingDetails.address.state ?? undefined,
              postal_code: billingDetails.address.postal_code ?? undefined,
              country: billingDetails.address.country ?? undefined,
            }
          : undefined;

        // Find existing payment record
        const existingPayment = await prisma.payments.findUnique({
          where: {
            stripe_payment_intent_id: paymentIntent.id,
          },
        });

        if (!existingPayment) {
          console.error('Payment record not found for payment intent:', paymentIntent.id);
          return NextResponse.json({ received: true });
        }

        // Create or find guest user if email is available
        let userId: string | null = existingPayment.user_id || null;

        if (!userId && email) {
          try {
            const userService = new UserService();
            const guestUser = await userService.findOrCreateGuestUser({
              email,
              fullName: name,
              phone: phone || undefined,
              billingAddress: address || undefined,
            });
            userId = guestUser.id;
          } catch (userError) {
            console.error('Failed to create guest user:', userError);
            // Continue without user_id if user creation fails
          }
        }

        // Update payment with user_id and status, and update booking status
        await prisma.$transaction(async (tx) => {
          // Update payment status
          await tx.payments.update({
            where: {
              id: existingPayment.id,
            },
            data: {
              user_id: userId,
              status: PaymentStatus.Completed,
              completed_at: new Date(),
            },
          });

          // Update booking status when payment succeeds
          // Check if booking is in the future or active
          const booking = await tx.bookings.findFirst({
            where: {
              payment_id: existingPayment.id,
            },
          });

          if (booking) {
            const now = new Date();
            const bookingStart = new Date(booking.start_date);
            // Check if booking start time has already passed - if so, set to Active immediately
            // Otherwise, set to Pending (will be activated by trigger when time arrives)
            const newStatus = bookingStart <= now ? BookingStatus.Active : BookingStatus.Pending;
            
            await tx.bookings.update({
              where: {
                id: booking.id,
              },
              data: {
                status: newStatus,
              },
            });
          }
        });
      } catch (dbError) {
        console.error('Failed to process payment success in database:', dbError);
        // Continue even if DB update fails
      }
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Validate payment intent ID exists - no processing without valid intent ID
      if (!paymentIntent || !paymentIntent.id) {
        console.error('Invalid payment intent: Missing payment intent ID');
        return NextResponse.json({ received: true });
      }

      // Update payment status to failed in database using Prisma
      // Only update if payment record exists (created when intent was created)
      try {
        await prisma.payments.updateMany({
          where: {
            stripe_payment_intent_id: paymentIntent.id,
          },
          data: {
            status: PaymentStatus.Failed,
          },
        });
      } catch (dbError) {
        console.error('Failed to update payment status to failed in database:', dbError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

