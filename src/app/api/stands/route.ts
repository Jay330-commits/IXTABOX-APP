import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';
import { StandStatus } from '@prisma/client';

type ApiStand = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  address: string;
  description?: string;
  size?: {
    area: number;
    unit: string;
    capacity?: number;
  };
  pricePerDay?: number;
  imageUrl?: string;
  status?: 'available' | 'booked' | 'maintenance';
};

const STATUS_MAP: Record<StandStatus, ApiStand['status']> = {
  [StandStatus.AVAILABLE]: 'available',
  [StandStatus.OCCUPIED]: 'booked',
  [StandStatus.MAINTENANCE]: 'maintenance',
  [StandStatus.INACTIVE]: 'maintenance',
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
    const stands = await prisma.stand.findMany({
      where: {
        status: {
          not: StandStatus.INACTIVE,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const normalized = stands
      .map((stand) => {
        const coordinates = isRecord(stand.coordinates) ? stand.coordinates : undefined;
        const lat = toNumber(coordinates?.lat);
        const lng = toNumber(coordinates?.lng);

        if (lat === null || lng === null) {
          return null;
        }

        const features = isRecord(stand.features) ? stand.features : undefined;
        const pricing = isRecord(stand.pricing) ? stand.pricing : undefined;

        const sizeRaw = isRecord(features?.size) ? (features?.size as Record<string, unknown>) : undefined;
        const size =
          sizeRaw && toNumber(sizeRaw.area) !== null
            ? {
                area: toNumber(sizeRaw.area)!,
                unit: typeof sizeRaw.unit === 'string' && sizeRaw.unit.trim() ? sizeRaw.unit : 'm',
                capacity: toNumber(sizeRaw.capacity) ?? undefined,
              }
            : undefined;

        const pricePerDay =
          toNumber(pricing?.pricePerDay) ??
          toNumber(pricing?.dailyRate) ??
          toNumber(pricing?.daily_price) ??
          undefined;

        const imageUrl =
          typeof features?.imageUrl === 'string' && features.imageUrl.trim()
            ? features.imageUrl
            : Array.isArray(features?.images) && typeof features.images[0] === 'string'
            ? features.images[0]
            : undefined;

        const description =
          typeof features?.description === 'string' ? features.description : undefined;

        return {
          id: stand.id,
          lat,
          lng,
          title: stand.name,
          address: stand.location ?? 'Location coming soon',
          description,
          size,
          pricePerDay,
          imageUrl,
          status: STATUS_MAP[stand.status] ?? 'available',
        } satisfies ApiStand;
      })
      .filter(Boolean);

    return NextResponse.json({ stands: normalized });
  } catch (error) {
    console.error('Failed to fetch stands', error);
    return NextResponse.json(
      {
        error: 'Unable to load stands at this time.',
      },
      { status: 500 },
    );
  }
}

