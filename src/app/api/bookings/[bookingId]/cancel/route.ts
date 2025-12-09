import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { CancelBookingService } from '@/services/bookings/CancelBookingService';

/**
 * Cancel a booking
 * POST /api/bookings/[bookingId]/cancel
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

    // Check if booking can be cancelled (pre-check)
    const cancelService = new CancelBookingService();
    const canCancelResult = await cancelService.canCancelBooking(bookingId, user.id);

    if (!canCancelResult.canCancel) {
      return NextResponse.json(
        {
          error: canCancelResult.error || 'Booking cannot be cancelled',
          refundCalculation: canCancelResult.refundCalculation,
        },
        { status: 400 }
      );
    }

    // Process cancellation
    const cancellationResult = await cancelService.cancelBooking(bookingId, user.id);

    if (!cancellationResult.success) {
      return NextResponse.json(
        {
          error: cancellationResult.error || 'Failed to cancel booking',
          refundCalculation: {
            refundAmount: cancellationResult.refundAmount,
            refundPercentage: cancellationResult.refundPercentage,
            reason: cancellationResult.reason,
            eligible: false,
            transactionFee: 0,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      cancellation: cancellationResult,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a booking can be cancelled (pre-check)
 * GET /api/bookings/[bookingId]/cancel
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

    // Check if booking can be cancelled
    const cancelService = new CancelBookingService();
    const canCancelResult = await cancelService.canCancelBooking(bookingId, user.id);

    return NextResponse.json({
      canCancel: canCancelResult.canCancel,
      refundCalculation: canCancelResult.refundCalculation,
      error: canCancelResult.error,
    });
  } catch (error) {
    console.error('Error checking booking cancellation:', error);
    return NextResponse.json(
      {
        error: 'Failed to check booking cancellation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

