import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma/prisma';
import { IglooService } from '@/services/locations/IglooService';
import { EmailService } from '@/services/notifications/emailService';

/**
 * Cron job: generates lock PIN and sends unlock code at booking start time.
 * - Finds bookings that have started (start_date <= now) and have lock_pin = 0
 * - Skips refunded payments
 * - Generates PIN via Igloo, stores in DB, sends email
 * Run every 1-5 minutes via Vercel Cron. Protect with CRON_SECRET in Authorization header.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Look back up to 24h to catch bookings that started (in case cron missed runs)
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Bookings that have started, no PIN yet, not refunded
    const pendingUnlockBookings = await prisma.bookings.findMany({
      where: {
        start_date: { gte: windowStart, lte: now },
        lock_pin: 0,
        status: { in: ['Confirmed', 'Pending', 'Upcoming', 'Active'] },
        payments: {
          status: { not: PaymentStatus.Refunded },
        },
      },
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
        payments: {
          include: { users: true },
        },
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
      'https://ixtarent.com';

    const emailService = new EmailService();
    const iglooService = new IglooService();
    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const formatTime = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    let sent = 0;
    for (const booking of pendingUnlockBookings) {
      const email = booking.payments?.users?.email;
      if (!email) continue;

      try {
        // Generate PIN via Igloo (valid from booking start to end)
        const lockPin = await iglooService.generateAndParseBookingPin(
          booking.start_date,
          booking.end_date,
          'Customer'
        );

        // Store PIN in DB
        await prisma.bookings.update({
          where: { id: booking.id },
          data: { lock_pin: lockPin },
        });

        const location = booking.boxes.stands.locations;
        const box = booking.boxes;
        const stand = box.stands;
        const bookingsUrl = booking.payments?.charge_id
          ? `${baseUrl}/guest/bookings?email=${encodeURIComponent(email)}&chargeId=${encodeURIComponent(booking.payments.charge_id)}`
          : `${baseUrl}/guest/bookings?email=${encodeURIComponent(email)}`;

        await emailService.sendUnlockCodeEmail({
          to: email,
          locationName: location.name,
          boxNumber: box.display_id,
          standNumber: stand.display_id,
          startDate: formatDate(booking.start_date),
          startTime: formatTime(booking.start_date),
          unlockCode: String(lockPin),
          bookingsUrl,
        });

        sent++;
        console.log('[Cron] Unlock code generated and sent for booking:', booking.id);
      } catch (err) {
        console.error('[Cron] Failed to generate/send unlock for booking:', booking.id, err);
      }
    }

    return NextResponse.json({ sent, total: pendingUnlockBookings.length });
  } catch (error) {
    console.error('[Cron] send-unlock-codes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    );
  }
}
