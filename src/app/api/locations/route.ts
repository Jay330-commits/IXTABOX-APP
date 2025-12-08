import { NextResponse } from 'next/server';
import { status, boxStatus, BoxModel } from '@prisma/client';
import { LocationService } from '@/services/locations/LocationService';

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
  isFullyBooked: boolean;
  earliestNextAvailableDate?: string | null;
  modelAvailability: {
    classic: {
      isFullyBooked: boolean;
      nextAvailableDate: string | null;
    };
    pro: {
      isFullyBooked: boolean;
      nextAvailableDate: string | null;
    };
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
    const locationService = new LocationService();

    // Get all active locations using LocationService
    const locations = await locationService.getActiveLocations();

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
        // A box is available only if it has no active/pending bookings
        let classicCount = 0;
        let proCount = 0;
        let classicTotal = 0;
        let proTotal = 0;
        let totalBoxes = 0;
        let bookedBoxes = 0;
        const allBookingEndDates: Date[] = [];
        const classicBookingEndDates: Date[] = [];
        const proBookingEndDates: Date[] = [];
        
        location.stands.forEach((stand) => {
          stand.boxes.forEach((box) => {
            if (box.status === boxStatus.Active) {
              totalBoxes++;
              const hasActiveBooking = box.bookings.length > 0;
              
              if (box.model === BoxModel.Classic) {
                classicTotal++;
              } else if (box.model === BoxModel.Pro) {
                proTotal++;
              }
              
              if (hasActiveBooking) {
                bookedBoxes++;
                // Collect booking end dates by model
                box.bookings.forEach((booking) => {
                  const endDate = new Date(booking.end_date);
                  allBookingEndDates.push(endDate);
                  if (box.model === BoxModel.Classic) {
                    classicBookingEndDates.push(endDate);
                  } else if (box.model === BoxModel.Pro) {
                    proBookingEndDates.push(endDate);
                  }
                });
              } else {
                if (box.model === BoxModel.Classic) {
                  classicCount++;
                } else if (box.model === BoxModel.Pro) {
                  proCount++;
                }
              }
            }
          });
        });

        // Location is fully booked if all boxes have active/pending bookings
        const isFullyBooked = totalBoxes > 0 && bookedBoxes === totalBoxes;
        
        // Calculate earliest next available date per model
        const getLatestEndDate = (dates: Date[]): Date | null => {
          if (dates.length === 0) return null;
          return dates.reduce((latest, endDate) => {
            return endDate > latest ? endDate : latest;
          }, new Date(0));
        };
        
        const classicLatestEndDate = getLatestEndDate(classicBookingEndDates);
        const proLatestEndDate = getLatestEndDate(proBookingEndDates);
        const allLatestEndDate = getLatestEndDate(allBookingEndDates);
        
        // Check if models are fully booked
        const isClassicFullyBooked = classicTotal > 0 && classicCount === 0;
        const isProFullyBooked = proTotal > 0 && proCount === 0;
        
        // Calculate earliest next available date (latest end date from all bookings)
        let earliestNextAvailableDate: string | null = null;
        if (isFullyBooked && allLatestEndDate) {
          earliestNextAvailableDate = allLatestEndDate.toISOString();
        }
        
        if (isFullyBooked) {
          // Location fully booked (logging removed)
        } else {
          // Location available (logging removed)
        }

        const statusMap: Record<status, ApiLocation['status']> = {
          [status.Available]: 'available',
          [status.Occupied]: 'available', // Treat occupied as available for display
          [status.Maintenance]: 'maintenance',
          [status.Inactive]: 'inactive',
        };

        const apiLocation: ApiLocation = {
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
          isFullyBooked,
          earliestNextAvailableDate: earliestNextAvailableDate || null,
          modelAvailability: {
            classic: {
              isFullyBooked: isClassicFullyBooked,
              nextAvailableDate: classicLatestEndDate ? classicLatestEndDate.toISOString() : null,
            },
            pro: {
              isFullyBooked: isProFullyBooked,
              nextAvailableDate: proLatestEndDate ? proLatestEndDate.toISOString() : null,
            },
          },
        };
        
        // Location API response (logging removed)
        
        return apiLocation;
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

