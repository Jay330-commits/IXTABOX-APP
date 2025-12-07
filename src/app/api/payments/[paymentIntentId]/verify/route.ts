import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';

/**
 * Verify payment intent exists in Stripe
 * GET /api/payments/[paymentIntentId]/verify
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

    const paymentService = new PaymentProcessingService();
    const result = await paymentService.verifyPaymentIntent(paymentIntentId);

    if (!result.exists) {
        return NextResponse.json(
          { exists: false, message: 'Payment intent not found in Stripe' },
          { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      paymentIntent: result.paymentIntent,
    });
  } catch (error) {
    console.error('Error in payment intent verification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
