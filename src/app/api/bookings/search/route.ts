import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, bookingReference } = body;

    if (!email || !bookingReference) {
      return NextResponse.json(
        { error: 'Email and booking reference are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.public_users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { bookings: [], error: 'No bookings found with the provided details' },
        { status: 404 }
      );
    }

    // Search for booking by payment ID or booking ID (booking reference could be either)
    // Try to find booking through payment (using charge_id - the actual payment ID)
    const payment = await prisma.payments.findFirst({
      where: {
        user_id: user.id,
        OR: [
          { id: bookingReference },
          { charge_id: bookingReference }, // charge_id is the actual Stripe payment ID
        ],
      },
      include: {
        bookings: {
          include: {
            boxes: {
              include: {
                stands: {
                  include: {
                    locations: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment || !payment.bookings) {
      // Try direct booking search
      const booking = await prisma.bookings.findFirst({
        where: {
          id: bookingReference,
          payments: {
            user_id: user.id,
          },
        },
        include: {
          boxes: {
            include: {
              stands: {
                include: {
                  locations: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      if (!booking) {
        return NextResponse.json(
          { bookings: [], error: 'No bookings found with the provided details' },
          { status: 404 }
        );
      }

      const formattedBooking = {
        id: booking.id,
        standId: booking.boxes.stand_id,
        address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        status: (booking.status || BookingStatus.Pending).toLowerCase(),
        model: {
          name: booking.boxes.model === 'Pro' ? 'IXTAbox Pro' : 'IXTAbox Classic',
          description: booking.boxes.model === 'Pro' ? 'Premium model with advanced features' : 'Standard model with essential features',
          priceMultiplier: booking.boxes.model === 'Pro' ? 1.5 : 1.0,
        },
        pricePerDay: parseFloat(booking.payments?.amount.toString() || '0') / Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)),
        locationName: booking.boxes.stands.locations.name,
        boxDisplayId: booking.boxes.display_id,
        standDisplayId: booking.boxes.stands.display_id,
      };

      return NextResponse.json({ bookings: [formattedBooking] });
    }

    // Format booking from payment
    const booking = payment.bookings;
    const formattedBooking = {
      id: booking.id,
      standId: booking.boxes.stand_id,
      address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
      startDate: booking.start_date.toISOString(),
      endDate: booking.end_date.toISOString(),
      status: (booking.status || BookingStatus.Pending).toLowerCase(),
      model: {
        name: booking.boxes.model === 'Pro' ? 'IXTAbox Pro' : 'IXTAbox Classic',
        description: booking.boxes.model === 'Pro' ? 'Premium model with advanced features' : 'Standard model with essential features',
        priceMultiplier: booking.boxes.model === 'Pro' ? 1.5 : 1.0,
      },
      pricePerDay: parseFloat(payment.amount.toString()) / Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)),
      locationName: booking.boxes.stands.locations.name,
      boxDisplayId: booking.boxes.display_id,
      standDisplayId: booking.boxes.stands.display_id,
    };

    return NextResponse.json({ bookings: [formattedBooking] });
  } catch (error) {
    console.error('Error searching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to search bookings' },
      { status: 500 }
    );
  }
}

