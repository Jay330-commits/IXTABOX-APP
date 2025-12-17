'use client';

import React, { useState, useEffect } from 'react';

interface LocationComparison {
  locationId: string;
  locationName: string;
  occupancyRate: number;
  monthlyRevenue: number;
  totalBookings: number;
  averageRating: number;
  totalStands: number;
}

type Metric = 'occupancy' | 'revenue' | 'bookings' | 'rating';

export default function PerformanceComparison() {
  const [comparisons, setComparisons] = useState<LocationComparison[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<Metric>('occupancy');
  const [currency, setCurrency] = useState<string>('SEK');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparisons = async () => {
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

        const response = await fetch(
          `/api/distributor/stands?type=comparison&metric=${selectedMetric}`,
          { headers }
        );

        if (response.status === 401) {
          setError('Unauthorized');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch performance comparison');
        }

        const data = await response.json();
        if (data.success) {
          setComparisons(data.data || []);
        }

        // Try to get currency from dashboard stands endpoint
        const standsResponse = await fetch('/api/distributor/dashboard/stands', { headers });
        if (standsResponse.ok) {
          const standsData = await standsResponse.json();
          if (standsData.success && standsData.data.currency) {
            setCurrency(standsData.data.currency);
          }
        }
      } catch (err) {
        console.error('Error fetching performance comparison:', err);
        setError(err instanceof Error ? err.message : 'Failed to load performance comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisons();
  }, [selectedMetric]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
            <p className="text-gray-400">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-12 text-red-400">
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-center py-12 text-gray-400">
          <p>No location data available for comparison</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...comparisons.map((loc) => {
      switch (selectedMetric) {
        case 'occupancy':
          return loc.occupancyRate;
        case 'revenue':
          return loc.monthlyRevenue;
        case 'bookings':
          return loc.totalBookings;
        case 'rating':
          return loc.averageRating;
        default:
          return 0;
      }
    })
  );

  const getMetricValue = (location: LocationComparison) => {
    switch (selectedMetric) {
      case 'occupancy':
        return location.occupancyRate;
      case 'revenue':
        return location.monthlyRevenue;
      case 'bookings':
        return location.totalBookings;
      case 'rating':
        return location.averageRating;
      default:
        return 0;
    }
  };

  const formatMetricValue = (value: number) => {
    switch (selectedMetric) {
      case 'occupancy':
        return `${value}%`;
      case 'revenue':
        return `${currency} ${value.toLocaleString()}`;
      case 'bookings':
        return value.toString();
      case 'rating':
        return value > 0 ? value.toFixed(1) : 'N/A';
      default:
        return value.toString();
    }
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'occupancy':
        return 'Occupancy Rate';
      case 'revenue':
        return 'Monthly Revenue';
      case 'bookings':
        return 'Total Bookings';
      case 'rating':
        return 'Average Rating';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Performance Comparison</h2>
            <p className="text-sm text-gray-400">Compare locations by different metrics</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Compare By
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as Metric)}
              className="border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            >
              <option value="occupancy" className="bg-gray-800">Occupancy Rate</option>
              <option value="revenue" className="bg-gray-800">Monthly Revenue</option>
              <option value="bookings" className="bg-gray-800">Total Bookings</option>
              <option value="rating" className="bg-gray-800">Average Rating</option>
            </select>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="space-y-4">
          {comparisons.map((location) => {
            const value = getMetricValue(location);
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={location.locationId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{location.locationName}</span>
                    <span className="text-xs text-gray-400">
                      {location.totalStands} stand{location.totalStands !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-cyan-300">{formatMetricValue(value)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Detailed Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Location</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Stands</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Occupancy</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Revenue</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Bookings</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((location) => (
                <tr
                  key={location.locationId}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-white">{location.locationName}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">{location.totalStands}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-cyan-300 font-semibold">{location.occupancyRate}%</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-cyan-300 font-semibold">
                      {currency} {location.monthlyRevenue.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">{location.totalBookings}</td>
                  <td className="py-3 px-4 text-right">
                    {location.averageRating > 0 ? (
                      <span className="text-yellow-400 font-semibold">
                        {location.averageRating.toFixed(1)} ⭐
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">{getMetricLabel()} by Location</h2>
        <div className="flex items-end justify-between gap-3 h-64">
          {comparisons.map((location) => {
            const value = getMetricValue(location);
            const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={location.locationId} className="flex-1 flex flex-col items-center group">
                <div className="w-full flex flex-col justify-end h-56 relative">
                  <div
                    className="bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t hover:from-cyan-500 hover:to-cyan-300 transition-colors cursor-pointer relative"
                    style={{ height: `${heightPercentage}%`, minHeight: value > 0 ? '4px' : '0' }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-950 border border-cyan-400/40 text-cyan-300 text-xs rounded py-1 px-2 whitespace-nowrap">
                        {formatMetricValue(value)}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center line-clamp-2">
                  {location.locationName}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

