import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { DistributorBookingService } from '@/services/distributors/DistributorBookingService';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.distributors) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const standId = searchParams.get('standId');
    const status = searchParams.get('status') as BookingStatus | null;
    const type = searchParams.get('type');

    const service = new DistributorBookingService();

    if (type === 'active') {
      const bookings = await service.getActiveBookings(user.distributors.id);
      return NextResponse.json({ success: true, data: bookings });
    }

    if (type === 'scheduled') {
      const bookings = await service.getScheduledBookings(user.distributors.id);
      return NextResponse.json({ success: true, data: bookings });
    }

    if (standId) {
      const bookings = await service.getBookingsByStand(standId, {
        status: status || undefined,
      });
      return NextResponse.json({ success: true, data: bookings });
    }

    const bookings = await service.getBookingsByDistributor(user.distributors.id, {
      status: status || undefined,
    });

    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

