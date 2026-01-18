import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { LocationService } from '@/services/locations/LocationService';
import { status } from '@prisma/client';

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
    const { name, address, status: locationStatus } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const service = new LocationService();
    const location = await service.createLocation({
      distributorId: user.distributors.id,
      name,
      address: address || null,
      status: locationStatus ? (locationStatus as status) : status.Available,
    });

    return NextResponse.json({ success: true, data: location });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create location' },
      { status: 500 }
    );
  }
}
