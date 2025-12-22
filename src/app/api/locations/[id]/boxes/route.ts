import { NextRequest, NextResponse } from 'next/server';
import { boxStatus, boxmodel, BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/prisma';

// ============================================================================
// Type Definitions
// ============================================================================

type StandGroup = {
  standId: string;
  standName: string;
  boxes: Array<{
    id: string;
    model: string; // Normalized display format (e.g., "Pro 175" instead of "Pro_175")
    displayId: string;
    compartment: number | null;
    isAvailable: boolean;
  }>;
};

type BoxWithStand = Prisma.boxesGetPayload<{
  include: {
    stands: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes a boxmodel enum value to display format (with spaces instead of underscores)
 */
function normalizeModelForDisplay(model: boxmodel): string {
  return String(model).replace(/_/g, ' ');
}

/**
 * Converts a string model parameter to a boxmodel enum value
 * Handles URL encoding and various formats (Pro 175, Pro_175, etc.)
 */
function parseModelParam(modelParam: string | null): boxmodel | undefined {
  if (!modelParam) return undefined;

  const decodedModel = decodeURIComponent(modelParam).trim();

  if (
    decodedModel === 'Pro 175' ||
    decodedModel === 'Pro_175' ||
    decodedModel.toLowerCase() === 'pro 175' ||
    decodedModel.toLowerCase() === 'pro_175'
  ) {
    return boxmodel.Pro_175;
  }

  if (
    decodedModel === 'Pro 190' ||
    decodedModel === 'Pro_190' ||
    decodedModel.toLowerCase() === 'pro 190' ||
    decodedModel.toLowerCase() === 'pro_190'
  ) {
    return boxmodel.Pro_190;
  }

  console.warn(
    `Unexpected model parameter value: "${modelParam}" (decoded: "${decodedModel}"). Expected "Pro 175" or "Pro 190".`
  );
  return undefined;
}

/**
 * Builds the where clause for filtering boxes by date range
 */
function buildDateFilterWhereClause(
  locationId: string,
  startDateTime: Date,
  endDateTime: Date,
  modelEnum?: boxmodel
): Prisma.boxesWhereInput {
  const baseWhere: Prisma.boxesWhereInput = {
    stands: { location_id: locationId },
    status: boxStatus.Active,
    bookings: {
      none: {
        status: { in: [BookingStatus.Upcoming, BookingStatus.Active] },
        AND: [
          { start_date: { lte: endDateTime } },
          { end_date: { gte: startDateTime } },
        ],
      },
    },
  };

  if (modelEnum === boxmodel.Pro_175) {
    return { ...baseWhere, model: 'Pro_175' as boxmodel };
  }

  if (modelEnum === boxmodel.Pro_190) {
    return { ...baseWhere, model: 'Pro_190' as boxmodel };
  }

  return baseWhere;
}

/**
 * Fetches boxes with date filtering (excludes boxes with overlapping bookings)
 * Orders by score first (lower scores = higher priority), then by stand name
 */
async function fetchBoxesWithDateFilter(
  locationId: string,
  startDate: string,
  endDate: string,
  modelEnum?: boxmodel
): Promise<BoxWithStand[]> {
  const startDateTime = new Date(`${startDate}T00:00:00`);
  const endDateTime = new Date(`${endDate}T23:59:59`);

  const whereClause = buildDateFilterWhereClause(
    locationId,
    startDateTime,
    endDateTime,
    modelEnum
  );

  return await prisma.boxes.findMany({
    where: whereClause,
    include: {
      stands: { select: { id: true, name: true } },
    },
    orderBy: [
      { score: 'asc' }, // Primary sort: lower scores first (nulls last)
      { stands: { name: 'asc' } }, // Secondary sort: stand name
    ],
  });
}

/**
 * Fetches all active boxes for a location (without date filtering)
 * Orders by score first (lower scores = higher priority), then by stand name
 */
async function fetchAllActiveBoxes(
  locationId: string,
  modelEnum?: boxmodel
): Promise<BoxWithStand[]> {
  return await prisma.boxes.findMany({
    where: {
      stands: { location_id: locationId },
      status: boxStatus.Active,
      ...(modelEnum ? { model: modelEnum } : {}),
    },
    include: {
      stands: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { score: 'asc' }, // Primary sort: lower scores first (nulls last)
      { stands: { name: 'asc' } }, // Secondary sort: stand name
    ],
  });
}

/**
 * Groups boxes by stand
 */
function groupBoxesByStand(boxes: BoxWithStand[]): Record<string, StandGroup> {
  return boxes.reduce(
    (acc, box) => {
      const standId = box.stands.id;
      if (!acc[standId]) {
        acc[standId] = {
          standId: box.stands.id,
          standName: box.stands.name,
          boxes: [],
        };
      }
      acc[standId].boxes.push({
        id: box.id,
        model: normalizeModelForDisplay(box.model), // Normalize to display format (Pro 175 instead of Pro_175)
        displayId: box.display_id,
        compartment: box.compartment,
        isAvailable: true,
      });
      return acc;
    },
    {} as Record<string, StandGroup>
  );
}

/**
 * Gets the lowest score from a stand's boxes for sorting stands
 */
function getStandLowestScore(stand: StandGroup, boxes: BoxWithStand[]): number {
  const scores = stand.boxes
    .map((box) => {
      const fullBox = boxes.find((b) => b.id === box.id);
      return fullBox?.score ? Number(fullBox.score) : Number.MAX_SAFE_INTEGER;
    })
    .filter((score) => score !== Number.MAX_SAFE_INTEGER);

  return scores.length > 0 ? Math.min(...scores) : Number.MAX_SAFE_INTEGER;
}

/**
 * Processes and organizes boxes into stands
 * Boxes are already ordered by score from the database query,
 * so we just group them and sort stands by their lowest score box
 */
function processBoxesIntoStands(boxes: BoxWithStand[]): StandGroup[] {
  // Group boxes by stand (boxes are already ordered by score from query)
  const grouped = groupBoxesByStand(boxes);
  
  // Convert to array and sort stands by their lowest score box
  // This prioritizes stands with better (lower score) boxes
  const stands = Object.values(grouped);
  
  return stands.sort((standA, standB) => {
    const scoreA = getStandLowestScore(standA, boxes);
    const scoreB = getStandLowestScore(standB, boxes);
    return scoreA - scoreB;
  });
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
    const modelParam = searchParams.get('model');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Parse model parameter
    const modelEnum = parseModelParam(modelParam);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Model conversion:', {
        modelParam,
        modelEnum,
        modelEnumType: typeof modelEnum,
        isPro175: modelEnum === boxmodel.Pro_175,
        isPro190: modelEnum === boxmodel.Pro_190,
        enumPro175Value: boxmodel.Pro_175,
        enumPro190Value: boxmodel.Pro_190,
        enumPro175String: String(boxmodel.Pro_175),
        enumPro190String: String(boxmodel.Pro_190),
      });
    }

    // Fetch boxes based on whether dates are provided
    const boxes = startDate && endDate
      ? await fetchBoxesWithDateFilter(id, startDate, endDate, modelEnum)
      : await fetchAllActiveBoxes(id, modelEnum);

    // Process boxes into stands with proper sorting
    const boxesByStand = processBoxesIntoStands(boxes);

    return NextResponse.json({
      locationId: id,
      availableBoxes: boxesByStand,
      totalAvailable: boxes.length,
      totalBoxes: boxes.length,
    });
  } catch (error) {
    console.error('Failed to fetch available boxes', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        error,
      });
    }
    
    return NextResponse.json(
      {
        error: 'Unable to check box availability.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

