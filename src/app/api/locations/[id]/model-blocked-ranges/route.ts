import { NextRequest, NextResponse } from 'next/server';
import { BoxModel } from '@prisma/client';
import { BookingService } from '@/services/bookings/BookingService';

/**
 * GET /api/locations/[id]/model-blocked-ranges
 * Fetches merged blocked ranges for all boxes of a specific model at a location
 * 
 * Query params:
 * - model: 'Classic' or 'Pro'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const modelParam = searchParams.get('model');

    if (!modelParam) {
      return NextResponse.json(
        { error: 'Model parameter is required' },
        { status: 400 }
      );
    }

    // Map string to BoxModel enum
    const model = modelParam === 'classic' || modelParam === 'Classic' 
      ? BoxModel.Classic 
      : modelParam === 'pro' || modelParam === 'Pro'
      ? BoxModel.Pro
      : null;

    if (!model) {
      return NextResponse.json(
        { error: 'Invalid model. Must be "classic" or "pro"' },
        { status: 400 }
      );
    }

    const bookingService = new BookingService();

    // Get blocked ranges using BookingService
    const blockedRanges = await bookingService.getModelBlockedRanges(locationId, model);

    const mergedRanges = blockedRanges.ranges;

    return NextResponse.json({
      locationId,
      model: modelParam,
      ranges: mergedRanges.map(r => ({
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      })),
      totalBookings: blockedRanges.totalBookings,
      mergedRangesCount: blockedRanges.mergedRangesCount,
    });
  } catch (error) {
    console.error('Failed to fetch model blocked ranges:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Unable to fetch blocked ranges for this model.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

