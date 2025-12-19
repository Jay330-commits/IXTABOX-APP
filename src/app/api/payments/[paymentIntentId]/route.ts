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
    let pricePerDay: number | null = null;
    let modelMultiplier: number | null = null;
    let modelName: string | null = null;
    
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
    
    // Fetch base price from platform settings for price breakdown
    // Price is stored in platform_settings, not in stands table
    try {
      const basePriceSetting = await prisma.platform_settings.findUnique({
        where: { setting_key: 'base_price_per_day' },
      });
      
      if (basePriceSetting?.value) {
        if (typeof basePriceSetting.value === 'number') {
          pricePerDay = basePriceSetting.value;
        } else if (typeof basePriceSetting.value === 'string') {
          const parsed = parseFloat(basePriceSetting.value);
          if (!isNaN(parsed)) {
            pricePerDay = parsed;
          }
        }
      }
      
      // Default fallback if not found in settings
      if (!pricePerDay) {
        pricePerDay = 300; // Default base price
      }
    } catch (error) {
      console.error('Error fetching base price from platform settings:', error);
      // Use default if fetch fails
      pricePerDay = 300;
    }
    
    // Get model information from enum value and platform settings
    // modelId in metadata is the enum value (Pro_175 or Pro_190)
    if (paymentIntent.metadata.modelId) {
      try {
        const modelIdValue = paymentIntent.metadata.modelId;
        
        // Determine model name from enum value
        if (modelIdValue === 'Pro_175' || modelIdValue === 'Pro 175' || modelIdValue === 'pro_175') {
          modelName = 'Pro 175';
          // Get multiplier from platform settings
          const pro175MultiplierSetting = await prisma.platform_settings.findUnique({
            where: { setting_key: 'pro_175_model_multiplier' },
          });
          if (pro175MultiplierSetting?.value) {
            if (typeof pro175MultiplierSetting.value === 'number') {
              modelMultiplier = pro175MultiplierSetting.value;
            } else if (typeof pro175MultiplierSetting.value === 'string') {
              const parsed = parseFloat(pro175MultiplierSetting.value);
              if (!isNaN(parsed)) modelMultiplier = parsed;
            }
          }
          // Fallback to classic multiplier if pro_175 not found
          if (!modelMultiplier) {
            const classicMultiplierSetting = await prisma.platform_settings.findUnique({
              where: { setting_key: 'classic_model_multiplier' },
            });
            if (classicMultiplierSetting?.value) {
              if (typeof classicMultiplierSetting.value === 'number') {
                modelMultiplier = classicMultiplierSetting.value;
              } else if (typeof classicMultiplierSetting.value === 'string') {
                const parsed = parseFloat(classicMultiplierSetting.value);
                if (!isNaN(parsed)) modelMultiplier = parsed;
              }
            }
          }
          // Default multiplier
          if (!modelMultiplier) modelMultiplier = 1.0;
        } else if (modelIdValue === 'Pro_190' || modelIdValue === 'Pro 190' || modelIdValue === 'pro_190') {
          modelName = 'Pro 190';
          // Get multiplier from platform settings
          const pro190MultiplierSetting = await prisma.platform_settings.findUnique({
            where: { setting_key: 'pro_190_model_multiplier' },
          });
          if (pro190MultiplierSetting?.value) {
            if (typeof pro190MultiplierSetting.value === 'number') {
              modelMultiplier = pro190MultiplierSetting.value;
            } else if (typeof pro190MultiplierSetting.value === 'string') {
              const parsed = parseFloat(pro190MultiplierSetting.value);
              if (!isNaN(parsed)) modelMultiplier = parsed;
            }
          }
          // Fallback to pro multiplier if pro_190 not found
          if (!modelMultiplier) {
            const proMultiplierSetting = await prisma.platform_settings.findUnique({
              where: { setting_key: 'pro_model_multiplier' },
            });
            if (proMultiplierSetting?.value) {
              if (typeof proMultiplierSetting.value === 'number') {
                modelMultiplier = proMultiplierSetting.value;
              } else if (typeof proMultiplierSetting.value === 'string') {
                const parsed = parseFloat(proMultiplierSetting.value);
                if (!isNaN(parsed)) modelMultiplier = parsed;
              }
            }
          }
          // Default multiplier for Pro 190
          if (!modelMultiplier) modelMultiplier = 1.5;
        }
      } catch (error) {
        console.error('Error fetching model details:', error);
        // Use defaults on error
        if (!modelName) modelName = 'Pro 175';
        if (!modelMultiplier) modelMultiplier = 1.0;
      }
    }

    // Extract booking details from Stripe metadata (always available)
    const bookingDetails = {
      locationId: paymentIntent.metadata.locationId,
      locationName: locationName || paymentIntent.metadata.locationDisplayId || paymentIntent.metadata.locationId,
      boxId: paymentIntent.metadata.boxId,
      standId: paymentIntent.metadata.standId,
      modelId: paymentIntent.metadata.modelId,
      modelName: modelName,
      startDate: paymentIntent.metadata.startDate,
      endDate: paymentIntent.metadata.endDate,
      startTime: paymentIntent.metadata.startTime,
      endTime: paymentIntent.metadata.endTime,
      locationDisplayId: paymentIntent.metadata.locationDisplayId || paymentIntent.metadata.locationId,
      compartment: paymentIntent.metadata.compartment || null,
      pricePerDay: pricePerDay,
      modelMultiplier: modelMultiplier,
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
