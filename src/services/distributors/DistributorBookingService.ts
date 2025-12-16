import 'server-only';
import { BookingStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface DistributorBooking {
  id: string;
  boxId: string;
  boxDisplayId: string;
  standId: string;
  standName: string;
  location: string;
  customerEmail: string;
  startDate: string;
  endDate: string;
  status: string;
  revenue: number;
}

/**
 * DistributorBookingService
 * Handles booking operations specific to distributors
 */
export class DistributorBookingService extends BaseService {
  /**
   * Get bookings by distributor
   */
  async getBookingsByDistributor(
    distributorId: string,
    filters?: {
      status?: BookingStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<DistributorBooking[]> {
    return await this.logOperation(
      'GET_BOOKINGS_BY_DISTRIBUTOR',
      async () => {
        // Get all box IDs for this distributor's locations
        const distributorBoxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
          },
          select: {
            id: true,
          },
        });
        const boxIds = distributorBoxes.map((box) => box.id);

        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            ...(filters?.status && { status: filters.status }),
            ...(filters?.startDate && {
              start_date: {
                gte: filters.startDate,
              },
            }),
            ...(filters?.endDate && {
              end_date: {
                lte: filters.endDate,
              },
            }),
          },
          include: {
            boxes: {
              select: {
                id: true,
                display_id: true,
              },
              include: {
                stands: {
                  include: {
                    locations: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
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
          id: booking.id,
          boxId: booking.boxes.id,
          boxDisplayId: booking.boxes.display_id,
          standId: booking.boxes.stands.id,
          standName: booking.boxes.stands.name,
          location: booking.boxes.stands.locations.name,
          customerEmail: booking.payments?.users?.email || 'Unknown',
          startDate: new Date(booking.start_date).toLocaleDateString(),
          endDate: new Date(booking.end_date).toLocaleDateString(),
          status: booking.status || 'unknown',
          revenue: booking.payments?.amount ? Number(booking.payments.amount) : 0,
        }));
      },
      'DistributorBookingService.getBookingsByDistributor',
      { distributorId, filters }
    );
  }

  /**
   * Get bookings by stand
   */
  async getBookingsByStand(
    standId: string,
    filters?: {
      status?: BookingStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<DistributorBooking[]> {
    return await this.logOperation(
      'GET_BOOKINGS_BY_STAND',
      async () => {
        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: {
            stand_id: standId,
          },
          select: {
            id: true,
          },
        });
        const boxIds = standBoxes.map((box) => box.id);

        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            ...(filters?.status && { status: filters.status }),
            ...(filters?.startDate && {
              start_date: {
                gte: filters.startDate,
              },
            }),
            ...(filters?.endDate && {
              end_date: {
                lte: filters.endDate,
              },
            }),
          },
          include: {
            boxes: {
              select: {
                id: true,
                display_id: true,
              },
              include: {
                stands: {
                  include: {
                    locations: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
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
          id: booking.id,
          boxId: booking.boxes.id,
          boxDisplayId: booking.boxes.display_id,
          standId: booking.boxes.stands.id,
          standName: booking.boxes.stands.name,
          location: booking.boxes.stands.locations.name,
          customerEmail: booking.payments?.users?.email || 'Unknown',
          startDate: new Date(booking.start_date).toLocaleDateString(),
          endDate: new Date(booking.end_date).toLocaleDateString(),
          status: booking.status || 'unknown',
          revenue: booking.payments?.amount ? Number(booking.payments.amount) : 0,
        }));
      },
      'DistributorBookingService.getBookingsByStand',
      { standId, filters }
    );
  }

  /**
   * Get active bookings
   */
  async getActiveBookings(distributorId: string): Promise<DistributorBooking[]> {
    return await this.getBookingsByDistributor(distributorId, {
      status: BookingStatus.Active,
    });
  }

  /**
   * Get scheduled bookings
   */
  async getScheduledBookings(distributorId: string): Promise<DistributorBooking[]> {
    return await this.getBookingsByDistributor(distributorId, {
      status: BookingStatus.Upcoming,
    });
  }

  /**
   * Track box location (get current booking info for a box)
   */
  async trackBoxLocation(boxId: string) {
    return await this.logOperation(
      'TRACK_BOX_LOCATION',
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
                    coordinates: true,
                  },
                },
              },
            },
            bookings: {
              where: {
                OR: [
                  { status: BookingStatus.Active },
                  { status: BookingStatus.Upcoming },
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

        return {
          boxId: box.id,
          boxDisplayId: box.display_id,
          currentLocation: {
            standId: box.stands.id,
            standName: box.stands.name,
            locationId: box.stands.locations.id,
            locationName: box.stands.locations.name,
            address: box.stands.locations.address,
            coordinates: box.stands.locations.coordinates,
          },
          currentBooking: box.bookings[0]
            ? {
                bookingId: box.bookings[0].id,
                customerEmail: box.bookings[0].payments?.users?.email,
                startDate: box.bookings[0].start_date,
                endDate: box.bookings[0].end_date,
                status: box.bookings[0].status,
              }
            : null,
          status: box.status,
        };
      },
      'DistributorBookingService.trackBoxLocation',
      { boxId }
    );
  }
}

