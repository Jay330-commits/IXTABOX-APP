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
      console.error('[Notifications API] User not found for email:', supabaseUser.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Notifications API] Fetching notifications for user:', user.id, user.email);

    // Fetch notifications for the user
    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log('[Notifications API] Found notifications:', notifications.length);

    // Transform notifications to match the frontend format
    const formattedNotifications = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message || '',
      date: notification.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      read: notification.read || false,
    }));

    return NextResponse.json({ notifications: formattedNotifications });
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

