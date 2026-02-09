'use client';

import React, { useState } from 'react';

type LocationsTab = 'locations' | 'stands' | 'boxes' | 'pricing';

const TABS: { id: LocationsTab; label: string; description: string }[] = [
  { id: 'locations', label: 'Locations', description: 'All deployment sites' },
  { id: 'stands', label: 'Stands', description: 'Stands per location' },
  { id: 'boxes', label: 'Boxes', description: 'Box inventory and models' },
  { id: 'pricing', label: 'Pricing', description: 'Location and box pricing' },
];

export default function LocationsSection() {
  const [activeTab, setActiveTab] = useState<LocationsTab>('locations');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" aria-label="Locations">
        <ul className="flex flex-wrap gap-6">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
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
        <p className="text-sm text-gray-400 mb-4">{TABS.find((t) => t.id === activeTab)?.description}</p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
            {activeTab === 'locations' && 'Locations list with map link, distributor, stand count.'}
            {activeTab === 'stands' && 'Stands per location with box assignments.'}
            {activeTab === 'boxes' && 'Box registry: model, status, current stand/location.'}
            {activeTab === 'pricing' && 'Pricing rules per location and box model.'}
            {' — Prototype, backend pending.'}
          </div>
        </div>
      </div>
    </div>
  );
}
