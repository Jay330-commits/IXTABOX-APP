import 'server-only';
import { boxStatus } from '@prisma/client';
import { BaseService } from '../BaseService';

export type ExportFormat = 'csv' | 'pdf' | 'excel';

/**
 * ExportService
 * Handles data export functionality for reports
 */
export class ExportService extends BaseService {
  /**
   * Export inventory report
   */
  async exportInventoryReport(
    distributorId: string,
    format: ExportFormat = 'csv'
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    return await this.logOperation(
      'EXPORT_INVENTORY_REPORT',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
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

        if (format === 'csv') {
          const headers = ['Box ID', 'Type', 'Status', 'Location', 'Stand'];
          const rows = boxes.map((box) => [
            box.display_id,
            box.model || 'Unknown',
            box.status || 'available',
            box.stands.locations.name,
            box.stands.name,
          ]);

          const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
          ].join('\n');

          return {
            data: csvContent,
            filename: `inventory-report-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
          };
        }

        // For PDF/Excel, you would use libraries like pdfkit or exceljs
        // This is a placeholder
        throw new Error(`Export format ${format} not yet implemented`);
      },
      'ExportService.exportInventoryReport',
      { distributorId, format }
    );
  }

  /**
   * Export financial report
   */
  async exportFinancialReport(
    distributorId: string,
    period: 'month' | 'quarter' | 'year' = 'month',
    format: ExportFormat = 'csv'
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    return await this.logOperation(
      'EXPORT_FINANCIAL_REPORT',
      async () => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Get all box IDs for this distributor's locations
        const distributorBoxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
          },
          select: {
            id: true,
          },
        });
        const boxIds = distributorBoxes.map((box) => box.id);

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
                completed_at: true,
              },
            },
            boxes: {
              select: {
                display_id: true,
              },
            },
          },
        });

        if (format === 'csv') {
          const headers = ['Date', 'Box ID', 'Amount', 'Status'];
          const rows = bookings.map((booking) => [
            new Date(booking.start_date).toLocaleDateString(),
            booking.boxes.display_id,
            booking.payments?.amount ? Number(booking.payments.amount).toFixed(2) : '0.00',
            booking.payments?.completed_at ? 'Paid' : 'Pending',
          ]);

          const totalRevenue = bookings.reduce(
            (sum, booking) =>
              sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
            0
          );

          const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
            '',
            `Total Revenue,${totalRevenue.toFixed(2)}`,
          ].join('\n');

          return {
            data: csvContent,
            filename: `financial-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
          };
        }

        throw new Error(`Export format ${format} not yet implemented`);
      },
      'ExportService.exportFinancialReport',
      { distributorId, period, format }
    );
  }

  /**
   * Export performance report
   */
  async exportPerformanceReport(
    distributorId: string,
    period: 'month' | 'quarter' | 'year' = 'month',
    format: ExportFormat = 'csv'
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    return await this.logOperation(
      'EXPORT_PERFORMANCE_REPORT',
      async () => {
        const locations = await this.prisma.locations.findMany({
          where: {
            distributor_id: distributorId,
          },
          include: {
            stands: {
              include: {
                boxes: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

        if (format === 'csv') {
          const headers = ['Stand', 'Location', 'Total Boxes', 'Occupied', 'Occupancy Rate'];
          const rows = locations.flatMap((location) =>
            location.stands.map((stand) => {
              const totalBoxes = stand.boxes.length;
              const occupied = stand.boxes.filter(
                (box) => box.status === boxStatus.Active
              ).length;
              const occupancyRate = totalBoxes > 0 ? Math.round((occupied / totalBoxes) * 100) : 0;

              return [
                stand.name,
                location.name,
                totalBoxes.toString(),
                occupied.toString(),
                `${occupancyRate}%`,
              ];
            })
          );

          const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
          ].join('\n');

          return {
            data: csvContent,
            filename: `performance-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
          };
        }

        throw new Error(`Export format ${format} not yet implemented`);
      },
      'ExportService.exportPerformanceReport',
      { distributorId, period, format }
    );
  }
}

