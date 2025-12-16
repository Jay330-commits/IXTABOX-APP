import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { DistributorNotificationService } from '@/services/distributors/DistributorNotificationService';

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

    const service = new DistributorNotificationService();

    if (type === 'low-stock') {
      const alerts = await service.getLowStockNotifications(user.distributors.id);
      return NextResponse.json({ success: true, data: alerts });
    }

    if (type === 'maintenance') {
      const alerts = await service.getMaintenanceNotifications(user.distributors.id);
      return NextResponse.json({ success: true, data: alerts });
    }

    if (type === 'payments') {
      const reminders = await service.getPaymentReminders(user.distributors.id);
      return NextResponse.json({ success: true, data: reminders });
    }

    if (type === 'contracts') {
      const notifications = await service.getContractRenewalNotifications(user.distributors.id);
      return NextResponse.json({ success: true, data: notifications });
    }

    const notifications = await service.getDistributorNotifications(user.distributors.id);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

