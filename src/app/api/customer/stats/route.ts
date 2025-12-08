import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const supabaseUser = await getCurrentUser(request);
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database with customer relation
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        customers: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all bookings for the user
    const bookings = await prisma.bookings.findMany({
      where: {
        payments: {
          user_id: user.id,
        },
      },
      include: {
        payments: true,
      },
    });

    // Calculate stats
    const now = new Date();
    const totalBookings = bookings.length;
    const upcomingBookings = bookings.filter((booking) => {
      const status = booking.status || BookingStatus.Pending;
      return (
        (status === BookingStatus.Confirmed || status === BookingStatus.Pending) &&
        new Date(booking.start_date) >= now
      );
    }).length;
    
    const loyaltyPoints = user.customers?.loyalty_points || 0;
    const memberSince = user.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

    // Determine membership tier based on loyalty points
    let membershipTier = 'Standard';
    if (loyaltyPoints >= 5000) {
      membershipTier = 'Platinum';
    } else if (loyaltyPoints >= 2500) {
      membershipTier = 'Gold';
    } else if (loyaltyPoints >= 1000) {
      membershipTier = 'Silver';
    }

    return NextResponse.json({
      stats: {
        totalBookings,
        upcomingBookings,
        loyaltyPoints,
        memberSince,
        membershipTier,
        totalRewards: loyaltyPoints, // You may want to calculate this differently
      },
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

