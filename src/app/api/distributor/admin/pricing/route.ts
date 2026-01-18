import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { LocationPricingService } from '@/services/pricing/LocationPricingService';

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

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const service = new LocationPricingService();

    if (locationId) {
      const pricing = await service.getPricingByLocation(locationId);
      return NextResponse.json({ success: true, data: pricing });
    }

    // Get all locations for this distributor and their pricing
    const locations = await prisma.locations.findMany({
      where: {
        distributor_id: user.distributors.id,
      },
      select: {
        id: true,
        name: true,
        display_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const allPricing = await Promise.all(
      locations.map(async (location) => {
        try {
          const pricing = await service.getPricingByLocation(location.id);
          return {
            location: {
              id: location.id,
              name: location.name,
              display_id: location.display_id,
            },
            pricing: pricing || [],
          };
        } catch (error) {
          // If error fetching pricing, still return location with empty pricing
          console.error(`Error fetching pricing for location ${location.id}:`, error);
          return {
            location: {
              id: location.id,
              name: location.name,
              display_id: location.display_id,
            },
            pricing: [],
          };
        }
      })
    );

    return NextResponse.json({ success: true, data: allPricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pricing' },
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
    const { locationId, weekFrom, weekTo, pricePerDay, modelType } = body;

    if (!locationId || weekFrom === undefined || weekTo === undefined || !pricePerDay) {
      return NextResponse.json(
        { error: 'locationId, weekFrom, weekTo, and pricePerDay are required' },
        { status: 400 }
      );
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

    const service = new LocationPricingService();
    const pricing = await service.createLocationPricing({
      locationId,
      weekFrom: parseInt(weekFrom),
      weekTo: parseInt(weekTo),
      pricePerDay: parseFloat(pricePerDay),
      modelType: modelType || null,
    });

    return NextResponse.json({ success: true, data: pricing });
  } catch (error) {
    console.error('Error creating pricing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pricing' },
      { status: 500 }
    );
  }
}
