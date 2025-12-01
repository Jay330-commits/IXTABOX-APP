import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

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

    const stripe = getStripe();
    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: unknown) {
      // Stripe typings may not expose a concrete StripeError type here in this
      // runtime; safely check for the `code` value instead without using
      // `any` to satisfy eslint rules.
      if (typeof error === 'object' && error !== null) {
        const errWithCode = error as { code?: unknown };
        if (errWithCode.code === 'resource_missing') {
        return NextResponse.json(
          { exists: false, message: 'Payment intent not found in Stripe' },
          { status: 404 }
        );
      }
      }
      console.error('Error retrieving payment intent from Stripe:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve payment intent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        livemode: paymentIntent.livemode,
      },
    });
  } catch (error) {
    console.error('Error in payment intent verification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
