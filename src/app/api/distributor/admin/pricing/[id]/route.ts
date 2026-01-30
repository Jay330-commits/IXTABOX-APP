import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { LocationPricingService, UpdateLocationPricingData } from '@/services/pricing/LocationPricingService';

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

    // Verify pricing rule belongs to distributor's location
    const existing = await prisma.$queryRaw<Array<{ location_id: string }>>`
      SELECT location_id FROM location_pricing WHERE id = ${id}::uuid
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 });
    }

    const location = await prisma.locations.findUnique({
      where: { id: existing[0].location_id },
      select: { distributor_id: true },
    });

    if (!location || location.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: UpdateLocationPricingData = {};
    if (body.week !== undefined) updateData.week = parseInt(body.week);
    if (body.recommendedPrice !== undefined) updateData.recommendedPrice = body.recommendedPrice !== null ? parseFloat(body.recommendedPrice) : null;
    if (body.actualPrice !== undefined) updateData.actualPrice = parseFloat(body.actualPrice);

    const service = new LocationPricingService();
    const updated = await service.updateLocationPricing(id, updateData);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pricing' },
      { status: 500 }
    );
  }
}

