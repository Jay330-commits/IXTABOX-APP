import { NextRequest, NextResponse } from 'next/server';
import { boxStatus, BoxModel } from '@prisma/client';
import { BookingService } from '@/services/bookings/BookingService';
import { LocationService } from '@/services/locations/LocationService';

// ============================================================================
// Type Definitions
// ============================================================================

type BoxWithBookings = {
  id: string;
  model: BoxModel;
  display_id: string;
  compartment: number | null;
  status: boxStatus | null;
  bookings: Array<{
    start_date: Date;
    end_date: Date;
  }>;
};

type ProcessedBox = {
  id: string;
  standId: string;
  standName: string;
  model: BoxModel;
  displayId: string;
  compartment: number | null;
  status: boxStatus | null;
  isAvailable: boolean;
  nextAvailableDate: string | null;
};

type StandGroup = {
  standId: string;
  standName: string;
  boxes: Array<{
    id: string;
    model: BoxModel;
    displayId: string;
    compartment: number | null;
    isAvailable: boolean;
    nextAvailableDate: string | null;
  }>;
};

// ============================================================================
// Box Processing Functions
// ============================================================================

/**
 * Filter and process boxes from stands
 */
function processBoxes(
  stands: Array<{
    id: string;
    name: string;
    boxes: BoxWithBookings[];
  }>,
  modelFilter: string | null,
  requestedStartDate: string | null,
  requestedEndDate: string | null,
  bookingService: BookingService
): ProcessedBox[] {
  return stands.flatMap((stand) =>
    stand.boxes
      .filter((box) => {
        // Filter by model if specified
        if (modelFilter && box.model !== modelFilter) return false;
        
        // Only include active boxes
        return box.status === boxStatus.Active;
      })
      .map((box) => {
        const { isAvailable, nextAvailableDate } = bookingService.calculateAvailability(
          box.bookings,
          requestedStartDate,
          requestedEndDate
        );

        return {
          id: box.id,
          standId: stand.id,
          standName: stand.name,
          model: box.model,
          displayId: box.display_id,
          compartment: box.compartment ?? null,
          status: box.status,
          isAvailable,
          nextAvailableDate,
        };
      })
  );
}

/**
 * Group processed boxes by stand
 */
function groupBoxesByStand(boxes: ProcessedBox[]): StandGroup[] {
  const grouped = boxes.reduce(
    (acc, box) => {
      if (!acc[box.standId]) {
        acc[box.standId] = {
          standId: box.standId,
          standName: box.standName,
          boxes: [],
        };
      }
      
      acc[box.standId].boxes.push({
        id: box.id,
        model: box.model,
        displayId: box.displayId,
        compartment: box.compartment,
        isAvailable: box.isAvailable,
        nextAvailableDate: box.nextAvailableDate,
      });
      
      return acc;
    },
    {} as Record<string, StandGroup>
  );

  return Object.values(grouped);
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model'); // 'Classic' or 'Pro'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const bookingService = new BookingService();
    const locationService = new LocationService();

    // Fetch location with stands, boxes, and bookings using LocationService
    const location = await locationService.getLocationWithBookings(id);

    // Process all boxes with availability information
    const processedBoxes = processBoxes(
      location.stands,
      model,
      startDate,
      endDate,
      bookingService
    );

    // Group boxes by stand
    const boxesByStand = groupBoxesByStand(processedBoxes);

    // Build response
    const responseData = {
      locationId: id,
      locationName: location.name,
      availableBoxes: boxesByStand,
      totalAvailable: processedBoxes.filter((b) => b.isAvailable).length,
      totalBoxes: processedBoxes.length,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch available boxes', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Unable to check box availability.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
