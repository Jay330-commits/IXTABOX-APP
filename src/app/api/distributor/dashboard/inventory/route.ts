import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { DashboardStatisticsService } from '@/services/distributors/dashboard/DashboardStatisticsService';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract access token from request for signed URL generation
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : undefined;

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
    const bookingStatus = searchParams.get('bookingStatus') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const showAllTime = searchParams.get('showAllTime') === 'true';

    // IMPORTANT: Only filter by bookingStatus if explicitly provided in query params
    // When no bookingStatus is provided, return ALL bookings regardless of status
    console.log('[Inventory API] Booking status filter:', bookingStatus || 'NONE (returning all statuses)');

    const service = new DashboardStatisticsService();
    
    const inventory = await service.getBookingInventory(user.distributors.id, {
      // Only pass bookingStatus if it was explicitly provided - otherwise undefined means return all
      bookingStatus: bookingStatus ? (BookingStatus[bookingStatus as keyof typeof BookingStatus]) : undefined,
      paymentStatus,
      locationId,
      dateFrom,
      dateTo,
      showAllTime,
      accessToken, // Pass access token for signed URL generation
    });

    // Use booking status counts based on actual booking statuses
    const statusCounts = await service.getBookingStatusCounts(user.distributors.id, {
      dateFrom,
      dateTo,
      showAllTime,
    });

    // Calculate revenue summary using payment completion dates
    const revenueSummary = await service.getBookingInventoryRevenue(
      user.distributors.id,
      {
        dateFrom,
        dateTo,
        showAllTime,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        inventory: inventory.map(item => ({
          ...item,
          startDate: item.startDate.toISOString(),
          endDate: item.endDate.toISOString(),
          paymentDate: item.paymentDate ? item.paymentDate.toISOString() : null,
          returnedAt: item.returnedAt ? item.returnedAt.toISOString() : null,
          boxReturnDate: item.boxReturnDate ? item.boxReturnDate.toISOString() : null,
        })),
        statusCounts,
        revenueSummary,
        currency: revenueSummary.currency,
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

