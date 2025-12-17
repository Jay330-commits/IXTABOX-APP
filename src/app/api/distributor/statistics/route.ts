import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { RentalStatisticsService } from '@/services/distributors/statistics/RentalStatisticsService';

export async function GET(request: NextRequest) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    const { searchParams } = new URL(request.url);
    const standId = searchParams.get('standId');
    const period = (searchParams.get('period') as 'month' | 'quarter' | 'year') || 'month';
    const type = searchParams.get('type');

    if (!standId) {
      return NextResponse.json(
        { error: 'standId is required' },
        { status: 400 }
      );
    }

    const service = new RentalStatisticsService();

    if (type === 'metrics') {
      const metrics = await service.getStandMetrics(standId);
      return NextResponse.json({ success: true, data: metrics });
    }

    const statistics = await service.getStandStatistics(standId, period);
    return NextResponse.json({ success: true, data: statistics });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

