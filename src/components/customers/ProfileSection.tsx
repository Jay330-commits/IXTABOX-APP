'use client';

import React from 'react';
import type { UserStats } from './DashboardSection';

interface ProfileSectionProps {
  user: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  } | null;
  userStats: UserStats;
}

export default function ProfileSection({
  user,
  userStats,
}: ProfileSectionProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 lg:pb-12">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{user?.fullName || 'User'}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">Member since {userStats.memberSince}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
              {user?.fullName || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
              {user?.email || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
              {user?.phone || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Account Type</label>
            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200 capitalize">
              {user?.role || 'Customer'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Account Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-cyan-300">{userStats.totalBookings}</div>
            <div className="text-sm text-gray-400 mt-1">Total Bookings</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-yellow-300">{userStats.upcomingBookings}</div>
            <div className="text-sm text-gray-400 mt-1">Upcoming</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-purple-300">{userStats.loyaltyPoints}</div>
            <div className="text-sm text-gray-400 mt-1">Loyalty Points</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-green-300">{userStats.totalRewards}</div>
            <div className="text-sm text-gray-400 mt-1">Rewards</div>
          </div>
        </div>
      </div>
    </div>
  );
}

