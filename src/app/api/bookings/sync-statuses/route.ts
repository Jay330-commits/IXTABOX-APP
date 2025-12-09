import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatusService } from '@/services/bookings/BookingStatusService';
import { BookingStatus } from '@prisma/client';

/**
 * API endpoint to sync booking statuses
 * Supports both batch updates and full user sync
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;
    
    const statusService = new BookingStatusService();
    
    // If specific updates are provided, use batch update
    if (updates && Array.isArray(updates)) {
      // Validate updates format
      const validUpdates = updates.filter((update: unknown): update is { bookingId: string; newStatus: BookingStatus } => {
        if (
          typeof update === 'object' &&
          update !== null &&
          'bookingId' in update &&
          'newStatus' in update &&
          typeof update.bookingId === 'string' &&
          typeof update.newStatus === 'string'
        ) {
          return Object.values(BookingStatus).includes(update.newStatus as BookingStatus);
        }
        return false;
      });

      if (validUpdates.length === 0) {
        return NextResponse.json({ 
          success: true, 
          updated: 0,
          message: 'No valid updates provided'
        });
      }

      // Verify user owns these bookings (security check)
      const dbUser = await prisma.public_users.findUnique({
        where: { email: user.email! },
        include: {
          payments: {
            include: {
              bookings: {
                where: {
                  id: {
                    in: validUpdates.map((u: { bookingId: string }) => u.bookingId),
                  },
                },
              },
            },
          },
        },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Filter to only include bookings owned by this user
      const userBookingIds = new Set(
        dbUser.payments
          .filter((p) => p.bookings !== null)
          .map((p) => p.bookings!.id)
      );

      const authorizedUpdates = validUpdates.filter((update: { bookingId: string }) =>
        userBookingIds.has(update.bookingId)
      );

      if (authorizedUpdates.length === 0) {
        return NextResponse.json({ 
          success: true, 
          updated: 0,
          message: 'No authorized bookings to update'
        });
      }

      const result = await statusService.updateBookingStatuses(
        authorizedUpdates.map((u: { bookingId: string; newStatus: BookingStatus }) => ({
          bookingId: u.bookingId,
          newStatus: u.newStatus,
        }))
      );

      return NextResponse.json({ 
        success: true, 
        updated: result.updated 
      });
    } else {
      // Sync all user bookings
      const dbUser = await prisma.public_users.findUnique({
        where: { email: user.email! },
      });
      
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const result = await statusService.syncUserBookingStatuses(dbUser.id);
      return NextResponse.json({ 
        success: true, 
        updated: result.updated 
      });
    }
  } catch (error) {
    console.error('Error syncing booking statuses:', error);
    return NextResponse.json(
      { error: 'Failed to sync statuses' },
      { status: 500 }
    );
  }
}

