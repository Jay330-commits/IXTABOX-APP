import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { getCurrentUser } from '@/lib/supabase-auth';
import { BookingStatus } from '@prisma/client';

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

    // Find payment by Stripe payment intent ID
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
        status: payment.status,
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

