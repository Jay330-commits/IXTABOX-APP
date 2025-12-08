import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';

export async function GET() {
  try {
    const supabaseUser = await getCurrentUser();
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch payments for the user
    const payments = await prisma.payments.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        completed_at: 'desc',
      },
    });

    // Transform payments to match the frontend format
    // Note: Payments are only created when Stripe confirms success, so they're all "Completed"
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      amount: parseFloat(payment.amount.toString()),
      date: payment.completed_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      method: 'Credit Card', // You may want to store this in payment_methods table
      status: 'Completed', // All payments in DB are confirmed by Stripe
      currency: payment.currency || 'SEK',
      completedAt: payment.completed_at?.toISOString(),
      chargeId: payment.charge_id,
    }));

    return NextResponse.json({ payments: formattedPayments });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

