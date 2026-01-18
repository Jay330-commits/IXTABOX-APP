import 'server-only';
import { BaseService } from '../BaseService';

export interface CreateLocationPricingData {
  locationId: string;
  weekFrom: number;
  weekTo: number;
  pricePerDay: number;
  modelType?: string | null;
}

export interface UpdateLocationPricingData {
  weekFrom?: number;
  weekTo?: number;
  pricePerDay?: number;
  modelType?: string | null;
}

export interface LocationPricing {
  id: string;
  location_id: string;
  week_from: number;
  week_to: number;
  price_per_day: number;
  model_type: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * LocationPricingService
 * Handles location-based dynamic pricing with week ranges
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

        // Validate week range
        if (data.weekTo < data.weekFrom) {
          throw new Error('Week to must be greater than or equal to week from');
        }

        if (data.weekFrom < 1 || data.weekTo < 1) {
          throw new Error('Weeks must be positive numbers');
        }

        // Check for overlapping pricing rules
        const overlapping = await this.prisma.$queryRaw<LocationPricing[]>`
          SELECT * FROM location_pricing
          WHERE location_id = ${data.locationId}::uuid
            AND (
              (week_from <= ${data.weekFrom} AND week_to >= ${data.weekFrom})
              OR (week_from <= ${data.weekTo} AND week_to >= ${data.weekTo})
              OR (week_from >= ${data.weekFrom} AND week_to <= ${data.weekTo})
            )
            AND (model_type = ${data.modelType || null} OR model_type IS NULL OR ${data.modelType || null} IS NULL)
        `;

        if (overlapping.length > 0) {
          throw new Error('Pricing rule overlaps with existing rule for this week range and model type');
        }

        // Create pricing rule using raw SQL
        const result = await this.prisma.$queryRaw<LocationPricing[]>`
          INSERT INTO location_pricing (location_id, week_from, week_to, price_per_day, model_type)
          VALUES (${data.locationId}::uuid, ${data.weekFrom}::integer, ${data.weekTo}::integer, ${data.pricePerDay}::decimal, ${data.modelType || null})
          RETURNING *
        `;

        return result[0];
      },
      'LocationPricingService.createLocationPricing'
    );
  }

  /**
   * Get pricing for a location for a specific week
   */
  async getPriceForWeek(locationId: string, week: number, modelType?: string | null): Promise<number | null> {
    const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
      SELECT * FROM location_pricing
      WHERE location_id = ${locationId}::uuid
        AND week_from <= ${week}::integer
        AND week_to >= ${week}::integer
        AND (
          model_type = ${modelType || null}
          OR model_type IS NULL
          OR ${modelType || null} IS NULL
        )
      ORDER BY model_type NULLS LAST, created_at DESC
      LIMIT 1
    `;

    if (pricing.length > 0) {
      return Number(pricing[0].price_per_day);
    }

    return null;
  }

  /**
   * Get all pricing rules for a location
   */
  async getPricingByLocation(locationId: string) {
    const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
      SELECT * FROM location_pricing
      WHERE location_id = ${locationId}::uuid
      ORDER BY week_from ASC, model_type NULLS FIRST
    `;

    return pricing;
  }

  /**
   * Get pricing for a week range
   */
  async getPricingForWeekRange(
    locationId: string,
    weekFrom: number,
    weekTo: number
  ) {
    const pricing = await this.prisma.$queryRaw<LocationPricing[]>`
      SELECT * FROM location_pricing
      WHERE location_id = ${locationId}::uuid
        AND (
          (week_from <= ${weekTo}::integer AND week_to >= ${weekFrom}::integer)
        )
      ORDER BY week_from ASC, model_type NULLS FIRST
    `;

    return pricing;
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
        const weekFrom = data.weekFrom ?? current.week_from;
        const weekTo = data.weekTo ?? current.week_to;

        if (weekTo < weekFrom) {
          throw new Error('Week to must be greater than or equal to week from');
        }

        // Check for overlapping pricing rules (excluding current)
        const overlapping = await this.prisma.$queryRaw<LocationPricing[]>`
          SELECT * FROM location_pricing
          WHERE location_id = ${current.location_id}::uuid
            AND id != ${pricingId}::uuid
            AND (
              (week_from <= ${weekFrom}::integer AND week_to >= ${weekFrom}::integer)
              OR (week_from <= ${weekTo}::integer AND week_to >= ${weekTo}::integer)
              OR (week_from >= ${weekFrom}::integer AND week_to <= ${weekTo}::integer)
            )
            AND (model_type = ${(data.modelType ?? current.model_type) ?? null} OR model_type IS NULL OR ${(data.modelType ?? current.model_type) ?? null} IS NULL)
        `;

        if (overlapping.length > 0) {
          throw new Error('Pricing rule overlaps with existing rule for this week range and model type');
        }

        const result = await this.prisma.$queryRaw<LocationPricing[]>`
          UPDATE location_pricing
          SET 
            week_from = ${weekFrom}::integer,
            week_to = ${weekTo}::integer,
            price_per_day = ${data.pricePerDay ?? current.price_per_day}::decimal,
            model_type = ${(data.modelType ?? current.model_type) ?? null},
            updated_at = NOW()
          WHERE id = ${pricingId}::uuid
          RETURNING *
        `;

        return result[0];
      },
      'LocationPricingService.updateLocationPricing'
    );
  }

  /**
   * Calculate total price for a booking date range based on weeks
   */
  async calculateTotalPrice(
    locationId: string,
    startDate: Date | string,
    endDate: Date | string,
    modelType?: string | null,
    defaultPrice: number = 300
  ): Promise<{ total: number; breakdown: Array<{ date: string; price: number; week: number }> }> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const breakdown: Array<{ date: string; price: number; week: number }> = [];
    let total = 0;

    // Get all pricing rules for this location
    const pricingRules = await this.getPricingByLocation(locationId);

    // Iterate through each day in the range
    const currentDate = new Date(start);
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate week number (weeks from booking start)
      const daysDiff = Math.floor((currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(daysDiff / 7) + 1;
      
      // Find matching pricing rule for this week
      let price = defaultPrice;
      for (const rule of pricingRules) {
        if (weekNumber >= rule.week_from && weekNumber <= rule.week_to) {
          // Check if model type matches
          if (!rule.model_type || rule.model_type === modelType || !modelType) {
            price = Number(rule.price_per_day);
            break;
          }
        }
      }

      breakdown.push({ date: dateStr, price, week: weekNumber });
      total += price;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { total, breakdown };
  }
}
