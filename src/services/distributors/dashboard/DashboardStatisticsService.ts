import 'server-only';
import { BookingStatus, boxStatus, PaymentStatus, ContractStatus, Prisma, status } from '@prisma/client';
import { BaseService } from '../../BaseService';
import { getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

export interface DashboardStats {
  activeStands: number;
  totalRentalsThisMonth: number;
  earningsOverview: {
    currentMonth: number;
    lastMonth: number;
    growthPercentage: number;
  };
  contractStatus: {
    status: string;
    daysRemaining: number;
    contractType: string;
  };
  currency: string;
}

export interface BoxInventoryItem {
  boxId: string;
  boxDisplayId: string;
  type: string;
  currentLocation: string;
  status: string;
  customer?: string;
  startTime?: string;
  duration?: string;
  revenue?: number;
}

export interface BookingExtension {
  id: string;
  previousEndDate: string;
  newEndDate: string;
  previousLockPin: number;
  newLockPin: number;
  additionalDays: number;
  additionalCost: number;
  createdAt: string;
  boxStatusAtExtension?: string;
}

export interface BookingInventoryItem {
  bookingId: string;
  bookingDisplayId: string | null;
  boxId: string;
  boxType: string;
  location: string;
  stand: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  bookingStatus: BookingStatus;
  paymentStatus: string;
  amount: number;
  currency: string;
  paymentDate?: Date | null;
  paymentId?: string | null;
  chargeId?: string | null;
  returnedAt?: Date | null;
  lockPin: number;
  compartment?: number | null;
  daysRemaining?: number;
  boxFrontView?: string | null;
  boxBackView?: string | null;
  closedStandLock?: string | null;
  boxReturnStatus?: boolean | null;
  boxReturnDate?: Date | null;
  reportedProblems?: Array<{ type: string; description?: string }> | null;
  extensionCount?: number;
  originalEndDate?: string;
  isExtended?: boolean;
  extensions?: BookingExtension[];
}

export interface StandsOverview {
  totalStands: number;
  todayBookings: number;
  monthlyRevenue: number;
  averageOccupancy: number;
  currency: string;
  stands: Array<{
    id: string;
    name: string;
    location: string;
    status: string;
    todayBookings: number;
    monthlyRevenue: number;
    occupancyRate: number;
    totalBookings: number;
    averageRating: number;
  }>;
}

export interface LocationsOverview {
  totalLocations: number;
  todayBookings: number;
  monthlyRevenue: number;
  averageOccupancy: number;
  currency: string;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
    todayBookings: number;
    monthlyRevenue: number;
    occupancyRate: number;
    totalBookings: number;
    averageRating: number;
    totalStands: number;
    totalBoxes: number;
  }>;
}

/**
 * DashboardStatisticsService
 * Handles all dashboard-related statistics and metrics
 */
export class DashboardStatisticsService extends BaseService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(distributorId: string): Promise<DashboardStats> {
    return await this.logOperation(
      'GET_DASHBOARD_STATS',
      async () => {
        // Get distributor's locations and stands
        const distributor = await this.prisma.distributors.findUnique({
          where: { id: distributorId },
          include: {
            locations: {
              include: {
                stands: {
                  include: {
                    boxes: true,
                  },
                },
              },
            },
            contracts: {
              where: {
                status: ContractStatus.Active,
              },
              orderBy: {
                end_date: 'desc',
              },
              take: 1,
            },
          },
        });

        if (!distributor) {
          throw new Error(`Distributor with id ${distributorId} not found`);
        }

        // Count active locations (not stands)
        const activeLocations = distributor.locations.length;

        // Get current month bookings and earnings
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

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

        // Get payments completed in current month (more accurate for revenue)
        const currentMonthPayments = await this.prisma.payments.findMany({
          where: {
            bookings: {
              box_id: {
                in: boxIds,
              },
            },
            completed_at: {
              gte: startOfMonth,
              lte: now,
            },
            status: PaymentStatus.Completed, // Only count completed payments
          },
          select: {
            amount: true,
            currency: true,
          },
        });

        // Get payments completed in last month
        const lastMonthPayments = await this.prisma.payments.findMany({
          where: {
            bookings: {
              box_id: {
                in: boxIds,
              },
            },
            completed_at: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
            status: PaymentStatus.Completed, // Only count completed payments
          },
          select: {
            amount: true,
            currency: true,
          },
        });

        // Calculate earnings from completed payments
        const currentMonthEarnings = currentMonthPayments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );

        const lastMonthEarnings = lastMonthPayments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );

        // Get bookings that started in current month (for rental count)
        const currentMonthBookings = await this.prisma.bookings.findMany({
          where: {
            box_id: {
              in: boxIds,
            },
            start_date: {
              gte: startOfMonth,
            },
          },
          select: {
            id: true,
          },
        });

        const growthPercentage =
          lastMonthEarnings > 0
            ? ((currentMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
            : 0;

        // Get currency from payments (default to SEK if not found)
        const currencyPayment = currentMonthPayments.find(p => p.currency) || 
                                lastMonthPayments.find(p => p.currency);
        const currency = currencyPayment?.currency || 'SEK';

        // Get contract status
        const activeContract = distributor.contracts[0];
        let contractStatus = {
          status: 'None',
          daysRemaining: 0,
          contractType: 'N/A',
        };

        if (activeContract) {
          const endDate = new Date(activeContract.end_date);
          const daysRemaining = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          contractStatus = {
            status: activeContract.status || 'Active',
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            contractType: activeContract.type,
          };
        }

        return {
          activeStands: activeLocations, // Actually locations, keeping field name for compatibility
          totalRentalsThisMonth: currentMonthBookings.length,
          earningsOverview: {
            currentMonth: currentMonthEarnings,
            lastMonth: lastMonthEarnings,
            growthPercentage: Math.round(growthPercentage * 100) / 100,
          },
          contractStatus,
          currency,
        };
      },
      'DashboardStatisticsService.getDashboardStats',
      { distributorId }
    );
  }

  /**
   * Get booking-focused inventory for revenue tracking
   */
  async getBookingInventory(
    distributorId: string,
    filters?: { 
      bookingStatus?: BookingStatus;
      paymentStatus?: string;
      locationId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      showAllTime?: boolean;
      accessToken?: string; // User's access token for signed URL generation (server-side only)
    }
  ): Promise<BookingInventoryItem[]> {
    return await this.logOperation(
      'GET_BOOKING_INVENTORY',
      async () => {
        // First get all box IDs for this distributor
        const boxIds = await this.prisma.boxes.findMany({
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

        const boxIdList = boxIds.map(b => b.id);

        if (boxIdList.length === 0) {
          return [];
        }

        // Build where clause for bookings
        // IMPORTANT: Do NOT filter by status unless explicitly provided
        // Return ALL bookings regardless of status (active, completed, upcoming, cancelled, confirmed, etc.)
        const whereClause: Prisma.bookingsWhereInput = {
          box_id: {
            in: boxIdList,
          },
          // Explicitly do NOT filter by status - return all statuses
        };

        // Only filter by status if explicitly provided in filters
        if (filters?.bookingStatus) {
          whereClause.status = filters.bookingStatus;
          console.log(`[DashboardStatisticsService] Filtering bookings by status: ${filters.bookingStatus}`);
        } else {
          console.log('[DashboardStatisticsService] No status filter provided - returning ALL bookings regardless of status');
        }

        // Default to current month (from start of month to today) if no date filters provided
        // Unless showAllTime is explicitly set to true
        // IMPORTANT: Filter by created_at (when booking was created/revenue was entered)
        // NOT by start_date or end_date - this ensures all bookings created in the period are shown
        // regardless of their status (active, completed, upcoming, cancelled, etc.)
        const now = new Date();
        if (filters?.showAllTime) {
          // Show all bookings - no date filter
          console.log('[DashboardStatisticsService] showAllTime=true - returning ALL bookings regardless of date');
        } else if (!filters?.dateFrom && !filters?.dateTo) {
          // Default to current month - filter by created_at (when revenue was entered)
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          whereClause.created_at = {
            gte: startOfMonth,
            lte: now,
          };
          console.log('[DashboardStatisticsService] Default date filter: current month (filtering by created_at)');
        } else {
          // Use provided date filters - filter by created_at
          whereClause.created_at = {};
          if (filters.dateFrom) {
            whereClause.created_at.gte = filters.dateFrom;
          }
          if (filters.dateTo) {
            whereClause.created_at.lte = filters.dateTo;
          }
          console.log('[DashboardStatisticsService] Custom date filter applied (filtering by created_at)');
        }

        const bookings = await this.prisma.bookings.findMany({
          where: whereClause,
          include: {
            boxes: {
              include: {
                stands: {
                  include: {
                    locations: true,
                  },
                },
              },
            },
            payments: {
              include: {
                users: {
                  select: {
                    email: true,
                    full_name: true,
                    phone: true,
                  },
                },
              },
            },
            box_returns: {
              select: {
                id: true,
                booking_id: true,
                confirmed_good_status: true,
                box_front_view: true,
                box_back_view: true,
                closed_stand_lock: true,
                returned_at: true,
                created_at: true,
              },
            },
            extensions: {
              orderBy: {
                created_at: 'desc',
              },
            },
          },
          orderBy: {
            start_date: 'desc',
          },
        });

        // Log booking statuses to verify all statuses are being returned
        const statusCounts: Record<string, number> = {};
        bookings.forEach(b => {
          const status = b.status?.toString() || 'null';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log(`[DashboardStatisticsService] Found ${bookings.length} bookings with status counts:`, statusCounts);

        // Generate signed URLs for return photos (secure, expire in 1 hour)
        const mappedBookings = await Promise.all(bookings.map(async (booking): Promise<BookingInventoryItem | null> => {
          const startDate = new Date(booking.start_date);
          const endDate = new Date(booking.end_date);
          const days = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Calculate days remaining for active/upcoming bookings
          let daysRemaining: number | undefined;
          if (booking.status === BookingStatus.Active || booking.status === BookingStatus.Upcoming) {
            const remaining = Math.ceil(
              (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            daysRemaining = remaining > 0 ? remaining : 0;
          }

          // Filter by payment status if provided
          if (filters?.paymentStatus && booking.payments?.status !== filters.paymentStatus) {
            return null;
          }

          // Filter by location if provided
          if (filters?.locationId && booking.boxes.stands.locations.id !== filters.locationId) {
            return null;
          }

          // Validate that display_id exists - should never be null if schema is correct
          if (!booking.display_id) {
            console.error(`[DashboardStatisticsService] Booking ${booking.id} has null display_id - this should not happen!`);
            throw new Error(`Booking ${booking.id} is missing display_id. This indicates a data integrity issue.`);
          }

          // Helper function to generate signed URLs for return photos
          // IMPORTANT: box_returns bucket is PRIVATE, so we MUST always generate signed URLs
          const getImageUrl = async (imagePath: string | null | undefined): Promise<string | null> => {
            if (!imagePath) return null;
            
            // If it's already a signed URL (contains token parameter), use it as-is
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              if (imagePath.includes('token=') || imagePath.includes('&t=')) {
                return imagePath;
              }
            }
            
            // Extract the path from the URL - the path format is: box_front_view/filename.jpg
            let cleanPath = imagePath;
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
              try {
                const url = new URL(imagePath);
                // Match pattern: /storage/v1/object/public/box_returns/box_front_view/filename.jpg
                // We want to extract: box_front_view/filename.jpg
                const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
                if (pathMatch && pathMatch[1]) {
                  cleanPath = pathMatch[1];
                } else {
                  // Try manual extraction
                  const parts = imagePath.split('/box_returns/');
                  if (parts.length > 1) {
                    cleanPath = parts[1];
                  } else {
                    console.error('[DashboardStatisticsService] Could not extract path from URL:', imagePath);
                    return null;
                  }
                }
              } catch (error) {
                console.error('[DashboardStatisticsService] Failed to parse URL:', error);
                return null;
              }
            }
            
            // Security: Validate path format to prevent path traversal attacks
            // Expected format: box_front_view/uuid-timestamp.jpg or box_back_view/... or closed_stand_view/...
            // Note: closed_stand_view doesn't have 'box_' prefix, so we need to allow both patterns
            const isValidPath = /^(box_(front_view|back_view)|closed_stand_view)\/[a-f0-9-]+-\d+\.(jpg|jpeg|png)$/i;
            if (!isValidPath.test(cleanPath)) {
              console.error('[DashboardStatisticsService] Security: Invalid image path format:', cleanPath);
              return null;
            }
            
            // Always generate signed URL for private bucket
            // SECURITY: Use user's access token (server-side only, never sent to client)
            // Authentication is verified before this method is called
            // Permission is verified by only returning bookings for the distributor's locations
            try {
              if (!filters?.accessToken) {
                console.error('[DashboardStatisticsService] No access token available for signed URL generation');
                return null;
              }
              console.log('[DashboardStatisticsService] Generating signed URL for path:', cleanPath, '(using user access token)');
              const signedUrl = await getSupabaseStorageSignedUrl('box_returns', cleanPath, 3600, filters.accessToken);
              if (!signedUrl || signedUrl.includes('/storage/v1/object/public/')) {
                console.error('[DashboardStatisticsService] Signed URL generation returned public URL - this should not happen!');
                return null;
              }
              return signedUrl;
            } catch (error) {
              console.error('[DashboardStatisticsService] Failed to create signed URL for box_returns:', {
                path: cleanPath,
                error: error instanceof Error ? error.message : String(error),
                originalPath: imagePath?.substring(0, 100),
              });
              // Return null if we can't generate signed URL (better than returning broken public URL)
              return null;
            }
          };
          
          // Only process return photos if booking is completed and has return data
          let boxFrontView: string | null = null;
          let boxBackView: string | null = null;
          let closedStandLock: string | null = null;
          
          if (booking.status === BookingStatus.Completed && booking.box_returns) {
            try {
              const results = await Promise.all([
                getImageUrl(booking.box_returns?.box_front_view),
                getImageUrl(booking.box_returns?.box_back_view),
                getImageUrl(booking.box_returns?.closed_stand_lock),
              ]);
              
              // Ensure we never return public URLs - if any result is a public URL, set it to null
              boxFrontView = results[0] && !results[0].includes('/storage/v1/object/public/') ? results[0] : null;
              boxBackView = results[1] && !results[1].includes('/storage/v1/object/public/') ? results[1] : null;
              closedStandLock = results[2] && !results[2].includes('/storage/v1/object/public/') ? results[2] : null;
            } catch (error) {
              console.error('[DashboardStatisticsService] Error processing return photos:', error);
              // Keep values as null if processing fails
            }
          }

          return {
            bookingId: booking.id,
            bookingDisplayId: booking.display_id,
            boxId: booking.boxes.display_id,
            boxType: booking.boxes.model || 'Unknown',
            location: booking.boxes.stands.locations.name,
            stand: booking.boxes.stands.name,
            customer: booking.payments?.users?.full_name || booking.payments?.users?.email || 'Unknown',
            customerEmail: booking.payments?.users?.email,
            customerPhone: booking.payments?.users?.phone ?? undefined,
            startDate: booking.start_date,
            endDate: booking.end_date,
            duration: days,
            bookingStatus: booking.status || BookingStatus.Pending,
            paymentStatus: booking.payments?.status || 'Pending',
            amount: booking.payments ? Number(booking.payments.amount) : 0,
            currency: booking.payments?.currency || 'SEK',
            paymentDate: booking.payments?.completed_at,
            paymentId: booking.payments?.id || null,
            chargeId: booking.payments?.charge_id || null,
            returnedAt: booking.box_returns?.returned_at ?? booking.box_returns?.created_at ?? null,
            lockPin: booking.lock_pin,
            compartment: booking.boxes.compartment,
            daysRemaining,
            boxFrontView,
            boxBackView,
            closedStandLock,
            boxReturnStatus: booking.box_returns?.confirmed_good_status ?? null,
            boxReturnDate: booking.box_returns?.returned_at ?? booking.box_returns?.created_at ?? null,
            reportedProblems: (booking.reported_problems as Array<{ type: string; description?: string }> | null) ?? null,
            extensionCount: booking.extensions?.length ?? 0,
            originalEndDate: (() => {
              const exts = booking.extensions;
              if (!exts?.length) return undefined;
              const first = [...exts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
              return first ? new Date(first.previous_end_date).toLocaleDateString() : undefined;
            })(),
            isExtended: (booking.extensions?.length ?? 0) > 0,
            extensions: booking.extensions?.map((ext) => ({
              id: ext.id,
              previousEndDate: new Date(ext.previous_end_date).toLocaleDateString(),
              newEndDate: new Date(ext.new_end_date).toLocaleDateString(),
              previousLockPin: ext.previous_lock_pin,
              newLockPin: ext.new_lock_pin,
              additionalDays: ext.additional_days,
              additionalCost: Number(ext.additional_cost),
              createdAt: new Date(ext.created_at).toLocaleDateString(),
              boxStatusAtExtension: ext.box_status_at_extension || undefined,
            })) || [],
          };
        }));

        return mappedBookings.filter((item): item is BookingInventoryItem => item !== null);
      },
      'DashboardStatisticsService.getBookingInventory',
      { distributorId, filters }
    );
  }

  /**
   * Get real-time box inventory for dashboard table
   */
  async getRealTimeBoxInventory(
    distributorId: string,
    filters?: { status?: string }
  ): Promise<BoxInventoryItem[]> {
    return await this.logOperation(
      'GET_REAL_TIME_BOX_INVENTORY',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
            ...(filters?.status && { status: filters.status as boxStatus }),
          },
          include: {
            stands: {
              include: {
                locations: true,
              },
            },
            bookings: {
              where: {
                OR: [
                  { status: BookingStatus.Active },
                  { status: BookingStatus.Upcoming },
                  { status: BookingStatus.Confirmed },
                ],
              },
              include: {
                payments: {
                  include: {
                    users: {
                      select: {
                        email: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                start_date: 'desc',
              },
              take: 1,
            },
          },
        });

        return boxes.map((box) => {
          const booking = box.bookings[0];
          const location = box.stands.locations.name;

          let duration: string | undefined;
          let revenue: number | undefined;

          if (booking) {
            const start = new Date(booking.start_date);
            const end = new Date(booking.end_date);
            const days = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            );
            duration = `${days} day${days !== 1 ? 's' : ''}`;
            revenue = booking.payments
              ? Number(booking.payments.amount)
              : undefined;
          }

          return {
            boxId: box.id,
            boxDisplayId: box.display_id,
            type: box.model || 'Unknown',
            currentLocation: location,
            status: box.status || boxStatus.Inactive,
            customer: booking?.payments?.users?.email,
            startTime: booking
              ? new Date(booking.start_date).toLocaleString()
              : undefined,
            duration,
            revenue,
          };
        });
      },
      'DashboardStatisticsService.getRealTimeBoxInventory',
      { distributorId, filters }
    );
  }

  /**
   * Get box status counts for summary
   */
  async getBoxStatusCounts(distributorId: string): Promise<{
    active: number;
    scheduled: number;
    available: number;
    maintenance: number;
  }> {
    return await this.logOperation(
      'GET_BOX_STATUS_COUNTS',
      async () => {
        const boxes = await this.prisma.boxes.findMany({
          where: {
            stands: {
              locations: {
                distributor_id: distributorId,
              },
            },
          },
          select: {
            status: true,
            bookings: {
              where: {
                status: BookingStatus.Upcoming,
              },
              take: 1,
            },
          },
        });

        let active = 0;
        let scheduled = 0;
        let available = 0;
        const maintenance = 0;

        boxes.forEach((box) => {
          // boxStatus enum: Active (in use), Inactive (available), Upcoming (scheduled)
          if (box.status === boxStatus.Upcoming) {
            scheduled++;
          } else if (box.status === boxStatus.Active) {
            active++;
          } else if (box.status === boxStatus.Inactive && box.bookings.length === 0) {
            available++;
          } else {
            // Default to available if status is null/undefined
            available++;
          }
        });

        return { active, scheduled, available, maintenance };
      },
      'DashboardStatisticsService.getBoxStatusCounts',
      { distributorId }
    );
  }

  /**
   * Get location status counts for summary
   * Counts locations by their actual status field (not box status)
   */
  async getLocationStatusCounts(distributorId: string): Promise<{
    active: number;
    scheduled: number;
    available: number;
    maintenance: number;
  }> {
    return await this.logOperation(
      'GET_LOCATION_STATUS_COUNTS',
      async () => {
        const locations = await this.prisma.locations.findMany({
          where: {
            distributor_id: distributorId,
          },
          select: {
            id: true,
            status: true,
            stands: {
              include: {
                boxes: {
                  include: {
                    bookings: {
                      where: {
                        status: BookingStatus.Upcoming,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });

        let active = 0;
        let scheduled = 0;
        let available = 0;
        let maintenance = 0;

        locations.forEach((location) => {
          // Location status enum: Available, Occupied, Maintenance, Inactive
          const locationStatus = location.status;
          
          // Check if location has boxes with upcoming bookings
          const hasUpcomingBookings = location.stands.some(stand =>
            stand.boxes.some(box => box.bookings.length > 0)
          );
          
          if (locationStatus === status.Occupied) {
            active++;
          } else if (locationStatus === status.Available) {
            // If available location has upcoming bookings, count as scheduled
            if (hasUpcomingBookings) {
              scheduled++;
            } else {
              available++;
            }
          } else if (locationStatus === status.Maintenance) {
            maintenance++;
          } else if (locationStatus === status.Inactive) {
            // Inactive locations are not counted in active/available/scheduled
            // They could be counted separately if needed
          } else {
            // Default to available if status is null/undefined
            if (hasUpcomingBookings) {
              scheduled++;
            } else {
              available++;
            }
          }
        });

        return { active, scheduled, available, maintenance };
      },
      'DashboardStatisticsService.getLocationStatusCounts',
      { distributorId }
    );
  }

  /**
   * Get booking status counts for summary
   * Counts bookings by their actual BookingStatus enum values
   */
  async getBookingStatusCounts(
    distributorId: string,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      showAllTime?: boolean;
    }
  ): Promise<{
    active: number;
    upcoming: number;
    cancelled: number;
    overdue: number;
  }> {
    return await this.logOperation(
      'GET_BOOKING_STATUS_COUNTS',
      async () => {
        // Get all box IDs for this distributor
        const boxIds = await this.prisma.boxes.findMany({
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

        const boxIdList = boxIds.map(b => b.id);

        if (boxIdList.length === 0) {
          return { active: 0, upcoming: 0, cancelled: 0, overdue: 0 };
        }

        // Build where clause for bookings
        const whereClause: Prisma.bookingsWhereInput = {
          box_id: {
            in: boxIdList,
          },
        };

        // Apply date filters if not showing all time
        // IMPORTANT: Filter by created_at (when booking was created/revenue was entered)
        // NOT by start_date - this matches the getBookingInventory method
        // This ensures status counts match the bookings shown in the table
        const now = new Date();
        if (filters?.showAllTime) {
          // Show all bookings - no date filter
          console.log('[DashboardStatisticsService.getBookingStatusCounts] showAllTime=true - counting ALL bookings');
        } else if (!filters?.dateFrom && !filters?.dateTo) {
          // Default to current month - filter by created_at
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          whereClause.created_at = {
            gte: startOfMonth,
            lte: now,
          };
          console.log('[DashboardStatisticsService.getBookingStatusCounts] Default date filter: current month (filtering by created_at)');
        } else {
          // Use provided date filters - filter by created_at
          whereClause.created_at = {};
          if (filters.dateFrom) {
            whereClause.created_at.gte = filters.dateFrom;
          }
          if (filters.dateTo) {
            whereClause.created_at.lte = filters.dateTo;
          }
          console.log('[DashboardStatisticsService.getBookingStatusCounts] Custom date filter applied (filtering by created_at)');
        }

        // Get all bookings matching the filters
        const bookings = await this.prisma.bookings.findMany({
          where: whereClause,
          select: {
            status: true,
            end_date: true,
          },
        });

        let active = 0;
        let upcoming = 0;
        let cancelled = 0;
        let overdue = 0;

        bookings.forEach((booking) => {
          const status = booking.status || BookingStatus.Pending;
          const endDate = new Date(booking.end_date);
          const isOverdue = endDate < now;
          
          if (status === BookingStatus.Overdue) {
            overdue++;
          } else if (status === BookingStatus.Active) {
            // Check if booking is overdue (end_date has passed but status is still Active)
            if (isOverdue) {
              overdue++;
            } else {
              active++;
            }
          } else if (status === BookingStatus.Upcoming) {
            upcoming++;
          } else if (status === BookingStatus.Cancelled) {
            cancelled++;
          }
        });

        return { active, upcoming, cancelled, overdue };
      },
      'DashboardStatisticsService.getBookingStatusCounts',
      { distributorId, filters }
    );
  }

  /**
   * Get locations overview with metrics (aggregated from all stands at each location)
   */
  async getLocationsOverview(distributorId: string): Promise<LocationsOverview> {
    return await this.logOperation(
      'GET_LOCATIONS_OVERVIEW',
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
                  include: {
                    bookings: {
                      include: {
                        payments: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const locationsData = locations.map((location) => {
          // Aggregate all boxes from all stands at this location
          const allBoxes = location.stands.flatMap(stand => stand.boxes);
          
          // Get today's bookings across all stands at this location
          const todayBookings = allBoxes.reduce(
            (count, box) =>
              count +
              box.bookings.filter(
                (booking) =>
                  new Date(booking.start_date).toDateString() ===
                  today.toDateString()
              ).length,
            0
          );

          // Get monthly revenue across all stands at this location
          // Based on payment completion dates, not booking start dates
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthlyRevenue = allBoxes.reduce(
            (sum, box) =>
              sum +
              box.bookings.reduce(
                (bookingSum, booking) => {
                  if (booking.payments && 
                      booking.payments.completed_at &&
                      booking.payments.status === PaymentStatus.Completed) {
                    const paymentDate = new Date(booking.payments.completed_at);
                    // Only count payments completed this month
                    if (paymentDate >= startOfMonth && paymentDate <= now) {
                      return bookingSum + Number(booking.payments.amount);
                    }
                  }
                  return bookingSum;
                },
                0
              ),
            0
          );

          // Get total bookings across all stands at this location
          const totalBookings = allBoxes.reduce(
            (sum, box) => sum + box.bookings.length,
            0
          );

          // Calculate occupancy rate across all boxes at this location
          // A box is occupied if it has an active or upcoming booking
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
            allBoxes.length > 0
              ? Math.round((occupiedBoxes / allBoxes.length) * 100)
              : 0;

          // Get average rating from location reviews
          const reviews = location.reviews || [];
          const averageRating =
            reviews.length > 0
              ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                reviews.length
              : 0;

          return {
            id: location.id,
            name: location.name,
            address: location.address || '',
            status: location.status || 'Available',
            todayBookings,
            monthlyRevenue,
            occupancyRate,
            totalBookings,
            averageRating: Math.round(averageRating * 10) / 10,
            totalStands: location.stands.length,
            totalBoxes: allBoxes.length,
          };
        });

        const totalBookingsToday = locationsData.reduce(
          (sum, location) => sum + location.todayBookings,
          0
        );
        const totalMonthlyRevenue = locationsData.reduce(
          (sum, location) => sum + location.monthlyRevenue,
          0
        );
        const averageOccupancy =
          locationsData.length > 0
            ? Math.round(
                locationsData.reduce((sum, location) => sum + location.occupancyRate, 0) /
                  locationsData.length
              )
            : 0;

        // Get currency from payments (default to SEK if not found)
        const currencyPayment = locations
          .flatMap(loc => loc.stands.flatMap(stand => stand.boxes.flatMap(box => box.bookings)))
          .find(b => b.payments?.currency)?.payments;
        const currency = currencyPayment?.currency || 'SEK';

        return {
          totalLocations: locationsData.length,
          todayBookings: totalBookingsToday,
          monthlyRevenue: totalMonthlyRevenue,
          averageOccupancy,
          currency,
          locations: locationsData,
        };
      },
      'DashboardStatisticsService.getLocationsOverview',
      { distributorId }
    );
  }

  /**
   * Get stands overview with metrics
   */
  async getStandsOverview(distributorId: string): Promise<StandsOverview> {
    return await this.logOperation(
      'GET_STANDS_OVERVIEW',
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
                  include: {
                    bookings: {
                      where: {
                        start_date: {
                          gte: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1
                          ),
                        },
                      },
                      include: {
                        payments: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const standsData = locations.flatMap((location) =>
          location.stands.map((stand) => {
            const todayBookings = stand.boxes.reduce(
              (count, box) =>
                count +
                box.bookings.filter(
                  (booking) =>
                    new Date(booking.start_date).toDateString() ===
                    today.toDateString()
                ).length,
              0
            );

            const monthlyRevenue = stand.boxes.reduce(
              (sum, box) =>
                sum +
                box.bookings.reduce(
                  (bookingSum, booking) =>
                    bookingSum +
                    (booking.payments
                      ? Number(booking.payments.amount)
                      : 0),
                  0
                ),
              0
            );

            const totalBookings = stand.boxes.reduce(
              (sum, box) => sum + box.bookings.length,
              0
            );

            const occupiedBoxes = stand.boxes.filter(
              (box) => box.status === boxStatus.Active || box.status === boxStatus.Upcoming
            ).length;
            const occupancyRate =
              stand.boxes.length > 0
                ? Math.round((occupiedBoxes / stand.boxes.length) * 100)
                : 0;

            // Get average rating from location reviews
            const reviews = location.reviews || [];
            const averageRating =
              reviews.length > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                  reviews.length
                : 0;

            return {
              id: stand.id,
              name: stand.name,
              location: location.name,
              status: location.status || 'active',
              todayBookings,
              monthlyRevenue,
              occupancyRate,
              totalBookings,
              averageRating: Math.round(averageRating * 10) / 10,
            };
          })
        );

        const totalBookingsToday = standsData.reduce(
          (sum, stand) => sum + stand.todayBookings,
          0
        );
        const totalMonthlyRevenue = standsData.reduce(
          (sum, stand) => sum + stand.monthlyRevenue,
          0
        );
        const averageOccupancy =
          standsData.length > 0
            ? Math.round(
                standsData.reduce((sum, stand) => sum + stand.occupancyRate, 0) /
                  standsData.length
              )
            : 0;

        // Get currency from payments (default to SEK if not found)
        const currencyPayment = locations
          .flatMap(loc => loc.stands.flatMap(stand => stand.boxes.flatMap(box => box.bookings)))
          .find(b => b.payments?.currency)?.payments;
        const currency = currencyPayment?.currency || 'SEK';

        return {
          totalStands: standsData.length,
          todayBookings: totalBookingsToday,
          monthlyRevenue: totalMonthlyRevenue,
          averageOccupancy,
          currency,
          stands: standsData,
        };
      },
      'DashboardStatisticsService.getStandsOverview',
      { distributorId }
    );
  }

  /**
   * Get total revenue summary
   */
  async getBoxRevenueSummary(
    distributorId: string,
    period?: 'day' | 'month' | 'year'
  ): Promise<number> {
    return await this.logOperation(
      'GET_BOX_REVENUE_SUMMARY',
      async () => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
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
            payments: true,
          },
        });

        return bookings.reduce(
          (sum, booking) =>
            sum + (booking.payments?.amount ? Number(booking.payments.amount) : 0),
          0
        );
      },
      'DashboardStatisticsService.getBoxRevenueSummary',
      { distributorId, period }
    );
  }

  /**
   * Calculate total revenue from completed payments for booking inventory
   * Filters by payment completion date and status (more accurate than booking start date)
   */
  async getBookingInventoryRevenue(
    distributorId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      showAllTime?: boolean;
    }
  ): Promise<{
    totalRevenue: number;
    currency: string;
  }> {
    return await this.logOperation(
      'GET_BOOKING_INVENTORY_REVENUE',
      async () => {
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

        // Build where clause for payments
        const paymentWhere: Prisma.paymentsWhereInput = {
          bookings: {
            box_id: {
              in: boxIds,
            },
          },
          status: PaymentStatus.Completed, // Only completed payments
        };

        // Apply date filters if not showing all time
        if (!options?.showAllTime) {
          if (options?.dateFrom || options?.dateTo) {
            paymentWhere.completed_at = {};
            if (options.dateFrom) {
              paymentWhere.completed_at.gte = options.dateFrom;
            }
            if (options.dateTo) {
              paymentWhere.completed_at.lte = options.dateTo;
            }
          }
        }

        const payments = await this.prisma.payments.findMany({
          where: paymentWhere,
          select: {
            amount: true,
            currency: true,
          },
        });

        const totalRevenue = payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );

        // Get currency from payments (default to SEK if not found)
        const currencyPayment = payments.find(p => p.currency);
        const currency = currencyPayment?.currency || 'SEK';

        return { totalRevenue, currency };
      },
      'DashboardStatisticsService.getBookingInventoryRevenue',
      { distributorId, options }
    );
  }
}

