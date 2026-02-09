'use client';

import React, { useState } from 'react';

type UserTab = 'customers' | 'partners' | 'admins';
type PartnerSubTab = 'prospect' | 'signup' | 'active';
type CustomerLevelTab = 'all' | 'bronze' | 'silver' | 'gold' | 'platinum';
const PARTNER_TABS: { id: PartnerSubTab; label: string }[] = [
  { id: 'prospect', label: 'Prospect partners' },
  { id: 'signup', label: 'Sign-up partners' },
  { id: 'active', label: 'Active partners' },
];

const CUSTOMER_LEVEL_TABS: { id: CustomerLevelTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bronze', label: 'Bronze' },
  { id: 'silver', label: 'Silver' },
  { id: 'gold', label: 'Gold' },
  { id: 'platinum', label: 'Platinum' },
];

const ADMIN_ALL_TAB = { id: 'all' as const, label: 'All' };

interface UsersSectionProps {
  initialTab: UserTab;
}

export default function UsersSection({ initialTab }: UsersSectionProps) {
  const [partnerSubTab, setPartnerSubTab] = useState<PartnerSubTab>('prospect');
  const [customerLevel, setCustomerLevel] = useState<CustomerLevelTab>('all');

  const subTabStyles = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
    }`;

  const tabStyles = (active: boolean) =>
    `pb-3 text-[13px] font-medium tracking-tight border-b-2 -mb-px transition-colors ${
      active ? 'border-amber-500 text-amber-300' : 'border-transparent text-gray-500 hover:text-gray-300'
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      {/* Customers: from side panel — sub-tabs (All, Bronze, …) + table */}
      {initialTab === 'customers' && (
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {CUSTOMER_LEVEL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCustomerLevel(tab.id)}
                className={subTabStyles(customerLevel === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
              Table: search, filter, edit — to be wired to API.
            </div>
          </div>
        </div>
      )}

      {/* Partners: from side panel — sub-tabs (Prospect, Sign-up, Active) + list */}
      {initialTab === 'partners' && (
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-4">
            {PARTNER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPartnerSubTab(tab.id)}
                className={subTabStyles(partnerSubTab === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
              Partner list — to be wired to API.
            </div>
          </div>
        </div>
      )}

      {/* Admins: from side panel — only "All" tab + content */}
      {initialTab === 'admins' && (
        <div className="min-w-0">
          <nav className="mb-6" aria-label="Admins tabs">
            <ul className="flex flex-wrap gap-6">
              <li>
                <button type="button" className={tabStyles(true)} aria-current="page">
                  {ADMIN_ALL_TAB.label}
                </button>
              </li>
            </ul>
          </nav>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="rounded-lg border border-dashed border-white/10 py-12 text-center text-gray-500 text-sm">
              Table: search, filter, edit roles — to be wired to API.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
