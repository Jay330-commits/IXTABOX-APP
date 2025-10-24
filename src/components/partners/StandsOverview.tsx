'use client';

import React from 'react';

interface Stand {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'maintenance' | 'inactive';
  todayBookings: number;
  monthlyRevenue: number;
  occupancyRate: number;
  totalBookings: number;
  averageRating: number;
}

const mockStands: Stand[] = [
  {
    id: 'stand-001',
    name: 'Downtown Location A',
    location: 'Stockholm Central Station',
    status: 'active',
    todayBookings: 8,
    monthlyRevenue: 5400,
    occupancyRate: 92,
    totalBookings: 142,
    averageRating: 4.8,
  },
  {
    id: 'stand-002',
    name: 'Airport Terminal B',
    location: 'Arlanda Airport, Terminal 5',
    status: 'active',
    todayBookings: 12,
    monthlyRevenue: 6200,
    occupancyRate: 95,
    totalBookings: 198,
    averageRating: 4.9,
  },
  {
    id: 'stand-003',
    name: 'Shopping Mall West',
    location: 'Gallerian Shopping Center',
    status: 'active',
    todayBookings: 5,
    monthlyRevenue: 4000,
    occupancyRate: 78,
    totalBookings: 87,
    averageRating: 4.6,
  },
];

interface StandsOverviewProps {
  onSelectStand?: (standId: string) => void;
}

export default function StandsOverview({ onSelectStand }: StandsOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-400/40';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/40';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
    }
  };

  const totalRevenue = mockStands.reduce((sum, stand) => sum + stand.monthlyRevenue, 0);
  const averageOccupancy = Math.round(
    mockStands.reduce((sum, stand) => sum + stand.occupancyRate, 0) / mockStands.length
  );
  const totalBookingsToday = mockStands.reduce((sum, stand) => sum + stand.todayBookings, 0);

  return (
    <div className="space-y-6">
      {/* Overview Summary */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">All Stands Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Stands</p>
            <p className="text-2xl font-bold text-cyan-300">{mockStands.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Today&apos;s Bookings</p>
            <p className="text-2xl font-bold text-cyan-300">{totalBookingsToday}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-cyan-300">${totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Avg Occupancy</p>
            <p className="text-2xl font-bold text-cyan-300">{averageOccupancy}%</p>
          </div>
        </div>
      </div>

      {/* Individual Stand Cards */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Your Stands</h2>
            <p className="text-sm text-gray-400 mt-1">Monitor each stand&apos;s performance individually</p>
          </div>
          <button className="px-4 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 rounded-md hover:bg-cyan-600/30 transition-colors text-sm font-medium">
            + Add New Stand
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mockStands.map((stand) => (
            <div
              key={stand.id}
              className="border border-white/10 rounded-lg p-5 bg-white/5 hover:border-cyan-400/40 transition-all cursor-pointer group"
              onClick={() => onSelectStand && onSelectStand(stand.id)}
            >
              {/* Stand Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-cyan-300 group-hover:text-cyan-200 transition-colors">
                    {stand.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{stand.location}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(
                    stand.status
                  )}`}
                >
                  {stand.status.charAt(0).toUpperCase() + stand.status.slice(1)}
                </span>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Today&apos;s Bookings</span>
                  <span className="text-lg font-bold text-cyan-300">{stand.todayBookings}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Monthly Revenue</span>
                  <span className="text-lg font-bold text-cyan-300">
                    ${stand.monthlyRevenue.toLocaleString()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">Occupancy Rate</span>
                    <span className="text-sm font-semibold text-cyan-300">{stand.occupancyRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${stand.occupancyRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Total Bookings:</span>
                  <span className="font-semibold text-gray-200">{stand.totalBookings}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-semibold text-gray-200">{stand.averageRating}</span>
                </div>
              </div>

              {/* View Details Button */}
              <button className="w-full mt-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm font-medium text-gray-300 hover:bg-white/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all">
                View Detailed Statistics →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Performance Comparison</h2>
        <div className="space-y-4">
          {/* Occupancy Rate Comparison */}
          <div>
            <p className="text-sm text-gray-400 mb-3">Occupancy Rate by Stand</p>
            <div className="space-y-3">
              {mockStands.map((stand) => (
                <div key={stand.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{stand.name}</span>
                    <span className="text-sm font-semibold text-cyan-300">{stand.occupancyRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-cyan-600/60 h-2 rounded-full transition-all"
                      style={{ width: `${stand.occupancyRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Comparison */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-3">Monthly Revenue by Stand</p>
            <div className="flex items-end justify-between gap-2 h-40">
              {mockStands.map((stand) => {
                const maxRevenue = Math.max(...mockStands.map(s => s.monthlyRevenue));
                const heightPercentage = (stand.monthlyRevenue / maxRevenue) * 100;
                return (
                  <div key={stand.id} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col justify-end h-32 relative group">
                      <div
                        className="bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t hover:from-cyan-500 hover:to-cyan-300 transition-colors cursor-pointer"
                        style={{ height: `${heightPercentage}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-950 border border-cyan-400/40 text-cyan-300 text-xs rounded py-1 px-2 whitespace-nowrap">
                            ${stand.monthlyRevenue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">{stand.name.split(' ')[0]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

