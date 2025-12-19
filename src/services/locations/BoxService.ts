import 'server-only';
import { boxmodel, boxStatus, BookingStatus, Prisma } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface CreateBoxData {
  standId: string;
  model: boxmodel;
  compartment?: number | null;
  status?: boxStatus;
  displayId?: string;
}

export interface UpdateBoxData {
  standId?: string;
  model?: boxmodel;
  compartment?: number | null;
  status?: boxStatus;
  displayId?: string;
}

/**
 * BoxService
 * Handles all box-related operations
 */
export class BoxService extends BaseService {
  /**
   * Create a new box
   */
  async createBox(data: CreateBoxData) {
    return await this.logOperation(
      'CREATE_BOX',
      async () => {
        // Validate stand exists
        const stand = await this.prisma.stands.findUnique({
          where: { id: data.standId },
          select: { id: true },
        });

        if (!stand) {
          throw new Error(`Stand with id ${data.standId} not found`);
        }

        // Validate model
        if (!Object.values(boxmodel).includes(data.model)) {
          throw new Error(`Invalid box model: ${data.model}`);
        }

        // Create box
        const box = await this.prisma.boxes.create({
          data: {
            stand_id: data.standId,
            model: data.model,
            compartment: data.compartment ?? null,
            status: data.status ?? boxStatus.Active,
            display_id: data.displayId, // If not provided, database will auto-generate
          },
          include: {
            stands: {
              select: {
                id: true,
                name: true,
                location_id: true,
              },
            },
          },
        });

        console.log('Box created:', {
          boxId: box.id,
          displayId: box.display_id,
          standId: box.stand_id,
          model: box.model,
          status: box.status,
        });

        return box;
      },
      'BoxService.createBox'
    );
  }

  /**
   * Update box with specific columns and values
   */
  async updateBox(boxId: string, data: UpdateBoxData) {
    return await this.logOperation(
      'UPDATE_BOX',
      async () => {
        // Verify box exists
        const existingBox = await this.prisma.boxes.findUnique({
          where: { id: boxId },
        });

        if (!existingBox) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        // Validate stand if being updated
        if (data.standId) {
          const stand = await this.prisma.stands.findUnique({
            where: { id: data.standId },
            select: { id: true },
          });

          if (!stand) {
            throw new Error(`Stand with id ${data.standId} not found`);
          }
        }

        // Validate model if being updated
        if (data.model && !Object.values(boxmodel).includes(data.model)) {
          throw new Error(`Invalid box model: ${data.model}`);
        }

        // Validate status if being updated
        if (data.status && !Object.values(boxStatus).includes(data.status)) {
          throw new Error(`Invalid box status: ${data.status}`);
        }

        // Build update data object
        const updateData: Prisma.boxesUpdateInput = {};

        if (data.standId !== undefined) {
          // Use relation syntax for Prisma updates
          updateData.stands = {
            connect: { id: data.standId },
          };
        }
        if (data.model !== undefined) {
          updateData.model = data.model;
        }
        if (data.compartment !== undefined) {
          updateData.compartment = data.compartment;
        }
        if (data.status !== undefined) {
          updateData.status = data.status;
        }
        if (data.displayId !== undefined) {
          updateData.display_id = data.displayId;
        }

        // Update box
        const updatedBox = await this.prisma.boxes.update({
          where: { id: boxId },
          data: updateData,
          include: {
            stands: {
              select: {
                id: true,
                name: true,
                location_id: true,
              },
            },
          },
        });

        console.log('Box updated:', {
          boxId: updatedBox.id,
          displayId: updatedBox.display_id,
          changes: Object.keys(updateData),
        });

        return updatedBox;
      },
      'BoxService.updateBox'
    );
  }

  /**
   * Change box owner (moves box to a different stand)
   * Uses updateBox() internally
   */
  async changeBoxOwner(boxId: string, newStandId: string) {
    return await this.logOperation(
      'CHANGE_BOX_OWNER',
      async () => {
        // Verify new stand exists
        const newStand = await this.prisma.stands.findUnique({
          where: { id: newStandId },
          select: { id: true, name: true },
        });

        if (!newStand) {
          throw new Error(`Stand with id ${newStandId} not found`);
        }

        // Get current box info for logging
        const currentBox = await this.prisma.boxes.findUnique({
          where: { id: boxId },
          include: {
            stands: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!currentBox) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        // Update box to new stand using updateBox
        const updatedBox = await this.updateBox(boxId, {
          standId: newStandId,
        });

        console.log('Box owner changed:', {
          boxId: updatedBox.id,
          displayId: updatedBox.display_id,
          oldStandId: currentBox.stand_id,
          oldStandName: currentBox.stands.name,
          newStandId: newStandId,
          newStandName: newStand.name,
        });

        return updatedBox;
      },
      'BoxService.changeBoxOwner'
    );
  }

  /**
   * Set box to maintenance status
   * Uses updateBox() internally
   */
  async setBoxMaintenance(boxId: string, isMaintenance: boolean = true) {
    return await this.logOperation(
      'SET_BOX_MAINTENANCE',
      async () => {
        const newStatus = isMaintenance ? boxStatus.Inactive : boxStatus.Active;

        // Update box status using updateBox
        const updatedBox = await this.updateBox(boxId, {
          status: newStatus,
        });

        console.log('Box maintenance status updated:', {
          boxId: updatedBox.id,
          displayId: updatedBox.display_id,
          status: updatedBox.status,
          isMaintenance,
        });

        return updatedBox;
      },
      'BoxService.setBoxMaintenance'
    );
  }

  /**
   * Delete a box
   * Note: This will fail if box has active bookings or locks
   */
  async deleteBox(boxId: string, force: boolean = false) {
    return await this.logOperation(
      'DELETE_BOX',
      async () => {
        // Verify box exists
        const box = await this.prisma.boxes.findUnique({
          where: { id: boxId },
          include: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.Upcoming, BookingStatus.Active],
                },
              },
              select: {
                id: true,
              },
            },
            locks: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!box) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        // Check for active bookings
        if (box.bookings.length > 0 && !force) {
          throw new Error(
            `Cannot delete box ${boxId}: Box has ${box.bookings.length} active/Upcoming booking(s). Use force=true to delete anyway.`
          );
        }

        // Check for locks
        if (box.locks.length > 0 && !force) {
          throw new Error(
            `Cannot delete box ${boxId}: Box has ${box.locks.length} lock(s). Use force=true to delete anyway.`
          );
        }

        // Delete box
        await this.prisma.boxes.delete({
          where: { id: boxId },
        });

        console.log('Box deleted:', {
          boxId: box.id,
          displayId: box.display_id,
          hadBookings: box.bookings.length,
          hadLocks: box.locks.length,
          force,
        });

        return { success: true, boxId };
      },
      'BoxService.deleteBox'
    );
  }

  /**
   * Get a box by ID
   */
  async getBox(boxId: string) {
    return await this.logOperation(
      'GET_BOX',
      async () => {
        const box = await this.prisma.boxes.findUnique({
          where: { id: boxId },
          include: {
            stands: {
              include: {
                locations: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
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
                status: true,
              },
            },
          },
        });

        if (!box) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        return box;
      },
      'BoxService.getBox'
    );
  }

  /**
   * Get box by display ID
   */
  async getBoxByDisplayId(displayId: string) {
    return await this.logOperation(
      'GET_BOX_BY_DISPLAY_ID',
      async () => {
        const box = await this.prisma.boxes.findUnique({
          where: { display_id: displayId },
          include: {
            stands: {
              include: {
                locations: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
          },
        });

        if (!box) {
          throw new Error(`Box with display ID ${displayId} not found`);
        }

        return box;
      },
      'BoxService.getBoxByDisplayId'
    );
  }

  /**
   * Get all boxes for a specific stand
   */
  async getBoxesByStand(standId: string, includeInactive: boolean = false) {
    return await this.logOperation(
      'GET_BOXES_BY_STAND',
      async () => {
        const where: Prisma.boxesWhereInput = {
          stand_id: standId,
        };

        if (!includeInactive) {
          where.status = boxStatus.Active;
        }

        const boxes = await this.prisma.boxes.findMany({
          where,
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
          orderBy: {
            display_id: 'asc',
          },
        });

        return boxes;
      },
      'BoxService.getBoxesByStand'
    );
  }

  /**
   * Get all boxes for a location (through stands)
   */
  async getBoxesByLocation(locationId: string, includeInactive: boolean = false) {
    return await this.logOperation(
      'GET_BOXES_BY_LOCATION',
      async () => {
        const location = await this.prisma.locations.findUnique({
          where: { id: locationId },
          include: {
            stands: {
              include: {
                boxes: {
                  where: includeInactive
                    ? undefined
                    : {
                        status: boxStatus.Active,
                      },
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
            },
          },
        });

        if (!location) {
          throw new Error(`Location with id ${locationId} not found`);
        }

        // Flatten boxes from all stands
        const boxes = location.stands.flatMap((stand) => stand.boxes);

        return boxes;
      },
      'BoxService.getBoxesByLocation'
    );
  }

  /**
   * Validate box data before creation/update
   */
  validateBoxData(data: CreateBoxData | UpdateBoxData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if ('model' in data && data.model) {
      if (!Object.values(boxmodel).includes(data.model)) {
        errors.push(`Invalid box model: ${data.model}`);
      }
    }

    if ('status' in data && data.status) {
      if (!Object.values(boxStatus).includes(data.status)) {
        errors.push(`Invalid box status: ${data.status}`);
      }
    }

    if ('compartment' in data && data.compartment !== null && data.compartment !== undefined) {
      if (data.compartment < 0) {
        errors.push('Compartment number must be non-negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all boxes (for debugging/admin)
   */
  async getAllBoxes(limit?: number) {
    return await this.logOperation(
      'GET_ALL_BOXES',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          select: {
            id: true,
            stand_id: true,
            model: true,
            compartment: true,
            display_id: true,
            status: true,
          },
          orderBy: [
            { stand_id: 'asc' },
            { id: 'asc' },
          ],
          take: limit,
        });

        return boxes;
      },
      'BoxService.getAllBoxes'
    );
  }

  /**
   * Check if box is available (no active bookings)
   */
  async isBoxAvailable(boxId: string, startDate?: Date, endDate?: Date): Promise<boolean> {
    return await this.logOperation(
      'CHECK_BOX_AVAILABILITY',
      async () => {
        const box = await this.prisma.boxes.findUnique({
          where: { id: boxId },
          include: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.Upcoming, BookingStatus.Active],
                },
              },
              select: {
                start_date: true,
                end_date: true,
              },
            },
          },
        });

        if (!box) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        // If box is inactive, it's not available
        if (box.status === boxStatus.Inactive) {
          return false;
        }

        // If no bookings, box is available
        if (box.bookings.length === 0) {
          return true;
        }

        // If no date range specified, check if box has any bookings
        if (!startDate || !endDate) {
          return false;
        }

        // Check for date overlaps
        const hasOverlap = box.bookings.some((booking) => {
          const bookingStart = new Date(booking.start_date);
          const bookingEnd = new Date(booking.end_date);
          return startDate <= bookingEnd && endDate >= bookingStart;
        });

        return !hasOverlap;
      },
      'BoxService.isBoxAvailable'
    );
  }
}

