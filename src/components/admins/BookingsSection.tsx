'use client';

import React, { useState } from 'react';

type FilterStatus = 'all' | 'active' | 'upcoming' | 'completed' | 'cancelled';

const STATUS_TABS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function BookingsSection() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" aria-label="Bookings status">
        <ul className="flex flex-wrap gap-6">
          {STATUS_TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`pb-3 text-[13px] font-medium tracking-tight border-b-2 -mb-px transition-colors ${
                  statusFilter === tab.id ? 'border-amber-500 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-gray-500 mb-4">Export and bulk actions (prototype).</p>
          <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
            Booking table with display ID, customer, location, dates, status, amount — to be wired to admin bookings API.
          </div>
        </div>
      </div>
    </div>
  );
}
