import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.public_users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ bookings: [] });
    }

    // Get all bookings for the user
    const bookings = await prisma.bookings.findMany({
      where: {
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
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform bookings to match the frontend format
    const formattedBookings = bookings.map((booking) => {
      const days = Math.max(1, Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)));
      const pricePerDay = parseFloat(booking.total_amount.toString()) / days;

      return {
        id: booking.id,
        standId: booking.boxes.stand_id,
        address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        status: (booking.status || BookingStatus.Pending).toLowerCase() as 'active' | 'pending' | 'completed' | 'cancelled',
        model: {
          name: booking.boxes.model === 'Pro' ? 'IXTAbox Pro' : 'IXTAbox Classic',
          description: booking.boxes.model === 'Pro' ? 'Premium model with advanced features' : 'Standard model with essential features',
          priceMultiplier: booking.boxes.model === 'Pro' ? 1.5 : 1.0,
        },
        pricePerDay,
        locationName: booking.boxes.stands.locations.name,
        boxDisplayId: booking.boxes.display_id,
        standDisplayId: booking.boxes.stands.display_id,
      };
    });

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

