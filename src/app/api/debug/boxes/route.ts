import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';

export async function GET() {
  try {
    const boxes = await prisma.boxes.findMany({
      select: {
        id: true,
        stand_id: true,
        model: true,
        compartment: true,
        display_id: true,
      },
      orderBy: [
        { stand_id: 'asc' },
        { id: 'asc' },
      ],
      take: 20,
    });

    const stats = {
      total: boxes.length,
      withCompartment: boxes.filter(b => b.compartment !== null).length,
      withoutCompartment: boxes.filter(b => b.compartment === null).length,
    };

    return NextResponse.json({
      stats,
      boxes,
    });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boxes' },
      { status: 500 }
    );
  }
}

