import 'server-only';
import { BaseService } from '../BaseService';

export interface CreateLocationPricingData {
  locationId: string;
  week: number;
  recommendedPrice?: number | null;
  actualPrice: number;
}

export interface UpdateLocationPricingData {
  week?: number;
  recommendedPrice?: number | null;
  actualPrice?: number;
}

export interface LocationPricing {
  id: string;
  location_id: string;
  week: number;
  recommended_price: number | null;
  actual_price: number;
}

/**
 * LocationPricingService
 * Handles location-based dynamic pricing per week
 */
export class LocationPricingService extends BaseService {
  /**
   * Get week number from a date (weeks from booking start or from year start)
   * Week 1 = first week, Week 2 = second week, etc.
   */
  getWeekNumber(date: Date | string, referenceDate?: Date | string): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    const ref = referenceDate ? (typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate) : new Date();
    
    // Calculate weeks from reference date (or use week of year)
    const diffTime = d.getTime() - ref.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    
    return Math.max(1, weekNumber);
  }

  /**
   * Create a new location pricing rule
   */
  async createLocationPricing(data: CreateLocationPricingData) {
    return await this.logOperation(
      'CREATE_LOCATION_PRICING',
      async () => {
        // Validate location exists
        const location = await this.prisma.locations.findUnique({
          where: { id: data.locationId },
          select: { id: true },
        });

        if (!location) {
          throw new Error(`Location with id ${data.locationId} not found`);
        }

        // Validate week
        if (data.week < 1) {
          throw new Error('Week must be a positive number');
        }

        // Validate actual price is provided
        if (!data.actualPrice || data.actualPrice <= 0) {
          throw new Error('Actual price must be a positive number');
        }

        // Check if pricing already exists for this location and week
        const existing = await this.prisma.$queryRaw<LocationPricing[]>`
          SELECT * FROM location_pricing
          WHERE location_id = ${data.locationId}::uuid
            AND week = ${data.week}::integer
        `;

        if (existing.length > 0) {
          throw new Error('Pricing rule already exists for this location and week');
        }

        // Create pricing rule using raw SQL
        const result = await this.prisma.$queryRaw<LocationPricing[]>`
          INSERT INTO location_pricing (location_id, week, recommended_price, actual_price)
          VALUES (${data.locationId}::uuid, ${data.week}::integer, ${data.recommendedPrice ?? null}::decimal, ${data.actualPrice}::decimal)
          RETURNING *
        `;

        return result[0];
      },
      'LocationPricingService.createLocationPricing'
    );
  }

  /**
   * Get pricing for a location for a specific week
   * Returns the actual_price (what customer pays)
   */
  async getPriceForWeek(locationId: string, week: number): Promise<number | null> {
    try {
      const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
        SELECT * FROM location_pricing
        WHERE location_id = ${locationId}::uuid
          AND week = ${week}::integer
        LIMIT 1
      `;

      if (pricing.length > 0) {
        return Number(pricing[0].actual_price);
      }

      return null;
    } catch (error: unknown) {
      // Handle case where location_pricing table doesn't exist yet (error code P2010 or 42P01)
      const prismaError = error as { code?: string; meta?: { code?: string } };
      if (
        prismaError.code === 'P2010' ||
        prismaError.meta?.code === '42P01' ||
        (typeof error === 'object' && error !== null && 'message' in error && 
         typeof (error as { message: string }).message === 'string' &&
         (error as { message: string }).message.includes('does not exist'))
      ) {
        // Table doesn't exist, return null (will use default pricing)
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get all pricing rules for a location
   */
  async getPricingByLocation(locationId: string) {
    try {
      const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
        SELECT * FROM location_pricing
        WHERE location_id = ${locationId}::uuid
        ORDER BY week ASC
      `;

      return pricing;
    } catch (error: unknown) {
      // Handle case where location_pricing table doesn't exist yet (error code P2010 or 42P01)
      const prismaError = error as { code?: string; meta?: { code?: string } };
      if (
        prismaError.code === 'P2010' ||
        prismaError.meta?.code === '42P01' ||
        (typeof error === 'object' && error !== null && 'message' in error && 
         typeof (error as { message: string }).message === 'string' &&
         (error as { message: string }).message.includes('does not exist'))
      ) {
        // Table doesn't exist, return empty array (will use default pricing)
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get pricing for multiple weeks
   */
  async getPricingForWeeks(
    locationId: string,
    weeks: number[]
  ) {
    try {
      if (weeks.length === 0) {
        return [];
      }

      const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
        SELECT * FROM location_pricing
        WHERE location_id = ${locationId}::uuid
          AND week = ANY(${weeks}::integer[])
        ORDER BY week ASC
      `;

      return pricing;
    } catch (error: unknown) {
      // Handle case where location_pricing table doesn't exist yet (error code P2010 or 42P01)
      const prismaError = error as { code?: string; meta?: { code?: string } };
      if (
        prismaError.code === 'P2010' ||
        prismaError.meta?.code === '42P01' ||
        (typeof error === 'object' && error !== null && 'message' in error && 
         typeof (error as { message: string }).message === 'string' &&
         (error as { message: string }).message.includes('does not exist'))
      ) {
        // Table doesn't exist, return empty array (will use default pricing)
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Update a pricing rule
   */
  async updateLocationPricing(pricingId: string, data: UpdateLocationPricingData) {
    return await this.logOperation(
      'UPDATE_LOCATION_PRICING',
      async () => {
        const existing = await this.prisma.$queryRaw<LocationPricing[]>`
          SELECT * FROM location_pricing WHERE id = ${pricingId}::uuid
        `;

        if (existing.length === 0) {
          throw new Error(`Pricing rule with id ${pricingId} not found`);
        }

        const current = existing[0];
        const week = data.week ?? current.week;
        const recommendedPrice = data.recommendedPrice !== undefined ? data.recommendedPrice : current.recommended_price;
        const actualPrice = data.actualPrice ?? current.actual_price;

        // If week is being changed, check if pricing already exists for the new week
        if (data.week !== undefined && data.week !== current.week) {
          const weekExists = await this.prisma.$queryRaw<LocationPricing[]>`
            SELECT * FROM location_pricing
            WHERE location_id = ${current.location_id}::uuid
              AND week = ${week}::integer
              AND id != ${pricingId}::uuid
          `;

          if (weekExists.length > 0) {
            throw new Error('Pricing rule already exists for this location and week');
          }
        }

        // Validate actual price if being updated
        if (data.actualPrice !== undefined && data.actualPrice <= 0) {
          throw new Error('Actual price must be a positive number');
        }

        const result = await this.prisma.$queryRaw<LocationPricing[]>`
          UPDATE location_pricing
          SET 
            week = ${week}::integer,
            recommended_price = ${recommendedPrice ?? null}::decimal,
            actual_price = ${actualPrice}::decimal
          WHERE id = ${pricingId}::uuid
          RETURNING *
        `;

        return result[0];
      },
      'LocationPricingService.updateLocationPricing'
    );
  }

  /**
   * Delete a pricing rule
   */
  async deleteLocationPricing(pricingId: string) {
    return await this.logOperation(
      'DELETE_LOCATION_PRICING',
      async () => {
        const existing = await this.prisma.$queryRaw<LocationPricing[]>`
          SELECT * FROM location_pricing WHERE id = ${pricingId}::uuid
        `;

        if (existing.length === 0) {
          throw new Error(`Pricing rule with id ${pricingId} not found`);
        }

        await this.prisma.$queryRaw`
          DELETE FROM location_pricing WHERE id = ${pricingId}::uuid
        `;

        return { success: true };
      },
      'LocationPricingService.deleteLocationPricing'
    );
  }

  /**
   * Calculate total price for a booking date range based on weeks
   * Uses actual_price for calculations (what customer pays)
   */
  async calculateTotalPrice(
    locationId: string,
    startDate: Date | string,
    endDate: Date | string,
    defaultPrice: number = 300
  ): Promise<{ total: number; breakdown: Array<{ date: string; price: number; week: number }> }> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const breakdown: Array<{ date: string; price: number; week: number }> = [];
    let total = 0;

    // Get all pricing rules for this location
    const pricingRules = await this.getPricingByLocation(locationId);

    // Create a map for quick lookup: week -> actual_price
    const pricingMap = new Map<number, number>();
    for (const rule of pricingRules) {
      pricingMap.set(rule.week, Number(rule.actual_price));
    }

    // Iterate through each day in the range
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate week number (weeks from booking start)
      const daysDiff = Math.floor((currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysDiff / 7) + 1;
      
      // Get price for this week (use actual_price from pricing map or default)
      const price = pricingMap.get(weekNumber) ?? defaultPrice;

      breakdown.push({ date: dateStr, price, week: weekNumber });
      total += price;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { total, breakdown };
  }
}
