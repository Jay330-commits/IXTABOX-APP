import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus, BookingStatus } from '@prisma/client';

/**
 * Secure API endpoint to create payment session
 * Stores booking details server-side and returns only payment_intent_id
 * This prevents sensitive data from being exposed in URLs
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error - Missing Stripe secret key' },
        { status: 500 }
      );
    }

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

    // Validate required fields
    if (!locationId || !boxId || !standId || !startDate || !endDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required booking fields' },
        { status: 400 }
      );
    }

    // Calculate amount server-side (not from client)
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const basePrice = 299.99;
    const multiplier = modelId === 'pro' || modelId === 'Pro' ? 1.5 : 1.0;
    const amount = basePrice * multiplier * days;

    // Determine booking status based on start date and time
    // Check if booking start time has already passed - if so, set to Active immediately
    // Otherwise, set to Pending (will be activated by trigger when time arrives)
    const now = new Date();
    const bookingStatus = start <= now ? BookingStatus.Active : BookingStatus.Pending;
    
    // Debug: Log the status value to verify it's correct
    console.log('🔍 Booking status check:', {
      start: start.toISOString(),
      now: now.toISOString(),
      isPast: start <= now,
      bookingStatus: bookingStatus,
      availableStatuses: Object.values(BookingStatus)
    });

    // Create payment intent with booking details in metadata (secure, server-side)
    const paymentIntent = await stripe.paymentIntents.create({
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

    if (!paymentIntent || !paymentIntent.id) {
      throw new Error('Failed to create payment intent: No payment intent ID returned');
    }

    // Store payment record in database and create booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payments.create({
        data: {
          amount: amount,
          currency: 'SEK',
          status: PaymentStatus.Pending,
          stripe_payment_intent_id: paymentIntent.id,
        },
      });

      // Create booking record linked to the payment
      const booking = await tx.bookings.create({
        data: {
          box_id: boxId,
          payment_id: payment.id, // Link booking to payment
          start_date: start,
          end_date: end,
          total_amount: amount,
          status: bookingStatus, // Pending if future, Active if current/past
        },
      });

      return { payment, booking };
    });

    // Return ONLY the payment intent ID (no sensitive data)
    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      bookingId: result.booking.id, // Return booking ID for reference
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

