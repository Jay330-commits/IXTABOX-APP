import 'server-only';
import { Distributor, ContractType, User } from '../prisma-client/client';
import { BaseService } from './BaseService';

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
          where: { userId: data.userId },
        });

        if (existingDistributor) {
          throw new Error('Distributor already exists for this user');
        }

        // Validate contract type
        const validContractTypes: ContractType[] = [
          ContractType.HYBRID,
          ContractType.LEASING,
          ContractType.OWNING,
          ContractType.BASIC,
        ];
        if (!validContractTypes.includes(data.contractType)) {
          throw new Error(`Invalid contract type: ${data.contractType}`);
        }

        // Create distributor record
        const distributor = await this.prisma.distributor.create({
          data: {
            userId: data.userId,
            companyName: data.companyName,
            regNumber: data.regNumber,
            website: data.website || null,
            contactPerson: data.contactPerson,
            businessType: data.businessType,
            yearsInBusiness: data.yearsInBusiness || null,
            expectedMonthlyBookings: data.expectedMonthlyBookings || null,
            marketingChannels: data.marketingChannels || [],
            businessDescription: data.businessDescription || null,
            contractType: data.contractType,
            active: true,
          },
          include: {
            user: true,
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
        where: { userId },
        include: {
          user: true,
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
          user: true,
          stands: true,
          contracts: true,
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
        // Validate contract type if provided
        if (data.contractType) {
          const validContractTypes: ContractType[] = [
            ContractType.HYBRID,
            ContractType.LEASING,
            ContractType.OWNING,
            ContractType.BASIC,
          ];
          if (!validContractTypes.includes(data.contractType)) {
            throw new Error(`Invalid contract type: ${data.contractType}`);
          }
        }

        return await this.prisma.distributor.update({
          where: { id: distributorId },
          data: {
            ...data,
            website: data.website === undefined ? undefined : data.website || null,
            yearsInBusiness:
              data.yearsInBusiness === undefined ? undefined : data.yearsInBusiness || null,
            expectedMonthlyBookings:
              data.expectedMonthlyBookings === undefined
                ? undefined
                : data.expectedMonthlyBookings || null,
            businessDescription:
              data.businessDescription === undefined ? undefined : data.businessDescription || null,
          },
          include: {
            user: true,
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
          user: true,
        },
        orderBy: { createdAt: 'desc' },
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
          user: true,
        },
        orderBy: { createdAt: 'desc' },
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
            user: true,
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
            user: true,
          },
        });
      },
      'DistributorService.activateDistributor',
      { distributorId }
    );
  }
}

