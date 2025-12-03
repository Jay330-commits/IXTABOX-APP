import 'server-only';
import { status, Prisma, boxStatus, BookingStatus } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CreateLocationData {
  distributorId: string;
  name: string;
  address?: string | null;
  coordinates?: Prisma.JsonValue | null;
  status?: status;
  displayId?: string;
}

export interface UpdateLocationData {
  distributorId?: string;
  name?: string;
  address?: string | null;
  coordinates?: Prisma.JsonValue | null;
  status?: status;
  displayId?: string;
}

/**
 * LocationService
 * Handles all location-related operations
 */
export class LocationService extends BaseService {
  /**
   * Create a new location
   */
  async createLocation(data: CreateLocationData) {
    return await this.logOperation(
      'CREATE_LOCATION',
      async () => {
        // Validate distributor exists
        const distributor = await this.prisma.distributors.findUnique({
          where: { id: data.distributorId },
          select: { id: true },
        });

        if (!distributor) {
          throw new Error(`Distributor with id ${data.distributorId} not found`);
        }

        // Validate status if provided
        if (data.status && !Object.values(status).includes(data.status)) {
          throw new Error(`Invalid location status: ${data.status}`);
        }

        // Create location
        const location = await this.prisma.locations.create({
          data: {
            distributor_id: data.distributorId,
            name: data.name,
            address: data.address ?? null,
            coordinates: data.coordinates ?? null,
            status: data.status ?? status.Available,
            display_id: data.displayId, // If not provided, database will auto-generate
          },
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
                contact_person: true,
              },
            },
            stands: {
              select: {
                id: true,
                name: true,
                display_id: true,
                capacity: true,
              },
            },
          },
        });

        console.log('Location created:', {
          locationId: location.id,
          displayId: location.display_id,
          distributorId: location.distributor_id,
          name: location.name,
          status: location.status,
        });

        return location;
      },
      'LocationService.createLocation'
    );
  }

  /**
   * Update location with specific columns and values
   */
  async updateLocation(locationId: string, data: UpdateLocationData) {
    return await this.logOperation(
      'UPDATE_LOCATION',
      async () => {
        // Verify location exists
        const existingLocation = await this.prisma.locations.findUnique({
          where: { id: locationId },
        });

        if (!existingLocation) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        // Validate distributor if being updated
        if (data.distributorId) {
          const distributor = await this.prisma.distributors.findUnique({
            where: { id: data.distributorId },
            select: { id: true },
          });

          if (!distributor) {
            throw new Error(`Distributor with id ${data.distributorId} not found`);
          }
        }

        // Validate status if being updated
        if (data.status && !Object.values(status).includes(data.status)) {
          throw new Error(`Invalid location status: ${data.status}`);
        }

        // Build update data object
        const updateData: Prisma.locationsUpdateInput = {};

        if (data.distributorId !== undefined) {
          updateData.distributor_id = data.distributorId;
        }
        if (data.name !== undefined) {
          updateData.name = data.name;
        }
        if (data.address !== undefined) {
          updateData.address = data.address;
        }
        if (data.coordinates !== undefined) {
          updateData.coordinates = data.coordinates;
        }
        if (data.status !== undefined) {
          updateData.status = data.status;
        }
        if (data.displayId !== undefined) {
          updateData.display_id = data.displayId;
        }

        // Update location
        const updatedLocation = await this.prisma.locations.update({
          where: { id: locationId },
          data: updateData,
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
                contact_person: true,
              },
            },
            stands: {
              select: {
                id: true,
                name: true,
                display_id: true,
                capacity: true,
              },
            },
          },
        });

        console.log('Location updated:', {
          locationId: updatedLocation.id,
          displayId: updatedLocation.display_id,
          changes: Object.keys(updateData),
        });

        return updatedLocation;
      },
      'LocationService.updateLocation'
    );
  }

  /**
   * Change location owner (moves location to a different distributor)
   * Uses updateLocation() internally
   */
  async changeLocationOwner(locationId: string, newDistributorId: string) {
    return await this.logOperation(
      'CHANGE_LOCATION_OWNER',
      async () => {
        // Verify new distributor exists
        const newDistributor = await this.prisma.distributors.findUnique({
          where: { id: newDistributorId },
          select: { id: true, company_name: true },
        });

        if (!newDistributor) {
          throw new Error(`Distributor with id ${newDistributorId} not found`);
        }

        // Get current location info for logging
        const currentLocation = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
              },
            },
          },
        });

        if (!currentLocation) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        // Update location to new distributor using updateLocation
        const updatedLocation = await this.updateLocation(locationId, {
          distributorId: newDistributorId,
        });

        console.log('Location owner changed:', {
          locationId: updatedLocation.id,
          displayId: updatedLocation.display_id,
          oldDistributorId: currentLocation.distributor_id,
          oldDistributorName: currentLocation.distributors.company_name,
          newDistributorId: newDistributorId,
          newDistributorName: newDistributor.company_name,
        });

        return updatedLocation;
      },
      'LocationService.changeLocationOwner'
    );
  }

  /**
   * Set location to maintenance status
   * Uses updateLocation() internally
   */
  async setLocationMaintenance(locationId: string, isMaintenance: boolean = true) {
    return await this.logOperation(
      'SET_LOCATION_MAINTENANCE',
      async () => {
        const newStatus = isMaintenance ? status.Maintenance : status.Available;

        // Update location status using updateLocation
        const updatedLocation = await this.updateLocation(locationId, {
          status: newStatus,
        });

        console.log('Location maintenance status updated:', {
          locationId: updatedLocation.id,
          displayId: updatedLocation.display_id,
          status: updatedLocation.status,
          isMaintenance,
        });

        return updatedLocation;
      },
      'LocationService.setLocationMaintenance'
    );
  }

  /**
   * Delete a location
   * Note: This will fail if location has stands
   */
  async deleteLocation(locationId: string, force: boolean = false) {
    return await this.logOperation(
      'DELETE_LOCATION',
      async () => {
        // Verify location exists
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            stands: {
              select: {
                id: true,
                name: true,
                display_id: true,
              },
            },
          },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        // Check for stands
        if (location.stands.length > 0 && !force) {
          throw new Error(
            `Cannot delete location ${locationId}: Location has ${location.stands.length} stand(s). Use force=true to delete anyway.`
          );
        }

        // Delete location
        await this.prisma.locations.delete({
          where: { id: locationId },
        });

        console.log('Location deleted:', {
          locationId: location.id,
          displayId: location.display_id,
          hadStands: location.stands.length,
          force,
        });

        return { success: true, locationId };
      },
      'LocationService.deleteLocation'
    );
  }

  /**
   * Get a location by ID with bookings for availability calculations
   */
  async getLocationWithBookings(locationId: string) {
    return await this.logOperation(
      'GET_LOCATION_WITH_BOOKINGS',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
                contact_person: true,
                website: true,
              },
            },
            stands: {
              include: {
                boxes: {
                  select: {
                    id: true,
                    display_id: true,
                    model: true,
                    compartment: true,
                    status: true,
                    bookings: {
                      where: {
                        status: {
                          in: [BookingStatus.Pending, BookingStatus.Active],
                        },
                      },
                      select: {
                        start_date: true,
                        end_date: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        return location;
      },
      'LocationService.getLocationWithBookings'
    );
  }

  /**
   * Get a location by ID
   */
  async getLocation(locationId: string) {
    return await this.logOperation(
      'GET_LOCATION',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
                contact_person: true,
                website: true,
              },
            },
            stands: {
              include: {
                boxes: {
                  select: {
                    id: true,
                    display_id: true,
                    model: true,
                    status: true,
                  },
                },
              },
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                comment: true,
                created_at: true,
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 10, // Limit to recent reviews
            },
          },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        return location;
      },
      'LocationService.getLocation'
    );
  }

  /**
   * Get location by display ID
   */
  async getLocationByDisplayId(displayId: string) {
    return await this.logOperation(
      'GET_LOCATION_BY_DISPLAY_ID',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { display_id: displayId },
          include: {
            distributors: {
              select: {
                id: true,
                company_name: true,
              },
            },
          },
        });

        if (!location) {
          throw new Error(`Location with display ID ${displayId} not found`);
        }

        return location;
      },
      'LocationService.getLocationByDisplayId'
    );
  }

  /**
   * Get all active locations (for map display)
   */
  async getActiveLocations() {
    return await this.logOperation(
      'GET_ACTIVE_LOCATIONS',
      async () => {
        const locations = await this.prisma.locations.findMany({
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
                    status: boxStatus.Active,
                  },
                  include: {
                    bookings: {
                      where: {
                        status: {
                          in: [BookingStatus.Pending, BookingStatus.Active],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });

        return locations;
      },
      'LocationService.getActiveLocations'
    );
  }

  /**
   * Get all locations for a specific distributor
   */
  async getLocationsByDistributor(distributorId: string) {
    return await this.logOperation(
      'GET_LOCATIONS_BY_DISTRIBUTOR',
      async () => {
        const distributor = await this.prisma.distributors.findUnique({
          where: { id: distributorId },
          select: { id: true },
        });

        if (!distributor) {
          throw new Error(`Distributor with id ${distributorId} not found`);
        }

        const locations = await this.prisma.locations.findMany({
          where: {
            distributor_id: distributorId,
          },
          include: {
            stands: {
              select: {
                id: true,
                name: true,
                display_id: true,
                capacity: true,
              },
            },
          },
          orderBy: {
            display_id: 'asc',
          },
        });

        return locations;
      },
      'LocationService.getLocationsByDistributor'
    );
  }

  /**
   * Validate location data before creation/update
   */
  validateLocationData(data: CreateLocationData | UpdateLocationData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if ('name' in data && data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Location name is required');
      }
      if (data.name.length > 255) {
        errors.push('Location name must be 255 characters or less');
      }
    }

    if ('status' in data && data.status) {
      if (!Object.values(status).includes(data.status)) {
        errors.push(`Invalid location status: ${data.status}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get location statistics
   */
  async getLocationStatistics(locationId: string): Promise<{
    totalStands: number;
    totalBoxes: number;
    activeBoxes: number;
    totalBookings: number;
  }> {
    return await this.logOperation(
      'GET_LOCATION_STATISTICS',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            stands: {
              include: {
                boxes: {
                  include: {
                    bookings: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        const totalStands = location.stands.length;
        const allBoxes = location.stands.flatMap((stand) => stand.boxes);
        const totalBoxes = allBoxes.length;
        const activeBoxes = allBoxes.filter((box) => box.status === boxStatus.Active).length;
        const totalBookings = allBoxes.reduce(
          (sum, box) => sum + box.bookings.length,
          0
        );

        return {
          totalStands,
          totalBoxes,
          activeBoxes,
          totalBookings,
        };
      },
      'LocationService.getLocationStatistics'
    );
  }
}

