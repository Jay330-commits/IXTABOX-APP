import { NextResponse } from 'next/server';
import { StandService } from '@/services/locations/StandService';

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
    const standService = new StandService();
    
    // Get all stands using StandService
    const stands = await standService.getAllStands();

    const normalized = stands
      .map((stand) => {
        // Get coordinates from the related location
        const locationCoordinates = stand.locations?.coordinates 
          ? (isRecord(stand.locations.coordinates) ? stand.locations.coordinates : undefined)
          : undefined;
        const lat = toNumber(locationCoordinates?.lat);
        const lng = toNumber(locationCoordinates?.lng);

        if (lat === null || lng === null) {
          return null;
        }

        const features = isRecord(stand.features) ? stand.features : undefined;
        const pricing = isRecord(features?.pricing) ? (features.pricing as Record<string, unknown>) : undefined;

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
          address: stand.locations?.address ?? 'Location coming soon',
          description,
          size,
          pricePerDay,
          imageUrl,
          status: 'available', // Stands don't have a status field in the schema
        } satisfies ApiStand;
      })
      .filter(Boolean);

    return NextResponse.json({ stands: normalized });
  } catch (error) {
    console.error('Failed to fetch stands', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: 'Unable to load stands at this time.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 },
    );
  }
}

