import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/PaymentProcessingService';
import { BookingService } from '@/services/BookingService';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentStatus } from '@prisma/client';

/**
 * Secure API endpoint to create payment session
 * Stores booking details server-side and returns only payment_intent_id
 * This prevents sensitive data from being exposed in URLs
 */
export async function POST(request: NextRequest) {
  try {
    const paymentService = new PaymentProcessingService();
    const bookingService = new BookingService();

    const body = await request.json();
    const { 
      locationId, 
      boxId, 
      standId, 
      modelId, 
      startDate, 
      endDate, 
      startTime, 
      endTime,
      locationDisplayId,
      compartment
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

    // Validate and prepare booking using BookingService
    const booking = await bookingService.validateAndPrepareBooking({
      locationId,
      boxId,
      standId,
      modelId,
      startDate,
      endDate,
      startTime,
      endTime,
      locationDisplayId,
      compartment,
    });

    console.log('🔍 Booking calculation:', {
      start: booking.validatedDates.start.toISOString(),
      end: booking.validatedDates.end.toISOString(),
      amount: booking.amountStr,
    });
    
    // Verify box exists and create Stripe payment intent in parallel for better performance
    const [boxVerification, paymentIntent] = await Promise.all([
      // Verify box exists
      bookingService.verifyBox(boxId),
      // Create payment intent with booking details in metadata (secure, server-side)
      paymentService.createPaymentIntent({
        amount: booking.amount,
        currency: 'sek',
        metadata: booking.metadata,
      })
    ]);

    if (!boxVerification.exists) {
      throw new Error(`Box with id ${boxId} not found`);
    }

    if (!paymentIntent || !paymentIntent.id) {
      throw new Error('Failed to create payment intent: No payment intent ID returned');
    }

    console.log('✅ Stripe payment intent created:', paymentIntent.id);

    // Store payment record in database (non-blocking - can be done after response)
    // We'll create it in the background to speed up the response
    prisma.payments.create({
      data: {
        amount: booking.amountStr, // Prisma will convert string to Decimal
        currency: 'SEK',
        status: PaymentStatus.Pending,
        stripe_payment_intent_id: paymentIntent.id,
      },
    }).then(payment => {
      console.log('Payment record created:', payment.id);
      console.log('Booking will be created after payment succeeds via webhook');
    }).catch(dbError => {
      console.error('Database error (non-critical - payment intent already created):', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        paymentIntentId: paymentIntent.id,
      });
      // Don't throw - payment intent is already created, we can retry payment record creation later
    });

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

