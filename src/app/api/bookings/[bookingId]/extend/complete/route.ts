import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { ExtensionRequestService } from '@/services/bookings/ExtensionRequestService';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';
import { PaymentStatus } from '@prisma/client';

/**
 * Complete booking extension after payment
 * POST /api/bookings/[bookingId]/extend/complete
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
    const { paymentIntentId, newEndDate, newEndTime } = body;

    if (!paymentIntentId || !newEndDate || !newEndTime) {
      return NextResponse.json(
        { error: 'Payment intent ID, new end date and time are required' },
        { status: 400 }
      );
    }

    // Verify payment succeeded
    const paymentService = new PaymentProcessingService();
    const paymentIntent = await paymentService.retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been completed' },
        { status: 400 }
      );
    }

    // Verify metadata matches
    if (paymentIntent.metadata.type !== 'booking_extension' || 
        paymentIntent.metadata.bookingId !== bookingId) {
      return NextResponse.json(
        { error: 'Invalid payment intent for this extension' },
        { status: 400 }
      );
    }

    // Create payment record for the extension FIRST (before processing extension)
    const chargeId = paymentIntent.latest_charge 
      ? (typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : (paymentIntent.latest_charge as any).id)
      : null;

    let extensionPaymentId: string | null = null;
    
    if (chargeId) {
      const additionalCost = (paymentIntent.amount / 100).toFixed(2); // Convert from cents
      
      // Check if payment record already exists (race condition protection)
      let extensionPayment = await prisma.payments.findFirst({
        where: { charge_id: chargeId },
      });

      if (!extensionPayment) {
        // Create payment record for extension
        extensionPayment = await prisma.payments.create({
          data: {
            amount: additionalCost,
            currency: 'SEK',
            status: PaymentStatus.Completed,
            charge_id: chargeId,
            user_id: user.id,
            completed_at: new Date(),
          },
        });
      }
      
      extensionPaymentId = extensionPayment.id;
    }

    // Process extension request (reassign conflicting bookings and update end date)
    // Now we can pass the payment ID so it's linked immediately
    console.log('[Extend Complete] Processing extension:', {
      bookingId,
      userId: user.id,
      newEndDate,
      newEndTime,
      extensionPaymentId,
    });

    const extensionService = new ExtensionRequestService();
    let result;
    try {
      result = await extensionService.requestExtension(
        bookingId,
        user.id,
        newEndDate,
        newEndTime,
        extensionPaymentId // Pass payment ID so extension record is created with it
      );
    } catch (extensionError) {
      console.error('[Extend Complete] Extension service error:', extensionError);
      return NextResponse.json(
        {
          error: 'Failed to process extension',
          message: extensionError instanceof Error ? extensionError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.error('[Extend Complete] Extension failed:', result.error, result.reason);
      return NextResponse.json(
        {
          error: result.error || 'Failed to process extension',
          reason: result.reason,
        },
        { status: 400 }
      );
    }

    console.log('[Extend Complete] Extension processed successfully');

    // Fetch updated booking to get new lock PIN and end date
    let updatedBooking = null;
    try {
      updatedBooking = await prisma.bookings.findUnique({
        where: { id: bookingId },
        include: {
          boxes: {
            include: {
              stands: {
                include: {
                  locations: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (fetchError) {
      console.error('[Extend Complete] Error fetching updated booking:', fetchError);
      // Continue even if fetch fails - extension was successful
    }

    return NextResponse.json({
      success: true,
      message: 'Booking extended successfully',
      extensionRequest: result.extensionRequest,
      booking: updatedBooking ? {
        id: updatedBooking.id,
        lockPin: updatedBooking.lock_pin,
        lock_pin: updatedBooking.lock_pin,
        endDate: updatedBooking.end_date.toISOString(),
        end_date: updatedBooking.end_date.toISOString(),
        startDate: updatedBooking.start_date.toISOString(),
        start_date: updatedBooking.start_date.toISOString(),
        standId: updatedBooking.boxes.stand_id,
        standName: updatedBooking.boxes.stands.name,
        location: updatedBooking.boxes.stands.locations.name,
      } : null,
    });
  } catch (error) {
    console.error('[Extend Complete] Error completing booking extension:', {
      bookingId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to complete extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
