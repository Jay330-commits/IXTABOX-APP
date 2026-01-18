import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { boxStatus, BookingStatus } from '@prisma/client';

export interface DistributorLocationForMap {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  status: 'available' | 'maintenance' | 'inactive';
  image: string | null;
  stands: {
    id: string;
    name: string;
    capacity: number;
    boxes: {
      id: string;
      display_id: string;
      model: string;
      type: string;
      status: string;
      compartment: number | null;
      bookingStatus: string | null;
    }[];
  }[];
  inventoryStats: {
    totalBoxes: number;
    availableBoxes: number;
    rentedBoxes: number;
    reservedBoxes: number;
    maintenanceBoxes: number;
    totalStands: number;
  };
}

export async function GET(request: NextRequest) {
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.distributors) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    // Fetch all locations with stands and boxes for this distributor
    const locations = await prisma.locations.findMany({
      where: {
        distributor_id: user.distributors.id,
      },
      include: {
        stands: {
          include: {
            boxes: {
              include: {
                bookings: {
                  orderBy: {
                    start_date: 'desc',
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    // Transform the data to match the map interface
    const locationsForMap: DistributorLocationForMap[] = locations
      .filter((location) => {
        // Only include locations with valid coordinates
        if (!location.coordinates) return false;
        const coords = location.coordinates as { lat?: number; lng?: number } | null;
        return coords && typeof coords.lat === 'number' && typeof coords.lng === 'number';
      })
      .map((location) => {
        const coords = location.coordinates as { lat: number; lng: number };
        
        // Calculate inventory stats for this location
        let totalBoxes = 0;
        let availableBoxes = 0;
        let rentedBoxes = 0;
        let reservedBoxes = 0;
        let maintenanceBoxes = 0;

        const standsWithInventory = location.stands.map((stand) => {
          const boxes = stand.boxes.map((box) => {
            totalBoxes++;
            
            // Get the most recent booking for this box
            const latestBooking = box.bookings[0];
            const bookingStatus = latestBooking?.status;

            // Determine box status based on box status and booking status
            // Box status: Active = available, Inactive = maintenance
            // Then check booking status to override if needed
            let status = 'available';
            
            // First check box status
            // Box status: Active = can be available/rented/reserved, Inactive = maintenance
            if (box.status === boxStatus.Inactive) {
              // Inactive boxes are always in maintenance
              status = 'maintenance';
              maintenanceBoxes++;
            } else if (box.status === boxStatus.Active) {
              // Active box status depends on booking status
              if (bookingStatus === BookingStatus.Active) {
                status = 'rented';
                rentedBoxes++;
              } else if (
                bookingStatus === BookingStatus.Upcoming ||
                bookingStatus === BookingStatus.Confirmed ||
                bookingStatus === BookingStatus.Pending
              ) {
                status = 'reserved';
                reservedBoxes++;
              } else if (
                bookingStatus === BookingStatus.Completed ||
                bookingStatus === BookingStatus.Cancelled ||
                bookingStatus === BookingStatus.Overdue ||
                !bookingStatus
              ) {
                // No active booking or booking is completed/cancelled, box is available
                status = 'available';
                availableBoxes++;
              } else {
                // Fallback to available
                status = 'available';
                availableBoxes++;
              }
            } else {
              // Unknown box status (like Upcoming), default to maintenance
              status = 'maintenance';
              maintenanceBoxes++;
            }

            return {
              id: box.id,
              display_id: box.display_id || '',
              model: box.model || 'Unknown',
              type: box.model || 'Unknown', // Keep for backward compatibility
              status,
              compartment: box.compartment || null,
              bookingStatus: bookingStatus || null,
            };
          });

          return {
            id: stand.id,
            name: stand.name,
            capacity: stand.capacity || 0,
            boxes,
          };
        });

        // Determine location status based on operational status
        const locationStatus = location.status === 'Available' 
          ? 'available' 
          : location.status === 'Maintenance'
          ? 'maintenance'
          : 'inactive';

        return {
          id: location.id,
          name: location.name,
          address: location.address || null,
          lat: coords.lat,
          lng: coords.lng,
          status: locationStatus,
          image: location.image || null,
          stands: standsWithInventory,
          inventoryStats: {
            totalBoxes,
            availableBoxes,
            rentedBoxes,
            reservedBoxes,
            maintenanceBoxes,
            totalStands: location.stands.length,
          },
        };
      });

    return NextResponse.json({ 
      success: true, 
      data: locationsForMap 
    });
  } catch (error) {
    console.error('Error fetching locations for map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

