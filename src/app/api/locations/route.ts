import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { status, BoxModel } from '@prisma/client';

type ApiLocation = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  status: 'available' | 'maintenance' | 'inactive';
  availableBoxes: {
    classic: number;
    pro: number;
    total: number;
  };
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const locations = await prisma.locations.findMany({
      where: {
        status: {
          not: status.Inactive,
        },
      },
      include: {
        stands: {
          include: {
            boxes: {
              where: {
                status: status.Available,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const normalized = locations
      .map((location) => {
        // Get coordinates
        const coordinates = location.coordinates 
          ? (isRecord(location.coordinates) ? location.coordinates : undefined)
          : undefined;
        const lat = toNumber(coordinates?.lat);
        const lng = toNumber(coordinates?.lng);

        if (lat === null || lng === null) {
          return null;
        }

        // Count available boxes by model across all stands in this location
        let classicCount = 0;
        let proCount = 0;
        
        location.stands.forEach((stand) => {
          stand.boxes.forEach((box) => {
            if (box.status === status.Available) {
              if (box.model === BoxModel.Classic) {
                classicCount++;
              } else if (box.model === BoxModel.Pro) {
                proCount++;
              }
            }
          });
        });

        const statusMap: Record<status, ApiLocation['status']> = {
          [status.Available]: 'available',
          [status.Occupied]: 'available', // Treat occupied as available for display
          [status.Maintenance]: 'maintenance',
          [status.Inactive]: 'inactive',
        };

        return {
          id: location.id,
          lat,
          lng,
          name: location.name,
          address: location.address ?? 'Address not available',
          status: statusMap[location.status ?? status.Available],
          availableBoxes: {
            classic: classicCount,
            pro: proCount,
            total: classicCount + proCount,
          },
        } satisfies ApiLocation;
      })
      .filter(Boolean);

    return NextResponse.json({ locations: normalized });
  } catch (error) {
    console.error('Failed to fetch locations', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Unable to load locations at this time.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

