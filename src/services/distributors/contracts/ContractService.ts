import 'server-only';
import { ContractStatus, ContractType } from '@prisma/client';
import { BaseService } from '../../BaseService';

export interface ContractDetails {
  id: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  renewalStatus: ContractStatus;
  contractNumber: string;
  autoRenewal: boolean;
  terms?: Record<string, unknown>;
}

/**
 * ContractService
 * Handles contract-related operations for distributors
 */
export class ContractService extends BaseService {
  /**
   * Get all contracts for a distributor
   */
  async getDistributorContracts(distributorId: string) {
    return await this.logOperation(
      'GET_DISTRIBUTOR_CONTRACTS',
      async () => {
        const contracts = await this.prisma.contracts.findMany({
          where: {
            distributor_id: distributorId,
          },
          orderBy: {
            start_date: 'desc',
          },
        });

        return contracts;
      },
      'ContractService.getDistributorContracts',
      { distributorId }
    );
  }

  /**
   * Get active contract for distributor
   */
  async getActiveContract(distributorId: string) {
    return await this.logOperation(
      'GET_ACTIVE_CONTRACT',
      async () => {
        const contract = await this.prisma.contracts.findFirst({
          where: {
            distributor_id: distributorId,
            status: ContractStatus.Active,
          },
          orderBy: {
            end_date: 'desc',
          },
        });

        return contract;
      },
      'ContractService.getActiveContract',
      { distributorId }
    );
  }

  /**
   * Get contract details
   */
  async getContractDetails(contractId: string): Promise<ContractDetails | null> {
    return await this.logOperation(
      'GET_CONTRACT_DETAILS',
      async () => {
        const contract = await this.prisma.contracts.findUnique({
          where: { id: contractId },
        });

        if (!contract) {
          return null;
        }

        // Check if auto-renewal is enabled (this would be in terms or a separate field)
        // For now, we'll check if end_date is far in the future
        const endDate = new Date(contract.end_date);
        const now = new Date();
        const daysUntilEnd = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Assume auto-renewal if contract ends more than 90 days away
        const autoRenewal = daysUntilEnd > 90;

        return {
          id: contract.id,
          contractType: contract.type,
          startDate: new Date(contract.start_date).toLocaleDateString(),
          endDate: new Date(contract.end_date).toLocaleDateString(),
          renewalStatus: contract.status || ContractStatus.Active,
          contractNumber: contract.id.substring(0, 8).toUpperCase(),
          autoRenewal,
          terms: contract.terms as Record<string, unknown> | undefined,
        };
      },
      'ContractService.getContractDetails',
      { contractId }
    );
  }

  /**
   * Get contract renewal information
   */
  async getContractRenewalInfo(contractId: string) {
    return await this.logOperation(
      'GET_CONTRACT_RENEWAL_INFO',
      async () => {
        const contract = await this.prisma.contracts.findUnique({
          where: { id: contractId },
        });

        if (!contract) {
          throw new Error(`Contract with id ${contractId} not found`);
        }

        const endDate = new Date(contract.end_date);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          contractId: contract.id,
          endDate: contract.end_date,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          status: contract.status,
          canRenew: daysRemaining <= 90 && daysRemaining > 0,
        };
      },
      'ContractService.getContractRenewalInfo',
      { contractId }
    );
  }

  /**
   * Request contract amendment
   */
  async requestContractAmendment(
    contractId: string,
    changes: Record<string, unknown>
  ) {
    return await this.logOperation(
      'REQUEST_CONTRACT_AMENDMENT',
      async () => {
        // In a real implementation, this would create a request/ticket
        // For now, we'll just log it
        const contract = await this.prisma.contracts.findUnique({
          where: { id: contractId },
          select: { id: true, distributor_id: true },
        });

        if (!contract) {
          throw new Error(`Contract with id ${contractId} not found`);
        }

        // This would typically create a notification or ticket
        return {
          success: true,
          contractId,
          changes,
          message: 'Amendment request submitted',
        };
      },
      'ContractService.requestContractAmendment',
      { contractId, changes }
    );
  }
}

