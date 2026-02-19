'use client';

import React, { useState, useEffect } from 'react';

interface Location {
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
}

interface LocationsOverviewData {
  totalLocations: number;
  todayBookings: number;
  monthlyRevenue: number;
  averageOccupancy: number;
  currency?: string;
  locations: Location[];
}

interface StandsOverviewProps {
  onSelectStand?: (locationId: string) => void;
}

export default function StandsOverview({ onSelectStand }: StandsOverviewProps) {
  const [locationsData, setLocationsData] = useState<LocationsOverviewData | null>(null);
  const [currency, setCurrency] = useState<string>('SEK');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandsData = async () => {
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

        const response = await fetch('/api/distributor/dashboard/stands', { headers });
        
        if (response.status === 401) {
          setError('Unauthorized');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch stands data');
        }

        const data = await response.json();
        if (data.success) {
          setLocationsData(data.data);
          if (data.data.currency) {
            setCurrency(data.data.currency || 'SEK');
          }
        } else {
          throw new Error(data.error || 'Failed to fetch locations data');
        }
      } catch (err) {
        console.error('Error fetching locations data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load locations data');
      } finally {
        setLoading(false);
      }
    };

    fetchStandsData();
  }, []);

  const locations = locationsData?.locations || [];
  const getStatusColor = (status: string) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized === 'active' || normalized === 'available') {
        return 'bg-green-500/20 text-green-400 border-green-400/40';
    } else if (normalized === 'maintenance' || normalized === 'occupied') {
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/40';
    } else if (normalized === 'inactive') {
        return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
    }
    return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
  };

  const totalRevenue = locationsData?.monthlyRevenue || 0;
  const averageOccupancy = locationsData?.averageOccupancy || 0;
  const totalBookingsToday = locationsData?.todayBookings || 0;

  return (
    <div className="space-y-6">
      {/* Overview Summary */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">All Locations Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Locations</p>
            <p className="text-2xl font-bold text-cyan-300">{locationsData?.totalLocations || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Today&apos;s Bookings</p>
            <p className="text-2xl font-bold text-cyan-300">{totalBookingsToday}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-cyan-300">{currency} {totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Avg Occupancy</p>
            <p className="text-2xl font-bold text-cyan-300">{averageOccupancy}%</p>
          </div>
        </div>
      </div>

      {/* Individual Location Cards */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Your Locations</h2>
            <p className="text-sm text-gray-400 mt-1">Monitor each location&apos;s performance individually</p>
          </div>
          <button className="px-4 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 rounded-md hover:bg-cyan-600/30 transition-colors text-sm font-medium">
            + Add New Location
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500"></div>
            <p className="mt-4 text-gray-400">Loading locations...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-400">Error: {error}</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400">No locations found</p>
          </div>
        ) : (
        <div className="flex lg:grid lg:grid-cols-3 overflow-x-auto lg:overflow-x-visible gap-3 lg:gap-6 pb-4">
            {locations.map((location) => (
            <div
              key={location.id}
              className="border border-white/10 rounded-lg p-3 lg:p-5 bg-white/5 hover:border-cyan-400/40 transition-all cursor-pointer group flex-shrink-0 w-72 lg:w-auto lg:flex-shrink"
              onClick={() => onSelectStand && onSelectStand(location.id)}
            >
              {/* Location Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm lg:text-lg text-cyan-300 group-hover:text-cyan-200 transition-colors">
                    {location.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{location.address || 'No address'}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(
                    location.status
                  )}`}
                >
                  {location.status.charAt(0).toUpperCase() + location.status.slice(1)}
                </span>
              </div>

              {/* Key Metrics */}
              <div className="space-y-2 lg:space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-400">Today&apos;s Bookings</span>
                  <span className="text-sm lg:text-lg font-bold text-cyan-300">{location.todayBookings}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs lg:text-sm text-gray-400">Monthly Revenue</span>
                  <span className="text-sm lg:text-lg font-bold text-cyan-300">
                    {currency} {location.monthlyRevenue.toLocaleString()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs lg:text-sm text-gray-400">Occupancy Rate</span>
                    <span className="text-xs lg:text-sm font-semibold text-cyan-300">{location.occupancyRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 lg:h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 lg:h-2 rounded-full transition-all"
                      style={{ width: `${location.occupancyRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="pt-3 lg:pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Stands:</span>
                  <span className="font-semibold text-gray-200">{location.totalStands}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Boxes:</span>
                  <span className="font-semibold text-gray-200">{location.totalBoxes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-semibold text-gray-200">{location.averageRating}</span>
                </div>
              </div>

              {/* View Details Button */}
              <button className="w-full mt-3 lg:mt-4 py-1.5 lg:py-2 bg-white/5 border border-white/10 rounded-md text-xs lg:text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all">
                View Details →
              </button>
            </div>
          ))}
        </div>
        )}
      </div>

    </div>
  );
}

