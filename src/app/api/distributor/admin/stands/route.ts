import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { StandService } from '@/services/locations/StandService';

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
    const { name, capacity, locationId } = body;

    if (!name || !locationId) {
      return NextResponse.json({ error: 'Name and locationId are required' }, { status: 400 });
    }

    // Verify location belongs to distributor
    const location = await prisma.locations.findUnique({
      where: { id: locationId },
      select: { distributor_id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const service = new StandService();
    const stand = await service.createStand({
      locationId,
      name,
      capacity: capacity ? parseInt(capacity) : 1,
    });

    return NextResponse.json({ success: true, data: stand });
  } catch (error) {
    console.error('Error creating stand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create stand' },
      { status: 500 }
    );
  }
}
