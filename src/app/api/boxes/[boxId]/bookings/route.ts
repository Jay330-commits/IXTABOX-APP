import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/services/bookings/BookingService';

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
    const bookingService = new BookingService();

    // Get blocked ranges using BookingService
    const blockedRanges = await bookingService.getBoxBlockedRanges(boxId);

    const bookingRanges = blockedRanges.map(range => ({
      start_date: range.start.toISOString(),
      end_date: range.end.toISOString(),
    }));

    console.log(`📅 [Blocked Ranges] Box ${boxId}: Found ${blockedRanges.length} active/pending bookings`);
    if (blockedRanges.length > 0) {
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

