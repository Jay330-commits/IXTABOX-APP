import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { ExtensionRequestService } from '@/services/bookings/ExtensionRequestService';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';

/**
 * Create payment session for booking extension
 * POST /api/bookings/[bookingId]/extend/payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { prisma } = await import('@/lib/prisma/prisma');
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { newEndDate, newEndTime } = body;

    if (!newEndDate || !newEndTime) {
      return NextResponse.json(
        { error: 'New end date and time are required' },
        { status: 400 }
      );
    }

    // Calculate extension cost
    const extensionService = new ExtensionRequestService();
    const calculation = await extensionService.calculateExtension(
      bookingId,
      user.id,
      newEndDate,
      newEndTime
    );

    if (!calculation.canExtend) {
      return NextResponse.json(
        {
          error: calculation.error || 'Cannot extend booking',
          reason: calculation.reason,
        },
        { status: 400 }
      );
    }

    // Create payment intent for the extension
    const paymentService = new PaymentProcessingService();
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: calculation.additionalCost,
      currency: 'sek',
      metadata: {
        type: 'booking_extension',
        bookingId,
        newEndDate,
        newEndTime,
        additionalDays: calculation.additionalDays.toString(),
        pricePerDay: calculation.pricePerDay.toString(),
        customerEmail: supabaseUser.email || '',
      },
    });

    if (!paymentIntent || !paymentIntent.id) {
      throw new Error('Failed to create payment intent');
    }

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: calculation.additionalCost,
      additionalDays: calculation.additionalDays,
    });
  } catch (error) {
    console.error('Error creating extension payment session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
