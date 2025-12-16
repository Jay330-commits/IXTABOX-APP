import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { ExportService } from '@/services/distributors/ExportService';

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
    const type = searchParams.get('type'); // inventory, financial, performance
    const format = (searchParams.get('format') as 'csv' | 'pdf' | 'excel') || 'csv';
    const period = (searchParams.get('period') as 'month' | 'quarter' | 'year') || 'month';

    if (!type) {
      return NextResponse.json(
        { error: 'Export type is required' },
        { status: 400 }
      );
    }

    const service = new ExportService();
    let result;

    switch (type) {
      case 'inventory':
        result = await service.exportInventoryReport(user.distributors.id, format);
        break;
      case 'financial':
        result = await service.exportFinancialReport(user.distributors.id, period, format);
        break;
      case 'performance':
        result = await service.exportPerformanceReport(user.distributors.id, period, format);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        );
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

