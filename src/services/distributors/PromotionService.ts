import 'server-only';
import { DiscountType, Prisma } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface PromotionData {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  startDate: Date;
  endDate: Date;
  active: boolean;
  impressions?: number;
  clicks?: number;
}

export interface CreatePromotionData {
  distributorId: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  startDate: Date;
  endDate: Date;
}

/**
 * PromotionService
 * Handles promotion and marketing campaign operations
 */
export class PromotionService extends BaseService {
  /**
   * Get active promotions for distributor
   */
  async getActivePromotions(distributorId: string): Promise<PromotionData[]> {
    return await this.logOperation(
      'GET_ACTIVE_PROMOTIONS',
      async () => {
        const promotions = await this.prisma.promotions.findMany({
          where: {
            distributor_id: distributorId,
            active: true,
            start_date: {
              lte: new Date(),
            },
            end_date: {
              gte: new Date(),
            },
          },
          orderBy: {
            start_date: 'desc',
          },
        });

        return promotions.map((promo) => ({
          id: promo.id,
          code: promo.code,
          description: promo.description || undefined,
          discountType: promo.discount_type,
          discountValue: Number(promo.discount_value),
          maxUses: promo.max_uses || undefined,
          startDate: promo.start_date,
          endDate: promo.end_date,
          active: promo.active || false,
          // These would come from analytics/tracking
          impressions: 0,
          clicks: 0,
        }));
      },
      'PromotionService.getActivePromotions',
      { distributorId }
    );
  }

  /**
   * Get promotion statistics
   */
  async getPromotionStats(promotionId: string): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    uses: number;
  }> {
    return await this.logOperation(
      'GET_PROMOTION_STATS',
      async () => {
        // Get promotion
        const promotion = await this.prisma.promotions.findUnique({
          where: { id: promotionId },
        });

        if (!promotion) {
          throw new Error(`Promotion with id ${promotionId} not found`);
        }

        // Count bookings using this promotion code
        // Note: This assumes bookings have a promotion_code field
        // If not, you'd need to track this separately
        const uses = 0; // Would query bookings with this promotion code

        // These would come from analytics tracking
        const impressions = 0;
        const clicks = 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

        return {
          impressions,
          clicks,
          ctr: Math.round(ctr * 100) / 100,
          uses,
        };
      },
      'PromotionService.getPromotionStats',
      { promotionId }
    );
  }

  /**
   * Create new promotion
   */
  async createPromotion(data: CreatePromotionData) {
    return await this.logOperation(
      'CREATE_PROMOTION',
      async () => {
        // Validate code is unique
        const existing = await this.prisma.promotions.findUnique({
          where: { code: data.code },
        });

        if (existing) {
          throw new Error(`Promotion code ${data.code} already exists`);
        }

        // Validate dates
        if (data.endDate <= data.startDate) {
          throw new Error('End date must be after start date');
        }

        const promotion = await this.prisma.promotions.create({
          data: {
            distributor_id: data.distributorId,
            code: data.code,
            description: data.description || null,
            discount_type: data.discountType,
            discount_value: data.discountValue,
            max_uses: data.maxUses || 0,
            start_date: data.startDate,
            end_date: data.endDate,
            active: true,
          },
        });

        return promotion;
      },
      'PromotionService.createPromotion',
      { distributorId: data.distributorId }
    );
  }

  /**
   * Update promotion
   */
  async updatePromotion(
    promotionId: string,
    data: Partial<CreatePromotionData>
  ) {
    return await this.logOperation(
      'UPDATE_PROMOTION',
      async () => {
        const updateData: Prisma.promotionsUpdateInput = {};

        if (data.code !== undefined) {
          // Check if code is unique (excluding current promotion)
          const existing = await this.prisma.promotions.findUnique({
            where: { code: data.code },
          });

          if (existing && existing.id !== promotionId) {
            throw new Error(`Promotion code ${data.code} already exists`);
          }

          updateData.code = data.code;
        }

        if (data.description !== undefined) {
          updateData.description = data.description || null;
        }

        if (data.discountType !== undefined) {
          updateData.discount_type = data.discountType;
        }

        if (data.discountValue !== undefined) {
          updateData.discount_value = data.discountValue;
        }

        if (data.maxUses !== undefined) {
          updateData.max_uses = data.maxUses;
        }

        if (data.startDate !== undefined) {
          updateData.start_date = data.startDate;
        }

        if (data.endDate !== undefined) {
          updateData.end_date = data.endDate;
        }

        // Validate dates if both are being updated
        if (data.startDate && data.endDate && data.endDate <= data.startDate) {
          throw new Error('End date must be after start date');
        }

        return await this.prisma.promotions.update({
          where: { id: promotionId },
          data: updateData,
        });
      },
      'PromotionService.updatePromotion',
      { promotionId }
    );
  }

  /**
   * Deactivate promotion
   */
  async deactivatePromotion(promotionId: string) {
    return await this.logOperation(
      'DEACTIVATE_PROMOTION',
      async () => {
        return await this.prisma.promotions.update({
          where: { id: promotionId },
          data: { active: false },
        });
      },
      'PromotionService.deactivatePromotion',
      { promotionId }
    );
  }

  /**
   * Get promotion performance
   */
  async getPromotionPerformance(
    promotionId: string,
    period?: 'week' | 'month' | 'quarter'
  ): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    revenue: number;
  }> {
    return await this.logOperation(
      'GET_PROMOTION_PERFORMANCE',
      async () => {
        // This would integrate with analytics
        // For now, return placeholder data
        return {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          conversions: 0,
          revenue: 0,
        };
      },
      'PromotionService.getPromotionPerformance',
      { promotionId, period }
    );
  }
}

