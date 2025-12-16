import { NextRequest, NextResponse } from 'next/server';
import { boxStatus, BoxModel, BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma/prisma';

// ============================================================================
// Type Definitions
// ============================================================================

type StandGroup = {
  standId: string;
  standName: string;
  boxes: Array<{
    id: string;
    model: BoxModel;
    displayId: string;
    compartment: number | null;
    isAvailable: boolean;
  }>;
};

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

    // If dates are provided, use SQL query to filter boxes that don't have overlapping bookings
    if (startDate && endDate) {
      const startDateTime = new Date(`${startDate}T00:00:00`);
      const endDateTime = new Date(`${endDate}T23:59:59`);

      // Build model filter
      const modelFilter = model ? { model: model as BoxModel } : {};

      // Query boxes - only return boxes without overlapping bookings
      // A booking overlaps if: booking.start_date <= endDateTime AND booking.end_date >= startDateTime
      const availableBoxes = await prisma.boxes.findMany({
        where: {
          stands: {
            location_id: id,
          },
          status: boxStatus.Active,
          ...modelFilter,
          // Exclude boxes that have overlapping bookings
          bookings: {
            none: {
              status: {
                in: [BookingStatus.Upcoming, BookingStatus.Active],
              },
              AND: [
                { start_date: { lte: endDateTime } },
                { end_date: { gte: startDateTime } },
              ],
            },
          },
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
          {
            Score: 'asc', // Lower scores first (nulls last)
          },
          {
            stands: {
              name: 'asc',
            },
          },
        ],
      });

      // Group boxes by stand, maintaining score order
      const grouped = availableBoxes.reduce(
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
            model: box.model,
            displayId: box.display_id,
            compartment: box.compartment,
            isAvailable: true,
          });
          return acc;
        },
        {} as Record<string, StandGroup>
      );

      // Sort boxes within each stand by score (lower scores first)
      const boxesByStand = Object.values(grouped).map(stand => ({
        ...stand,
        boxes: stand.boxes.sort((a, b) => {
          const boxA = availableBoxes.find(box => box.id === a.id);
          const boxB = availableBoxes.find(box => box.id === b.id);
          const scoreA = boxA?.Score ? Number(boxA.Score) : Number.MAX_SAFE_INTEGER; // Null scores go last
          const scoreB = boxB?.Score ? Number(boxB.Score) : Number.MAX_SAFE_INTEGER;
          return scoreA - scoreB;
        }),
      }));

      return NextResponse.json({
        locationId: id,
        availableBoxes: boxesByStand,
        totalAvailable: availableBoxes.length,
        totalBoxes: availableBoxes.length,
      });
    }

    // If no dates provided, return all active boxes (for initial load)
    const allBoxes = await prisma.boxes.findMany({
      where: {
        stands: {
          location_id: id,
        },
        status: boxStatus.Active,
        ...(model ? { model: model as BoxModel } : {}),
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
        {
          Score: 'asc', // Lower scores first (nulls last)
        },
        {
          stands: {
            name: 'asc',
          },
        },
      ],
    });

    // Group boxes by stand, maintaining score order
    const grouped = allBoxes.reduce(
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
          model: box.model,
          displayId: box.display_id,
          compartment: box.compartment,
          isAvailable: true,
        });
        return acc;
      },
      {} as Record<string, StandGroup>
    );

    // Sort boxes within each stand by score (lower scores first)
    const boxesByStand = Object.values(grouped).map(stand => ({
      ...stand,
      boxes: stand.boxes.sort((a, b) => {
        const boxA = allBoxes.find(box => box.id === a.id);
        const boxB = allBoxes.find(box => box.id === b.id);
        const scoreA = boxA?.Score ? Number(boxA.Score) : Number.MAX_SAFE_INTEGER; // Null scores go last
        const scoreB = boxB?.Score ? Number(boxB.Score) : Number.MAX_SAFE_INTEGER;
        return scoreA - scoreB;
      }),
    }));

    return NextResponse.json({
      locationId: id,
      availableBoxes: boxesByStand,
      totalAvailable: allBoxes.length,
      totalBoxes: allBoxes.length,
    });
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
