import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, chargeId } = body;

    // SECURITY: Require BOTH email AND charge_id for all searches
    if (!email || !chargeId) {
      return NextResponse.json(
        { error: 'Both email address and Payment ID (charge ID) are required for security. Please use the link from your booking confirmation email.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // SECURITY: Verify BOTH email AND charge_id match the booking
    // Use a SELECT query that checks both conditions
    const payment = await prisma.payments.findFirst({
      where: {
        charge_id: chargeId,
        users: {
          email: email.toLowerCase(), // Verify email matches the payment's user
        },
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
        payments: true,
      },
        },
        users: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'No booking found. Please verify that both your email address and Payment ID match your booking confirmation email.' },
        { status: 404 }
      );
    }

    // Get the booking for this payment
    if (!payment.bookings) {
      return NextResponse.json({ bookings: [] });
    }

    const bookings = [payment.bookings];

    // Transform bookings to match the frontend format (similar to customer page)
    const formattedBookings = bookings.map((booking) => {
      const days = Math.max(1, Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)));
      const totalAmount = parseFloat(booking.payments?.amount.toString() || '0');
      const modelMultiplier = booking.boxes.model === 'Pro' ? 1.5 : 1.0;
      // Base price per day (before model multiplier)
      const basePricePerDay = totalAmount / days / modelMultiplier;

      return {
        id: booking.id,
        location: booking.boxes.stands.locations.name,
        locationAddress: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || null,
        locationId: booking.boxes.stands.locations.id,
        standId: booking.boxes.stand_id,
        standDisplayId: booking.boxes.stands.display_id,
        boxId: booking.box_id,
        boxDisplayId: booking.boxes.display_id,
        address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        date: booking.start_date.toISOString(), // For compatibility
        status: (booking.status || BookingStatus.Upcoming).toLowerCase() as 'active' | 'upcoming' | 'completed' | 'cancelled' | 'confirmed',
        amount: totalAmount,
        pricePerDay: basePricePerDay, // Base price per day (before model multiplier)
        model: booking.boxes.model === 'Pro' ? 'Pro' : 'Classic',
        lockPin: booking.lock_pin ? String(booking.lock_pin) : null,
        paymentId: booking.payments?.id || null,
        chargeId: booking.payments?.charge_id || null,
        paymentStatus: booking.payments?.status || null,
        createdAt: booking.created_at?.toISOString() || null,
        returnedAt: booking.returned_at?.toISOString() || null,
      };
    });

    // Include user details if available
    const userDetails = payment.users ? {
      name: payment.users.full_name || 'Guest User',
      email: payment.users.email,
      phone: payment.users.phone || null,
    } : null;

    return NextResponse.json({ 
      bookings: formattedBookings,
      user: userDetails,
    });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

