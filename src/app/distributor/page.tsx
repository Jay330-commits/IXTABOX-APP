'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/auth';
import Contracts from '@/components/distributors/Contracts';
import MarketingTools from '@/components/distributors/MarketingTools';
import RentalStats from '@/components/distributors/RentalStats';
import AccountUpgradeSection from '@/components/distributors/AccountUpgradeSection';
import StandsOverview from '@/components/distributors/StandsOverview';
import InventoryManagement from '@/components/distributors/InventoryManagement';
import DistributerHeader from '@/components/layouts/DistributerHeader';
import Footer from '@/components/layouts/Footer';

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

interface DashboardStats {
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
}

interface BookingInventoryItem {
  bookingId: string;
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

export default function DistributerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [boxInventory, setBoxInventory] = useState<BookingInventoryItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    scheduled: 0,
    available: 0,
    maintenance: 0,
  });
  const [currency, setCurrency] = useState<string>('SEK');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_INTERVAL = 60000; // Only sync once per minute max
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showAllTime, setShowAllTime] = useState<boolean>(false);

  // Protect route - check authentication and role FIRST
  useEffect(() => {
    // Wait for auth check to complete
    if (authLoading) {
      return; // Still loading, don't redirect yet
    }

    // If not authenticated, redirect to login immediately
    if (!user) {
      console.log('Distributor page: No user found, redirecting to login');
      router.replace('/auth/login');
      return;
    }

    // If user is not a Distributor, redirect to appropriate page
    if (user.role !== Role.DISTRIBUTOR) {
      console.log('Distributor page: User role mismatch, redirecting to appropriate page');
      if (user.role === Role.CUSTOMER) {
        router.replace('/customer');
      } else if (user.role === Role.ADMIN) {
        router.replace('/admin');
      } else {
        router.replace('/auth/login');
      }
      return;
    }

    // User is authenticated and has correct role
    setIsAuthenticated(true);
    console.log('Distributor page: User authenticated and has Distributor role - allowing access');
  }, [user, authLoading, router]);

  // Silent refresh function - updates data without showing loading state
  const refreshDashboardData = useCallback(async (silent: boolean = false) => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      if (!silent) {
        setIsRefreshing(true);
      }

      // Get auth token from localStorage
      const authToken = localStorage.getItem('auth-token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/distributor/dashboard/stats', { headers });
      if (statsResponse.status === 401) {
        router.replace('/auth/login');
        return;
      }
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setDashboardStats(statsData.data);
          if (statsData.data.currency) {
            setCurrency(statsData.data.currency);
          }
        }
      }

      // Build date filter query params
      let inventoryUrl = '/api/distributor/dashboard/inventory';
      if (showAllTime) {
        inventoryUrl += '?showAllTime=true';
      } else {
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const today = new Date();
        const endDate = endOfMonth > today ? today : endOfMonth;
        
        inventoryUrl += `?dateFrom=${startOfMonth.toISOString()}&dateTo=${endDate.toISOString()}`;
      }

      // Fetch box inventory
      const inventoryResponse = await fetch(inventoryUrl, { headers });
      if (inventoryResponse.status === 401) {
        router.replace('/auth/login');
        return;
      }
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.success) {
          // Update state smoothly without causing re-render glitches
          setBoxInventory(inventoryData.data.inventory || []);
          setStatusCounts(inventoryData.data.statusCounts || {
            active: 0,
            scheduled: 0,
            available: 0,
            maintenance: 0,
          });
          if (inventoryData.data.currency) {
            setCurrency(inventoryData.data.currency);
          }
        }
      }

      // Sync booking statuses (throttled to once per minute)
      const now = Date.now();
      if (now - lastSyncTimeRef.current > SYNC_INTERVAL) {
        lastSyncTimeRef.current = now;
        
        try {
          const syncResponse = await fetch('/api/distributor/bookings/sync-statuses', {
            method: 'POST',
            headers,
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            if (syncData.success && syncData.updated > 0) {
              // Statuses were updated, refresh inventory to get latest data
              const refreshInventoryUrl = showAllTime 
                ? '/api/distributor/dashboard/inventory?showAllTime=true'
                : (() => {
                    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
                    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
                    const today = new Date();
                    const endDate = endOfMonth > today ? today : endOfMonth;
                    return `/api/distributor/dashboard/inventory?dateFrom=${startOfMonth.toISOString()}&dateTo=${endDate.toISOString()}`;
                  })();
              const refreshInventoryResponse = await fetch(refreshInventoryUrl, { headers });
              if (refreshInventoryResponse.ok) {
                const refreshData = await refreshInventoryResponse.json();
                if (refreshData.success) {
                  setBoxInventory(refreshData.data.inventory || []);
                }
              }
            }
          }
        } catch (syncErr) {
          // Don't fail the whole refresh if sync fails
          console.warn('Error syncing booking statuses:', syncErr);
        }
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      // Only show error on initial load, not on silent refreshes
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to refresh data');
      }
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }, [isAuthenticated, user, router, selectedMonth, selectedYear, showAllTime]);

  // Fetch dashboard data ONLY if authenticated (initial load)
  useEffect(() => {
    // Don't fetch if not authenticated or still checking auth
    if (!isAuthenticated || authLoading || !user) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token from localStorage
        const authToken = localStorage.getItem('auth-token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Fetch dashboard stats
        const statsResponse = await fetch('/api/distributor/dashboard/stats', { headers });
        if (statsResponse.status === 401) {
          // Unauthorized - redirect immediately
          console.log('Distributor page: Unauthorized (401), redirecting to login');
          router.replace('/auth/login');
          return;
        }
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setDashboardStats(statsData.data);
          if (statsData.data.currency) {
            setCurrency(statsData.data.currency);
          }
        }

        // Build date filter query params
        let inventoryUrl = '/api/distributor/dashboard/inventory';
        if (showAllTime) {
          inventoryUrl += '?showAllTime=true';
        } else {
          const startOfMonth = new Date(selectedYear, selectedMonth, 1);
          const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
          const today = new Date();
          const endDate = endOfMonth > today ? today : endOfMonth;
          
          inventoryUrl += `?dateFrom=${startOfMonth.toISOString()}&dateTo=${endDate.toISOString()}`;
        }

        // Fetch box inventory
        const inventoryResponse = await fetch(inventoryUrl, { headers });
        if (inventoryResponse.status === 401) {
          // Unauthorized - redirect immediately
          console.log('Distributor page: Unauthorized (401), redirecting to login');
          router.replace('/auth/login');
          return;
        }
        if (!inventoryResponse.ok) {
          throw new Error('Failed to fetch inventory');
        }
        const inventoryData = await inventoryResponse.json();
        if (inventoryData.success) {
          setBoxInventory(inventoryData.data.inventory || []);
          setStatusCounts(inventoryData.data.statusCounts || {
            active: 0,
            scheduled: 0,
            available: 0,
            maintenance: 0,
          });
          if (inventoryData.data.currency) {
            setCurrency(inventoryData.data.currency);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        // If it's an auth error, redirect immediately
        if (err instanceof Error && err.message.includes('401')) {
          router.replace('/auth/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (activeSection === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeSection, isAuthenticated, authLoading, user, router, selectedMonth, selectedYear, showAllTime]);

  // Refetch inventory when date filters change
  useEffect(() => {
    if (!isAuthenticated || !user || activeSection !== 'dashboard') {
      return;
    }
    refreshDashboardData(true); // Silent refresh when filters change
  }, [selectedMonth, selectedYear, showAllTime, isAuthenticated, user, activeSection, refreshDashboardData]);

  // Periodic refresh of dashboard data (every 30 seconds)
  useEffect(() => {
    // Don't set up polling if not authenticated or not on dashboard
    if (!isAuthenticated || !user || activeSection !== 'dashboard') {
      return;
    }

    // Set up interval for periodic updates
    const refreshInterval = setInterval(() => {
      refreshDashboardData(true); // Silent refresh
    }, 30000); // Refresh every 30 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, user, activeSection, refreshDashboardData]);

  // Calculate stats cards from dashboard data
  const statsData: StatCard[] = dashboardStats
    ? [
        {
          title: 'Active Locations',
          value: dashboardStats.activeStands,
          change: 'Active locations',
          changeType: 'neutral',
          icon: 'stands',
        },
        {
          title: 'Total Rentals This Month',
          value: dashboardStats.totalRentalsThisMonth,
          change:
            dashboardStats.earningsOverview.growthPercentage > 0
              ? `+${dashboardStats.earningsOverview.growthPercentage.toFixed(1)}% from last month`
              : dashboardStats.earningsOverview.growthPercentage < 0
              ? `${dashboardStats.earningsOverview.growthPercentage.toFixed(1)}% from last month`
              : 'No change from last month',
          changeType:
            dashboardStats.earningsOverview.growthPercentage > 0
              ? 'positive'
              : dashboardStats.earningsOverview.growthPercentage < 0
              ? 'negative'
              : 'neutral',
          icon: 'rentals',
        },
        {
          title: 'Earnings Overview',
          value: `${currency} ${dashboardStats.earningsOverview.currentMonth.toLocaleString()}`,
          change:
            dashboardStats.earningsOverview.growthPercentage > 0
              ? `+${dashboardStats.earningsOverview.growthPercentage.toFixed(1)}% this month`
              : dashboardStats.earningsOverview.growthPercentage < 0
              ? `${dashboardStats.earningsOverview.growthPercentage.toFixed(1)}% this month`
              : 'No change',
          changeType:
            dashboardStats.earningsOverview.growthPercentage > 0
              ? 'positive'
              : dashboardStats.earningsOverview.growthPercentage < 0
              ? 'negative'
              : 'neutral',
          icon: 'earnings',
        },
        {
          title: 'Contract Status',
          value: dashboardStats.contractStatus.status,
          change:
            dashboardStats.contractStatus.daysRemaining > 0
              ? `${dashboardStats.contractStatus.daysRemaining} days remaining`
              : 'Expired',
          changeType: 'neutral',
          icon: 'contract',
        },
      ]
    : [];

  const renderSection = () => {
    switch (activeSection) {
      case 'upgrade':
        return <AccountUpgradeSection />;
      case 'inventory':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <InventoryManagement />
          </div>
        );
      case 'marketing':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <MarketingTools />
          </div>
        );
      case 'contracts':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <Contracts />
          </div>
        );
      case 'statistics':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div>
              <button
                onClick={() => setActiveSection('dashboard')}
                className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-300 mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold mb-2">Detailed Statistics</h1>
              <p className="text-gray-300">Deep dive into individual location performance</p>
            </div>
            <RentalStats />
          </div>
        );
      case 'dashboard':
      default:
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
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Booking ID</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Box ID</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Model</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Location</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Customer</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Start Date</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">End Date</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Booking Status</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Payment Status</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Amount ({currency})</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Returned At</th>
                          <th className="text-left py-4 px-3 text-gray-300 font-semibold bg-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boxInventory.map((booking) => {
                          const isExpanded = expandedRows.has(booking.bookingId);
                          
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

                          const toggleExpand = () => {
                            const newExpanded = new Set(expandedRows);
                            if (isExpanded) {
                              newExpanded.delete(booking.bookingId);
                            } else {
                              newExpanded.add(booking.bookingId);
                            }
                            setExpandedRows(newExpanded);
                          };

                          return (
                            <React.Fragment key={booking.bookingId}>
                              <tr
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="py-4 px-3">
                                  <span className="font-mono text-cyan-300 text-xs">#{booking.bookingId.slice(0, 8)}</span>
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
                                    onClick={toggleExpand}
                                    className="text-cyan-300 hover:text-cyan-200 text-xs"
                                  >
                                    {isExpanded ? 'Hide Details' : 'Track →'}
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
                                                        // Refresh the data
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
                                                        // Refresh the data
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
                                                      className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
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
                          <span className="text-gray-300">{statusCounts.scheduled} Scheduled</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-gray-300">{statusCounts.available} Available</span>
                        </div>
                        {statusCounts.maintenance > 0 && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            <span className="text-gray-300">{statusCounts.maintenance} Maintenance</span>
                          </div>
                        )}
                      </div>
                      <div className="text-cyan-300 font-semibold">
                        Total Revenue: {currency}{' '}
                        {boxInventory
                          .filter(booking => {
                            // Only count bookings with completed payments
                            // Payment date should be within the selected period
                            if (!booking.paymentDate) return false;
                            
                            const paymentDate = new Date(booking.paymentDate);
                            if (showAllTime) {
                              // For "All Time", count all completed payments
                              return booking.paymentStatus === 'Completed';
                            } else {
                              // For month filter, only count payments completed in that month
                              const startOfMonth = new Date(selectedYear, selectedMonth, 1);
                              const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
                              const today = new Date();
                              const endDate = endOfMonth > today ? today : endOfMonth;
                              
                              return paymentDate >= startOfMonth && 
                                     paymentDate <= endDate &&
                                     booking.paymentStatus === 'Completed';
                            }
                          })
                          .reduce((sum, booking) => sum + (booking.amount || 0), 0)
                          .toLocaleString()}
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
                // In a real app, you'd also set the selected location here
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
  };

  // Show loading state while checking authentication
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <DistributerHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main>
        {renderSection()}
      </main>

      <Footer />
    </div>
  );
}

