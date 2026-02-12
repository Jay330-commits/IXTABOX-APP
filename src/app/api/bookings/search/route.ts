import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus, boxmodel } from '@prisma/client';
import { getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

/**
 * Format a booking to match the guest bookings API response format
 * so search results display identically to the main bookings list.
 */
async function formatBookingForGuestDisplay(booking: {
  id: string;
  start_date: Date;
  end_date: Date;
  status: string | null;
  lock_pin: number | null;
  created_at: Date;
  boxes: {
    stand_id: string;
    model: string;
    display_id: string;
    price: unknown;
    deposit: unknown;
    stands: {
      display_id: string;
      locations: {
        id: string;
        name: string;
        address: string | null;
      };
    };
  };
  box_id: string;
  payments?: { id: string; charge_id: string; amount: unknown; status: string | null } | null;
  box_returns?: {
    box_front_view: string | null;
    box_back_view: string | null;
    closed_stand_lock: string | null;
    returned_at: Date | null;
    created_at: Date | null;
  } | null;
}) {
  const days = Math.max(1, Math.ceil((booking.end_date.getTime() - booking.start_date.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAmount = booking.payments && booking.payments.amount
    ? (typeof booking.payments.amount === 'string' ? parseFloat(booking.payments.amount) : Number(booking.payments.amount))
    : 0;
  const boxPrice = booking.boxes.price
    ? (typeof booking.boxes.price === 'string' ? parseFloat(booking.boxes.price) : Number(booking.boxes.price))
    : 300;
  const boxDeposit = booking.boxes.deposit
    ? (typeof booking.boxes.deposit === 'string' ? parseFloat(booking.boxes.deposit) : Number(booking.boxes.deposit))
    : 0;

  const getImageUrl = async (imagePath: string | null | undefined): Promise<string | null> => {
    if (!imagePath) return null;
    let cleanPath = imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      if (imagePath.includes('token=') || imagePath.includes('&t=')) return imagePath;
      try {
        const url = new URL(imagePath);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
        if (pathMatch) {
          return await getSupabaseStorageSignedUrl('box_returns', pathMatch[1], 3600);
        }
        const parts = imagePath.split('/box_returns/');
        if (parts.length > 1) cleanPath = parts[1];
      } catch {
        const parts = imagePath.split('/box_returns/');
        if (parts.length > 1) cleanPath = parts[1];
      }
    }
    const isValidPath = /^(box_(front_view|back_view)|closed_stand_view)\/[a-f0-9-]+-\d+\.(jpg|jpeg|png)$/i;
    if (!isValidPath.test(cleanPath)) return null;
    try {
      return await getSupabaseStorageSignedUrl('box_returns', cleanPath, 3600);
    } catch {
      return null;
    }
  };

  let boxFrontView: string | null = null;
  let boxBackView: string | null = null;
  let closedStandLock: string | null = null;
  if (booking.box_returns) {
    const [r0, r1, r2] = await Promise.all([
      getImageUrl(booking.box_returns.box_front_view),
      getImageUrl(booking.box_returns.box_back_view),
      getImageUrl(booking.box_returns.closed_stand_lock),
    ]);
    boxFrontView = r0 && !r0.includes('/storage/v1/object/public/') ? r0 : null;
    boxBackView = r1 && !r1.includes('/storage/v1/object/public/') ? r1 : null;
    closedStandLock = r2 && !r2.includes('/storage/v1/object/public/') ? r2 : null;
  }

  const location = booking.boxes.stands.locations;
  const address = location.address || location.name || 'Unknown Location';

  return {
    id: booking.id,
    location: location.name,
    locationAddress: location.address || location.name || null,
    locationId: location.id,
    standId: booking.boxes.stand_id,
    standDisplayId: booking.boxes.stands.display_id,
    boxId: booking.box_id,
    boxDisplayId: booking.boxes.display_id,
    address,
    startDate: booking.start_date.toISOString(),
    endDate: booking.end_date.toISOString(),
    date: booking.start_date.toISOString(),
    status: (booking.status || BookingStatus.Upcoming).toLowerCase() as 'active' | 'upcoming' | 'completed' | 'cancelled' | 'confirmed',
    amount: totalAmount,
    pricePerDay: boxPrice,
    deposit: boxDeposit,
    model: booking.boxes.model === boxmodel.Pro_190 ? 'Pro 190' : 'Pro 175',
    lockPin: booking.lock_pin ? String(booking.lock_pin) : null,
    paymentId: booking.payments?.id || null,
    chargeId: booking.payments?.charge_id || null,
    paymentStatus: booking.payments?.status || null,
    createdAt: booking.created_at.toISOString(),
    returnedAt: (booking.box_returns?.returned_at ?? booking.box_returns?.created_at)?.toISOString() ?? null,
    boxFrontView,
    boxBackView,
    closedStandLock,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, bookingReference } = body;

    if (!email || !bookingReference) {
      return NextResponse.json(
        { error: 'Email and booking reference are required' },
        { status: 400 }
      );
    }

    const user = await prisma.public_users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { bookings: [], error: 'No bookings found with the provided details' },
        { status: 404 }
      );
    }

    // Search via payment (charge_id or payment id)
    const payment = await prisma.payments.findFirst({
      where: {
        user_id: user.id,
        OR: [
          { id: bookingReference },
          { charge_id: bookingReference },
        ],
      },
      include: {
        bookings: {
          include: {
            boxes: {
              include: {
                stands: {
                  include: { locations: true },
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

    if (payment?.bookings) {
      const formattedBooking = await formatBookingForGuestDisplay(payment.bookings);
      const userDetails = payment.users
        ? { name: payment.users.full_name || 'Guest User', email: payment.users.email, phone: payment.users.phone || null }
        : null;
      return NextResponse.json({ bookings: [formattedBooking], user: userDetails });
    }

    // Search via direct booking id
    const booking = await prisma.bookings.findFirst({
      where: {
        id: bookingReference,
        payments: { user_id: user.id },
      },
      include: {
        boxes: {
          include: {
            stands: { include: { locations: true } },
          },
        },
        payments: {
          include: { users: true },
        },
        box_returns: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { bookings: [], error: 'No bookings found with the provided details' },
        { status: 404 }
      );
    }

    const formattedBooking = await formatBookingForGuestDisplay(booking);
    const paymentUser = booking.payments?.users;
    const userDetails = paymentUser
      ? { name: paymentUser.full_name || 'Guest User', email: paymentUser.email, phone: paymentUser.phone || null }
      : null;

    return NextResponse.json({ bookings: [formattedBooking], user: userDetails });
  } catch (error) {
    console.error('Error searching bookings:', error);
    return NextResponse.json(
      { error: 'Error searching bookings' },
      { status: 500 }
    );
  }
}
