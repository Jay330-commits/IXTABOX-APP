import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus, boxmodel } from '@prisma/client';

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

      // Get price and deposit from box
      const boxPrice = booking.boxes.price 
        ? (typeof booking.boxes.price === 'string' ? parseFloat(booking.boxes.price) : Number(booking.boxes.price))
        : 300; // Default fallback
      const boxDeposit = booking.boxes.deposit 
        ? (typeof booking.boxes.deposit === 'string' ? parseFloat(booking.boxes.deposit) : Number(booking.boxes.deposit))
        : 0;

      const formattedBooking = {
        id: booking.id,
        standId: booking.boxes.stand_id,
        address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        status: (booking.status || BookingStatus.Upcoming).toLowerCase(),
        model: {
          name: booking.boxes.model === boxmodel.Pro_190 ? 'IXTAbox Pro 190' : 'IXTAbox Pro 175',
          description: booking.boxes.model === boxmodel.Pro_190 ? 'Premium model with advanced features' : 'Standard model with essential features',
        },
        pricePerDay: boxPrice,
        deposit: boxDeposit,
        locationName: booking.boxes.stands.locations.name,
        boxDisplayId: booking.boxes.display_id,
        standDisplayId: booking.boxes.stands.display_id,
      };

      return NextResponse.json({ bookings: [formattedBooking] });
    }

    // Format booking from payment
    const booking = payment.bookings;
    
    // Get price and deposit from box
    const boxPrice = booking.boxes.price 
      ? (typeof booking.boxes.price === 'string' ? parseFloat(booking.boxes.price) : Number(booking.boxes.price))
      : 300; // Default fallback
    const boxDeposit = booking.boxes.deposit 
      ? (typeof booking.boxes.deposit === 'string' ? parseFloat(booking.boxes.deposit) : Number(booking.boxes.deposit))
      : 0;

    const formattedBooking = {
      id: booking.id,
      standId: booking.boxes.stand_id,
      address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
      startDate: booking.start_date.toISOString(),
      endDate: booking.end_date.toISOString(),
      status: (booking.status || BookingStatus.Upcoming).toLowerCase(),
      model: {
        name: booking.boxes.model === boxmodel.Pro_190 ? 'IXTAbox Pro 190' : 'IXTAbox Pro 175',
        description: booking.boxes.model === boxmodel.Pro_190 ? 'Premium model with advanced features' : 'Standard model with essential features',
      },
      pricePerDay: boxPrice,
      deposit: boxDeposit,
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

