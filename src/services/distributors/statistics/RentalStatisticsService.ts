import 'server-only';
import { boxStatus, BookingStatus } from '@prisma/client';
import { BaseService } from '../../BaseService';

export interface StandStatistics {
  standId: string;
  standName: string;
  totalBookings: number;
  occupancyRate: number;
  monthlyEarnings: number[];
  months: string[];
}

export interface StandMetrics {
  totalBookings: number;
  occupancyRate: number;
  totalEarnings: number;
  averageRentalDuration: number;
  repeatCustomerRate: number;
  averageRating: number;
  revenueGrowth: number;
}

/**
 * RentalStatisticsService
 * Handles rental statistics and analytics
 */
export class RentalStatisticsService extends BaseService {
  /**
   * Get stand statistics
   */
  async getStandStatistics(
    standId: string,
    period?: 'month' | 'quarter' | 'year'
  ): Promise<StandStatistics> {
    return await this.logOperation(
      'GET_STAND_STATISTICS',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

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

        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: { stand_id: standId },
          select: { id: true },
        });
        const boxIds = standBoxes.map((box) => box.id);

        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
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

        // Calculate occupancy rate
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stand_id: standId,
          },
          select: {
            status: true,
          },
        });

        const totalBoxes = boxes.length;
        const occupiedBoxes = boxes.filter(
          (box) => box.status === boxStatus.Active
        ).length;
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
          const earnings = bookings.reduce(
            (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
            0
          );
          monthlyEarnings.push(earnings);
        }

        return {
          standId: stand.id,
          standName: stand.name,
          totalBookings,
          occupancyRate,
          monthlyEarnings,
          months,
        };
      },
      'RentalStatisticsService.getStandStatistics',
      { standId, period }
    );
  }

  /**
   * Get comprehensive stand metrics
   */
  async getStandMetrics(standId: string): Promise<StandMetrics> {
    return await this.logOperation(
      'GET_STAND_METRICS',
      async () => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(now.getFullYear(), 0, 0);

        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: { stand_id: standId },
          select: { id: true },
        });
        const boxIds = standBoxes.map((box) => box.id);

        // Get all bookings for this year
        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            start_date: {
              gte: startOfYear,
            },
          },
          include: {
            payments: {
              include: {
                users: {
                  select: {
                    id: true,
                  },
                },
              },
              select: {
                amount: true,
                users: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        // Get last year bookings for growth calculation
        const lastYearBookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            start_date: {
              gte: startOfLastYear,
              lte: endOfLastYear,
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

        // Calculate occupancy rate
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stand_id: standId,
          },
          select: {
            status: true,
          },
        });

        const totalBoxes = boxes.length;
        const occupiedBoxes = boxes.filter(
          (box) => box.status === boxStatus.Active
        ).length;
        const occupancyRate = totalBoxes > 0 ? Math.round((occupiedBoxes / totalBoxes) * 100) : 0;

        // Calculate total earnings
        const totalEarnings = bookings.reduce(
          (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );

        // Calculate average rental duration
        const durations = bookings.map((booking) => {
          const start = new Date(booking.start_date);
          const end = new Date(booking.end_date);
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        });
        const averageRentalDuration =
          durations.length > 0
            ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
            : 0;

        // Calculate repeat customer rate
        const customerIds = bookings
          .map((b) => b.payments?.users?.id)
          .filter((id): id is string => id !== undefined);
        const uniqueCustomers = new Set(customerIds).size;
        const repeatCustomerRate =
          customerIds.length > 0
            ? Math.round(((customerIds.length - uniqueCustomers) / customerIds.length) * 100)
            : 0;

        // Get average rating from location reviews
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              include: {
                reviews: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        });

        const reviews = stand?.locations.reviews || [];
        const averageRating =
          reviews.length > 0
            ? Math.round(
                (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10
              ) / 10
            : 0;

        // Calculate revenue growth
        const lastYearEarnings = lastYearBookings.reduce(
          (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );
        const revenueGrowth =
          lastYearEarnings > 0
            ? Math.round(((totalEarnings - lastYearEarnings) / lastYearEarnings) * 100)
            : 0;

        return {
          totalBookings,
          occupancyRate,
          totalEarnings,
          averageRentalDuration,
          repeatCustomerRate,
          averageRating,
          revenueGrowth,
        };
      },
      'RentalStatisticsService.getStandMetrics',
      { standId }
    );
  }

  /**
   * Get average rental duration
   */
  async getAverageRentalDuration(standId: string): Promise<number> {
    return await this.logOperation(
      'GET_AVERAGE_RENTAL_DURATION',
      async () => {
        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: { stand_id: standId },
          select: { id: true },
        });
        const boxIds = standBoxes.map((box) => box.id);

        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            status: BookingStatus.Completed,
          },
          select: {
            start_date: true,
            end_date: true,
          },
        });

        if (bookings.length === 0) return 0;

        const durations = bookings.map((booking) => {
          const start = new Date(booking.start_date);
          const end = new Date(booking.end_date);
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        });

        return Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
      },
      'RentalStatisticsService.getAverageRentalDuration',
      { standId }
    );
  }

  /**
   * Get repeat customer rate
   */
  async getRepeatCustomerRate(standId: string): Promise<number> {
    return await this.logOperation(
      'GET_REPEAT_CUSTOMER_RATE',
      async () => {
        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: { stand_id: standId },
          select: { id: true },
        });
        const boxIds = standBoxes.map((box) => box.id);

        const bookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
          },
          include: {
            payments: {
              include: {
                users: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        if (bookings.length === 0) return 0;

        const customerIds = bookings
          .map((b) => b.payments?.users?.id)
          .filter((id): id is string => id !== undefined);
        const uniqueCustomers = new Set(customerIds).size;
        const repeatRate =
          ((customerIds.length - uniqueCustomers) / customerIds.length) * 100;

        return Math.round(repeatRate);
      },
      'RentalStatisticsService.getRepeatCustomerRate',
      { standId }
    );
  }

  /**
   * Get average rating
   */
  async getAverageRating(standId: string): Promise<number> {
    return await this.logOperation(
      'GET_AVERAGE_RATING',
      async () => {
        const stand = await this.prisma.stands.findUnique({
          where: { id: standId },
          include: {
            locations: {
              include: {
                reviews: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        });

        if (!stand) {
          throw new Error(`Stand with id ${standId} not found`);
        }

        const reviews = stand.locations.reviews || [];
        if (reviews.length === 0) return 0;

        const average =
          reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        return Math.round(average * 10) / 10;
      },
      'RentalStatisticsService.getAverageRating',
      { standId }
    );
  }

  /**
   * Get revenue growth
   */
  async getRevenueGrowth(
    standId: string,
    period?: 'month' | 'quarter' | 'year'
  ): Promise<number> {
    return await this.logOperation(
      'GET_REVENUE_GROWTH',
      async () => {
        const now = new Date();
        let currentStart: Date;
        let previousStart: Date;
        let previousEnd: Date;

        switch (period) {
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            currentStart = new Date(now.getFullYear(), quarter * 3, 1);
            previousStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
            previousEnd = new Date(now.getFullYear(), quarter * 3, 0);
            break;
          case 'year':
            currentStart = new Date(now.getFullYear(), 0, 1);
            previousStart = new Date(now.getFullYear() - 1, 0, 1);
            previousEnd = new Date(now.getFullYear(), 0, 0);
            break;
          default: // month
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
            previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        // Get all box IDs for this stand
        const standBoxes = await this.prisma.boxes.findMany({
          where: { stand_id: standId },
          select: { id: true },
        });
        const boxIds = standBoxes.map((box) => box.id);

        const currentBookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            start_date: {
              gte: currentStart,
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

        const previousBookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            start_date: {
              gte: previousStart,
              lte: previousEnd,
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

        const currentRevenue = currentBookings.reduce(
          (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );

        const previousRevenue = previousBookings.reduce(
          (sum, booking) => sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );

        if (previousRevenue === 0) return 0;

        return Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
      },
      'RentalStatisticsService.getRevenueGrowth',
      { standId, period }
    );
  }
}

