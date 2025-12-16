import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';

/**
 * Update box return condition (confirmed_good_status) for a booking
 * Only distributors who own the location can update this
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await request.json();
    const { confirmedGoodStatus } = body;

    if (typeof confirmedGoodStatus !== 'boolean') {
      return NextResponse.json(
        { error: 'confirmedGoodStatus must be a boolean' },
        { status: 400 }
      );
    }

    // Verify user is a distributor
    const dbUser = await prisma.public_users.findUnique({
      where: { email: user.email! },
      include: {
        distributors: {
          select: { id: true },
        },
      },
    });

    if (!dbUser || !dbUser.distributors) {
      return NextResponse.json({ error: 'Not a distributor' }, { status: 403 });
    }

    // Verify the booking belongs to this distributor's location
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: {
                  select: {
                    distributor_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.boxes.stands.locations.distributor_id !== dbUser.distributors.id) {
      return NextResponse.json(
        { error: 'Access denied. Booking does not belong to your locations' },
        { status: 403 }
      );
    }

    // Update or create box_returns record
    const boxReturn = await prisma.box_returns.upsert({
      where: { booking_id: bookingId },
      update: {
        confirmed_good_status: confirmedGoodStatus,
      },
      create: {
        booking_id: bookingId,
        confirmed_good_status: confirmedGoodStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        confirmedGoodStatus: boxReturn.confirmed_good_status,
        returnDate: boxReturn.created_at,
      },
    });
  } catch (error) {
    console.error('Error updating box return condition:', error);
    return NextResponse.json(
      { error: 'Failed to update box return condition' },
      { status: 500 }
    );
  }
}

