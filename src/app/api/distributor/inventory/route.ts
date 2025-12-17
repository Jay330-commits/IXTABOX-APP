import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BoxInventoryService } from '@/services/distributors/inventory/BoxInventoryService';

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
    const standId = searchParams.get('standId');

    const service = new BoxInventoryService();

    if (standId) {
      const inventory = await service.getInventoryByStand(standId);
      return NextResponse.json({ success: true, data: inventory });
    }

    const overview = await service.getInventoryOverview(user.distributors.id);
    const lowStockAlerts = await service.getLowStockAlerts(user.distributors.id);
    const maintenanceAlerts = await service.getMaintenanceAlerts(user.distributors.id);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        alerts: {
          lowStock: lowStockAlerts,
          maintenance: maintenanceAlerts,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

