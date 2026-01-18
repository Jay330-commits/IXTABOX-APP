import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { LocationService, UpdateLocationData } from '@/services/locations/LocationService';
import { status } from '@prisma/client';

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

    // Verify location belongs to distributor
    const location = await prisma.locations.findUnique({
      where: { id },
      select: { distributor_id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: UpdateLocationData = {};
    if (body.name) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.status) updateData.status = body.status as status;

    const service = new LocationService();
    const updatedLocation = await service.updateLocation(id, updateData);

    return NextResponse.json({ success: true, data: updatedLocation });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update location' },
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

    // Verify location belongs to distributor
    const location = await prisma.locations.findUnique({
      where: { id },
      select: { distributor_id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const service = new LocationService();
    await service.deleteLocation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete location' },
      { status: 500 }
    );
  }
}
