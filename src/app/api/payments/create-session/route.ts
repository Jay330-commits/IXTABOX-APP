import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus, Prisma } from '@prisma/client';

/**
 * Secure API endpoint to create payment session
 * Stores booking details server-side and returns only payment_intent_id
 * This prevents sensitive data from being exposed in URLs
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error - Missing Stripe secret key' },
        { status: 500 }
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    const body = await request.json();
    const { 
      locationId, 
      boxId, 
      standId, 
      modelId, 
      startDate, 
      endDate, 
      startTime, 
      endTime 
    } = body;
    
    console.log('Received booking request:', {
      locationId,
      boxId,
      standId,
      modelId,
      startDate,
      endDate,
      startTime,
      endTime
    });

    // Validate required fields
    if (!locationId || !boxId || !standId || !startDate || !endDate || !startTime || !endTime) {
      console.error(' Missing required fields:', {
        locationId: !!locationId,
        boxId: !!boxId,
        standId: !!standId,
        startDate: !!startDate,
        endDate: !!endDate,
        startTime: !!startTime,
        endTime: !!endTime
      });
      return NextResponse.json(
        { error: 'Missing required booking fields' },
        { status: 400 }
      );
    }

    // Calculate amount server-side (not from client)
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('❌ Invalid date format:', { startDate, endDate, startTime, endTime });
      return NextResponse.json(
        { error: 'Invalid date or time format' },
        { status: 400 }
      );
    }
    
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const basePrice = 299.99;
    const multiplier = modelId === 'pro' || modelId === 'Pro' ? 1.5 : 1.0;
    const amount = basePrice * multiplier * days;

    // Determine booking status based on start date and time
    const now = new Date();
    const bookingStatus = start <= now ? BookingStatus.Active : BookingStatus.Pending;
    
    console.log('🔍 Booking calculation:', {
      start: start.toISOString(),
      end: end.toISOString(),
      days,
      basePrice,
      multiplier,
      amount: amount.toFixed(2),
      bookingStatus,
    });

    // Create payment intent with booking details in metadata (secure, server-side)
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'sek',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          locationId,
          boxId,
          standId,
          modelId: modelId || '',
          startDate,
          endDate,
          startTime,
          endTime,
          amount: amount.toFixed(2),
          source: 'ixtabox-app',
        },
      });
      console.log('✅ Stripe payment intent created:', paymentIntent.id);
    } catch (stripeError) {
      console.error('❌ Stripe API error:', {
        error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
        stack: stripeError instanceof Error ? stripeError.stack : undefined,
        type: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : undefined,
        code: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : undefined,
      });
      throw new Error(`Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'}`);
    }

    if (!paymentIntent || !paymentIntent.id) {
      throw new Error('Failed to create payment intent: No payment intent ID returned');
    }

    // Store payment record in database (booking will be created after payment succeeds in webhook)
    try {
      await prisma.$transaction(async (tx) => {
        // Convert amount to string with 2 decimal places for Prisma Decimal type
        const amountStr = amount.toFixed(2);
        
        // Verify box exists first
        const box = await tx.boxes.findUnique({
          where: { id: boxId },
        });
        
        if (!box) {
          throw new Error(`Box with id ${boxId} not found`);
        }
        
        // Create payment record ONLY (booking will be created after payment succeeds in webhook)
        const payment = await tx.payments.create({
          data: {
            amount: amountStr, // Prisma will convert string to Decimal
            currency: 'SEK',
            status: PaymentStatus.Pending,
            stripe_payment_intent_id: paymentIntent.id,
          },
        });
        console.log('Payment record created:', payment.id);
        console.log('Booking will be created after payment succeeds via webhook');

        // Return payment only - booking will be created in webhook after payment succeeds
        return { payment };
      });
    } catch (dbError) {
      console.error('Database transaction error:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        code: dbError instanceof Prisma.PrismaClientKnownRequestError ? dbError.code : undefined,
        meta: dbError instanceof Prisma.PrismaClientKnownRequestError ? dbError.meta : undefined,
      });
      throw dbError;
    }

    // Return ONLY the payment intent ID (no sensitive data)
    // Booking will be created after payment succeeds via webhook
    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Failed to create payment session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

