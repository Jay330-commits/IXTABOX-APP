import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatusService } from '@/services/bookings/BookingStatusService';
import { BookingStatus } from '@prisma/client';
import { getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

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

    // Extract access token from request for signed URL generation
    // Try Authorization header first
    let accessToken: string | undefined;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
      console.log('[Bookings API] Found access token in Authorization header');
    } else {
      // Fallback: extract from Supabase cookies (same logic as createServerSupabaseClient)
      const cookieStore = request.cookies;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || '';
      const authTokenCookieName = projectRef ? `sb-${projectRef}-auth-token` : null;
      
      if (authTokenCookieName) {
        const authCookie = cookieStore.get(authTokenCookieName);
        if (authCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(authCookie.value));
            if (parsed?.access_token) {
              accessToken = parsed.access_token;
              console.log('[Bookings API] Found access token in cookie:', authTokenCookieName);
            }
          } catch {
            // If not JSON, might be a direct token
            if (authCookie.value.length > 50) {
              accessToken = authCookie.value;
              console.log('[Bookings API] Found access token in cookie (non-JSON)');
            }
          }
        }
      }
      
      // Fallback: search for any cookie containing 'auth-token'
      if (!accessToken) {
        for (const cookie of cookieStore.getAll()) {
          if (cookie.name.includes('auth-token') || cookie.name.includes('supabase') || cookie.name.startsWith('sb-')) {
            try {
              const parsed = JSON.parse(decodeURIComponent(cookie.value));
              if (parsed?.access_token) {
                accessToken = parsed.access_token;
                console.log('[Bookings API] Found access token in cookie:', cookie.name);
                break;
              }
            } catch {
              if (cookie.value.length > 50 && !accessToken) {
                accessToken = cookie.value;
                console.log('[Bookings API] Found access token in cookie (non-JSON):', cookie.name);
                break;
              }
            }
          }
        }
      }
      
      if (!accessToken) {
        console.warn('[Bookings API] No access token found in headers or cookies - signed URL generation may fail');
      }
    }

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
    // Note: Extensions include may fail if database hasn't been migrated yet
    let bookings;
    try {
      bookings = await prisma.bookings.findMany({
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
          box_returns: true,
          extensions: {
            orderBy: {
              created_at: 'desc',
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
    } catch (error) {
      // If extensions relation doesn't exist (database not migrated), try without it
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('column') || msg.includes('does not exist')) {
        console.warn('[Bookings API] Extensions table not found, fetching bookings without extensions. Please run migration.');
        bookings = await prisma.bookings.findMany({
          where: {
            payment_id: {
              in: userPayments.map(p => p.id),
            },
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
            box_returns: true,
          },
          orderBy: [
            {
              created_at: 'desc',
            },
          ],
        });
      } else {
        throw error;
      }
    }

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
    // Note: We need to use Promise.all because we're generating signed URLs asynchronously
    const formattedBookings = await Promise.all(bookings.map(async (booking) => {
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

      // Convert bucket paths to signed URLs for return photos (secure, temporary access)
      // Images are stored in the 'box_returns' bucket in folders:
      // - box_front_view/
      // - box_back_view/
      // - closed_stand_view/
      // The database may store either full URLs or relative paths (e.g., "box_front_view/123-456.jpg")
      // IMPORTANT: box_returns bucket is PRIVATE, so we MUST always generate signed URLs
      const getImageUrl = async (imagePath: string | null | undefined): Promise<string | null> => {
        if (!imagePath) return null;
        
        // If it's already a signed URL (contains token parameter), use it as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          if (imagePath.includes('token=') || imagePath.includes('&t=')) {
            return imagePath;
          }
          }
          
        // Extract the path from the URL - the path format is: box_front_view/filename.jpg
        let cleanPath = imagePath;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          try {
            const url = new URL(imagePath);
            // Match pattern: /storage/v1/object/public/box_returns/box_front_view/filename.jpg
            // We want to extract: box_front_view/filename.jpg
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
            if (pathMatch && pathMatch[1]) {
              cleanPath = pathMatch[1];
              console.log('[Bookings API] Extracted path from URL:', { original: imagePath.substring(0, 100), extracted: cleanPath });
            } else {
              // Try manual extraction
              const parts = imagePath.split('/box_returns/');
              if (parts.length > 1) {
                cleanPath = parts[1];
                console.log('[Bookings API] Manually extracted path:', cleanPath);
              } else {
                console.error('[Bookings API] Could not extract path from URL:', imagePath);
                return null;
              }
            }
          } catch (error) {
            console.error('[Bookings API] Failed to parse URL:', error);
            return null;
          }
        }
        
        // Security: Validate path format to prevent path traversal attacks
        // Expected format: box_front_view/uuid-timestamp.jpg or box_back_view/... or closed_stand_view/...
        // Note: closed_stand_view doesn't have 'box_' prefix, so we need to allow both patterns
        const isValidPath = /^(box_(front_view|back_view)|closed_stand_view)\/[a-f0-9-]+-\d+\.(jpg|jpeg|png)$/i;
        if (!isValidPath.test(cleanPath)) {
          console.error('[Bookings API] Security: Invalid image path format:', cleanPath);
          return null;
        }
        
        // Always generate signed URL for private bucket
        // SECURITY: Use user's access token (server-side only, never sent to client)
        // Authentication is verified above via getCurrentUser() before reaching this point
        // Permission is verified by only returning bookings owned by the user (via payment.user_id check above)
        try {
          if (!accessToken) {
            console.error('[Bookings API] No access token available for signed URL generation');
            return null;
          }
          console.log('[Bookings API] Generating signed URL for path:', cleanPath, '(using user access token)');
          const signedUrl = await getSupabaseStorageSignedUrl('box_returns', cleanPath, 3600, accessToken);
          if (!signedUrl || signedUrl.includes('/storage/v1/object/public/')) {
            console.error('[Bookings API] Signed URL generation returned public URL - this should not happen!');
            return null;
          }
          console.log('[Bookings API] Generated signed URL successfully (first 100 chars):', signedUrl.substring(0, 100));
          return signedUrl;
        } catch (error) {
          console.error('[Bookings API] Failed to create signed URL for box_returns:', {
            path: cleanPath,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            originalPath: imagePath?.substring(0, 100),
            hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          });
          // Return null if we can't generate signed URL (better than returning broken public URL)
          return null;
        }
      };
      
      // Only generate signed URLs for completed bookings with return photos
      // This avoids unnecessary API calls for active/upcoming bookings
      let boxFrontView: string | null = null;
      let boxBackView: string | null = null;
      let closedStandLock: string | null = null;
      
      // Only process return photos if booking is completed and has return data
      if (finalStatus === 'completed' && booking.box_returns) {
        try {
          const results = await Promise.all([
        getImageUrl(booking.box_returns?.box_front_view),
        getImageUrl(booking.box_returns?.box_back_view),
        getImageUrl(booking.box_returns?.closed_stand_lock),
      ]);
      
          // Ensure we never return public URLs - if any result is a public URL, set it to null
          boxFrontView = results[0] && !results[0].includes('/storage/v1/object/public/') ? results[0] : null;
          boxBackView = results[1] && !results[1].includes('/storage/v1/object/public/') ? results[1] : null;
          closedStandLock = results[2] && !results[2].includes('/storage/v1/object/public/') ? results[2] : null;
          
          // Log if we filtered out any public URLs
          if (results[0]?.includes('/storage/v1/object/public/') || 
              results[1]?.includes('/storage/v1/object/public/') || 
              results[2]?.includes('/storage/v1/object/public/')) {
            console.error('[Bookings API] Filtered out public URLs - signed URL generation failed:', {
              boxFrontView: results[0]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
              boxBackView: results[1]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
              closedStandLock: results[2]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
            });
          }
        } catch (error) {
          console.error('[Bookings API] Error processing return photos:', error);
          // Keep values as null if processing fails
        }
      }
      
      // Debug logging for return photos (only log if we actually processed them)
      if (finalStatus === 'completed' && booking.box_returns && (boxFrontView || boxBackView || closedStandLock)) {
        console.log('[Bookings API] Return photos processed for completed booking', booking.id.slice(0, 8));
      }

      // Get price and deposit from box
      const boxPrice = booking.boxes.price 
        ? (typeof booking.boxes.price === 'string' ? parseFloat(booking.boxes.price) : Number(booking.boxes.price))
        : 300; // Default fallback
      const boxDeposit = booking.boxes.deposit 
        ? (typeof booking.boxes.deposit === 'string' ? parseFloat(booking.boxes.deposit) : Number(booking.boxes.deposit))
        : 0;

      // Calculate original booking amount
      const originalAmount = parseFloat(booking.payments?.amount.toString() || '0');
      
      // Extensions and return time from joins (no redundant columns on bookings)
      // Handle case where extensions might not be included in query (fallback scenario)
      const extensions = (booking as typeof booking & { extensions?: Array<{ additional_cost?: unknown; previous_end_date?: Date; created_at?: Date }> }).extensions;
      const extensionAmount = extensions && Array.isArray(extensions)
        ? extensions.reduce((sum: number, ext: { additional_cost?: unknown }) => {
            return sum + Number(ext.additional_cost || 0);
          }, 0)
        : 0;

      const totalAmount = originalAmount + extensionAmount;

      const hasExtensions = extensions && Array.isArray(extensions) && extensions.length > 0;
      const extensionCount = hasExtensions ? extensions.length : 0;
      const isExtended = hasExtensions;
      const returnedAt = booking.box_returns?.returned_at ?? booking.box_returns?.created_at ?? null;
      const firstExtensionByDate = hasExtensions && extensions.length > 0
        ? (extensions as Array<{ previous_end_date: Date; created_at: Date }>).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0]
        : null;
      const originalEndDate = firstExtensionByDate?.previous_end_date ?? null;

      const formattedBooking = {
        id: booking.id,
        bookingDisplayId: booking.display_id,
        location: booking.boxes.stands.locations.name || 'Unknown Location',
        locationAddress: booking.boxes.stands.locations.address || null,
        date: booking.start_date.toISOString().split('T')[0],
        status: finalStatus, // Use DB status if Cancelled/Completed, otherwise calculated
        amount: totalAmount, // Total amount including extensions
        originalAmount, // Original booking amount (for reference)
        extensionAmount, // Total extension amount (for reference)
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
        returnedAt: returnedAt ? returnedAt.toISOString() : null,
        model: booking.boxes.model || 'Pro 175',
        pricePerDay: boxPrice,
        deposit: boxDeposit,
        boxFrontView,
        boxBackView,
        closedStandLock,
        extensionCount,
        isExtended,
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
    }));

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

