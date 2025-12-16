import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';
import { prisma } from '@/lib/prisma/prisma';
import type Stripe from 'stripe';

/**
 * Secure API endpoint to fetch payment details by payment intent ID
 * Returns booking details stored in Stripe metadata (server-side only)
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

    // Get payment intent from Stripe (this always exists)
    const paymentIntent = await paymentService.retrievePaymentIntent(paymentIntentId);
    
    // Fetch location name from database if locationId is available
    let locationName: string | null = null;
    if (paymentIntent.metadata.locationId) {
      try {
        const location = await prisma.locations.findUnique({
          where: { id: paymentIntent.metadata.locationId },
          select: { name: true },
        });
        locationName = location?.name || null;
      } catch (error) {
        console.error('Error fetching location name:', error);
        // Continue without location name if fetch fails
      }
    }

    // Extract booking details from Stripe metadata (always available)
    const bookingDetails = {
      locationId: paymentIntent.metadata.locationId,
      locationName: locationName || paymentIntent.metadata.locationDisplayId || paymentIntent.metadata.locationId,
      boxId: paymentIntent.metadata.boxId,
      standId: paymentIntent.metadata.standId,
      modelId: paymentIntent.metadata.modelId,
      startDate: paymentIntent.metadata.startDate,
      endDate: paymentIntent.metadata.endDate,
      startTime: paymentIntent.metadata.startTime,
      endTime: paymentIntent.metadata.endTime,
      locationDisplayId: paymentIntent.metadata.locationDisplayId || paymentIntent.metadata.locationId,
      compartment: paymentIntent.metadata.compartment || null,
    };

    // Only query database if payment has succeeded (to avoid unnecessary DB calls)
    let payment = null;
    let booking = bookingDetails;

    if (paymentIntent.status === 'succeeded' && paymentIntent.latest_charge) {
      // Payment has succeeded - try to find payment record in database
      const actualChargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : (paymentIntent.latest_charge as Stripe.Charge).id;

      payment = await prisma.payments.findUnique({
        where: {
          charge_id: actualChargeId,
        },
        include: {
          bookings: true, // Include booking if it exists
        },
      });

      // If payment and booking exist in database, use those details
      if (payment?.bookings) {
        booking = {
          ...bookingDetails,
          id: payment.bookings.id,
          lockPin: payment.bookings.lock_pin,
          lock_pin: payment.bookings.lock_pin,
        } as typeof bookingDetails & { id: string; lockPin: number; lock_pin: number };
      }
    }

    // Return payment intent details (always available)
    // If payment record exists, include it; otherwise just return Stripe payment intent
    return NextResponse.json({
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
      },
      booking: booking,
      bookingExists: !!payment?.bookings, // Flag to indicate if booking exists in DB
      ...(payment ? {
        payment: {
          id: payment.id,
          amount: payment.amount.toString(),
          currency: payment.currency,
          chargeId: payment.charge_id,
        },
      } : {}), // Only include payment if it exists in database
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}
