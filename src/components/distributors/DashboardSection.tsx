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
          className="w-8 h-8"
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
          className="w-8 h-8"
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
          className="w-8 h-8"
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
          className="w-8 h-8"
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
              {statsData.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-cyan-300 w-8 h-8">{getIconSvg(stat.icon)}</div>
                    <div
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        stat.changeType === 'positive'
                          ? 'bg-green-500/20 text-green-400'
                          : stat.changeType === 'negative'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {stat.changeType === 'positive' && '↑'}
                      {stat.changeType === 'negative' && '↓'}
                    </div>
                  </div>

                  <h3 className="text-sm text-gray-400 mb-1">{stat.title}</h3>
                  <p className="text-2xl font-bold text-cyan-300 mb-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-400">{stat.change}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modern Real-time Box Inventory Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
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
          
          {/* Modern Excel-like Table */}
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
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">ID</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Box ID</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Model</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Location</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Customer</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Start</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">End</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Booking</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Payment</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Amount</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Return</th>
                      <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxInventory.map((booking) => {
                      const isExpanded = expandedRows.has(booking.bookingId);

                      return (
                        <React.Fragment key={booking.bookingId}>
                          <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-3">
                              <span className="font-mono text-cyan-300 text-xs">
                                #{booking.bookingDisplayId || booking.bookingId.slice(0, 8)}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="font-mono text-white">#{booking.boxId}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-white">{booking.boxType}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-white break-words" title={booking.location}>
                                {booking.location}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-white">{booking.customer}</span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-gray-300">
                                {new Date(booking.startDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-gray-300">
                                {new Date(booking.endDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getBookingStatusColor(
                                  booking.bookingStatus
                                )}`}
                              >
                                {booking.bookingStatus}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPaymentStatusColor(
                                  booking.paymentStatus
                                )}`}
                              >
                                {booking.paymentStatus}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="font-semibold text-green-400">
                                {booking.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-gray-300">
                                {booking.returnedAt ? new Date(booking.returnedAt).toLocaleDateString() : '-'}
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
                              <td colSpan={12} className="py-4 px-6">
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

                                {/* Box Return Information */}
                                {(booking.returnedAt || booking.boxReturnDate || booking.boxReturnStatus !== null || booking.boxFrontView || booking.boxBackView || booking.closedStandLock) && (
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
                                                  className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"/>
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
                    <span className="text-gray-300">{statusCounts.active} Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-300">{statusCounts.upcoming} Upcoming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-gray-300">{statusCounts.cancelled} Cancelled</span>
                  </div>
                  {statusCounts.overdue > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-300">{statusCounts.overdue} Overdue</span>
                    </div>
                  )}
                </div>
                <div className="text-cyan-300 font-semibold">
                  Total Revenue: {currency}{' '}
                  {revenueSummary?.totalRevenue.toLocaleString() || '0'}
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

