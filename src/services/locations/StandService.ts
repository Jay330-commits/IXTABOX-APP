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
                      in: [BookingStatus.Upcoming, BookingStatus.Active],
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

  /**
   * Get all stands by distributor ID
   */
  async getAllStandsByDistributor(distributorId: string) {
    return await this.logOperation(
      'GET_ALL_STANDS_BY_DISTRIBUTOR',
      async () => {
        const stands = await this.prisma.stands.findMany({
          where: {
            locations: {
              distributor_id: distributorId,
            },
          },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
                status: true,
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
          orderBy: {
            name: 'asc',
          },
        });

        return stands;
      },
      'StandService.getAllStandsByDistributor',
      { distributorId }
    );
  }

  /**
   * Get stand performance metrics
   */
  async getStandPerformance(
    standId: string,
    period?: 'month' | 'quarter' | 'year'
  ): Promise<{
    totalBookings: number;
    occupancyRate: number;
    monthlyEarnings: number[];
    months: string[];
  }> {
    return await this.logOperation(
      'GET_STAND_PERFORMANCE',
      async () => {
        const now = new Date();
        let startDate: Date;
        const months: string[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        switch (period) {
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            for (let i = 0; i < 3; i++) {
              months.push(monthNames[quarter * 3 + i]);
            }
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            months.push(...monthNames);
            break;
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            months.push(monthNames[now.getMonth()]);
        }

        const bookings = await this.prisma.bookings.findMany({
          where: {
            boxes: {
              stand_id: standId,
            },
            start_date: {
              gte: startDate,
            },
          },
          include: {
            payments: {
              select: {
                amount: true,
              },
            },
          },
        });

        const totalBookings = bookings.length;

        // Calculate occupancy rate (boxes in use / total boxes)
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

        const totalBoxes = stand?.boxes.length || 0;
        const occupiedBoxes = stand?.boxes.filter(
          (box) => box.status === boxStatus.Active
        ).length || 0;
        const occupancyRate = totalBoxes > 0 ? Math.round((occupiedBoxes / totalBoxes) * 100) : 0;

        // Calculate monthly earnings
        const monthlyEarnings: number[] = [];
        if (period === 'year') {
          for (let month = 0; month < 12; month++) {
            const monthStart = new Date(now.getFullYear(), month, 1);
            const monthEnd = new Date(now.getFullYear(), month + 1, 0);
            const monthBookings = bookings.filter(
              (booking) =>
                new Date(booking.start_date) >= monthStart &&
                new Date(booking.start_date) <= monthEnd
            );
            const earnings = monthBookings.reduce(
              (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
              0
            );
            monthlyEarnings.push(earnings);
          }
        } else {
          // For month/quarter, just return total
          const earnings = bookings.reduce(
            (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
            0
          );
          monthlyEarnings.push(earnings);
        }

        return {
          totalBookings,
          occupancyRate,
          monthlyEarnings,
          months,
        };
      },
      'StandService.getStandPerformance',
      { standId, period }
    );
  }

  /**
   * Get stand occupancy rate
   */
  async getStandOccupancyRate(standId: string): Promise<number> {
    return await this.logOperation(
      'GET_STAND_OCCUPANCY_RATE',
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

        const totalBoxes = stand.boxes.length;
        if (totalBoxes === 0) return 0;

        const occupiedBoxes = stand.boxes.filter(
          (box) => box.status === boxStatus.Active
        ).length;

        return Math.round((occupiedBoxes / totalBoxes) * 100);
      },
      'StandService.getStandOccupancyRate',
      { standId }
    );
  }

  /**
   * Get stand revenue
   */
  async getStandRevenue(
    standId: string,
    period?: 'month' | 'quarter' | 'year'
  ): Promise<number> {
    return await this.logOperation(
      'GET_STAND_REVENUE',
      async () => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const bookings = await this.prisma.bookings.findMany({
          where: {
            boxes: {
              stand_id: standId,
            },
            start_date: {
              gte: startDate,
            },
          },
          include: {
            payments: {
              select: {
                amount: true,
              },
            },
          },
        });

        return bookings.reduce(
          (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );
      },
      'StandService.getStandRevenue',
      { standId, period }
    );
  }
}

