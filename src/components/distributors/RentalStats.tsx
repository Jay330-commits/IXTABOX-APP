'use client';

import React, { useState, useEffect } from 'react';

interface Stand {
  id: string;
  name: string;
  locationName?: string;
}

interface StandStats {
  standId: string;
  standName: string;
  totalBookings: number;
  occupancyRate: number;
  monthlyEarnings: number[];
  months: string[];
}

interface StandMetrics {
  totalBookings: number;
  occupancyRate: number;
  totalEarnings: number;
  averageRentalDuration: number;
  repeatCustomerRate: number;
  averageRating: number;
  revenueGrowth: number;
}

const timePeriods = ['Month', 'Quarter', 'Year'] as const;
type TimePeriod = typeof timePeriods[number];

export default function RentalStats() {
  const [stands, setStands] = useState<Stand[]>([]);
  const [selectedStand, setSelectedStand] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Month');
  const [standStats, setStandStats] = useState<StandStats | null>(null);
  const [standMetrics, setStandMetrics] = useState<StandMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stands list
  useEffect(() => {
    const fetchStands = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const authToken = localStorage.getItem('auth-token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/distributor/stands', { headers });
        
        if (response.status === 401) {
          setError('Unauthorized');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch stands');
        }

        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setStands(data.data);
          setSelectedStand(data.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching stands:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stands');
      } finally {
        setLoading(false);
      }
    };

    fetchStands();
  }, []);

  // Fetch statistics when stand or period changes
  useEffect(() => {
    if (!selectedStand) return;

    const fetchStatistics = async () => {
      try {
        setLoadingStats(true);
        setError(null);
        
        const authToken = localStorage.getItem('auth-token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const periodParam = selectedPeriod.toLowerCase() as 'month' | 'quarter' | 'year';

        // Fetch statistics
        const statsResponse = await fetch(
          `/api/distributor/statistics?standId=${selectedStand}&period=${periodParam}`,
          { headers }
        );
        
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch statistics');
        }

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStandStats(statsData.data);
        }

        // Fetch metrics
        const metricsResponse = await fetch(
          `/api/distributor/statistics?standId=${selectedStand}&type=metrics`,
          { headers }
        );
        
        if (!metricsResponse.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const metricsData = await metricsResponse.json();
        if (metricsData.success) {
          setStandMetrics(metricsData.data);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStatistics();
  }, [selectedStand, selectedPeriod]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
            <p className="text-gray-400">Loading stands...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !standStats) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-12 text-red-400">
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (stands.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-12 text-gray-400">
          <p>No stands found. Add stands to view statistics.</p>
        </div>
      </div>
    );
  }

  if (!standStats) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
            <p className="text-gray-400">Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  const maxEarning = standStats.monthlyEarnings.length > 0 
    ? Math.max(...standStats.monthlyEarnings) 
    : 1;

  const selectedStandName = stands.find(s => s.id === selectedStand)?.name || standStats.standName;
  const totalEarnings = standStats.monthlyEarnings.reduce((sum, val) => sum + val, 0);
  const previousPeriodEarnings = standStats.monthlyEarnings.length > 1 
    ? standStats.monthlyEarnings[standStats.monthlyEarnings.length - 2] 
    : 0;
  const earningsGrowth = previousPeriodEarnings > 0 
    ? Math.round(((standStats.monthlyEarnings[standStats.monthlyEarnings.length - 1] - previousPeriodEarnings) / previousPeriodEarnings) * 100)
    : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Rental Statistics</h2>
        <p className="text-gray-300">Track performance and earnings across your stands.</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Stand
          </label>
          <select
            value={selectedStand}
            onChange={(e) => setSelectedStand(e.target.value)}
            className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            disabled={loadingStats}
          >
            {stands.map((stand) => (
              <option key={stand.id} value={stand.id} className="bg-gray-800">
                {stand.name} {stand.locationName ? `(${stand.locationName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Time Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
            className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            disabled={loadingStats}
          >
            {timePeriods.map((period) => (
              <option key={period} value={period} className="bg-gray-800">
                {period}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      {loadingStats && (
        <div className="mb-8 text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500"></div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Total Bookings</p>
          <p className="text-3xl font-bold text-cyan-300">{standStats.totalBookings}</p>
          {standMetrics && (
            <p className="text-xs text-gray-500 mt-1">Current period</p>
          )}
        </div>

        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Occupancy Rate</p>
          <p className="text-3xl font-bold text-cyan-300">{standStats.occupancyRate}%</p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${standStats.occupancyRate}%` }}
            />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">
            Total Earnings {selectedPeriod === 'Year' ? '(YTD)' : `(${selectedPeriod})`}
          </p>
          <p className="text-3xl font-bold text-cyan-300">
            ${totalEarnings.toLocaleString()}
          </p>
          {earningsGrowth !== 0 && (
            <p className={`text-xs mt-1 ${earningsGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {earningsGrowth > 0 ? '↑' : '↓'} {Math.abs(earningsGrowth)}% from previous {selectedPeriod.toLowerCase()}
            </p>
          )}
        </div>
      </div>

      {/* Earnings Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Monthly Earnings Trend</h3>
        <div className="border border-white/10 rounded-lg p-6 bg-white/5">
          {/* Simple Bar Chart */}
          {standStats.monthlyEarnings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No earnings data available for this period</p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between space-x-2 h-64">
                {standStats.monthlyEarnings.map((earning, index) => {
                  const heightPercentage = maxEarning > 0 ? (earning / maxEarning) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col justify-end h-56">
                        <div
                          className="bg-cyan-600/60 rounded-t hover:bg-cyan-500/80 transition-colors cursor-pointer relative group"
                          style={{ height: `${heightPercentage}%`, minHeight: earning > 0 ? '2px' : '0' }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-950 border border-cyan-400/40 text-cyan-300 text-xs rounded py-1 px-2 whitespace-nowrap">
                              ${earning.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {standStats.months[index]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Y-axis labels */}
              <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-gray-400">
                  <span className="font-semibold text-cyan-300">Min:</span> $
                  {Math.min(...standStats.monthlyEarnings).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  <span className="font-semibold text-cyan-300">Avg:</span> $
                  {Math.round(totalEarnings / standStats.monthlyEarnings.length).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  <span className="font-semibold text-cyan-300">Max:</span> $
                  {Math.max(...standStats.monthlyEarnings).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {standMetrics && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Rental Duration</p>
            <p className="text-xl font-bold text-cyan-300">{standMetrics.averageRentalDuration.toFixed(1)} days</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Repeat Customers</p>
            <p className="text-xl font-bold text-cyan-300">{standMetrics.repeatCustomerRate}%</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Rating</p>
            <p className="text-xl font-bold text-cyan-300">
              {standMetrics.averageRating > 0 ? `${standMetrics.averageRating.toFixed(1)} ⭐` : 'N/A'}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Revenue Growth</p>
            <p className={`text-xl font-bold ${standMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {standMetrics.revenueGrowth >= 0 ? '+' : ''}{standMetrics.revenueGrowth}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

