import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { getCurrentUser } from '@/lib/supabase-auth';
import { BookingStatus } from '@prisma/client';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // Verify user session using the same method as /api/auth/me
    const supabaseUser = await getCurrentUser();
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to view booking information' },
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

    // Get payment intent from Stripe to extract charge ID (actual payment ID)
    const { PaymentProcessingService } = await import('@/services/bookings/PaymentProcessingService');
    const paymentService = new PaymentProcessingService();
    const paymentIntent = await paymentService.retrievePaymentIntent(paymentIntentId);
    
    // Get the charge ID from the payment intent (this is the actual payment ID)
    const chargeId = paymentIntent.latest_charge;
    if (!chargeId) {
      return NextResponse.json(
        { error: 'Payment not completed yet' },
        { status: 404 }
      );
    }

    // Extract charge ID (could be string or expanded object)
    const actualChargeId = typeof chargeId === 'string' ? chargeId : (chargeId as Stripe.Charge).id;

    // Find payment by charge ID (the actual payment ID)
    const payment = await prisma.payments.findUnique({
      where: {
        charge_id: actualChargeId,
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

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (!payment.bookings) {
      return NextResponse.json(
        { error: 'Booking not found for this payment' },
        { status: 404 }
      );
    }

    const booking = payment.bookings;
    // Type assertion needed because Prisma's nested include types don't always include all fields
    type BookingWithStatus = typeof booking & { status: BookingStatus | null };

    return NextResponse.json({
      booking: {
        id: booking.id,
        boxId: booking.box_id,
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        totalAmount: booking.total_amount.toString(),
        status: (booking as BookingWithStatus).status ?? BookingStatus.Pending,
      },
      payment: {
        id: payment.id,
        amount: payment.amount.toString(),
        currency: payment.currency,
        chargeId: payment.charge_id,
      },
    });
  } catch (error) {
    console.error('Error fetching booking by payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking information' },
      { status: 500 }
    );
  }
}

