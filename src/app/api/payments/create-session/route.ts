import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';
import { BookingService } from '@/services/bookings/BookingService';
import { getCurrentUser } from '@/lib/supabase-auth';

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

    console.log('Booking calculation:', {
      start: booking.validatedDates.start.toISOString(),
      end: booking.validatedDates.end.toISOString(),
      amount: booking.amountStr,
    });
    
    // Try to get authenticated user to include email in metadata
    let customerEmail: string | null = null;
    try {
      const supabaseUser = await getCurrentUser();
      if (supabaseUser?.email) {
        customerEmail = supabaseUser.email;
        console.log('Adding authenticated user email to payment intent metadata:', customerEmail);
      }
    } catch {
      // User not authenticated - that's fine, email will be collected during payment
      console.log('No authenticated user - email will be collected during payment');
    }

    // Verify box exists and check model match
    const boxVerification = await bookingService.verifyBox(boxId);
    
    if (!boxVerification.exists || !boxVerification.box) {
      throw new Error(`Box with id ${boxId} not found`);
    }

    // Validate that the box model matches the selected model
    if (modelId && boxVerification.box.model) {
      const expectedModel = modelId.toLowerCase() === 'classic' ? 'Classic' : modelId.toLowerCase() === 'pro' ? 'Pro' : modelId;
      const boxModel = boxVerification.box.model;
      
      if (boxModel !== expectedModel) {
        console.error('Model mismatch:', {
          boxId,
          boxModel,
          selectedModel: modelId,
          expectedModel,
        });
        return NextResponse.json(
          { 
            error: `Model mismatch: Selected box is ${boxModel} but you selected ${modelId}. Please select a box that matches your selected model.` 
          },
          { status: 400 }
        );
      }
    }

      // Create payment intent with booking details in metadata (secure, server-side)
    const paymentIntent = await paymentService.createPaymentIntent({
        amount: booking.amount,
        currency: 'sek',
        metadata: {
          ...booking.metadata,
          ...(customerEmail ? { customerEmail } : {}), // Add customer email if authenticated
        },
    });

    if (!paymentIntent || !paymentIntent.id) {
      throw new Error('Failed to create payment intent: No payment intent ID returned');
    }

    console.log('Stripe payment intent created:', paymentIntent.id);
    console.log('SECURITY: Payment record will be created ONLY when payment is confirmed via webhook or payment success handler');

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

