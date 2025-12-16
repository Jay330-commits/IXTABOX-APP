import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatusService } from '@/services/bookings/BookingStatusService';

/**
 * Sync booking statuses for all bookings visible to distributor
 * Called automatically during dashboard refresh to keep statuses up-to-date
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a distributor
    const dbUser = await prisma.public_users.findUnique({
      where: { email: user.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.distributors) {
      return NextResponse.json({ error: 'Not a distributor' }, { status: 403 });
    }

    // Use the service - all business logic is here
    const statusService = new BookingStatusService();
    const result = await statusService.syncDistributorBookingStatuses(dbUser.distributors.id);

    return NextResponse.json({
      success: true,
      updated: result.updated,
      totalChecked: result.totalChecked,
    });
  } catch (error) {
    console.error('Error syncing booking statuses:', error);
    return NextResponse.json(
      { error: 'Failed to sync booking statuses' },
      { status: 500 }
    );
  }
}

