'use client';

import React from 'react';

interface DashboardSectionProps {
  setActiveSection?: (section: string) => void;
}

const OVERVIEW_CARDS = [
  { label: 'Total users', value: '—', sub: 'Customers, distributors, admins', section: 'users' },
  { label: 'Active bookings', value: '—', sub: 'Across all locations', section: 'bookings' },
  { label: 'Locations', value: '—', sub: 'Stands & boxes', section: 'locations' },
  { label: 'Revenue (MTD)', value: '—', sub: 'Payments & refunds', section: 'payments' },
  { label: 'System health', value: 'OK', sub: 'API & services', section: 'system' },
];

export default function DashboardSection({ setActiveSection }: DashboardSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {OVERVIEW_CARDS.map((card) => (
          <button
            key={card.label}
            onClick={() => setActiveSection?.(card.section)}
            className="rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:bg-amber-500/10 hover:border-amber-500/20 transition-all group"
          >
            <p className="text-xs uppercase tracking-wider text-amber-300/90">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{card.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-amber-200">Recent activity</h2>
        <p className="mt-2 text-sm text-gray-400">Activity feed and audit events will appear here (prototype).</p>
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-white/10 py-8 text-gray-500 text-sm">
          No recent activity — connect backend to load data.
        </div>
      </div>
    </div>
  );
}
