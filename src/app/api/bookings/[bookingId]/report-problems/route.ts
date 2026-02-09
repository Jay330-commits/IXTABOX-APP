import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { Prisma } from '@prisma/client';

const VALID_PROBLEM_TYPES = new Set([
  'interior_lights',
  'exterior_lights',
  'mounting_fixture',
  'lid_damage',
  'box_scratch',
  'box_dent_major_damage',
  'defect_rubber_sealing',
  'stolen',
  'other',
]);

/**
 * Report problems with a booked box (stored on the booking as JSON array; multiple allowed).
 * POST /api/bookings/[bookingId]/report-problems
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { prisma } = await import('@/lib/prisma/prisma');
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { problems } = body;

    if (!problems || !Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json(
        { error: 'At least one problem must be reported' },
        { status: 400 }
      );
    }

    const normalized: Array<{ type: string; description?: string }> = [];

    for (const problem of problems) {
      if (!problem.type || typeof problem.type !== 'string') {
        return NextResponse.json(
          { error: 'Each problem must have a valid type' },
          { status: 400 }
        );
      }
      if (!VALID_PROBLEM_TYPES.has(problem.type)) {
        return NextResponse.json(
          { error: `Invalid problem type: ${problem.type}` },
          { status: 400 }
        );
      }
      const description =
        problem.type === 'other' && problem.description
          ? String(problem.description).trim()
          : undefined;
      normalized.push(description !== undefined ? { type: problem.type, description } : { type: problem.type });
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          include: { users: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.payments?.users?.id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: This booking does not belong to you' },
        { status: 403 }
      );
    }

    await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        reported_problems: normalized as Prisma.InputJsonValue,
      },
    });

    console.log('Box problems reported on booking:', {
      bookingId,
      userId: user.id,
      count: normalized.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Problems reported successfully',
      problems: normalized,
    });
  } catch (error) {
    console.error('Error reporting box problems:', error);
    return NextResponse.json(
      {
        error: 'Failed to report problems',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
