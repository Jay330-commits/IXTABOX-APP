'use client';

import React from 'react';
import type { Notification } from './DashboardSection';

interface NotificationsSectionProps {
  notifications: Notification[];
  isLoadingData: boolean;
  dataError: string | null;
}

export default function NotificationsSection({
  notifications,
  isLoadingData,
  dataError,
}: NotificationsSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:pb-12">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      ) : dataError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
          {dataError}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-6 rounded-xl border ${
                notification.read ? 'bg-white/5 border-white/10' : 'bg-cyan-500/10 border-cyan-400/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{notification.title}</div>
                  <div className="text-gray-400 mt-2">{notification.message}</div>
                </div>
                {!notification.read && (
                  <div className="w-3 h-3 bg-cyan-400 rounded-full ml-4 mt-1"></div>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-3">{notification.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

