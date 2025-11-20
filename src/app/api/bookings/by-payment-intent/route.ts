import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { getCurrentUser } from '@/lib/supabase-auth';

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
                    fullName: true,
                    email: true,
                    phone: true,
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

    if (!payment.booking) {
      return NextResponse.json(
        { error: 'Booking not found for this payment' },
        { status: 404 }
      );
    }

    const booking = payment.booking;

    return NextResponse.json({
      booking: {
        id: booking.id,
        standId: booking.standId,
        standName: booking.stand.name,
        location: booking.stand.location,
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
        totalAmount: booking.totalAmount.toString(),
        status: booking.status,
        customer: {
          name: booking.customer.user.fullName,
          email: booking.customer.user.email,
          phone: booking.customer.user.phone,
        },
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

