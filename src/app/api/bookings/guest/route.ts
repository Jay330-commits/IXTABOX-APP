import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus, boxmodel } from '@prisma/client';
import { getSupabaseStoragePublicUrl, getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, chargeId } = body;

    // SECURITY: Require BOTH email AND charge_id for all searches
    if (!email || !chargeId) {
      return NextResponse.json(
        { error: 'Both email address and Payment ID (charge ID) are required for security. Please use the link from your booking confirmation email.' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // SECURITY: Verify BOTH email AND charge_id match the booking
    // Use a SELECT query that checks both conditions
    const payment = await prisma.payments.findFirst({
      where: {
        charge_id: chargeId,
        users: {
          email: email.toLowerCase(), // Verify email matches the payment's user
        },
      },
      include: {
        bookings: {
          include: {
        boxes: {
          include: {
            stands: {
              include: {
                locations: true,
              },
            },
          },
        },
        payments: true,
            box_returns: true,
      },
        },
        users: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'No booking found. Please verify that both your email address and Payment ID match your booking confirmation email.' },
        { status: 404 }
      );
    }

    // Get the booking for this payment
    if (!payment.bookings) {
      return NextResponse.json({ bookings: [] });
    }

    const bookings = [payment.bookings];

    // Transform bookings to match the frontend format (similar to customer page)
    const formattedBookings = await Promise.all(bookings.map(async (booking) => {
      const days = Math.max(1, Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)));
      const totalAmount = parseFloat(booking.payments?.amount.toString() || '0');
      
      // Get price and deposit from box
      const boxPrice = booking.boxes.price 
        ? (typeof booking.boxes.price === 'string' ? parseFloat(booking.boxes.price) : Number(booking.boxes.price))
        : 300; // Default fallback
      const boxDeposit = booking.boxes.deposit 
        ? (typeof booking.boxes.deposit === 'string' ? parseFloat(booking.boxes.deposit) : Number(booking.boxes.deposit))
        : 0;

      // Generate signed URLs for return photos if they exist
      // IMPORTANT: box_returns bucket is PRIVATE, so we MUST always generate signed URLs
      // For guest bookings, we use service role key (no access token available)
      const getImageUrl = async (imagePath: string | null | undefined): Promise<string | null> => {
        if (!imagePath) return null;
        
        // If it's already a signed URL (contains token parameter), use it as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          if (imagePath.includes('token=') || imagePath.includes('&t=')) {
            return imagePath;
          }
          
          // Even if it looks like a public URL, extract the path and generate a signed URL
          // because the bucket is private
          try {
            const url = new URL(imagePath);
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
            if (pathMatch) {
              const extractedPath = pathMatch[1];
              // Generate signed URL using service role key (no access token for guests)
              const signedUrl = await getSupabaseStorageSignedUrl('box_returns', extractedPath, 3600);
              return signedUrl;
            }
          } catch (error) {
            console.error('[Guest Bookings API] Failed to parse URL:', error);
          }
        }
        
        // Extract just the path part if it's a full URL, or use as-is if it's already a path
        let cleanPath = imagePath;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          try {
            const url = new URL(imagePath);
            const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
            if (pathMatch) {
              cleanPath = pathMatch[1];
            }
          } catch {
            // If we can't parse it, try to extract path manually
            const parts = imagePath.split('/box_returns/');
            if (parts.length > 1) {
              cleanPath = parts[1];
            }
          }
        }
        
        // Security: Validate path format to prevent path traversal attacks
        // Expected format: box_front_view/uuid-timestamp.jpg or box_back_view/... or closed_stand_view/...
        // Note: closed_stand_view doesn't have 'box_' prefix, so we need to allow both patterns
        const isValidPath = /^(box_(front_view|back_view)|closed_stand_view)\/[a-f0-9-]+-\d+\.(jpg|jpeg|png)$/i;
        if (!isValidPath.test(cleanPath)) {
          console.error('[Guest Bookings API] Security: Invalid image path format:', cleanPath);
          return null;
        }
        
        // Always generate signed URL for private bucket (using service role key)
        // SECURITY: Uses service role key. Permission verified by requiring email + chargeId match.
        try {
          const signedUrl = await getSupabaseStorageSignedUrl('box_returns', cleanPath, 3600);
          return signedUrl;
        } catch (error) {
          console.error('[Guest Bookings API] Failed to create signed URL for box_returns:', error);
          // Return null if we can't generate signed URL (better than returning broken public URL)
          return null;
        }
      };
      
      // Generate URLs for all return photos (expire in 1 hour)
      let boxFrontView: string | null = null;
      let boxBackView: string | null = null;
      let closedStandLock: string | null = null;
      
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
          console.error('[Guest Bookings API] Filtered out public URLs - signed URL generation failed:', {
            boxFrontView: results[0]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
            boxBackView: results[1]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
            closedStandLock: results[2]?.includes('/storage/v1/object/public/') ? 'public URL filtered' : 'ok',
          });
        }
      } catch (error) {
        console.error('[Guest Bookings API] Error processing return photos:', error);
        // Keep values as null if processing fails
      }

      return {
        id: booking.id,
        location: booking.boxes.stands.locations.name,
        locationAddress: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || null,
        locationId: booking.boxes.stands.locations.id,
        standId: booking.boxes.stand_id,
        standDisplayId: booking.boxes.stands.display_id,
        boxId: booking.box_id,
        boxDisplayId: booking.boxes.display_id,
        address: booking.boxes.stands.locations.address || booking.boxes.stands.locations.name || 'Unknown Location',
        startDate: booking.start_date.toISOString(),
        endDate: booking.end_date.toISOString(),
        date: booking.start_date.toISOString(), // For compatibility
        status: (booking.status || BookingStatus.Upcoming).toLowerCase() as 'active' | 'upcoming' | 'completed' | 'cancelled' | 'confirmed',
        amount: totalAmount,
        pricePerDay: boxPrice,
        deposit: boxDeposit,
        model: booking.boxes.model === boxmodel.Pro_190 ? 'Pro 190' : 'Pro 175',
        lockPin: booking.lock_pin ? String(booking.lock_pin) : null,
        paymentId: booking.payments?.id || null,
        chargeId: booking.payments?.charge_id || null,
        paymentStatus: booking.payments?.status || null,
        createdAt: booking.created_at?.toISOString() || null,
        returnedAt: booking.returned_at?.toISOString() || null,
        boxFrontView,
        boxBackView,
        closedStandLock,
      };
    }));

    // Include user details if available
    const userDetails = payment.users ? {
      name: payment.users.full_name || 'Guest User',
      email: payment.users.email,
      phone: payment.users.phone || null,
    } : null;

    return NextResponse.json({ 
      bookings: formattedBookings,
      user: userDetails,
    });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

