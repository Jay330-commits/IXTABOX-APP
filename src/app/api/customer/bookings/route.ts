import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatusService } from '@/services/bookings/BookingStatusService';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[Bookings API] Request headers:', {
      hasAuth: !!request.headers.get('authorization'),
      cookieCount: request.cookies.getAll().length,
    });
    
    const supabaseUser = await getCurrentUser(request);
    
    if (!supabaseUser) {
      console.error('[Bookings API] No Supabase user found - authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[Bookings API] Authenticated user:', supabaseUser.email);

    // Get user from database
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      console.error('[Bookings API] User not found for email:', supabaseUser.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Bookings API] Fetching bookings for user:', user.id, user.email);

    // First, let's try to find all payments for this user
    const userPayments = await prisma.payments.findMany({
      where: {
        user_id: user.id,
      },
      select: {
        id: true,
      },
    });

    console.log('[Bookings API] Found payments for user:', userPayments.length, userPayments.map(p => p.id));

    // Fetch ALL bookings that are linked to payments with this user_id
    // IMPORTANT: Do NOT filter by status - return all bookings regardless of status
    // (active, completed, upcoming, cancelled, confirmed, etc.)
    const bookings = await prisma.bookings.findMany({
      where: {
        payment_id: {
          in: userPayments.map(p => p.id),
        },
        // Explicitly do NOT filter by status - return all statuses
      },
      include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: {
                  include: {
                    distributors: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            users: true,
          },
        },
      },
      orderBy: [
        // Sort by status priority using CASE: active/confirmed > Upcoming > completed > cancelled
        // In Prisma, we'll sort manually in JavaScript since CASE expressions aren't directly supported
        {
          created_at: 'desc', // First sort by date
        },
      ],
    });

    console.log('[Bookings API] Found bookings:', bookings.length);
    
    // Log all booking statuses from DB to verify we're getting all statuses
    const statusCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const status = b.status?.toString() || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[Bookings API] Booking status counts from DB:', statusCounts);

    // Calculate current status for each booking based on dates
    const statusService = new BookingStatusService();
    const now = new Date();

    // Define status priority for sorting (lower number = higher priority)
    const statusPriority: Record<string, number> = {
      'active': 1,
      'confirmed': 2,
      'upcoming': 3,
      'completed': 4,
      'cancelled': 5,
    };

    // Sync booking statuses to DB (update any that have changed)
    const statusUpdates: Array<{ bookingId: string; newStatus: string }> = [];
    
    // Debug: Log raw booking statuses from database
    console.log('[Bookings API] Raw booking statuses from DB:', bookings.map(b => ({
      id: b.id.slice(0, 8),
      dbStatus: b.status,
      dbStatusType: typeof b.status,
      dbStatusString: String(b.status),
      startDate: b.start_date.toISOString().split('T')[0],
      endDate: b.end_date.toISOString().split('T')[0],
    })));

    // Transform bookings to match the frontend format
    const formattedBookings = bookings.map((booking) => {
      // Use DB status if booking is Cancelled or Completed (these should never change)
      // Otherwise calculate status based on dates
      let finalStatus: string;
      const dbStatus = booking.status as BookingStatus | null;
      
      console.log(`[Bookings API] Processing booking ${booking.id.slice(0, 8)}:`, {
        dbStatus,
        dbStatusType: typeof dbStatus,
        isCancelled: dbStatus === BookingStatus.Cancelled,
        isCompleted: dbStatus === BookingStatus.Completed,
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
      });
      
      // Skip only "confirmed" status - keep it on hold, don't recalculate
      if (dbStatus === BookingStatus.Confirmed) {
        // Keep confirmed status as-is (manually set, don't recalculate)
        finalStatus = dbStatus.toLowerCase();
        console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Using DB status (${dbStatus}) -> ${finalStatus} (confirmed, keeping on hold)`);
      } else if (dbStatus === BookingStatus.Cancelled || dbStatus === BookingStatus.Completed) {
        // Keep DB status for cancelled/completed bookings - don't recalculate (final states)
        finalStatus = dbStatus.toLowerCase();
        console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Using DB status (${dbStatus}) -> ${finalStatus} (final state)`);
      } else {
        // Calculate status for Upcoming/active bookings based on dates
        // (Confirmed, Cancelled, Completed are handled above as final states)
        const calculatedStatus = statusService.calculateBookingStatus(
          booking.start_date,
          booking.end_date,
          now
        );
        finalStatus = calculatedStatus.toLowerCase();
        
        console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Calculated status (${calculatedStatus}) -> ${finalStatus}`);
        
        // If calculated status differs from DB status, queue it for update
        // Note: We're already in the else block, so dbStatus can only be Upcoming or Active
        const dbStatusLower = dbStatus?.toLowerCase() || '';
        if (dbStatusLower !== finalStatus) {
          console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Status mismatch - DB: "${dbStatusLower}", Calculated: "${finalStatus}". Queuing update.`);
          statusUpdates.push({
            bookingId: booking.id,
            newStatus: calculatedStatus, // Use the enum value (BookingStatus)
          });
        } else {
          console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Status matches DB.`);
        }
      }
      
      console.log(`[Bookings API] Booking ${booking.id.slice(0, 8)}: Final status for response = "${finalStatus}"`);

      const formattedBooking = {
        id: booking.id,
        bookingDisplayId: booking.display_id,
        location: booking.boxes.stands.locations.name || 'Unknown Location',
        locationAddress: booking.boxes.stands.locations.address || null,
        date: booking.start_date.toISOString().split('T')[0],
        status: finalStatus, // Use DB status if Cancelled/Completed, otherwise calculated
        amount: parseFloat(booking.payments?.amount.toString() || '0'),
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        boxId: booking.box_id,
        boxDisplayId: booking.boxes.display_id,
        standId: booking.boxes.stand_id,
        standDisplayId: booking.boxes.stands.display_id,
        locationId: booking.boxes.stands.location_id,
        locationDisplayId: booking.boxes.stands.locations.display_id,
        lockPin: booking.lock_pin || null,
        paymentId: booking.payment_id,
        paymentStatus: booking.payments?.status || null,
        chargeId: booking.payments?.charge_id || null,
        createdAt: booking.created_at ? booking.created_at.toISOString() : new Date().toISOString(),
        returnedAt: booking.returned_at ? booking.returned_at.toISOString() : null,
        model: booking.boxes.model || 'Pro 175',
      };
      
      // Log the formatted booking status - especially for cancelled bookings
      if (finalStatus === 'cancelled') {
        console.log(`[Bookings API] ✅ CANCELLED booking formatted ${booking.id.slice(0, 8)}:`, {
          id: formattedBooking.id.slice(0, 8),
          status: formattedBooking.status,
          statusType: typeof formattedBooking.status,
          dbStatusWas: dbStatus,
        });
      }
      
      return formattedBooking;
      
      // Log the formatted booking status before returning
      if (finalStatus === 'cancelled') {
        console.log(`[Bookings API] Formatted cancelled booking ${booking.id.slice(0, 8)}:`, {
          id: formattedBooking.id.slice(0, 8),
          status: formattedBooking.status,
          statusType: typeof formattedBooking.status,
        });
      }
      
      return formattedBooking;
    });

    // Debug: Log all booking statuses before returning
    const finalStatusCounts: Record<string, number> = {};
    formattedBookings.forEach(b => {
      finalStatusCounts[b.status] = (finalStatusCounts[b.status] || 0) + 1;
    });
    console.log('[Bookings API] Final booking statuses being returned:', formattedBookings.map(b => ({
      id: b.id.slice(0, 8),
      status: b.status,
      statusType: typeof b.status
    })));
    console.log('[Bookings API] Final status counts:', finalStatusCounts);
    console.log('[Bookings API] Total bookings being returned:', formattedBookings.length);

    // Sync status updates to database if any bookings need status changes
    if (statusUpdates.length > 0) {
      try {
        await statusService.updateBookingStatuses(
          statusUpdates.map(({ bookingId, newStatus }) => ({
            bookingId,
            newStatus: newStatus as BookingStatus,
          }))
        );
        console.log(`[Bookings API] Synced ${statusUpdates.length} booking status updates to DB`);
      } catch (syncError) {
        console.error('[Bookings API] Error syncing booking statuses:', syncError);
        // Don't fail the request, just log the error
      }
    }

    // Sort bookings: active/confirmed/Upcoming first, then completed, then cancelled at bottom
    // Within each status group, sort by most recent first
    formattedBookings.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 999;
      const priorityB = statusPriority[b.status] || 999;
      
      // First sort by status priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by created date (most recent first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

