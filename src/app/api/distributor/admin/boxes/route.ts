import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BoxService } from '@/services/locations/BoxService';
import { boxmodel, boxStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.distributors) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Fetch all boxes for the distributor with location and stand information
    const boxes = await prisma.boxes.findMany({
      where: {
        stands: {
          locations: {
            distributor_id: user.distributors.id,
          },
        },
      },
      include: {
        stands: {
          include: {
            locations: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { stands: { locations: { name: 'asc' } } },
        { stands: { name: 'asc' } },
        { id: 'asc' },
      ],
    });

    const formattedBoxes = boxes.map((box) => ({
      id: box.id,
      display_id: box.display_id,
      model: box.model,
      status: box.status,
      compartment: box.compartment,
      stand_id: box.stand_id,
      stand_name: box.stands.name,
      location_name: box.stands.locations.name,
      location_id: box.stands.locations.id,
    }));

    return NextResponse.json({ success: true, data: formattedBoxes });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch boxes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.distributors) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    const body = await request.json();
    const { model, status: boxStatusValue, compartment, standId } = body;

    if (!standId || !model) {
      return NextResponse.json({ error: 'standId and model are required' }, { status: 400 });
    }

    // Verify stand belongs to distributor's location
    const stand = await prisma.stands.findUnique({
      where: { id: standId },
      include: {
        locations: {
          select: {
            distributor_id: true,
          },
        },
      },
    });

    if (!stand) {
      return NextResponse.json({ error: 'Stand not found' }, { status: 404 });
    }

    if (stand.locations.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate model
    if (!Object.values(boxmodel).includes(model as boxmodel)) {
      return NextResponse.json({ error: 'Invalid box model' }, { status: 400 });
    }

    const service = new BoxService();
    const box = await service.createBox({
      standId,
      model: model as boxmodel,
      compartment: compartment ? parseInt(compartment) : null,
      status: boxStatusValue ? (boxStatusValue as boxStatus) : boxStatus.Active,
    });

    return NextResponse.json({ success: true, data: box });
  } catch (error) {
    console.error('Error creating box:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create box' },
      { status: 500 }
    );
  }
}
