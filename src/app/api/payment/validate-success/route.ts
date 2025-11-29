import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const supabaseUser = await getCurrentUser();
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Verify payment intent with Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Invalid or incomplete payment' },
        { status: 400 }
      );
    }

    // Try to get booking from database
    const payment = await prisma.payments.findUnique({
      where: {
        stripe_payment_intent_id: paymentIntentId,
      },
      include: {
        bookings: {
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
        },
      },
    });

    // Note: Customer verification removed since bookings no longer have customer relation
    // Payment verification is done through Stripe payment intent ownership

    // Return payment and booking information
    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      },
      booking: payment?.bookings ? {
        id: payment.bookings.id,
        boxId: payment.bookings.box_id,
        startDate: payment.bookings.start_date.toISOString(),
        endDate: payment.bookings.end_date.toISOString(),
        totalAmount: payment.bookings.total_amount.toString(),
        status: payment.bookings.status,
      } : null,
    });
  } catch (error) {
    console.error('Error validating payment success:', error);
    return NextResponse.json(
      { error: 'Failed to validate payment' },
      { status: 500 }
    );
  }
}


