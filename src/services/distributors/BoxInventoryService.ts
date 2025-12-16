import 'server-only';
import { boxStatus, BookingStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface BoxInventoryOverview {
  totalBoxes: number;
  availableBoxes: number;
  rentedBoxes: number;
  reservedBoxes: number;
  maintenanceBoxes: number;
}

export interface StandInventory {
  standId: string;
  standName: string;
  location: string;
  isOperational: boolean;
  capacity: number;
  boxes: Array<{
    id: string;
    type: string;
    serialNumber: string;
    status: string;
    condition: string;
  }>;
  lastUpdated: string;
}

export interface BoxDetails {
  id: string;
  displayId: string;
  type: string;
  serialNumber: string;
  status: string;
  condition: string;
  currentLocation: string;
  standId: string;
  standName: string;
  currentBooking?: {
    customerEmail: string;
    startDate: string;
    endDate: string;
    revenue: number;
  };
}

/**
 * BoxInventoryService
 * Handles box inventory tracking and management
 */
export class BoxInventoryService extends BaseService {
  /**
   * Get inventory overview for distributor
   */
  async getInventoryOverview(
    distributorId: string
  ): Promise<BoxInventoryOverview> {
    return await this.logOperation(
      'GET_INVENTORY_OVERVIEW',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
          },
          select: {
            status: true,
            bookings: {
              where: {
                status: BookingStatus.Upcoming,
              },
              take: 1,
            },
          },
        });

        const totalBoxes = boxes.length;
        let availableBoxes = 0;
        let rentedBoxes = 0;
        let reservedBoxes = 0;
        const maintenanceBoxes = 0;

        boxes.forEach((box) => {
          // boxStatus enum: Active (in use), Inactive (available), Upcoming (scheduled)
          if (box.status === boxStatus.Active) {
            rentedBoxes++;
          } else if (box.status === boxStatus.Upcoming) {
            reservedBoxes++;
          } else if (box.status === boxStatus.Inactive) {
            availableBoxes++;
          } else {
            // Default to available if status is null/undefined
            availableBoxes++;
          }
        });

        return {
          totalBoxes,
          availableBoxes,
          rentedBoxes,
          reservedBoxes,
          maintenanceBoxes,
        };
      },
      'BoxInventoryService.getInventoryOverview',
      { distributorId }
    );
  }

  /**
   * Get inventory by stand
   */
  async getInventoryByStand(standId: string): Promise<StandInventory> {
    return await this.logOperation(
      'GET_INVENTORY_BY_STAND',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                address: true,
                status: true,
                updated_at: true,
              },
            },
            boxes: {
              include: {
                bookings: {
                  where: {
                    OR: [
                      { status: BookingStatus.Active },
                      { status: BookingStatus.Upcoming },
                      { status: BookingStatus.Confirmed },
                    ],
                  },
                  take: 1,
                  orderBy: {
                    start_date: 'desc',
                  },
                  include: {
                    payments: {
                      include: {
                        users: {
                          select: {
                            email: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        const boxes = stand.boxes.map((box) => {
          const isReserved = box.bookings.some(
            (booking) =>
              booking.status === BookingStatus.Upcoming ||
              booking.status === BookingStatus.Confirmed
          );

          let status = 'available';
          if (box.status === boxStatus.Active) {
            status = 'rented';
          } else if (isReserved) {
            status = 'reserved';
          } else if (box.status === boxStatus.Upcoming) {
            status = 'reserved';
          } else {
            status = 'available';
          }

          return {
            id: box.id,
            type: box.model || 'Unknown',
            serialNumber: box.display_id,
            status,
            condition: 'excellent', // This would come from a condition field if added
          };
        });

        return {
          standId: stand.id,
          standName: stand.name,
          location: stand.locations.name,
          isOperational: stand.locations.status === 'Available',
          capacity: stand.capacity || 0,
          boxes,
          lastUpdated: stand.locations.updated_at
            ? new Date(stand.locations.updated_at).toLocaleString()
            : 'Unknown',
        };
      },
      'BoxInventoryService.getInventoryByStand',
      { standId }
    );
  }

  /**
   * Get box details
   */
  async getBoxDetails(boxId: string): Promise<BoxDetails> {
    return await this.logOperation(
      'GET_BOX_DETAILS',
      async () => {
        const box = await this.prisma.boxes.findUnique({
          where: { id: boxId },
          include: {
            stands: {
              include: {
                locations: true,
              },
            },
            bookings: {
              where: {
                OR: [
                  { status: BookingStatus.Active },
                  { status: BookingStatus.Upcoming },
                  { status: BookingStatus.Confirmed },
                ],
              },
              include: {
                payments: {
                  include: {
                    users: {
                      select: {
                        email: true,
                      },
                    },
                  },
                  select: {
                    amount: true,
                    users: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                start_date: 'desc',
              },
              take: 1,
            },
          },
        });

        if (!box) {
          throw new Error(`Box with id ${boxId} not found`);
        }

        const currentBooking = box.bookings[0];

        return {
          id: box.id,
          displayId: box.display_id,
          type: box.model || 'Unknown',
          serialNumber: box.display_id,
          status: box.status || 'available',
          condition: 'excellent', // Would come from condition field
          currentLocation: box.stands.locations.name,
          standId: box.stands.id,
          standName: box.stands.name,
          currentBooking: currentBooking
            ? {
                customerEmail: currentBooking.payments?.users?.email || 'Unknown',
                startDate: new Date(
                  currentBooking.start_date
                ).toLocaleDateString(),
                endDate: new Date(currentBooking.end_date).toLocaleDateString(),
                revenue: currentBooking.payments
                  ? Number(currentBooking.payments.amount)
                  : 0,
              }
            : undefined,
        };
      },
      'BoxInventoryService.getBoxDetails',
      { boxId }
    );
  }

  /**
   * Update box status
   */
  async updateBoxStatus(
    boxId: string,
    status: boxStatus
  ): Promise<{ success: boolean }> {
    return await this.logOperation(
      'UPDATE_BOX_STATUS',
      async () => {
        await this.prisma.boxes.update({
          where: { id: boxId },
          data: { status },
        });

        return { success: true };
      },
      'BoxInventoryService.updateBoxStatus',
      { boxId, status }
    );
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(
    distributorId: string,
    threshold: number = 3
  ): Promise<
    Array<{
      standId: string;
      standName: string;
      location: string;
      availableCount: number;
      message: string;
    }>
  > {
    return await this.logOperation(
      'GET_LOW_STOCK_ALERTS',
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
                name: true,
              },
            },
            boxes: {
              where: {
                status: boxStatus.Inactive,
              },
            },
          },
        });

        const alerts = stands
          .filter((stand) => stand.boxes.length <= threshold)
          .map((stand) => ({
            standId: stand.id,
            standName: stand.name,
            location: stand.locations.name,
            availableCount: stand.boxes.length,
            message: `Only ${stand.boxes.length} IXTAboxes available. Consider adding more inventory to meet demand.`,
          }));

        return alerts;
      },
      'BoxInventoryService.getLowStockAlerts',
      { distributorId, threshold }
    );
  }

  /**
   * Get maintenance alerts
   */
  async getMaintenanceAlerts(
    distributorId: string
  ): Promise<
    Array<{
      boxId: string;
      boxDisplayId: string;
      standName: string;
      location: string;
      status: string;
    }>
  > {
    return await this.logOperation(
      'GET_MAINTENANCE_ALERTS',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
            status: boxStatus.Inactive,
          },
          include: {
            stands: {
              include: {
                locations: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        return boxes.map((box) => ({
          boxId: box.id,
          boxDisplayId: box.display_id,
          standName: box.stands.name,
          location: box.stands.locations.name,
          status: box.status || 'maintenance',
        }));
      },
      'BoxInventoryService.getMaintenanceAlerts',
      { distributorId }
    );
  }

  /**
   * Get box history
   */
  async getBoxHistory(boxId: string): Promise<
    Array<{
      bookingId: string;
      customerEmail: string;
      startDate: string;
      endDate: string;
      revenue: number;
      status: string;
    }>
  > {
    return await this.logOperation(
      'GET_BOX_HISTORY',
      async () => {
        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: boxId,
          },
          include: {
            payments: {
              include: {
                users: {
                  select: {
                    email: true,
                  },
                },
              },
              select: {
                amount: true,
                users: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            start_date: 'desc',
          },
        });

        return bookings.map((booking) => ({
          bookingId: booking.id,
          customerEmail: booking.payments?.users?.email || 'Unknown',
          startDate: new Date(booking.start_date).toLocaleDateString(),
          endDate: new Date(booking.end_date).toLocaleDateString(),
          revenue: booking.payments
            ? Number(booking.payments.amount)
            : 0,
          status: booking.status || 'unknown',
        }));
      },
      'BoxInventoryService.getBoxHistory',
      { boxId }
    );
  }
}

