import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { status, BoxModel, BookingStatus } from '@prisma/client';

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

    // Get location with stands and boxes
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

    // Debug: Log first box from database to verify compartment field
    console.log('=== Location Data from Database ===');
    console.log('Number of stands:', location.stands.length);
    if (location.stands.length > 0) {
      console.log('First stand boxes:', location.stands[0].boxes.length);
      if (location.stands[0].boxes.length > 0) {
        const firstBox = location.stands[0].boxes[0];
        console.log('=== First Box from Database ===');
        console.log('Box ID:', firstBox.id);
        console.log('Box keys:', Object.keys(firstBox));
        console.log('Has compartment property?', 'compartment' in firstBox);
        console.log('Compartment value:', firstBox.compartment);
        console.log('Compartment type:', typeof firstBox.compartment);
        console.log('Full first box object:', JSON.stringify(firstBox, null, 2));
        
        // Also check all boxes
        console.log('=== All Boxes Compartment Values ===');
        location.stands.forEach((stand, standIdx) => {
          stand.boxes.forEach((box, boxIdx) => {
            console.log(`Stand ${standIdx + 1}, Box ${boxIdx + 1}: ID=${box.id}, Compartment=${box.compartment}`);
          });
        });
      }
    }

    // Filter boxes based on model and availability
    const availableBoxes = location.stands.flatMap((stand) =>
      stand.boxes
        .filter((box) => {
          // Filter by model if specified
          if (model && box.model !== model) return false;
          
          // Filter by status
          if (box.status !== status.Available) return false;

          // Check if box is available for the requested dates
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Check if box has any conflicting bookings
            const hasConflict = box.bookings.some((booking) => {
              const bookingStart = new Date(booking.start_date);
              const bookingEnd = new Date(booking.end_date);
              
              // Check for overlap
              return (
                (start <= bookingEnd && end >= bookingStart)
              );
            });

            if (hasConflict) return false;
          }

          return true;
        })
        .map((box) => {
          // Access compartment - it should exist after Prisma client regeneration
          const compartment = box.compartment ?? null;
          console.log(`Box ${box.id}: compartment = ${compartment} (type: ${typeof compartment})`);
          
          return {
            id: box.id,
            standId: stand.id,
            standName: stand.name,
            model: box.model,
            displayId: box.display_id,
            compartment: compartment,
            status: box.status,
          };
        })
    );

    // Group by stand for better organization
    const boxesByStand = availableBoxes.reduce((acc, box) => {
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
      });
      return acc;
    }, {} as Record<string, { standId: string; standName: string; boxes: Array<{ id: string; model: BoxModel; displayId: string; compartment: number | null }> }>);

    const responseData = {
      locationId: id,
      locationName: location.name,
      availableBoxes: Object.values(boxesByStand),
      totalAvailable: availableBoxes.length,
    };

    console.log('=== API Response Data ===');
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    if (responseData.availableBoxes.length > 0 && responseData.availableBoxes[0].boxes.length > 0) {
      console.log('First box in response:', responseData.availableBoxes[0].boxes[0]);
      console.log('First box compartment:', responseData.availableBoxes[0].boxes[0].compartment);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch available boxes', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Unable to check box availability.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

