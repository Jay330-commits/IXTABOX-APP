'use client';

import React, { useState } from 'react';

type AuditFilter = 'all' | 'logins' | 'bookings' | 'payments' | 'admin';

const FILTERS: { id: AuditFilter; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'logins', label: 'Logins' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'admin', label: 'Admin actions' },
];

export default function AuditSection() {
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [dateRange, setDateRange] = useState('today');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" aria-label="Audit event type">
        <ul className="flex flex-wrap gap-6">
          {FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setFilter(f.id)}
                className={`pb-3 text-[13px] font-medium tracking-tight border-b-2 -mb-px transition-colors ${
                  filter === f.id ? 'border-amber-500 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <label className="text-xs uppercase tracking-wider text-gray-400">Date range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20"
          >
            <option value="today" className="bg-gray-900 text-white">Today</option>
            <option value="week" className="bg-gray-900 text-white">Last 7 days</option>
            <option value="month" className="bg-gray-900 text-white">Last 30 days</option>
          </select>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
            Log table: timestamp, actor, action, resource, IP — to be wired to audit API.
          </div>
        </div>
      </div>
    </div>
  );
}
