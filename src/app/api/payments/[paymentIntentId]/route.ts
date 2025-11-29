import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import Stripe from 'stripe';

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

    // Fetch payment from database and Stripe API in parallel for better performance
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    // Run database query and Stripe API call in parallel
    const [payment, paymentIntent] = await Promise.all([
      prisma.payments.findUnique({
        where: {
          stripe_payment_intent_id: paymentIntentId,
        },
      }),
      stripe.paymentIntents.retrieve(paymentIntentId),
    ]);

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Extract booking details from metadata
    const bookingDetails = {
      locationId: paymentIntent.metadata.locationId,
      boxId: paymentIntent.metadata.boxId,
      standId: paymentIntent.metadata.standId,
      modelId: paymentIntent.metadata.modelId,
      startDate: paymentIntent.metadata.startDate,
      endDate: paymentIntent.metadata.endDate,
      startTime: paymentIntent.metadata.startTime,
      endTime: paymentIntent.metadata.endTime,
    };

    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
      },
      booking: bookingDetails,
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

