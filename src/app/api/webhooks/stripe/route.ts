import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentProcessingService } from '@/services/PaymentProcessingService';

/**
 * Stripe Webhook Handler
 * Handles payment confirmation and automatically generates unlock codes
 * POST /api/webhooks/stripe
 */
export async function POST(request: NextRequest) {
  console.log('🔔🔔🔔 WEBHOOK ENDPOINT CALLED at', new Date().toISOString());
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  console.log('📋 Request headers:', {
    hasSignature: !!signature,
    contentType: request.headers.get('content-type'),
    userAgent: request.headers.get('user-agent'),
  });

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const paymentService = new PaymentProcessingService();
    const stripe = paymentService.getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified. Event type:', event.type, 'Event ID:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Log all webhook events for debugging
    console.log('📥 Webhook event received:', {
      type: event.type,
      eventId: event.id,
      livemode: event.livemode,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Handle payment_intent.succeeded event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('Webhook received: payment_intent.succeeded', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        livemode: paymentIntent.livemode,
      });

      // Validate payment intent ID exists - no payment record without valid intent ID
      if (!paymentIntent || !paymentIntent.id) {
        console.error('Invalid payment intent: Missing payment intent ID');
        return NextResponse.json({ received: true });
      }

      // CRITICAL: Verify payment actually succeeded and is not in test mode when using live key
      if (paymentIntent.status !== 'succeeded') {
        console.error('Payment intent status is not succeeded:', paymentIntent.status);
        return NextResponse.json({ received: true });
      }

      // Verify payment amount is valid (not zero or negative)
      if (!paymentIntent.amount || paymentIntent.amount <= 0) {
        console.error('Invalid payment amount:', paymentIntent.amount);
        return NextResponse.json({ received: true });
      }
      
      // Double-check payment status by retrieving from Stripe (prevents webhook spoofing)
      let verifiedPaymentIntent: Stripe.PaymentIntent;
      try {
        verifiedPaymentIntent = await paymentService.retrievePaymentIntent(paymentIntent.id);
        console.log('✅ Payment intent verified from Stripe API');
      } catch (retrieveError) {
        // Handle test webhooks that don't have real payment intents
        if (retrieveError instanceof Error && retrieveError.message.includes('Payment intent not found')) {
          console.warn('⚠️ Test webhook detected - payment intent not found in Stripe. Using event data.');
          verifiedPaymentIntent = paymentIntent;
        } else {
          console.error('❌ Failed to retrieve payment intent:', retrieveError);
          throw retrieveError;
        }
      }
      
      if (verifiedPaymentIntent.status !== 'succeeded') {
        console.error('Payment verification failed - status mismatch:', {
          webhookStatus: paymentIntent.status,
          verifiedStatus: verifiedPaymentIntent.status
        });
        return NextResponse.json({ received: true });
      }

      // CRITICAL: Verify payment is not a test payment when using live mode (or vice versa)
      // This prevents test cards from being processed with live keys
      const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
      const paymentIsLive = verifiedPaymentIntent.livemode;
      
      if (isLiveMode !== paymentIsLive) {
        console.error('Payment mode mismatch detected:', {
          serverMode: isLiveMode ? 'live' : 'test',
          paymentMode: paymentIsLive ? 'live' : 'test',
          paymentIntentId: verifiedPaymentIntent.id
        });
        // Don't process payment if mode mismatch - this prevents test cards with live keys
        return NextResponse.json({ 
          received: true,
          error: 'Payment mode mismatch - test payment cannot be processed with live key'
        });
      }

      try {
        const result = await paymentService.processPaymentSuccess(paymentIntent.id);
        
        if (result.alreadyProcessed) {
          return NextResponse.json({ received: true, message: 'Payment already processed' });
        }
        
        if (result.alreadyConfirmed) {
          return NextResponse.json({ received: true, message: 'Booking already confirmed' });
        }

        // Success - booking created
        console.log('✅ Webhook successfully processed payment and created booking');
        return NextResponse.json({ 
          received: true,
          message: 'Payment processed and booking created successfully'
        });
      } catch (dbError) {
        console.error('❌ Failed to process payment success in database:', {
          error: dbError,
          paymentIntentId: verifiedPaymentIntent.id,
          errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
          errorStack: dbError instanceof Error ? dbError.stack : undefined,
          errorName: dbError instanceof Error ? dbError.name : undefined,
        });
        // Return 500 so Stripe retries the webhook
        return NextResponse.json({ 
          received: false, 
          error: 'Database processing failed',
          message: dbError instanceof Error ? dbError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Validate payment intent ID exists - no processing without valid intent ID
      if (!paymentIntent || !paymentIntent.id) {
        console.error('Invalid payment intent: Missing payment intent ID');
        return NextResponse.json({ received: true });
      }

      // Update payment status to failed in database using Prisma
      // Only update if payment record exists (created when intent was created)
      try {
        await prisma.payments.updateMany({
          where: {
            stripe_payment_intent_id: paymentIntent.id,
          },
          data: {
            status: PaymentStatus.Failed,
          },
        });
      } catch (dbError) {
        console.error('Failed to update payment status to failed in database:', dbError);
      }

      return NextResponse.json({ received: true });
    }

    // Handle other event types (log but don't process)
    console.log('Unhandled webhook event type:', event.type, '- acknowledging');
    return NextResponse.json({ received: true, message: `Event ${event.type} acknowledged but not processed` });
  } catch (error) {
    console.error('Error processing webhook:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

