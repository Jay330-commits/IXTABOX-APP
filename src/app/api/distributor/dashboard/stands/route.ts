import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { DashboardStatisticsService } from '@/services/distributors/DashboardStatisticsService';

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

    const service = new DashboardStatisticsService();
    const overview = await service.getLocationsOverview(user.distributors.id);

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('Error fetching stands overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stands overview' },
      { status: 500 }
    );
  }
}

