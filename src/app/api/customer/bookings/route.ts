import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatusService } from '@/services/bookings/BookingStatusService';

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await getCurrentUser(request);
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      console.error('[Bookings API] User not found for email:', supabaseUser.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Bookings API] Fetching bookings for user:', user.id, user.email);

    // First, let's try to find all payments for this user
    const userPayments = await prisma.payments.findMany({
      where: {
        user_id: user.id,
      },
      select: {
        id: true,
      },
    });

    console.log('[Bookings API] Found payments for user:', userPayments.length, userPayments.map(p => p.id));

    // Fetch bookings that are linked to payments with this user_id
    // Try alternative query approach if the nested query doesn't work
    const bookings = await prisma.bookings.findMany({
      where: {
        payment_id: {
          in: userPayments.map(p => p.id),
        },
      },
      include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: {
                  include: {
                    distributors: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            users: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log('[Bookings API] Found bookings:', bookings.length);

    // Calculate current status for each booking based on dates
    const statusService = new BookingStatusService();
    const now = new Date();

    // Transform bookings to match the frontend format
    const formattedBookings = bookings.map((booking) => {
      // Calculate current status based on dates (ensures accuracy)
      const calculatedStatus = statusService.calculateBookingStatus(
        booking.start_date,
        booking.end_date,
        now
      );

      return {
        id: booking.id,
        location: booking.boxes.stands.locations.name || 'Unknown Location',
        locationAddress: booking.boxes.stands.locations.address || null,
        date: booking.start_date.toISOString().split('T')[0],
        status: calculatedStatus.toLowerCase(), // Use calculated status
        amount: parseFloat(booking.total_amount.toString()),
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        boxId: booking.box_id,
        boxDisplayId: booking.boxes.display_id,
        standId: booking.boxes.stand_id,
        standDisplayId: booking.boxes.stands.display_id,
        locationId: booking.boxes.stands.location_id,
        lockPin: booking.lock_pin || null,
        paymentId: booking.payment_id,
        paymentStatus: null, // Payment status removed - payments are only created after successful payment
        createdAt: booking.created_at ? booking.created_at.toISOString() : new Date().toISOString(),
        model: booking.boxes.model || 'Classic',
      };
    });

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

