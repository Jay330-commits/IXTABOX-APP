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
    const payment = await prisma.payment.findUnique({
      where: {
        stripePaymentIntentId: paymentIntentId,
      },
      include: {
        booking: {
          include: {
            stand: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            customer: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Verify the payment belongs to the current user (if booking exists)
    if (payment?.booking?.customer?.user?.email && payment.booking.customer.user.email !== supabaseUser.email) {
      return NextResponse.json(
        { error: 'Unauthorized - This payment does not belong to you' },
        { status: 403 }
      );
    }

    // Return payment and booking information
    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      },
      booking: payment?.booking ? {
        id: payment.booking.id,
        standId: payment.booking.standId,
        standName: payment.booking.stand.name,
        location: payment.booking.stand.location,
        startDate: payment.booking.startDate.toISOString(),
        endDate: payment.booking.endDate.toISOString(),
        totalAmount: payment.booking.totalAmount.toString(),
        status: payment.booking.status,
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


