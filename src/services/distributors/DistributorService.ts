import 'server-only';
import type { distributors as Distributor } from '@prisma/client';
import { ContractType, Prisma } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface CreateDistributorData {
  userId: string;
  companyName: string;
  regNumber: string;
  website?: string;
  contactPerson: string;
  businessType: string;
  yearsInBusiness?: string;
  expectedMonthlyBookings?: string;
  marketingChannels?: string[];
  businessDescription?: string;
  contractType: ContractType;
}

export interface UpdateDistributorData {
  companyName?: string;
  regNumber?: string;
  website?: string;
  contactPerson?: string;
  businessType?: string;
  yearsInBusiness?: string;
  expectedMonthlyBookings?: string;
  marketingChannels?: string[];
  businessDescription?: string;
  contractType?: ContractType;
  active?: boolean;
}

/**
 * DistributorService class handling all distributor-related operations
 */
export class DistributorService extends BaseService {
  /**
   * Create a distributor record linked to a user
   */
  async createDistributor(data: CreateDistributorData): Promise<Distributor> {
    return await this.logOperation(
      'CREATE_DISTRIBUTOR',
      async () => {
        // Check if distributor already exists for this user
        const existingDistributor = await this.prisma.distributor.findUnique({
          where: { user_id: data.userId },
        });

        if (existingDistributor) {
          throw new Error('Distributor already exists for this user');
        }

        // Validate contract type - only LEASING and OWNING are allowed
        const validContractTypes: ContractType[] = [
          ContractType.Leasing,
          ContractType.Owning,
        ];
        if (!validContractTypes.includes(data.contractType)) {
          throw new Error(`Invalid contract type: ${data.contractType}. Must be LEASING or OWNING.`);
        }

        // Create distributor record
        const distributor = await this.prisma.distributor.create({
          data: {
            user_id: data.userId,
            company_name: data.companyName,
            reg_number: data.regNumber,
            website: data.website || null,
            contact_person: data.contactPerson,
            business_type: data.businessType,
            years_in_business: data.yearsInBusiness || null,
            expected_monthly_bookings: data.expectedMonthlyBookings || null,
            marketing_channels: data.marketingChannels || [],
            business_description: data.businessDescription || null,
            contract_type: data.contractType,
            active: true,
          },
          include: {
            users: true,
          },
        });

        return distributor;
      },
      'DistributorService.createDistributor',
      { userId: data.userId, companyName: data.companyName }
    );
  }

  /**
   * Find distributor by user ID
   */
  async findByUserId(userId: string): Promise<Distributor | null> {
    try {
      return await this.prisma.distributor.findUnique({
        where: { user_id: userId },
        include: {
          users: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'DistributorService.findByUserId');
    }
  }

  /**
   * Find distributor by ID
   */
  async findById(distributorId: string): Promise<Distributor | null> {
    try {
      return await this.prisma.distributor.findUnique({
        where: { id: distributorId },
        include: {
          users: true,
          contracts: true,
          distributor_financials: true,
          locations: true,
          promotions: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'DistributorService.findById');
    }
  }

  /**
   * Update distributor information
   */
  async updateDistributor(
    distributorId: string,
    data: UpdateDistributorData
  ): Promise<Distributor> {
    return await this.logOperation(
      'UPDATE_DISTRIBUTOR',
      async () => {
        // Validate contract type if provided - only LEASING and OWNING are allowed
        if (data.contractType) {
          const validContractTypes: ContractType[] = [
            ContractType.Leasing,
            ContractType.Owning,
          ];
          if (!validContractTypes.includes(data.contractType)) {
            throw new Error(`Invalid contract type: ${data.contractType}. Must be LEASING or OWNING.`);
          }
        }

        const prismaData: Prisma.distributorsUpdateInput = {};

        if (data.companyName !== undefined) prismaData.company_name = data.companyName;
        if (data.regNumber !== undefined) prismaData.reg_number = data.regNumber;
        if (data.website !== undefined) prismaData.website = data.website || null;
        if (data.contactPerson !== undefined) prismaData.contact_person = data.contactPerson;
        if (data.businessType !== undefined) prismaData.business_type = data.businessType;
        if (data.yearsInBusiness !== undefined)
          prismaData.years_in_business = data.yearsInBusiness || null;
        if (data.expectedMonthlyBookings !== undefined)
          prismaData.expected_monthly_bookings = data.expectedMonthlyBookings || null;
        if (data.marketingChannels !== undefined)
          prismaData.marketing_channels = data.marketingChannels;
        if (data.businessDescription !== undefined)
          prismaData.business_description = data.businessDescription || null;
        if (data.contractType !== undefined) prismaData.contract_type = data.contractType;
        if (data.active !== undefined) prismaData.active = data.active;

        return await this.prisma.distributor.update({
          where: { id: distributorId },
          data: prismaData,
          include: {
            users: true,
          },
        });
      },
      'DistributorService.updateDistributor',
      { distributorId }
    );
  }

  /**
   * Get all distributors with pagination
   */
  async getAllDistributors(skip = 0, take = 10): Promise<Distributor[]> {
    try {
      return await this.prisma.distributor.findMany({
        skip,
        take,
        include: {
          users: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'DistributorService.getAllDistributors');
    }
  }

  /**
   * Get active distributors
   */
  async getActiveDistributors(): Promise<Distributor[]> {
    try {
      return await this.prisma.distributor.findMany({
        where: { active: true },
        include: {
          users: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'DistributorService.getActiveDistributors');
    }
  }

  /**
   * Deactivate distributor
   */
  async deactivateDistributor(distributorId: string): Promise<Distributor> {
    return await this.logOperation(
      'DEACTIVATE_DISTRIBUTOR',
      async () => {
        return await this.prisma.distributor.update({
          where: { id: distributorId },
          data: { active: false },
          include: {
            users: true,
          },
        });
      },
      'DistributorService.deactivateDistributor',
      { distributorId }
    );
  }

  /**
   * Activate distributor
   */
  async activateDistributor(distributorId: string): Promise<Distributor> {
    return await this.logOperation(
      'ACTIVATE_DISTRIBUTOR',
      async () => {
        return await this.prisma.distributor.update({
          where: { id: distributorId },
          data: { active: true },
          include: {
            users: true,
          },
        });
      },
      'DistributorService.activateDistributor',
      { distributorId }
    );
  }
}

