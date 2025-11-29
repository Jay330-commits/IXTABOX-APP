import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Endpoint to update payment intent metadata
 * Used to add customer contact information and notification preferences
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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    const body = await request.json();
    const { metadata } = body;

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      );
    }

    // Retrieve existing payment intent to merge metadata
    const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Update payment intent with merged metadata
    const updatedPaymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...existingPaymentIntent.metadata,
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      paymentIntentId: updatedPaymentIntent.id,
    });
  } catch (error) {
    console.error('Error updating payment intent metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update payment intent metadata' },
      { status: 500 }
    );
  }
}

