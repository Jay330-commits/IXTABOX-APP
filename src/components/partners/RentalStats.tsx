'use client';

import React, { useState } from 'react';

interface StandStats {
  standId: string;
  standName: string;
  totalBookings: number;
  occupancyRate: number;
  monthlyEarnings: number[];
  months: string[];
}

const mockStandsData: StandStats[] = [
  {
    standId: 'stand-001',
    standName: 'Downtown Location A',
    totalBookings: 142,
    occupancyRate: 78,
    monthlyEarnings: [3200, 3800, 4100, 4500, 5200, 4800, 5100, 5400, 4900, 5300, 5600, 5800],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  {
    standId: 'stand-002',
    standName: 'Airport Terminal B',
    totalBookings: 198,
    occupancyRate: 92,
    monthlyEarnings: [4100, 4300, 4600, 4900, 5100, 5300, 5500, 5700, 5400, 5600, 5900, 6200],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  {
    standId: 'stand-003',
    standName: 'Shopping Mall West',
    totalBookings: 87,
    occupancyRate: 65,
    monthlyEarnings: [2400, 2600, 2900, 3100, 3400, 3200, 3500, 3700, 3300, 3600, 3800, 4000],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
];

const timePeriods = ['Month', 'Quarter', 'Year'];

export default function RentalStats() {
  const [selectedStand, setSelectedStand] = useState<string>(mockStandsData[0].standId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Month');

  const currentStandData = mockStandsData.find((stand) => stand.standId === selectedStand);

  if (!currentStandData) return null;

  const maxEarning = Math.max(...currentStandData.monthlyEarnings);

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
          >
            {mockStandsData.map((stand) => (
              <option key={stand.standId} value={stand.standId} className="bg-gray-800">
                {stand.standName}
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
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Total Bookings</p>
          <p className="text-3xl font-bold text-cyan-300">{currentStandData.totalBookings}</p>
          <p className="text-xs text-green-400 mt-1">↑ 12% from last period</p>
        </div>

        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Occupancy Rate</p>
          <p className="text-3xl font-bold text-cyan-300">{currentStandData.occupancyRate}%</p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${currentStandData.occupancyRate}%` }}
            />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <p className="text-sm text-gray-400 mb-1">Total Earnings (YTD)</p>
          <p className="text-3xl font-bold text-cyan-300">
            {currentStandData.monthlyEarnings
              .reduce((sum, val) => sum + val, 0)
              .toLocaleString()} kr
          </p>
          <p className="text-xs text-green-400 mt-1">↑ 8% from last year</p>
        </div>
      </div>

      {/* Earnings Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Monthly Earnings Trend</h3>
        <div className="border border-white/10 rounded-lg p-6 bg-white/5">
          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between space-x-2 h-64">
            {currentStandData.monthlyEarnings.map((earning, index) => {
              const heightPercentage = (earning / maxEarning) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col justify-end h-56">
                    <div
                      className="bg-cyan-600/60 rounded-t hover:bg-cyan-500/80 transition-colors cursor-pointer relative group"
                      style={{ height: `${heightPercentage}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-950 border border-cyan-400/40 text-cyan-300 text-xs rounded py-1 px-2 whitespace-nowrap">
                          {earning.toLocaleString()} kr
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {currentStandData.months[index]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Y-axis labels */}
          <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-gray-400">
              <span className="font-semibold text-cyan-300">Min:</span> {Math.min(...currentStandData.monthlyEarnings).toLocaleString()} kr
            </div>
            <div className="text-xs text-gray-400">
              <span className="font-semibold text-cyan-300">Avg:</span> {Math.round(
                currentStandData.monthlyEarnings.reduce((sum, val) => sum + val, 0) /
                  currentStandData.monthlyEarnings.length
              ).toLocaleString()} kr
            </div>
            <div className="text-xs text-gray-400">
              <span className="font-semibold text-cyan-300">Max:</span> {Math.max(...currentStandData.monthlyEarnings).toLocaleString()} kr
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Avg Rental Duration</p>
          <p className="text-xl font-bold text-cyan-300">4.2 days</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Repeat Customers</p>
          <p className="text-xl font-bold text-cyan-300">68%</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Avg Rating</p>
          <p className="text-xl font-bold text-cyan-300">4.8 ⭐</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Revenue Growth</p>
          <p className="text-xl font-bold text-green-400">+15%</p>
        </div>
      </div>
    </div>
  );
}

