import 'server-only';
import { NotificationType, PaymentStatus, ContractStatus, boxStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export interface DistributorNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  createdAt: Date;
  relatedBookingId?: string;
}

/**
 * DistributorNotificationService
 * Handles notifications and alerts for distributors
 */
export class DistributorNotificationService extends BaseService {
  /**
   * Get all notifications for distributor
   */
  async getDistributorNotifications(distributorId: string): Promise<DistributorNotification[]> {
    return await this.logOperation(
      'GET_DISTRIBUTOR_NOTIFICATIONS',
      async () => {
        // Get distributor's user ID
        const distributor = await this.prisma.distributors.findUnique({
          where: { id: distributorId },
          select: { user_id: true },
        });

        if (!distributor) {
          throw new Error(`Distributor with id ${distributorId} not found`);
        }

        const notifications = await this.prisma.notifications.findMany({
          where: {
            user_id: distributor.user_id,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        return notifications.map((notif) => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message || undefined,
          read: notif.read || false,
          createdAt: notif.created_at || new Date(),
          relatedBookingId: notif.related_booking_id || undefined,
        }));
      },
      'DistributorNotificationService.getDistributorNotifications',
      { distributorId }
    );
  }

  /**
   * Get low stock notifications
   */
  async getLowStockNotifications(distributorId: string): Promise<
    Array<{
      standId: string;
      standName: string;
      location: string;
      availableCount: number;
      message: string;
    }>
  > {
    return await this.logOperation(
      'GET_LOW_STOCK_NOTIFICATIONS',
      async () => {
        const stands = await this.prisma.stands.findMany({
          where: {
            locations: {
              distributor_id: distributorId,
            },
          },
          include: {
            locations: {
              select: {
                name: true,
              },
            },
            boxes: {
              where: {
                status: boxStatus.Inactive,
              },
            },
          },
        });

        const threshold = 3;
        const alerts = stands
          .filter((stand) => stand.boxes.length <= threshold)
          .map((stand) => ({
            standId: stand.id,
            standName: stand.name,
            location: stand.locations.name,
            availableCount: stand.boxes.length,
            message: `Low stock alert: Only ${stand.boxes.length} boxes available at ${stand.name}`,
          }));

        return alerts;
      },
      'DistributorNotificationService.getLowStockNotifications',
      { distributorId }
    );
  }

  /**
   * Get maintenance notifications
   */
  async getMaintenanceNotifications(distributorId: string): Promise<
    Array<{
      boxId: string;
      boxDisplayId: string;
      standName: string;
      location: string;
      message: string;
    }>
  > {
    return await this.logOperation(
      'GET_MAINTENANCE_NOTIFICATIONS',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
            status: boxStatus.Inactive,
          },
          include: {
            stands: {
              include: {
                locations: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        return boxes.map((box) => ({
          boxId: box.id,
          boxDisplayId: box.display_id,
          standName: box.stands.name,
          location: box.stands.locations.name,
          message: `Box ${box.display_id} requires maintenance at ${box.stands.name}`,
        }));
      },
      'DistributorNotificationService.getMaintenanceNotifications',
      { distributorId }
    );
  }

  /**
   * Get payment reminders
   */
  async getPaymentReminders(distributorId: string): Promise<
    Array<{
      paymentId: string;
      amount: number;
      dueDate: Date;
      daysUntilDue: number;
      message: string;
    }>
  > {
    return await this.logOperation(
      'GET_PAYMENT_REMINDERS',
      async () => {
        const contractPayments = await this.prisma.contract_payments.findMany({
          where: {
            contracts: {
              distributor_id: distributorId,
            },
            payments: {
              status: {
                not: PaymentStatus.Completed,
              },
            },
          },
          include: {
            payments: {
              select: {
                id: true,
                amount: true,
                completed_at: true,
              },
            },
          },
        });

        const now = new Date();
        const reminders = contractPayments
          .filter((cp) => {
            // If payment has a completed_at, use it as due date
            // Otherwise, calculate based on contract terms
            return !cp.payments.completed_at;
          })
          .map((cp) => {
            // This is simplified - in reality, due dates would come from contract terms
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + 15); // Assume 15 days from now
            const daysUntilDue = Math.ceil(
              (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              paymentId: cp.payments.id,
              amount: Number(cp.payments.amount),
              dueDate,
              daysUntilDue,
              message: `Payment of $${Number(cp.payments.amount).toLocaleString()} due in ${daysUntilDue} days`,
            };
          });

        return reminders;
      },
      'DistributorNotificationService.getPaymentReminders',
      { distributorId }
    );
  }

  /**
   * Get contract renewal notifications
   */
  async getContractRenewalNotifications(distributorId: string): Promise<
    Array<{
      contractId: string;
      contractType: string;
      endDate: Date;
      daysRemaining: number;
      message: string;
    }>
  > {
    return await this.logOperation(
      'GET_CONTRACT_RENEWAL_NOTIFICATIONS',
      async () => {
        const contracts = await this.prisma.contracts.findMany({
          where: {
            distributor_id: distributorId,
            status: ContractStatus.Active,
          },
        });

        const now = new Date();
        const renewalThreshold = 90; // days

        const notifications = contracts
          .map((contract) => {
            const endDate = new Date(contract.end_date);
            const daysRemaining = Math.ceil(
              (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
              contractId: contract.id,
              contractType: contract.type,
              endDate,
              daysRemaining,
              message: `Contract ${contract.type} expires in ${daysRemaining} days`,
            };
          })
          .filter((notif) => notif.daysRemaining <= renewalThreshold && notif.daysRemaining > 0);

        return notifications;
      },
      'DistributorNotificationService.getContractRenewalNotifications',
      { distributorId }
    );
  }
}

