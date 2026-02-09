'use client';

import React, { useState } from 'react';

type PaymentsTab = 'overview' | 'transactions' | 'refunds';

const TABS: { id: PaymentsTab; label: string }[] = [
  { id: 'overview', label: 'Revenue overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'refunds', label: 'Refunds' },
];

export default function PaymentsSection() {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('overview');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" role="tablist" aria-label="Payments">
        <ul className="flex flex-wrap gap-6">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-[13px] font-medium tracking-tight border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id ? 'border-amber-500 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-amber-200/80">Revenue (MTD)</p>
          <p className="mt-1 text-xl font-semibold text-white">—</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-amber-200/80">Transactions</p>
          <p className="mt-1 text-xl font-semibold text-white">—</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-amber-200/80">Refunds (MTD)</p>
          <p className="mt-1 text-xl font-semibold text-white">—</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-gray-500">Stripe reconciliation and export (prototype).</p>
        <div className="mt-4 rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
          Transaction list and refund management — to be wired to payments API.
        </div>
      </div>
      </div>
    </div>
  );
}
