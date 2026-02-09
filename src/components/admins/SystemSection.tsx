'use client';

import React, { useState } from 'react';

type SystemTab = 'general' | 'notifications' | 'integrations' | 'maintenance';

const TABS: { id: SystemTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'maintenance', label: 'Maintenance' },
];

export default function SystemSection() {
  const [activeTab, setActiveTab] = useState<SystemTab>('general');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <nav className="mb-6" aria-label="System">
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-gray-500 mb-4">
          {activeTab === 'general' && 'Site name, support email, default currency, feature flags.'}
          {activeTab === 'notifications' && 'Email templates, SMS, push and in-app notification settings.'}
          {activeTab === 'integrations' && 'Stripe, maps, logging and third-party API keys (masked).'}
          {activeTab === 'maintenance' && 'Maintenance mode, cache clear, job queues.'}
        </p>
        <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
          Configuration forms (prototype). Backend integration pending.
        </div>
      </div>
      </div>
    </div>
  );
}
