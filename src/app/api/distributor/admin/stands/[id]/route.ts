import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { StandService, UpdateStandData } from '@/services/locations/StandService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    // Verify stand belongs to distributor's location
    const stand = await prisma.stands.findUnique({
      where: { id },
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

    const updateData: UpdateStandData = {};
    if (body.name) updateData.name = body.name;
    if (body.capacity !== undefined) updateData.capacity = parseInt(body.capacity);
    if (body.locationId) {
      // Verify new location belongs to distributor
      const newLocation = await prisma.locations.findUnique({
        where: { id: body.locationId },
        select: { distributor_id: true },
      });
      if (!newLocation || newLocation.distributor_id !== user.distributors.id) {
        return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      }
      updateData.locationId = body.locationId;
    }

    const service = new StandService();
    const updatedStand = await service.updateStand(id, updateData);

    return NextResponse.json({ success: true, data: updatedStand });
  } catch (error) {
    console.error('Error updating stand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update stand' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify stand belongs to distributor's location
    const stand = await prisma.stands.findUnique({
      where: { id },
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

    const service = new StandService();
    await service.deleteStand(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete stand' },
      { status: 500 }
    );
  }
}
