import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { PaymentProcessingService } from '@/services/bookings/PaymentProcessingService';

export async function GET() {
  try {
    const paymentIntentId = 'pi_3SZDEKHRKSWWZIGs1S83gCMI'; // From your logs

    // Retrieve payment intent from Stripe to get charge ID
    const paymentService = new PaymentProcessingService();
    let chargeId: string | null = null;
    try {
      const paymentIntent = await paymentService.retrievePaymentIntent(paymentIntentId, {
        expand: ['latest_charge'],
      });
      if (paymentIntent.latest_charge) {
        chargeId = typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : paymentIntent.latest_charge.id;
      }
    } catch (error) {
      console.error('Failed to retrieve payment intent from Stripe:', error);
    }

    // Check specific payment by charge_id
    const payment = chargeId ? await prisma.payments.findUnique({
      where: {
        charge_id: chargeId,
      },
      include: {
        bookings: true,
      },
    }) : null;

    // Get recent payments (order by id descending as proxy for most recent)
    const recentPayments = await prisma.payments.findMany({
      take: 10,
      orderBy: {
        id: 'desc',
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

    // Count total payments (status field removed - all payments are completed)
    const totalPayments = await prisma.payments.count();

    return NextResponse.json({
      specificPayment: payment ? {
        id: payment.id,
        charge_id: payment.charge_id,
        amount: payment.amount.toString(),
        currency: payment.currency || 'SEK',
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
        charge_id: p.charge_id,
        amount: p.amount.toString(),
        currency: p.currency || 'SEK',
        completed_at: p.completed_at,
        hasBooking: !!p.bookings,
        bookingStatus: p.bookings?.status,
      })),
      totalPayments,
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

