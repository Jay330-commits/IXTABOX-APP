import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { DistributorFinancialService } from '@/services/distributors/DistributorFinancialService';

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

    const service = new DistributorFinancialService();

    if (type === 'summary') {
      const summary = await service.getPaymentSummary(user.distributors.id);
      return NextResponse.json({ success: true, data: summary });
    }

    if (type === 'pending') {
      const pending = await service.getPendingPayments(user.distributors.id);
      return NextResponse.json({ success: true, data: pending });
    }

    const payments = await service.getContractPayments(user.distributors.id);
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

