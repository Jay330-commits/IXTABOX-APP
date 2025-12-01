import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus, BoxModel } from '@prisma/client';
import { mergeRanges, normalizeDate, type Range } from '@/utils/dates';

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

    // Log that API was called
    console.log(`\n🔔 API CALLED: /api/locations/${locationId}/model-blocked-ranges?model=${modelParam}`);

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

    // Fetch location with all stands and boxes of the specified model
    const location = await prisma.locations.findUnique({
      where: { id: locationId },
      include: {
        stands: {
          include: {
            boxes: {
              where: {
                model: model,
                status: 'Active',
              },
              include: {
                bookings: {
                  where: {
                    status: {
                      in: [BookingStatus.Pending, BookingStatus.Active],
                    },
                  },
                  select: {
                    start_date: true,
                    end_date: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Collect all booking ranges from all boxes of this model
    const allRanges: Range[] = [];
    const boxSummary: Array<{ boxId: string; displayId: string; bookingCount: number }> = [];
    let totalBoxes = 0;

    location.stands.forEach(stand => {
      stand.boxes.forEach(box => {
        totalBoxes++;
        const boxBookings: Range[] = [];
        box.bookings.forEach(booking => {
          const range = {
            start: normalizeDate(booking.start_date),
            end: normalizeDate(booking.end_date),
          };
          allRanges.push(range);
          boxBookings.push(range);
        });
        if (boxBookings.length > 0) {
          boxSummary.push({
            boxId: box.id,
            displayId: box.display_id || 'N/A',
            bookingCount: boxBookings.length,
          });
        }
      });
    });

    // Merge overlapping/adjacent ranges
    const mergedRanges = mergeRanges(allRanges);

    // Print comprehensive summary to terminal
    console.error('\n' + '='.repeat(80));
    console.error(`📅 MODEL-LEVEL BLOCKED RANGES - Location: ${location.name} (${locationId})`);
    console.error(`📅 Model: ${model}`);
    console.error('='.repeat(80));
    console.error(`\n📦 Total boxes of ${model} model: ${totalBoxes}`);
    console.error(`📦 Boxes with bookings: ${boxSummary.length}`);
    
    if (boxSummary.length > 0) {
      console.error('\n📦 Boxes contributing to blocked ranges:');
      boxSummary.forEach((box, index) => {
        console.error(`   ${index + 1}. Box ${box.displayId} (${box.boxId.substring(0, 8)}...): ${box.bookingCount} booking(s)`);
      });
    }
    
    console.error(`\n📊 Summary:`);
    console.error(`   • Individual bookings found: ${allRanges.length}`);
    console.error(`   • Merged blocked ranges: ${mergedRanges.length}`);
    
    if (mergedRanges.length === 0) {
      console.error('\n✅ No blocked ranges - All dates are available for this model!\n');
    } else {
      console.error('\n🚫 MERGED BLOCKED RANGES (all boxes combined):');
      mergedRanges.forEach((range, index) => {
        const startStr = range.start.toISOString().split('T')[0];
        const endStr = range.end.toISOString().split('T')[0];
        const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
        console.error(`   ${index + 1}. ${startStr} to ${endStr} (${days} day${days !== 1 ? 's' : ''})`);
      });
      console.error('');
    }
    console.error('='.repeat(80) + '\n');

    return NextResponse.json({
      locationId,
      model: modelParam,
      ranges: mergedRanges.map(r => ({
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      })),
      totalBookings: allRanges.length,
      mergedRangesCount: mergedRanges.length,
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

