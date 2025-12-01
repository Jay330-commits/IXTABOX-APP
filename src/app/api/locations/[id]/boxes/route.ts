import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { boxStatus, BoxModel, BookingStatus } from '@prisma/client';

// ============================================================================
// Type Definitions
// ============================================================================

type Booking = {
  start_date: Date;
  end_date: Date;
};

type BoxWithBookings = {
  id: string;
  model: BoxModel;
  display_id: string;
  compartment: number | null;
  status: boxStatus | null;
  bookings: Booking[];
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
// Helper Functions - Date & Booking Logic
// ============================================================================

/**
 * Check if two date ranges overlap
 */
function hasDateOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && end1 >= start2;
}

/**
 * Find bookings that conflict with the requested date range
 */
function findConflictingBookings(
  bookings: Booking[],
  requestedStart: Date,
  requestedEnd: Date
): Booking[] {
  return bookings.filter((booking) =>
    hasDateOverlap(
      new Date(booking.start_date),
      new Date(booking.end_date),
      requestedStart,
      requestedEnd
    )
  );
}

/**
 * Get the latest end date from a list of bookings
 */
function getLatestEndDate(bookings: Booking[]): Date | null {
  if (bookings.length === 0) return null;
  
  return bookings.reduce((latest, booking) => {
    const bookingEnd = new Date(booking.end_date);
    return bookingEnd > latest ? bookingEnd : latest;
  }, new Date(0));
}

/**
 * Calculate box availability based on bookings and requested dates
 */
function calculateAvailability(
  bookings: Booking[],
  requestedStartDate: string | null,
  requestedEndDate: string | null
): { isAvailable: boolean; nextAvailableDate: string | null } {
  // If no bookings, box is available
  if (bookings.length === 0) {
    return { isAvailable: true, nextAvailableDate: null };
  }

  // If no dates specified, check all bookings
  if (!requestedStartDate || !requestedEndDate) {
    const latestEndDate = getLatestEndDate(bookings);
    return {
      isAvailable: false,
      nextAvailableDate: latestEndDate ? latestEndDate.toISOString() : null,
    };
  }

  // Check for conflicts with requested dates
  const requestedStart = new Date(requestedStartDate);
  const requestedEnd = new Date(requestedEndDate);
  const conflictingBookings = findConflictingBookings(
    bookings,
    requestedStart,
    requestedEnd
  );

  if (conflictingBookings.length === 0) {
    return { isAvailable: true, nextAvailableDate: null };
  }

  // Get the latest end date from conflicting bookings
  const latestEndDate = getLatestEndDate(conflictingBookings);
  return {
    isAvailable: false,
    nextAvailableDate: latestEndDate ? latestEndDate.toISOString() : null,
  };
}

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
  requestedEndDate: string | null
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
        const { isAvailable, nextAvailableDate } = calculateAvailability(
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

    // Fetch location with stands, boxes, and bookings
    const location = await prisma.locations.findUnique({
      where: { id },
      include: {
        stands: {
          include: {
            boxes: {
              include: {
                bookings: {
                  where: {
                    status: {
                      in: [BookingStatus.Pending, BookingStatus.Active],
                    },
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

    // Process all boxes with availability information
    const processedBoxes = processBoxes(
      location.stands,
      model,
      startDate,
      endDate
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
