import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

/**
 * GET /api/boxes/[boxId]/bookings
 * Fetches all active/pending bookings for a specific box
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  try {
    const { boxId } = await params;

    // Fetch all active and pending bookings for this box
    const bookings = await prisma.bookings.findMany({
      where: {
        box_id: boxId,
        status: {
          in: [BookingStatus.Pending, BookingStatus.Active],
        },
      },
      select: {
        start_date: true,
        end_date: true,
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    const bookingRanges = bookings.map(b => ({
      start_date: b.start_date.toISOString(),
      end_date: b.end_date.toISOString(),
    }));

    console.log(`📅 [Blocked Ranges] Box ${boxId}: Found ${bookings.length} active/pending bookings`);
    if (bookings.length > 0) {
      console.log(`📅 [Blocked Ranges] Box ${boxId} ranges:`, JSON.stringify(bookingRanges, null, 2));
    }

    return NextResponse.json({
      boxId,
      bookings: bookingRanges,
    });
  } catch (error) {
    console.error('Failed to fetch bookings for box:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Unable to fetch bookings for this box.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

