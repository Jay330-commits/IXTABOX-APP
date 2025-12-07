import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';
import { prisma } from '@/lib/prisma/prisma';

/**
 * Secure API endpoint to fetch payment details by payment intent ID
 * Returns booking details stored in Stripe metadata (server-side only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentIntentId: string }> }
) {
  try {
    const { paymentIntentId } = await params;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    const paymentService = new PaymentProcessingService();

    // Run database query and Stripe API call in parallel
    const [payment, paymentIntent] = await Promise.all([
      prisma.payments.findUnique({
        where: {
          stripe_payment_intent_id: paymentIntentId,
        },
        include: {
          bookings: true, // Include booking if it exists
        },
      }),
      paymentService.retrievePaymentIntent(paymentIntentId),
    ]);

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Extract booking details from Stripe metadata (fallback if booking doesn't exist yet)
    // Note: Booking is created AFTER payment succeeds in webhook, so we use metadata here
    const bookingDetails = {
      locationId: paymentIntent.metadata.locationId,
      boxId: paymentIntent.metadata.boxId,
      standId: paymentIntent.metadata.standId,
      modelId: paymentIntent.metadata.modelId,
      startDate: paymentIntent.metadata.startDate,
      endDate: paymentIntent.metadata.endDate,
      startTime: paymentIntent.metadata.startTime,
      endTime: paymentIntent.metadata.endTime,
      locationDisplayId: paymentIntent.metadata.locationDisplayId || paymentIntent.metadata.locationId,
      compartment: paymentIntent.metadata.compartment || null,
    };

    // If booking exists in database, use that; otherwise use metadata
    const booking = payment.bookings 
      ? {
          id: payment.bookings.id,
          lockPin: payment.bookings.lock_pin, // Include PIN from database
          lock_pin: payment.bookings.lock_pin, // Also include with underscore for compatibility
          ...bookingDetails,
        }
      : bookingDetails;

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
      },
      booking: booking,
      bookingExists: !!payment.bookings, // Flag to indicate if booking exists in DB
      payment: {
        id: payment.id,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}
