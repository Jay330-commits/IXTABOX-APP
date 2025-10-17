'use client';

import React, { useState } from 'react';
import Contracts from '@/components/partners/Contracts';
import MarketingTools from '@/components/partners/MarketingTools';
import RentalStats from '@/components/partners/RentalStats';
import AccountUpgradeSection from '@/components/partners/AccountUpgradeSection';
import StandsOverview from '@/components/partners/StandsOverview';
import InventoryManagement from '@/components/partners/InventoryManagement';
import DistributerHeader from '@/components/layouts/DistributerHeader';
import Footer from '@/components/layouts/Footer';

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

const statsData: StatCard[] = [
  {
    title: 'Active Stands',
    value: 3,
    change: '+1 this quarter',
    changeType: 'positive',
    icon: 'stands',
  },
  {
    title: 'Total Rentals This Month',
    value: 47,
    change: '+12% from last month',
    changeType: 'positive',
    icon: 'rentals',
  },
  {
    title: 'Earnings Overview',
    value: '14,850 kr',
    change: '+8% this month',
    changeType: 'positive',
    icon: 'earnings',
  },
  {
    title: 'Contract Status',
    value: 'Active',
    change: '426 days remaining',
    changeType: 'neutral',
    icon: 'contract',
  },
];

const getIconSvg = (iconType: string) => {
  switch (iconType) {
    case 'stands':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'rentals':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      );
    case 'earnings':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'contract':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function DistributerDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderSection = () => {
    switch (activeSection) {
      case 'upgrade':
        return <AccountUpgradeSection />;
      case 'inventory':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <InventoryManagement />
          </div>
        );
      case 'marketing':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <MarketingTools />
          </div>
        );
      case 'contracts':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <Contracts />
          </div>
        );
      case 'statistics':
        return (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div>
              <button
                onClick={() => setActiveSection('dashboard')}
                className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-300 mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold mb-2">Detailed Statistics</h1>
              <p className="text-gray-300">Deep dive into individual stand performance</p>
            </div>
            <RentalStats />
          </div>
        );
      case 'dashboard':
      default:
        return (
          <>
            {/* Hero Section with Background */}
            <div className="relative overflow-hidden mb-8">
              <div
                className="absolute inset-0 bg-center bg-cover"
                style={{
                  backgroundImage: "url(/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/80" />
              
              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="mb-8">
                  <h1 className="text-4xl font-bold mb-3 text-white">
                    Welcome back, Partner Name!
                  </h1>
                  <p className="text-cyan-300 text-lg">
                    Track your stands&apos; performance and business metrics in real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Stats Cards */}
              <div className="mb-8 overflow-x-auto lg:overflow-visible">
                <div className="flex lg:grid lg:grid-cols-4 gap-6 px-2 lg:px-0">
                  {statsData.map((stat, index) => (
                    <div
                      key={index}
                      className="relative bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto hover:border-cyan-400/40 transition-all overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-cyan-300">{getIconSvg(stat.icon)}</div>
                          <div
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              stat.changeType === 'positive'
                                ? 'bg-green-500/20 text-green-400'
                                : stat.changeType === 'negative'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {stat.changeType === 'positive' && '↑'}
                            {stat.changeType === 'negative' && '↓'}
                          </div>
                        </div>

                        <h3 className="text-xs lg:text-sm text-gray-400 mb-1">{stat.title}</h3>
                        <p className="text-xl lg:text-2xl font-bold text-cyan-300 mb-2">
                          {stat.value}
                        </p>
                        <p className="text-xs text-gray-400">{stat.change}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* All Stands Overview - Main Focus */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <StandsOverview onSelectStand={() => {
                setActiveSection('statistics');
                // In a real app, you'd also set the selected stand here
              }} />
            </div>

            {/* Quick Actions */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveSection('inventory')}
                    className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Inventory</p>
                      <p className="text-xs text-gray-400">Manage boxes</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveSection('marketing')}
                    className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Marketing</p>
                      <p className="text-xs text-gray-400">View campaigns</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveSection('contracts')}
                    className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4 hover:border-cyan-400/40 hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Contracts</p>
                      <p className="text-xs text-gray-400">View agreements</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveSection('upgrade')}
                    className="flex items-center justify-center gap-3 bg-cyan-500/20 border border-cyan-400/40 rounded-lg p-4 hover:bg-cyan-500/30 transition-colors"
                  >
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Upgrade / New Stand</p>
                      <p className="text-xs text-gray-400">Expand account</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <DistributerHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main>
        {renderSection()}
      </main>

      <Footer />
    </div>
  );
}

