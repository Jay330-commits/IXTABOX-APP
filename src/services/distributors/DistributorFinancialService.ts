import 'server-only';
import { PaymentStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface PaymentData {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: string;
  transactionId?: string;
}

export interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  nextDueDate?: string;
  nextDueAmount?: number;
}

/**
 * DistributorFinancialService
 * Handles financial operations and payments for distributors
 */
export class DistributorFinancialService extends BaseService {
  /**
   * Get contract payments for distributor
   */
  async getContractPayments(distributorId: string): Promise<PaymentData[]> {
    return await this.logOperation(
      'GET_CONTRACT_PAYMENTS',
      async () => {
        const contractPayments = await this.prisma.contract_payments.findMany({
          where: {
            contracts: {
              distributor_id: distributorId,
            },
          },
          include: {
            payments: {
              select: {
                id: true,
                amount: true,
                completed_at: true,
                charge_id: true,
                status: true,
              },
            },
            contracts: {
              select: {
                id: true,
                type: true,
              },
            },
          },
          orderBy: {
            payments: {
              completed_at: 'desc',
            },
          },
        });

        return contractPayments.map((cp) => {
          const payment = cp.payments;
          const isPaid = payment.status === PaymentStatus.Completed;
          const isOverdue =
            !isPaid && payment.completed_at && new Date(payment.completed_at) < new Date();

          return {
            id: payment.id,
            description: `Contract Payment - ${cp.contracts.type}`,
            amount: Number(payment.amount),
            dueDate: payment.completed_at
              ? new Date(payment.completed_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            status: isPaid
              ? 'paid'
              : isOverdue
              ? 'overdue'
              : 'pending',
            paymentDate: payment.completed_at
              ? new Date(payment.completed_at).toISOString().split('T')[0]
              : undefined,
            transactionId: payment.charge_id,
          };
        });
      },
      'DistributorFinancialService.getContractPayments',
      { distributorId }
    );
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary(distributorId: string): Promise<PaymentSummary> {
    return await this.logOperation(
      'GET_PAYMENT_SUMMARY',
      async () => {
        const payments = await this.getContractPayments(distributorId);

        const totalPaid = payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const totalPending = payments
          .filter((p) => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.amount, 0);

        const nextPending = payments.find((p) => p.status === 'pending');
        const nextDueDate = nextPending?.dueDate;
        const nextDueAmount = nextPending?.amount;

        return {
          totalPaid,
          totalPending,
          nextDueDate,
          nextDueAmount,
        };
      },
      'DistributorFinancialService.getPaymentSummary',
      { distributorId }
    );
  }

  /**
   * Get pending payments
   */
  async getPendingPayments(distributorId: string): Promise<PaymentData[]> {
    return await this.logOperation(
      'GET_PENDING_PAYMENTS',
      async () => {
        const payments = await this.getContractPayments(distributorId);
        return payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
      },
      'DistributorFinancialService.getPendingPayments',
      { distributorId }
    );
  }

  /**
   * Get distributor financials
   */
  async getDistributorFinancials(distributorId: string) {
    return await this.logOperation(
      'GET_DISTRIBUTOR_FINANCIALS',
      async () => {
        const financials = await this.prisma.distributor_financials.findFirst({
          where: {
            distributor_id: distributorId,
          },
        });

        if (!financials) {
          // Create financials record if it doesn't exist
          return await this.prisma.distributor_financials.create({
            data: {
              distributor_id: distributorId,
              total_earnings: 0,
              pending_payout: 0,
              total_bookings: 0,
            },
          });
        }

        return financials;
      },
      'DistributorFinancialService.getDistributorFinancials',
      { distributorId }
    );
  }

  /**
   * Update distributor financials (typically called after booking completion)
   */
  async updateDistributorFinancials(
    distributorId: string,
    earnings: number
  ) {
    return await this.logOperation(
      'UPDATE_DISTRIBUTOR_FINANCIALS',
      async () => {
        const financials = await this.getDistributorFinancials(distributorId);

        return await this.prisma.distributor_financials.update({
          where: {
            id: financials.id,
          },
          data: {
            total_earnings: {
              increment: earnings,
            },
            total_bookings: {
              increment: 1,
            },
          },
        });
      },
      'DistributorFinancialService.updateDistributorFinancials',
      { distributorId, earnings }
    );
  }
}

