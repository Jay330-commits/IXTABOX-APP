import 'server-only';
import { Prisma, BookingStatus, boxStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface CreateStandData {
  locationId: string;
  name: string;
  capacity?: number | null;
  features?: Prisma.JsonValue | null;
  displayId?: string;
}

export interface UpdateStandData {
  locationId?: string;
  name?: string;
  capacity?: number | null;
  features?: Prisma.JsonValue | null;
  displayId?: string;
}

/**
 * StandService
 * Handles all stand-related operations
 */
export class StandService extends BaseService {
  /**
   * Create a new stand
   */
  async createStand(data: CreateStandData) {
    return await this.logOperation(
      'CREATE_STAND',
      async () => {
        // Validate location exists
        const location = await this.prisma.locations.findUnique({
          where: { id: data.locationId },
          select: { id: true },
        });

        if (!location) {
          throw new Error(`Location with id ${data.locationId} not found`);
        }

        // Validate capacity if provided
        if (data.capacity !== null && data.capacity !== undefined && data.capacity < 1) {
          throw new Error('Capacity must be at least 1');
        }

        // Create stand
        const stand = await this.prisma.stands.create({
          data: {
            location_id: data.locationId,
            name: data.name,
            capacity: data.capacity ?? 1,
            features: data.features ?? Prisma.JsonNull,
            display_id: data.displayId, // If not provided, database will auto-generate
          },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            boxes: {
              select: {
                id: true,
                display_id: true,
                model: true,
                status: true,
              },
            },
          },
        });

        console.log('Stand created:', {
          standId: stand.id,
          displayId: stand.display_id,
          locationId: stand.location_id,
          name: stand.name,
          capacity: stand.capacity,
        });

        return stand;
      },
      'StandService.createStand'
    );
  }

  /**
   * Update stand with specific columns and values
   */
  async updateStand(standId: string, data: UpdateStandData) {
    return await this.logOperation(
      'UPDATE_STAND',
      async () => {
        // Verify stand exists
        const existingStand = await this.prisma.stands.findUnique({
          where: { id: standId },
        });

        if (!existingStand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        // Validate location if being updated
        if (data.locationId) {
          const location = await this.prisma.locations.findUnique({
            where: { id: data.locationId },
            select: { id: true },
          });

          if (!location) {
            throw new Error(`Location with id ${data.locationId} not found`);
          }
        }

        // Validate capacity if being updated
        if (data.capacity !== null && data.capacity !== undefined && data.capacity < 1) {
          throw new Error('Capacity must be at least 1');
        }

        // Build update data object
        const updateData: Prisma.standsUpdateInput = {};

        if (data.locationId !== undefined) {
          updateData.locations = {
            connect: { id: data.locationId }
          };
        }
        if (data.name !== undefined) {
          updateData.name = data.name;
        }
        if (data.capacity !== undefined) {
          updateData.capacity = data.capacity;
        }
        if (data.features !== undefined) {
          updateData.features = data.features === null ? Prisma.JsonNull : data.features;
        }
        if (data.displayId !== undefined) {
          updateData.display_id = data.displayId;
        }

        // Update stand
        const updatedStand = await this.prisma.stands.update({
          where: { id: standId },
          data: updateData,
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            boxes: {
              select: {
                id: true,
                display_id: true,
                model: true,
                status: true,
              },
            },
          },
        });

        console.log('Stand updated:', {
          standId: updatedStand.id,
          displayId: updatedStand.display_id,
          changes: Object.keys(updateData),
        });

        return updatedStand;
      },
      'StandService.updateStand'
    );
  }

  /**
   * Change stand location (moves stand to a different location)
   * Uses updateStand() internally
   */
  async changeStandLocation(standId: string, newLocationId: string) {
    return await this.logOperation(
      'CHANGE_STAND_LOCATION',
      async () => {
        // Verify new location exists
        const newLocation = await this.prisma.locations.findUnique({
          where: { id: newLocationId },
          select: { id: true, name: true },
        });

        if (!newLocation) {
          throw new Error(`Location with id ${newLocationId} not found`);
        }

        // Get current stand info for logging
        const currentStand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!currentStand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        // Update stand to new location using updateStand
        const updatedStand = await this.updateStand(standId, {
          locationId: newLocationId,
        });

        console.log('Stand location changed:', {
          standId: updatedStand.id,
          displayId: updatedStand.display_id,
          oldLocationId: currentStand.location_id,
          oldLocationName: currentStand.locations.name,
          newLocationId: newLocationId,
          newLocationName: newLocation.name,
        });

        return updatedStand;
      },
      'StandService.changeStandLocation'
    );
  }

  /**
   * Delete a stand
   * Note: This will fail if stand has boxes
   */
  async deleteStand(standId: string, force: boolean = false) {
    return await this.logOperation(
      'DELETE_STAND',
      async () => {
        // Verify stand exists
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            boxes: {
              select: {
                id: true,
                display_id: true,
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        // Check for boxes
        if (stand.boxes.length > 0 && !force) {
          throw new Error(
            `Cannot delete stand ${standId}: Stand has ${stand.boxes.length} box(es). Use force=true to delete anyway.`
          );
        }

        // Delete stand
        await this.prisma.stands.delete({
          where: { id: standId },
        });

        console.log('Stand deleted:', {
          standId: stand.id,
          displayId: stand.display_id,
          hadBoxes: stand.boxes.length,
          force,
        });

        return { success: true, standId };
      },
      'StandService.deleteStand'
    );
  }

  /**
   * Get a stand by ID
   */
  async getStand(standId: string) {
    return await this.logOperation(
      'GET_STAND',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
                coordinates: true,
                status: true,
              },
            },
            boxes: {
              include: {
                bookings: {
                  where: {
                    status: {
                      in: [BookingStatus.Pending, BookingStatus.Active],
                    },
                  },
                  select: {
                    id: true,
                    start_date: true,
                    end_date: true,
                  },
                },
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        return stand;
      },
      'StandService.getStand'
    );
  }

  /**
   * Get stand by display ID
   */
  async getStandByDisplayId(displayId: string) {
    return await this.logOperation(
      'GET_STAND_BY_DISPLAY_ID',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { display_id: displayId },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with display ID ${displayId} not found`);
        }

        return stand;
      },
      'StandService.getStandByDisplayId'
    );
  }

  /**
   * Get all stands (for map display)
   */
  async getAllStands() {
    return await this.logOperation(
      'GET_ALL_STANDS',
      async () => {
        const stands = await this.prisma.stands.findMany({
          include: {
            locations: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

        return stands;
      },
      'StandService.getAllStands'
    );
  }

  /**
   * Get all stands for a specific location
   */
  async getStandsByLocation(locationId: string) {
    return await this.logOperation(
      'GET_STANDS_BY_LOCATION',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          select: { id: true },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        const stands = await this.prisma.stands.findMany({
          where: {
            location_id: locationId,
          },
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
          orderBy: {
            display_id: 'asc',
          },
        });

        return stands;
      },
      'StandService.getStandsByLocation'
    );
  }

  /**
   * Validate stand data before creation/update
   */
  validateStandData(data: CreateStandData | UpdateStandData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if ('name' in data && data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Stand name is required');
      }
      if (data.name.length > 255) {
        errors.push('Stand name must be 255 characters or less');
      }
    }

    if ('capacity' in data && data.capacity !== null && data.capacity !== undefined) {
      if (data.capacity < 1) {
        errors.push('Capacity must be at least 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get stand capacity utilization
   */
  async getStandCapacityUtilization(standId: string): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    utilizationPercentage: number;
  }> {
    return await this.logOperation(
      'GET_STAND_CAPACITY_UTILIZATION',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            boxes: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        const totalCapacity = stand.capacity ?? 1;
        const usedCapacity = stand.boxes.filter((box) => box.status === boxStatus.Active).length;
        const availableCapacity = totalCapacity - usedCapacity;
        const utilizationPercentage =
          totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

        return {
          totalCapacity,
          usedCapacity,
          availableCapacity,
          utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        };
      },
      'StandService.getStandCapacityUtilization'
    );
  }
}

