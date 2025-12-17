import 'server-only';
import { boxStatus, BookingStatus } from '@prisma/client';
import { BaseService } from '../../BaseService';

export interface LocationComparison {
  locationId: string;
  locationName: string;
  occupancyRate: number;
  monthlyRevenue: number;
  totalBookings: number;
  averageRating: number;
  totalStands: number;
}

/**
 * PerformanceComparisonService
 * Handles performance comparisons between locations
 */
export class PerformanceComparisonService extends BaseService {
  /**
   * Compare locations performance
   */
  async compareLocationsPerformance(
    distributorId: string,
    metric: 'occupancy' | 'revenue' | 'bookings' | 'rating'
  ): Promise<LocationComparison[]> {
    return await this.logOperation(
      'COMPARE_LOCATIONS_PERFORMANCE',
      async () => {
        const locations = await this.prisma.locations.findMany({
          where: {
            distributor_id: distributorId,
          },
          include: {
            reviews: {
              select: {
                rating: true,
              },
            },
            stands: {
              include: {
                boxes: {
                  select: {
                    id: true,
                    status: true,
                    bookings: {
                      where: {
                        OR: [
                          { status: BookingStatus.Active },
                          { status: BookingStatus.Upcoming },
                          { status: BookingStatus.Confirmed },
                        ],
                      },
                      select: {
                        id: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const comparisons: LocationComparison[] = [];

        for (const location of locations) {
          // Aggregate all boxes from all stands at this location
          const allBoxes = location.stands.flatMap(stand => stand.boxes);
          const allBoxIds = allBoxes.map(box => box.id);

          // Get all bookings for this location (from all stands)
          const bookings = await this.prisma.bookings.findMany({
            where: {
              box_id: {
                in: allBoxIds,
              },
              start_date: {
                gte: startOfMonth,
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

          // Calculate occupancy rate across all boxes at this location
          // A box is occupied if it has an active or upcoming booking
          const totalBoxes = allBoxes.length;
          const occupiedBoxes = allBoxes.filter((box) => {
            // Check if box has any active or upcoming bookings
            const hasActiveBooking = box.bookings && box.bookings.length > 0 && box.bookings.some(
              (booking) =>
                booking.status === BookingStatus.Active ||
                booking.status === BookingStatus.Upcoming ||
                booking.status === BookingStatus.Confirmed
            );
            return hasActiveBooking;
          }).length;
          const occupancyRate =
            totalBoxes > 0 ? Math.round((occupiedBoxes / totalBoxes) * 100) : 0;

          // Calculate monthly revenue for this location
          const monthlyRevenue = bookings.reduce(
            (sum, booking) =>
              sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
            0
          );

          // Get average rating from location reviews
          const reviews = location.reviews || [];
          const averageRating =
            reviews.length > 0
              ? Math.round(
                  (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10
                ) / 10
              : 0;

          comparisons.push({
            locationId: location.id,
            locationName: location.name,
            occupancyRate,
            monthlyRevenue,
            totalBookings: bookings.length,
            averageRating,
            totalStands: location.stands.length,
          });
        }

        // Sort by metric
        comparisons.sort((a, b) => {
          switch (metric) {
            case 'occupancy':
              return b.occupancyRate - a.occupancyRate;
            case 'revenue':
              return b.monthlyRevenue - a.monthlyRevenue;
            case 'bookings':
              return b.totalBookings - a.totalBookings;
            case 'rating':
              return b.averageRating - a.averageRating;
            default:
              return 0;
          }
        });

        return comparisons;
      },
      'PerformanceComparisonService.compareLocationsPerformance',
      { distributorId, metric }
    );
  }

  /**
   * Get occupancy comparison
   */
  async getOccupancyComparison(distributorId: string): Promise<
    Array<{
      locationId: string;
      locationName: string;
      occupancyRate: number;
    }>
  > {
    return await this.logOperation(
      'GET_OCCUPANCY_COMPARISON',
      async () => {
        const comparisons = await this.compareLocationsPerformance(distributorId, 'occupancy');
        return comparisons.map((c) => ({
          locationId: c.locationId,
          locationName: c.locationName,
          occupancyRate: c.occupancyRate,
        }));
      },
      'PerformanceComparisonService.getOccupancyComparison',
      { distributorId }
    );
  }

  /**
   * Get revenue comparison
   */
  async getRevenueComparison(distributorId: string): Promise<
    Array<{
      locationId: string;
      locationName: string;
      monthlyRevenue: number;
    }>
  > {
    return await this.logOperation(
      'GET_REVENUE_COMPARISON',
      async () => {
        const comparisons = await this.compareLocationsPerformance(distributorId, 'revenue');
        return comparisons.map((c) => ({
          locationId: c.locationId,
          locationName: c.locationName,
          monthlyRevenue: c.monthlyRevenue,
        }));
      },
      'PerformanceComparisonService.getRevenueComparison',
      { distributorId }
    );
  }
}

