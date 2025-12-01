import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';

export async function GET() {
  try {
    const paymentIntentId = 'pi_3SZDEKHRKSWWZIGs1S83gCMI'; // From your logs

    // Check specific payment
    const payment = await prisma.payments.findUnique({
      where: {
        stripe_payment_intent_id: paymentIntentId,
      },
      include: {
        bookings: true,
      },
    });

    // Get recent payments
    const recentPayments = await prisma.payments.findMany({
      take: 10,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            start_date: true,
            end_date: true,
          },
        },
      },
    });

    // Count by status
    const allPayments = await prisma.payments.findMany({
      select: {
        status: true,
      },
    });

    const statusCounts = allPayments.reduce((acc, p) => {
      const status = p.status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      specificPayment: payment ? {
        id: payment.id,
        status: payment.status,
        amount: payment.amount.toString(),
        created_at: payment.created_at,
        completed_at: payment.completed_at,
        hasBooking: !!payment.bookings,
        booking: payment.bookings ? {
          id: payment.bookings.id,
          status: payment.bookings.status,
          start_date: payment.bookings.start_date,
          end_date: payment.bookings.end_date,
        } : null,
      } : null,
      recentPayments: recentPayments.map(p => ({
        payment_intent_id: p.stripe_payment_intent_id,
        status: p.status,
        amount: p.amount.toString(),
        created_at: p.created_at,
        completed_at: p.completed_at,
        hasBooking: !!p.bookings,
        bookingStatus: p.bookings?.status,
      })),
      statusCounts,
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

