'use client';

import React from 'react';

export interface Booking {
  id: string;
  bookingDisplayId?: string | null;
  location: string;
  locationAddress?: string | null;
  date: string;
  status: string;
  amount: number;
  startDate?: string;
  endDate?: string;
  boxId?: string;
  boxDisplayId?: string;
  standId?: string;
  standDisplayId?: string;
  locationId?: string;
  locationDisplayId?: string | null;
  lockPin?: string | null;
  paymentId?: string;
  paymentStatus?: string | null;
  chargeId?: string | null;
  createdAt?: string;
  returnedAt?: string | null;
  model?: string;
  pricePerDay?: number;
  deposit?: number;
  boxFrontView?: string | null;
  boxBackView?: string | null;
  closedStandLock?: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface UserStats {
  totalBookings: number;
  upcomingBookings: number;
  loyaltyPoints: number;
  memberSince: string;
  membershipTier: string;
  totalRewards: number;
}

interface DashboardSectionProps {
  userStats: UserStats;
  bookings: Booking[];
  notifications: Notification[];
  isLoadingData: boolean;
  statsExpanded: boolean;
  setStatsExpanded: (expanded: boolean) => void;
  setActiveSection: (section: string) => void;
}

export default function DashboardSection({
  userStats,
  bookings,
  notifications,
  isLoadingData,
  statsExpanded,
  setStatsExpanded,
  setActiveSection,
}: DashboardSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      {/* Stats Grid - Desktop */}
      <div className="hidden lg:block mb-8">
        <div className="grid grid-cols-4 gap-6">
          {/* Total Bookings */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-cyan-300">{userStats.totalBookings}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              +1 this year
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-300">{userStats.upcomingBookings}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {bookings.find(b => {
                const status = b.status.toLowerCase();
                const startDate = b.startDate ? new Date(b.startDate) : null;
                return (status === 'confirmed' || status === 'upcoming') && startDate && startDate >= new Date();
              })?.location || 'No upcoming bookings'}
            </div>
          </div>

          {/* Loyalty Points */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Loyalty Points</p>
                <p className="text-2xl font-bold text-cyan-300">{userStats.loyaltyPoints}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-cyan-300">$</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-cyan-400">
              <div className="w-full bg-gray-700 rounded-full h-2 mr-1">
                <div className="bg-cyan-500 h-2 rounded-full" style={{width: '65%'}}></div>
              </div>
              65%
            </div>
          </div>

          {/* Membership */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Membership</p>
                <p className="text-xl font-bold text-yellow-300">{userStats.membershipTier}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Since {userStats.memberSince}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats Bar - Under Header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-[9999] bg-gray-900/95 backdrop-blur-md border-b border-white/10">
        {/* Toggle Arrow Button */}
        <button
          onClick={() => setStatsExpanded(!statsExpanded)}
          className="w-full flex justify-center py-1.5 bg-gradient-to-b from-gray-900/95 to-transparent backdrop-blur-sm"
        >
          <div className={`transition-transform duration-300 ${statsExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Stats Cards Container */}
        <div className={`bg-gray-900/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
          statsExpanded ? 'max-h-24 opacity-100 pb-2' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-4 py-2 flex gap-4 justify-center items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Total Bookings */}
            <button className="relative flex-shrink-0">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              {userStats.totalBookings > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-gray-900">
                  {userStats.totalBookings > 99 ? '99+' : userStats.totalBookings}
                </span>
              )}
              <p className="text-[9px] text-gray-400 mt-1 text-center">Total</p>
            </button>

            {/* Upcoming */}
            <button className="relative flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">⏰</span>
              </div>
              {userStats.upcomingBookings > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-gray-900">
                  {userStats.upcomingBookings > 99 ? '99+' : userStats.upcomingBookings}
                </span>
              )}
              <p className="text-[9px] text-gray-400 mt-1 text-center">Upcoming</p>
            </button>

            {/* Loyalty Points */}
            <button className="relative flex-shrink-0">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <span className="text-base font-bold text-cyan-300">$</span>
              </div>
              {userStats.loyaltyPoints > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-gray-900">
                  {userStats.loyaltyPoints > 99 ? '99+' : userStats.loyaltyPoints}
                </span>
              )}
              <p className="text-[9px] text-gray-400 mt-1 text-center">Points</p>
            </button>

            {/* Membership */}
            <button className="relative flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-xl">👑</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1 text-center">Member</p>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Bookings</h2>
              <button
                onClick={() => setActiveSection("bookings")}
                className="text-cyan-300 hover:text-cyan-200 text-sm font-medium"
              >
                View All →
              </button>
            </div>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No bookings found. Book your first box to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 3).map((booking) => {
                  const statusLower = booking.status.toLowerCase();
                  const statusColor = 
                    statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
                    statusLower === 'upcoming' ? 'yellow' :
                    statusLower === 'cancelled' ? 'red' :
                    'gray';
                  
                  return (
                    <div 
                      key={booking.id} 
                      onClick={() => setActiveSection("bookings")}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          statusColor === 'green' ? 'bg-green-400' :
                          statusColor === 'yellow' ? 'bg-yellow-400' :
                          statusColor === 'red' ? 'bg-red-400' :
                          'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium">{booking.location}</div>
                          <div className="text-sm text-gray-400">{booking.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">SEK {booking.amount.toFixed(2)}</div>
                        <div className={`text-xs ${
                          statusColor === 'green' ? 'text-green-400' :
                          statusColor === 'yellow' ? 'text-yellow-400' :
                          statusColor === 'red' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Recent Notifications */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Notifications</h2>
              <button
                onClick={() => setActiveSection("notifications")}
                className="text-cyan-300 hover:text-cyan-200 text-sm font-medium"
              >
                View All →
              </button>
            </div>
            {isLoadingData ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No notifications
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg ${
                    notification.read ? 'bg-white/5' : 'bg-cyan-500/10 border border-cyan-400/20'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-gray-400 mt-1 truncate">{notification.message}</div>
                        <div className="text-xs text-gray-500 mt-1">{notification.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Rewards Progress */}
      <div className="mt-8">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Next Reward Unlock</h3>
              <p className="text-gray-300">Free upgrade to Pro model</p>
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-400">
                  <span className="font-semibold text-cyan-300">{userStats.loyaltyPoints}</span>
                  <span className="mx-1">/</span>
                  <span>3000 points</span>
                </div>
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" 
                    style={{width: `${Math.min(100, (userStats.loyaltyPoints / 3000) * 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveSection("rewards")}
              className="px-6 py-3 bg-cyan-600/20 text-cyan-300 rounded-lg border border-cyan-400/40 hover:bg-cyan-600/30 transition-colors"
            >
              View Rewards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

