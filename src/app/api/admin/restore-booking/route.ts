import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { IglooService } from '@/services/locations/IglooService';
import { dbLogger } from '@/lib/db-logger';

/**
 * One-off API to restore a deleted booking.
 * Uses payment + box reference. Does NOT touch box score.
 *
 * Call: POST /api/admin/restore-booking
 * Body: { secret: process.env.RESTORE_BOOKING_SECRET }
 * Query: ?lockPin=123456 (optional - if Igloo fails for past dates)
 *
 * Default dates: 2026-02-20 00:00 to 2026-03-02 00:00 (10 days)
 */
const PAYMENT_ID = '43d7f1b6-c570-4386-b4bf-d07b3e4cbbd8';
const BOX_ID = '61ae44b3-549b-4b13-80fa-4f18fa403195';
const START_DATE = new Date('2026-02-20T00:00:00');
const END_DATE = new Date('2026-03-02T00:00:00'); // 10 days later

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RESTORE_BOOKING_SECRET;
    if (secret) {
      const body = await request.json().catch(() => ({}));
      const providedSecret =
        body.secret ?? request.headers.get('authorization')?.replace('Bearer ', '') ?? request.nextUrl.searchParams.get('secret');
      if (providedSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const lockPinParam = request.nextUrl.searchParams.get('lockPin');
    const manualLockPin = lockPinParam ? parseInt(lockPinParam, 10) : null;

    // Verify payment exists
    const payment = await prisma.payments.findUnique({
      where: { id: PAYMENT_ID },
    });
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found', paymentId: PAYMENT_ID },
        { status: 404 }
      );
    }

    // Verify no booking already exists for this payment
    const existing = await prisma.bookings.findUnique({
      where: { payment_id: PAYMENT_ID },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Booking already exists for this payment', bookingId: existing.id },
        { status: 409 }
      );
    }

    // Generate display_id (YYMMDD-XXX)
    const datePrefix = '260220'; // 2026-02-20
    const last = await prisma.bookings.findFirst({
      where: {
        display_id: { startsWith: `${datePrefix}-` },
      },
      orderBy: { display_id: 'desc' },
    });
    let sequence = 1;
    if (last?.display_id) {
      const parts = last.display_id.split('-');
      if (parts.length === 2) {
        const n = parseInt(parts[1], 10);
        if (!isNaN(n)) sequence = n + 1;
      }
    }
    const displayId = `${datePrefix}-${String(sequence).padStart(3, '0')}`;

    // Lock PIN: use manual if provided, otherwise try Igloo
    let lockPin: number;
    if (manualLockPin && !isNaN(manualLockPin)) {
      lockPin = manualLockPin;
      dbLogger.logInfo('Using manual lock PIN for restore', { lockPin });
    } else {
      try {
        const igloo = new IglooService();
        lockPin = await igloo.generateAndParseBookingPin(START_DATE, END_DATE, 'Customer');
        dbLogger.logInfo('Generated lock PIN from Igloo for restore', { lockPin });
      } catch (err) {
        dbLogger.logError({
          operation: 'restore-booking',
          error: err,
          context: 'Igloo PIN generation failed. Call with ?lockPin=YOUR_PIN if you have it.',
        });
        return NextResponse.json(
          {
            error: 'Igloo PIN generation failed (dates may be in the past). Call with ?lockPin=YOUR_PIN',
            hint: 'Add ?lockPin=123456 to the URL if you have the original PIN',
          },
          { status: 400 }
        );
      }
    }

    // Insert booking - NO box score increment
    const booking = await prisma.bookings.create({
      data: {
        box_id: BOX_ID,
        payment_id: PAYMENT_ID,
        start_date: START_DATE,
        end_date: END_DATE,
        lock_pin: lockPin,
        display_id: displayId,
        status: 'Confirmed',
      },
    });

    dbLogger.logInfo('Booking restored successfully', {
      bookingId: booking.id,
      displayId: booking.display_id,
      paymentId: PAYMENT_ID,
      boxId: BOX_ID,
      startDate: START_DATE.toISOString(),
      endDate: END_DATE.toISOString(),
      lockPin,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        display_id: booking.display_id,
        box_id: booking.box_id,
        payment_id: booking.payment_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        lock_pin: lockPin,
      },
      note: 'Box score was NOT modified (as requested)',
    });
  } catch (error) {
    dbLogger.logError({
      operation: 'restore-booking',
      error,
      context: 'Restore booking failed',
    });
    console.error('[restore-booking]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Restore failed',
      },
      { status: 500 }
    );
  }
}
