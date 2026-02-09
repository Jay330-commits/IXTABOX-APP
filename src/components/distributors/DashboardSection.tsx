'use client';

import React from 'react';
import StandsOverview from './StandsOverview';

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

interface BookingExtension {
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

interface BookingInventoryItem {
  bookingId: string;
  bookingDisplayId?: string | null;
  boxId: string;
  boxType: string;
  location: string;
  stand: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  duration: number;
  bookingStatus: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  paymentDate?: string | null;
  paymentId?: string | null;
  chargeId?: string | null;
  returnedAt?: string | null;
  lockPin: number;
  compartment?: number | null;
  daysRemaining?: number;
  boxFrontView?: string | null;
  boxBackView?: string | null;
  closedStandLock?: string | null;
  boxReturnStatus?: boolean | null;
  boxReturnDate?: string | null;
  reportedProblems?: Array<{ type: string; description?: string }> | null;
  extensionCount?: number;
  originalEndDate?: string;
  isExtended?: boolean;
  extensions?: BookingExtension[];
}

interface DashboardSectionProps {
  statsData: StatCard[];
  loading: boolean;
  error: string | null;
  boxInventory: BookingInventoryItem[];
  expandedRows: Set<string>;
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
  statusCounts: {
    active: number;
    upcoming: number;
    cancelled: number;
    overdue: number;
  };
  revenueSummary: { totalRevenue: number; currency: string } | null;
  currency: string;
  selectedMonth: number;
  selectedYear: number;
  showAllTime: boolean;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setShowAllTime: (show: boolean) => void;
  isRefreshing: boolean;
  refreshDashboardData: (silent: boolean) => Promise<void>;
  setActiveSection: (section: string) => void;
}

const getIconSvg = (iconType: string) => {
  switch (iconType) {
    case 'stands':
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'rentals':
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      );
    case 'earnings':
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'contract':
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function DashboardSection({
  statsData,
  loading,
  error,
  boxInventory,
  expandedRows,
  setExpandedRows,
  statusCounts,
  revenueSummary,
  currency,
  selectedMonth,
  selectedYear,
  showAllTime,
  setSelectedMonth,
  setSelectedYear,
  setShowAllTime,
  isRefreshing,
  refreshDashboardData,
  setActiveSection,
}: DashboardSectionProps) {
  // Column filters state - Excel-style filtering
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>({
    identifier: '',
    boxId: '',
    model: '',
    location: '',
    customer: '',
    from: '',
    to: '',
    booking: '',
    payment: '',
    amount: '',
  });
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Get unique booking statuses
  const getUniqueBookingStatuses = React.useMemo(() => {
    const statuses = new Set<string>();
    boxInventory.forEach((booking) => {
      if (booking.bookingStatus) {
        statuses.add(booking.bookingStatus);
      }
    });
    return Array.from(statuses).sort();
  }, [boxInventory]);

  // Get unique payment statuses
  const getUniquePaymentStatuses = React.useMemo(() => {
    const statuses = new Set<string>();
    boxInventory.forEach((booking) => {
      if (booking.paymentStatus) {
        statuses.add(booking.paymentStatus);
      }
    });
    return Array.from(statuses).sort();
  }, [boxInventory]);
  const getBookingStatusColor = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized === 'active') {
      return 'bg-green-500/20 text-green-400';
    } else if (normalized === 'upcoming' || normalized === 'confirmed') {
      return 'bg-yellow-500/20 text-yellow-400';
    } else if (normalized === 'completed') {
      return 'bg-blue-500/20 text-blue-400';
    } else if (normalized === 'cancelled') {
      return 'bg-red-500/20 text-red-400';
    } else if (normalized === 'overdue') {
      return 'bg-gray-500/20 text-gray-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const getPaymentStatusColor = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized === 'completed') {
      return 'bg-green-500/20 text-green-400';
    } else if (normalized === 'pending' || normalized === 'processing') {
      return 'bg-yellow-500/20 text-yellow-400';
    } else if (normalized === 'failed') {
      return 'bg-red-500/20 text-red-400';
    } else if (normalized === 'refunded') {
      return 'bg-orange-500/20 text-orange-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const toggleExpand = (bookingId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedRows(newExpanded);
  };

  // Filter boxInventory based on column filters
  const filteredInventory = React.useMemo(() => {
    return boxInventory.filter((booking) => {
      // Identifier filter
      if (columnFilters.identifier) {
        const identifier = booking.bookingDisplayId || '';
        if (!identifier.toLowerCase().includes(columnFilters.identifier.toLowerCase())) {
          return false;
        }
      }

      // Box ID filter
      if (columnFilters.boxId) {
        if (!booking.boxId.toLowerCase().includes(columnFilters.boxId.toLowerCase())) {
          return false;
        }
      }

      // Model filter
      if (columnFilters.model) {
        const model = booking.boxType?.replace(/_/g, ' ') || '';
        if (!model.toLowerCase().includes(columnFilters.model.toLowerCase())) {
          return false;
        }
      }

      // Location filter
      if (columnFilters.location) {
        if (!booking.location.toLowerCase().includes(columnFilters.location.toLowerCase())) {
          return false;
        }
      }

      // Customer filter
      if (columnFilters.customer) {
        const customer = booking.customer || '';
        if (!customer.toLowerCase().includes(columnFilters.customer.toLowerCase())) {
          return false;
        }
      }

      // From (Start Date) filter
      if (columnFilters.from) {
        const startDate = new Date(booking.startDate);
        // Compare dates (ignore time)
        if (startDate.toISOString().split('T')[0] !== columnFilters.from) {
          return false;
        }
      }

      // To (End Date) filter
      if (columnFilters.to) {
        const endDate = new Date(booking.endDate);
        // Compare dates (ignore time)
        if (endDate.toISOString().split('T')[0] !== columnFilters.to) {
          return false;
        }
      }

      // Booking Status filter
      if (columnFilters.booking) {
        if (booking.bookingStatus !== columnFilters.booking) {
          return false;
        }
      }

      // Payment Status filter
      if (columnFilters.payment) {
        if (booking.paymentStatus !== columnFilters.payment) {
          return false;
        }
      }

      // Amount filter with comparison operators
      if (columnFilters.amount) {
        const filterValue = columnFilters.amount.trim();
        const bookingAmount = booking.amount;
        
        // Check for comparison operators
        if (filterValue.startsWith('>=')) {
          const numValue = parseFloat(filterValue.substring(2).trim());
          if (isNaN(numValue) || bookingAmount < numValue) {
            return false;
          }
        } else if (filterValue.startsWith('<=')) {
          const numValue = parseFloat(filterValue.substring(2).trim());
          if (isNaN(numValue) || bookingAmount > numValue) {
            return false;
          }
        } else if (filterValue.startsWith('>')) {
          const numValue = parseFloat(filterValue.substring(1).trim());
          if (isNaN(numValue) || bookingAmount <= numValue) {
            return false;
          }
        } else if (filterValue.startsWith('<')) {
          const numValue = parseFloat(filterValue.substring(1).trim());
          if (isNaN(numValue) || bookingAmount >= numValue) {
            return false;
          }
        } else {
          // Fallback to text search for backward compatibility
          const amountStr = bookingAmount.toString();
          if (!amountStr.includes(filterValue)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [boxInventory, columnFilters]);

  // Calculate filtered stats, revenue, and status counts
  const filteredStats = React.useMemo(() => {
    const hasFilters = Object.values(columnFilters).some(f => f);
    if (!hasFilters) {
      return {
        statsData,
        revenueSummary,
        statusCounts,
      };
    }

    // Calculate revenue from filtered inventory
    const totalRevenue = filteredInventory.reduce((sum, booking) => {
      return sum + (booking.amount || 0);
    }, 0);

    // Calculate status counts from filtered inventory
    const counts = {
      active: 0,
      upcoming: 0,
      cancelled: 0,
      overdue: 0,
    };

    filteredInventory.forEach((booking) => {
      const status = booking.bookingStatus?.toLowerCase() || '';
      if (status === 'active') {
        counts.active++;
      } else if (status === 'upcoming' || status === 'confirmed') {
        counts.upcoming++;
      } else if (status === 'cancelled') {
        counts.cancelled++;
      } else if (status === 'overdue') {
        counts.overdue++;
      }
    });

    // Calculate stats from filtered inventory
    // Get unique locations/stands count
    const uniqueLocations = new Set(filteredInventory.map(b => b.location)).size;
    const totalBookings = filteredInventory.length;
    
    // Calculate based on what statsData contains - we'll need to map the existing stats
    const calculatedStats = statsData.map((stat) => {
      if (stat.title.toLowerCase().includes('stand') || stat.title.toLowerCase().includes('location')) {
        return { ...stat, value: uniqueLocations };
      } else if (stat.title.toLowerCase().includes('rental') || stat.title.toLowerCase().includes('booking')) {
        return { ...stat, value: totalBookings };
      } else if (stat.title.toLowerCase().includes('earning') || stat.title.toLowerCase().includes('revenue')) {
        return { ...stat, value: `${currency}${totalRevenue.toLocaleString()}` };
      }
      return stat;
    });

    return {
      statsData: calculatedStats,
      revenueSummary: { totalRevenue, currency },
      statusCounts: counts,
    };
  }, [filteredInventory, columnFilters, statsData, revenueSummary, statusCounts, currency]);

  const updateFilter = (column: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const clearAllFilters = () => {
    setColumnFilters({
      identifier: '',
      boxId: '',
      model: '',
      location: '',
      customer: '',
      from: '',
      to: '',
      booking: '',
      payment: '',
      amount: '',
    });
  };

  return (
    <>
      {/* Stats Section - Hidden on mobile */}
      <div className="hidden lg:block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="mb-8">
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
                >
                  <div className="h-8 w-8 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        ) : (
          /* Stats Cards */
          <div className="mb-8">
            <div className="grid grid-cols-4 gap-6">
              {filteredStats.statsData.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                  <h3 className="text-sm text-gray-400 mb-1">{stat.title}</h3>
                      <p className="text-2xl font-bold text-cyan-300">
                    {stat.value}
                  </p>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <div className="text-cyan-300 flex items-center justify-center">
                        {getIconSvg(stat.icon)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    {stat.change.replace(/^-/, '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modern Real-time Box Inventory Table */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold">Bookings & Revenue Tracking</h2>
              <p className="text-sm text-gray-400 mt-1">Track all bookings, payments, and revenue across your locations</p>
            </div>
            <div className="flex items-center space-x-4 flex-wrap">
              {/* Date Filter Controls */}
              <div className="flex items-center space-x-3 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5">
                <label className="text-xs font-medium text-gray-300 whitespace-nowrap">Filter by:</label>
                {!showAllTime ? (
                  <>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-gray-800 border border-white/30 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i} className="bg-gray-800">
                          {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-gray-800 border border-white/30 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return (
                          <option key={year} value={year} className="bg-gray-800">
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </>
                ) : (
                  <span className="text-sm font-medium text-cyan-300 px-2">All Time</span>
                )}
                <button
                  onClick={() => setShowAllTime(!showAllTime)}
                  className="text-xs font-medium text-cyan-300 hover:text-cyan-200 underline whitespace-nowrap"
                >
                  {showAllTime ? 'Filter by Month' : 'Show All Time'}
                </button>
                
                {/* Column Filters Toggle */}
                <div className="h-4 w-px bg-white/20 mx-1"></div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    showFilters
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-white/10 text-cyan-300 hover:bg-white/20'
                  }`}
                  title={showFilters ? 'Hide Column Filters' : 'Show Column Filters'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Columns</span>
                  {Object.values(columnFilters).some(f => f) && (
                    <span className="bg-white/20 text-white text-xs px-1 py-0.5 rounded-full">
                      {Object.values(columnFilters).filter(f => f).length}
                    </span>
                  )}
                </button>
                {Object.values(columnFilters).some(f => f) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-2 py-1 rounded text-xs font-medium transition-all duration-200 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    title="Clear all column filters"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {isRefreshing ? (
                <>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-cyan-400">Refreshing...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live Updates</span>
                </>
              )}
              <button className="text-cyan-300 hover:text-cyan-200 text-sm font-medium">
                Export Data →
              </button>
            </div>
          </div>
          
          {/* Modern Table with Inline Filters */}
          {loading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500"></div>
              <p className="mt-4 text-gray-400">Loading inventory...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-400">Error loading inventory: {error}</p>
            </div>
          ) : boxInventory.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">No bookings found</p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              {/* Results count when filters are active */}
              {Object.values(columnFilters).some(f => f) && (
                <div className="bg-gray-800/30 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">
                    Showing <span className="text-cyan-300 font-semibold">{filteredInventory.length}</span> of <span className="text-white font-semibold">{boxInventory.length}</span> bookings
                  </span>
                </div>
              )}
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="border-b border-white/20">
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Booking ID</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.identifier}
                              onChange={(e) => updateFilter('identifier', e.target.value)}
                              placeholder="Filter..."
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Box ID</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.boxId}
                              onChange={(e) => updateFilter('boxId', e.target.value)}
                              placeholder="Filter..."
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Model</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.model}
                              onChange={(e) => updateFilter('model', e.target.value)}
                              placeholder="Filter..."
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Location</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.location}
                              onChange={(e) => updateFilter('location', e.target.value)}
                              placeholder="Filter..."
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Customer</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.customer}
                              onChange={(e) => updateFilter('customer', e.target.value)}
                              placeholder="Filter..."
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">From</span>
                          {showFilters && (
                            <input
                              type="date"
                              value={columnFilters.from}
                              onChange={(e) => updateFilter('from', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              style={{ colorScheme: 'dark' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">To</span>
                          {showFilters && (
                            <input
                              type="date"
                              value={columnFilters.to}
                              onChange={(e) => updateFilter('to', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              style={{ colorScheme: 'dark' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Booking</span>
                          {showFilters && (
                            <select
                              value={columnFilters.booking}
                              onChange={(e) => updateFilter('booking', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer"
                              style={{ colorScheme: 'dark' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="" className="bg-gray-800">All</option>
                              {getUniqueBookingStatuses.map((status) => (
                                <option key={status} value={status} className="bg-gray-800">
                                  {status}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Payment</span>
                          {showFilters && (
                            <select
                              value={columnFilters.payment}
                              onChange={(e) => updateFilter('payment', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer"
                              style={{ colorScheme: 'dark' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="" className="bg-gray-800">All</option>
                              {getUniquePaymentStatuses.map((status) => (
                                <option key={status} value={status} className="bg-gray-800">
                                  {status}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </th>
                      <th className={`text-left ${showFilters ? 'py-2' : 'py-3'} px-3 bg-gray-900`}>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-semibold text-gray-300">Amount</span>
                          {showFilters && (
                            <input
                              type="text"
                              value={columnFilters.amount}
                              onChange={(e) => updateFilter('amount', e.target.value)}
                              placeholder="e.g. >100, <500, >=1000"
                              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                              onClick={(e) => e.stopPropagation()}
                              title="Use >, <, >=, <= for comparisons (e.g. >100, <500, >=1000)"
                            />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-2 px-3 bg-gray-900">
                        <span className="text-sm font-semibold text-gray-300">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((booking) => {
                      const isExpanded = expandedRows.has(booking.bookingId);

                      return (
                        <React.Fragment key={booking.bookingId}>
                          <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4">
                              <span className="font-mono text-cyan-300 text-sm whitespace-nowrap">
                                {booking.bookingDisplayId ? booking.bookingDisplayId : (
                                  <span className="text-red-400" title="Error: Booking display ID is missing">
                                    ERROR
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-mono text-white text-sm">{booking.boxId}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-white whitespace-nowrap text-sm">{booking.boxType?.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-white text-sm break-words overflow-wrap-anywhere" title={booking.location} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {booking.location}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-white text-sm">{booking.customer}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-300 text-sm">
                                {new Date(booking.startDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-300 text-sm">
                                {new Date(booking.endDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getBookingStatusColor(
                                    booking.bookingStatus
                                  )}`}
                                >
                                  {booking.bookingStatus}
                                </span>
                                {booking.isExtended && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Extended
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPaymentStatusColor(
                                  booking.paymentStatus
                                )}`}
                              >
                                {booking.paymentStatus}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-green-400 text-sm">
                                {booking.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <button 
                                onClick={() => toggleExpand(booking.bookingId)}
                                className="text-cyan-300 hover:text-cyan-200 text-xs"
                              >
                                {isExpanded ? 'Hide Details' : 'View →'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-white/5 border-b border-white/10">
                              <td colSpan={11} className="py-4 px-6">
                                {/* Booking Details */}
                                <div className="mb-6">
                                  <h4 className="text-sm font-semibold text-gray-300 mb-4">Booking Details</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">Stand</p>
                                      <p className="text-white">{booking.stand}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">Lock PIN</p>
                                      <p className="text-white font-mono">{booking.lockPin}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">Compartment</p>
                                      <p className="text-white">{booking.compartment || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">Duration</p>
                                      <p className="text-white">{booking.duration} day{booking.duration !== 1 ? 's' : ''}</p>
                                    </div>
                                    {booking.daysRemaining !== undefined && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Days Remaining</p>
                                        <p className="text-white font-semibold">{booking.daysRemaining} days</p>
                                      </div>
                                    )}
                                    {booking.returnedAt && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Return Date</p>
                                        <p className="text-white">{new Date(booking.returnedAt).toLocaleDateString()}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Customer Information */}
                                <div className="mb-6 pt-4 border-t border-white/10">
                                  <h4 className="text-sm font-semibold text-gray-300 mb-4">Customer Information</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    {booking.customerEmail && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Email</p>
                                        <p className="text-white">{booking.customerEmail}</p>
                                      </div>
                                    )}
                                    {booking.customerPhone && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Phone</p>
                                        <p className="text-white">{booking.customerPhone}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Information */}
                                {(booking.paymentDate || booking.paymentId || booking.chargeId) && (
                                  <div className="mb-6 pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-4">Payment Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      {booking.paymentDate && (
                                        <div>
                                          <p className="text-gray-400 text-xs mb-1">Payment Date</p>
                                          <p className="text-white">{new Date(booking.paymentDate).toLocaleDateString()}</p>
                                        </div>
                                      )}
                                      {booking.paymentId && (
                                        <div>
                                          <p className="text-gray-400 text-xs mb-1">Payment ID</p>
                                          <p className="text-white font-mono text-xs">{booking.paymentId.slice(0, 8)}...</p>
                                        </div>
                                      )}
                                      {booking.chargeId && (
                                        <div>
                                          <p className="text-gray-400 text-xs mb-1">Charge ID</p>
                                          <p className="text-white font-mono text-xs">{booking.chargeId}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Extension Information */}
                                {booking.extensionCount && booking.extensionCount > 0 && (
                                  <div className="mb-6 pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-4">
                                      Extension History ({booking.extensionCount} {booking.extensionCount === 1 ? 'extension' : 'extensions'})
                                    </h4>
                                    {booking.originalEndDate && (
                                      <div className="mb-3 text-sm">
                                        <p className="text-gray-400 text-xs mb-1">Original End Date</p>
                                        <p className="text-white">{booking.originalEndDate}</p>
                                      </div>
                                    )}
                                    {booking.extensions && booking.extensions.length > 0 && (
                                      <div className="space-y-3">
                                        {booking.extensions.map((ext, idx) => (
                                          <div key={ext.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs text-gray-400">Extension #{booking.extensions!.length - idx}</span>
                                              <span className="text-xs text-gray-400">{ext.createdAt}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">Previous End</p>
                                                <p className="text-white">{ext.previousEndDate}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">New End</p>
                                                <p className="text-white font-semibold">{ext.newEndDate}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">Additional Days</p>
                                                <p className="text-white">{ext.additionalDays} day{ext.additionalDays !== 1 ? 's' : ''}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">Additional Cost</p>
                                                <p className="text-green-400 font-semibold">SEK {ext.additionalCost.toFixed(2)}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">Previous PIN</p>
                                                <p className="text-white font-mono text-xs">{ext.previousLockPin}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs mb-1">New PIN</p>
                                                <p className="text-white font-mono text-xs">{ext.newLockPin}</p>
                                              </div>
                                              {ext.boxStatusAtExtension && (
                                                <div>
                                                  <p className="text-gray-400 text-xs mb-1">Box Status</p>
                                                  <p className="text-white">{ext.boxStatusAtExtension}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Box Return Information */}
                                {(booking.returnedAt || booking.boxReturnDate || booking.boxReturnStatus !== null || booking.boxFrontView || booking.boxBackView || booking.closedStandLock || (booking.reportedProblems && Array.isArray(booking.reportedProblems) && booking.reportedProblems.length > 0)) && (
                                  <div className="mb-6 pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-4">Box Return Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                      {booking.returnedAt && (
                                        <div>
                                          <p className="text-gray-400 text-xs mb-1">Returned At</p>
                                          <p className="text-white">{new Date(booking.returnedAt).toLocaleDateString()}</p>
                                        </div>
                                      )}
                                      {booking.boxReturnDate && (
                                        <div>
                                          <p className="text-gray-400 text-xs mb-1">Return Recorded</p>
                                          <p className="text-white">{new Date(booking.boxReturnDate).toLocaleDateString()}</p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-gray-400 text-xs mb-1">Box Condition</p>
                                        {booking.boxReturnStatus !== null ? (
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              booking.boxReturnStatus 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                              {booking.boxReturnStatus ? 'Good Condition' : 'Needs Attention'}
                                            </span>
                                            <select
                                              value={booking.boxReturnStatus ? 'good' : 'needs_attention'}
                                              onChange={async (e) => {
                                                const newStatus = e.target.value === 'good';
                                                try {
                                                  const authToken = localStorage.getItem('auth-token');
                                                  const response = await fetch(
                                                    `/api/distributor/bookings/${booking.bookingId}/update-return-condition`,
                                                    {
                                                      method: 'PATCH',
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                        ...(authToken && { Authorization: `Bearer ${authToken}` }),
                                                      },
                                                      body: JSON.stringify({ confirmedGoodStatus: newStatus }),
                                                    }
                                                  );
                                                  if (response.ok) {
                                                    refreshDashboardData(true);
                                                  }
                                                } catch (err) {
                                                  console.error('Error updating box condition:', err);
                                                }
                                              }}
                                              className="bg-gray-800 border border-white/30 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            >
                                              <option value="good">Good Condition</option>
                                              <option value="needs_attention">Needs Attention</option>
                                            </select>
                                          </div>
                                        ) : booking.boxReturnDate ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400 text-xs">Not Set</span>
                                            <select
                                              defaultValue=""
                                              onChange={async (e) => {
                                                if (!e.target.value) return;
                                                const newStatus = e.target.value === 'good';
                                                try {
                                                  const authToken = localStorage.getItem('auth-token');
                                                  const response = await fetch(
                                                    `/api/distributor/bookings/${booking.bookingId}/update-return-condition`,
                                                    {
                                                      method: 'PATCH',
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                        ...(authToken && { Authorization: `Bearer ${authToken}` }),
                                                      },
                                                      body: JSON.stringify({ confirmedGoodStatus: newStatus }),
                                                    }
                                                  );
                                                  if (response.ok) {
                                                    refreshDashboardData(true);
                                                  }
                                                } catch (err) {
                                                  console.error('Error updating box condition:', err);
                                                }
                                              }}
                                              className="bg-gray-800 border border-white/30 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            >
                                              <option value="">Set Condition...</option>
                                              <option value="good">Good Condition</option>
                                              <option value="needs_attention">Needs Attention</option>
                                            </select>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                    
                                    {/* Reported Problems */}
                                    {booking.reportedProblems && Array.isArray(booking.reportedProblems) && booking.reportedProblems.length > 0 && (
                                      <div className="mb-4">
                                        <p className="text-gray-400 text-xs mb-2 font-semibold">Reported Problems</p>
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                          <div className="flex flex-wrap gap-2">
                                            {booking.reportedProblems.map((problem: { type: string; description?: string }, index: number) => {
                                              const problemLabels: Record<string, string> = {
                                                'interior_lights': 'Interior lights',
                                                'exterior_lights': 'Exterior lights',
                                                'mounting_fixture': 'Mounting fixture',
                                                'lid_damage': 'Lid damage',
                                                'box_scratch': 'Box scratch',
                                                'box_dent_major_damage': 'Box dent / major damage',
                                                'defect_rubber_sealing': 'Defect rubber sealing',
                                                'stolen': 'Stolen',
                                                'other': 'Other…',
                                                // Legacy (pre-migration) labels for display
                                                'led_light': 'LED Light Issue',
                                                'hinge': 'Hinge Problem',
                                                'scratches': 'Scratches/Damage',
                                                'lock': 'Lock Issue',
                                              };
                                              
                                              const label = problemLabels[problem.type] || problem.type;
                                              
                                              return (
                                                <div
                                                  key={index}
                                                  className="bg-yellow-500/20 border border-yellow-400/40 rounded-md px-3 py-1.5 text-xs"
                                                >
                                                  <span className="text-yellow-200 font-medium">{label}</span>
                                                  {problem.description && (
                                                    <div className="text-yellow-300/80 text-xs mt-1">
                                                      {problem.description}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Return Photos */}
                                    {(booking.boxFrontView || booking.boxBackView || booking.closedStandLock) && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-3">Return Photos</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          {booking.boxFrontView && (
                                            <div>
                                              <p className="text-gray-400 text-xs mb-2">Box Front View</p>
                                              <a
                                                href={booking.boxFrontView}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                              >
                                                <img
                                                  src={booking.boxFrontView}
                                                  alt="Box Front View"
                                                  className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                                  onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    // If signed URL fails, show error placeholder
                                                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3Mzc0MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                                                    img.onerror = null; // Prevent infinite loop
                                                  }}
                                                />
                                              </a>
                                            </div>
                                          )}
                                          {booking.boxBackView && (
                                            <div>
                                              <p className="text-gray-400 text-xs mb-2">Box Back View</p>
                                              <a
                                                href={booking.boxBackView}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                              >
                                                <img
                                                  src={booking.boxBackView}
                                                  alt="Box Back View"
                                                  className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                                  onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    // If signed URL fails, show error placeholder
                                                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3Mzc0MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                                                    img.onerror = null; // Prevent infinite loop
                                                  }}
                                                />
                                              </a>
                                            </div>
                                          )}
                                          {booking.closedStandLock && (
                                            <div>
                                              <p className="text-gray-400 text-xs mb-2">Closed Stand Lock</p>
                                              <a
                                                href={booking.closedStandLock}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                              >
                                                <img
                                                  src={booking.closedStandLock}
                                                  alt="Closed Stand Lock"
                                                  className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                                  onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    // If signed URL fails, show error placeholder
                                                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3Mzc0MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                                                    img.onerror = null; // Prevent infinite loop
                                                  }}
                                                />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Footer with Summary */}
          {!loading && !error && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">{filteredStats.statusCounts.active} Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-300">{filteredStats.statusCounts.upcoming} Upcoming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-gray-300">{filteredStats.statusCounts.cancelled} Cancelled</span>
                  </div>
                  {filteredStats.statusCounts.overdue > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-300">{filteredStats.statusCounts.overdue} Overdue</span>
                    </div>
                  )}
                </div>
                <div className="text-cyan-300 font-semibold">
                  Total Revenue: {filteredStats.revenueSummary?.currency || currency}{' '}
                  {filteredStats.revenueSummary?.totalRevenue.toLocaleString() || '0'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Locations Overview - Main Focus */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <StandsOverview onSelectStand={() => {
          setActiveSection('statistics');
        }} />
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveSection('inventory')}
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm">Inventory</p>
                <p className="text-xs text-gray-400">Manage boxes</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('marketing')}
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm">Marketing</p>
                <p className="text-xs text-gray-400">View campaigns</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('contracts')}
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm">Contracts</p>
                <p className="text-xs text-gray-400">View agreements</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('upgrade')}
              className="flex items-center justify-center gap-3 bg-cyan-500/20 border border-cyan-400/40 rounded-lg p-4 hover:bg-cyan-500/30 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm">Upgrade / New Location</p>
                <p className="text-xs text-gray-400">Expand account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

