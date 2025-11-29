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
        locations: {
          select: {
            id: true,
            name: true,
            address: true,
            distributor_id: true,
            coordinates: true,
            status: true,
            distributors: {
              select: {
                id: true,
                user_id: true,
                company_name: true,
                contact_person: true,
              },
            },
            reviews: {
              include: {
                users: {
                  select: {
                    id: true,
                    full_name: true,
                  },
                },
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 10,
            },
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

    const location = stand.locations ?? null;
    const owner = location?.distributors
      ? {
          id: location.distributors.id,
          userId: location.distributors.user_id,
          companyName: location.distributors.company_name,
          contactPerson: location.distributors.contact_person,
        }
      : null;

    const reviews =
      location?.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        user: review.users
          ? {
              id: review.users.id,
              fullName: review.users.full_name,
            }
          : null,
      })) ?? [];

    const responsePayload = {
      ...stand,
      locations: location
        ? {
            id: location.id,
            name: location.name,
            address: location.address,
            distributorId: location.distributor_id,
            coordinates: location.coordinates,
            status: location.status,
          }
        : null,
      owner,
      reviews,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error fetching stand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stand';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

