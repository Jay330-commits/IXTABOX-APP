'use client';

import React, { useState } from 'react';

const TABS = [{ id: 'overview', label: 'Overview' }];

export default function InventorySection() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" aria-label="Inventory">
        <ul className="flex gap-6">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-[13px] font-medium tracking-tight border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-300'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="rounded-lg bg-white/[0.02] p-8">
        <p className="text-sm text-gray-500">Box and location inventory. Coming soon.</p>
      </div>
    </div>
  );
}
