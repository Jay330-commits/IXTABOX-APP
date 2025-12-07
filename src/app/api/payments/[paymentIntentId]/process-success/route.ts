import { NextRequest, NextResponse } from 'next/server';
import { processPaymentSuccess } from '@/services/bookings/PaymentProcessingService';

/**
 * Process payment success locally (for local development when webhooks don't work)
 * POST /api/payments/[paymentIntentId]/process-success
 */
export async function POST(
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

    // Get email from request body (from contact form)
    let customerEmail: string | null = null;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await request.text();
        if (text?.trim()) {
          try {
            const body = JSON.parse(text);
            customerEmail = body.customerEmail || null;
            if (customerEmail) {
              console.log('📧 Email from form:', customerEmail);
            } else {
              console.log('📧 No email in request body');
            }
          } catch {
            console.log('📧 Invalid JSON in request body');
          }
        } else {
          console.log('📧 Empty request body');
        }
      } else {
        console.log('📧 No JSON content type, skipping body parse');
      }
    } catch (error) {
      console.log('📧 Could not read request body:', error instanceof Error ? error.message : String(error));
    }

    console.log('🔄 Processing payment success locally for:', paymentIntentId);

    const result = await processPaymentSuccess(paymentIntentId, customerEmail);

    if (result.alreadyProcessed) {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        booking: result.booking,
      });
    }

    if (result.alreadyConfirmed) {
      return NextResponse.json({
        success: true,
        message: 'Booking already confirmed',
        booking: result.booking,
      });
    }

    console.log('✅ Payment processed and booking created successfully');
    return NextResponse.json({
      success: true,
      message: 'Payment processed and booking created successfully',
      booking: result.booking,
    });
  } catch (error) {
    console.error('❌ Failed to process payment success:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
