import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';

/**
 * Update payment intent metadata
 * PATCH /api/payments/[paymentIntentId]/metadata
 */
export async function PATCH(
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

    const body = await request.json();
    const { metadata } = body;

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'Metadata object is required' },
        { status: 400 }
      );
    }

    const paymentService = new PaymentProcessingService();
    
    // Merge with existing metadata (don't overwrite)
    const existingIntent = await paymentService.retrievePaymentIntent(paymentIntentId);
    const updatedMetadata = {
      ...existingIntent.metadata,
      ...metadata,
    };

    // Update Stripe payment intent metadata AND set receipt_email
    // This ensures email is available in multiple places for reliable extraction
    const stripe = paymentService.getStripe();
    
    if (metadata.customerEmail) {
      // Update both metadata AND receipt_email for maximum reliability
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: updatedMetadata,
        receipt_email: metadata.customerEmail, // Set receipt_email so Stripe stores it
      });
      console.log('Email set in both metadata and receipt_email:', metadata.customerEmail);
    } else {
      // Just update metadata if no email
      await paymentService.updatePaymentIntentMetadata(paymentIntentId, updatedMetadata);
    }

    console.log('Payment intent metadata updated:', {
      paymentIntentId,
      hasEmail: !!metadata.customerEmail,
      email: metadata.customerEmail || 'NOT PROVIDED',
    });

    return NextResponse.json({
      success: true,
      message: 'Payment intent metadata updated successfully',
    });
  } catch (error) {
    console.error('Error updating payment intent metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to update payment intent metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

