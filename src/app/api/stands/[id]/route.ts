import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Stand ID is required' },
        { status: 400 }
      );
    }

    const stand = await prisma.stand.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            contactPerson: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!stand) {
      return NextResponse.json(
        { error: 'Stand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stand);
  } catch (error) {
    console.error('Error fetching stand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stand';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

