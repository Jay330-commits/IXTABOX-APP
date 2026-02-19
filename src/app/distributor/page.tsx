'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/auth';
import Contracts from '@/components/distributors/Contracts';
import MarketingTools from '@/components/distributors/MarketingTools';
import PerformanceComparison from '@/components/distributors/PerformanceComparison';
import AccountUpgradeSection from '@/components/distributors/AccountUpgradeSection';
import Inventory from '@/components/distributors/Inventory';
import DashboardSection from '@/components/distributors/DashboardSection';
import DistributerHeader from '@/components/layouts/DistributerHeader';
import DistributorProfileSection from '@/components/distributors/ProfileSection';
import SettingsSection from '@/components/customers/SettingsSection';
import AdminSection from '@/components/distributors/AdminSection';

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

export default function DistributerDashboard() {
  const { user, loading: authLoading, token } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [boxInventory, setBoxInventory] = useState<BookingInventoryItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    upcoming: 0,
    cancelled: 0,
    overdue: 0,
  });
  const [revenueSummary, setRevenueSummary] = useState<{ totalRevenue: number; currency: string } | null>(null);
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
  
  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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

      // Get auth token from context (consistent with test page approach)
      const authToken = token || localStorage.getItem('auth-token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        // If no token available, redirect to login
        router.replace('/auth/login');
        return;
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
            setCurrency(statsData.data.currency || 'SEK');
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
            upcoming: 0,
            cancelled: 0,
            overdue: 0,
          });
          if (inventoryData.data.currency) {
            setCurrency(inventoryData.data.currency || 'SEK');
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
            setCurrency(statsData.data.currency || 'SEK');
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
            upcoming: 0,
            cancelled: 0,
            overdue: 0,
          });
          if (inventoryData.data.revenueSummary) {
            setRevenueSummary(inventoryData.data.revenueSummary);
            setCurrency(inventoryData.data.revenueSummary.currency || 'SEK');
          } else if (inventoryData.data.currency) {
            setCurrency(inventoryData.data.currency || 'SEK');
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
        return <Inventory />;
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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <PerformanceComparison />
          </div>
        );
      case 'profile':
        return (
          <DistributorProfileSection
            user={user ? {
              fullName: user.fullName || null,
              email: user.email || null,
              phone: user.phone || null,
              role: user.role || 'Distributor',
            } : null}
            dashboardStats={dashboardStats}
            currency={currency}
          />
        );
      case 'settings':
        return (
          <SettingsSection
            emailNotifications={emailNotifications}
            setEmailNotifications={setEmailNotifications}
            smsNotifications={smsNotifications}
            setSmsNotifications={setSmsNotifications}
            pushNotifications={pushNotifications}
            setPushNotifications={setPushNotifications}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      case 'admin':
        return <AdminSection />;
      case 'dashboard':
      default:
        return (
          <DashboardSection
            statsData={statsData}
            loading={loading}
            error={error}
            boxInventory={boxInventory}
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
            statusCounts={statusCounts}
            revenueSummary={revenueSummary}
            currency={currency}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            showAllTime={showAllTime}
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
            setShowAllTime={setShowAllTime}
            isRefreshing={isRefreshing}
            refreshDashboardData={refreshDashboardData}
            setActiveSection={setActiveSection}
          />
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
    </div>
  );
}

