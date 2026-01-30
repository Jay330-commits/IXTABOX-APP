import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { ExtensionRequestService } from '@/services/bookings/ExtensionRequestService';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';

/**
 * Request a booking extension
 * POST /api/bookings/[bookingId]/extend
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

    // Calculate extension cost first
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

    // Validate amount before creating payment intent
    if (!calculation.additionalCost || calculation.additionalCost <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid extension amount',
          message: 'Extension cost must be greater than zero'
        },
        { status: 400 }
      );
    }

    // Create payment intent for the extension
    try {
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
        return NextResponse.json(
          { error: 'Failed to create payment intent', message: 'Payment service did not return a valid payment intent' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: calculation.additionalCost,
        additionalDays: calculation.additionalDays,
      });
    } catch (paymentError) {
      console.error('Payment intent creation error:', paymentError);
      return NextResponse.json(
        {
          error: 'Failed to create payment intent',
          message: paymentError instanceof Error ? paymentError.message : 'Unknown payment error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error requesting booking extension:', error);
    return NextResponse.json(
      {
        error: 'Failed to request extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get extension calculation info (pre-check)
 * GET /api/bookings/[bookingId]/extend
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const newEndDate = searchParams.get('newEndDate');
    const newEndTime = searchParams.get('newEndTime');

    if (!newEndDate || !newEndTime) {
      return NextResponse.json(
        { error: 'New end date and time are required' },
        { status: 400 }
      );
    }

    // Calculate extension info
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

    return NextResponse.json({
      canExtend: calculation.canExtend,
      additionalDays: calculation.additionalDays,
      additionalCost: calculation.additionalCost,
      pricePerDay: calculation.pricePerDay,
      reason: calculation.reason,
    });
  } catch (error) {
    console.error('Error calculating extension:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
