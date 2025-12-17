import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { StandService } from '@/services/locations/StandService';
import { PerformanceComparisonService } from '@/services/distributors/statistics/PerformanceComparisonService';

export async function GET(request: NextRequest) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

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
    const type = searchParams.get('type');
    const metric = searchParams.get('metric') as 'occupancy' | 'revenue' | 'bookings' | 'rating' | null;

    if (type === 'comparison') {
      const service = new PerformanceComparisonService();
      const comparison = await service.compareLocationsPerformance(
        user.distributors.id,
        metric || 'occupancy'
      );
      return NextResponse.json({ success: true, data: comparison });
    }

    const service = new StandService();
    const stands = await service.getAllStandsByDistributor(user.distributors.id);

    return NextResponse.json({ success: true, data: stands });
  } catch (error) {
    console.error('Error fetching stands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stands' },
      { status: 500 }
    );
  }
}

