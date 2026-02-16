'use client';

import React from 'react';

interface CurrentAccountInfo {
  type: 'Leasing' | 'Owning' | 'Ixtabox Owner';
  since: string;
  activeStands: number;
}

const currentAccount: CurrentAccountInfo = {
  type: 'Leasing',
  since: 'January 15, 2024',
  activeStands: 3,
};

const upgradeOptions = [
  {
    id: 'leasing',
    title: 'Leasing',
    description: 'Pay per rental cycle with minimal upfront costs. Ideal for testing new markets or seasonal operations.',
    features: ['Low initial cost', 'No maintenance fees', 'Flexible contracts', 'Up to 3 stands'],
    price: '10,000 SEK/month',
    recommended: true,
  },
  {
    id: 'owning',
    title: 'Owning',
    description: 'Full ownership of your Ixtabox. Purchase for 40,000 SEK and maximize long-term returns.',
    features: ['Full ownership', 'Maximum ROI', 'Asset appreciation', 'Unlimited stands'],
    price: '40,000 SEK',
    recommended: false,
  },
  {
    id: 'ixtabox-owner',
    title: 'Ixtabox Owner',
    description: 'People who own their Ixtaboxes and want to rent them out. Peer-to-peer rental.',
    features: ['List your own boxes', 'Earn from rentals', 'Peer-to-peer', 'You own the asset'],
    price: 'No monthly fee',
    recommended: false,
  },
];

export default function AccountUpgradeSection() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Current Account Status */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Current Account</h2>
            <p className="text-gray-300">Manage your partnership plan and stands</p>
          </div>
          <span className="px-4 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 text-sm font-semibold rounded-full">
            {currentAccount.type}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Account Type</p>
            <p className="text-xl font-bold text-cyan-300">{currentAccount.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Member Since</p>
            <p className="text-xl font-bold text-gray-200">{currentAccount.since}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Active Stands</p>
            <p className="text-xl font-bold text-cyan-300">{currentAccount.activeStands}</p>
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Upgrade Your Account</h2>
          <p className="text-gray-300">
            Choose the plan that best fits your business goals and scale your operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upgradeOptions.map((option) => {
            const isCurrent = option.title === currentAccount.type;
            return (
              <div
                key={option.id}
                className={`border rounded-lg p-6 transition-colors relative ${
                  isCurrent
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : option.recommended
                    ? 'border-cyan-400/40 bg-white/5 hover:border-cyan-400/60'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {option.recommended && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500/20 text-green-400 border border-green-400/40 text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT PLAN
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2 text-cyan-300">{option.title}</h3>
                  <p className="text-2xl font-bold text-white mb-2">{option.price}</p>
                  <p className="text-gray-300 min-h-[60px]">{option.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {option.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-300">
                      <svg
                        className="w-4 h-4 mr-2 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    isCurrent
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : option.recommended
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]'
                      : 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-600/30'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade to ' + option.title}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-4">
          <p className="text-sm text-gray-200">
            <span className="font-semibold text-cyan-300">Need help choosing?</span> Contact our sales team to discuss
            which option best suits your business needs.
          </p>
        </div>
      </div>

      {/* Apply for New Stand */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Apply for a New Stand</h2>
          <p className="text-gray-300">
            Expand your business by adding a new IXTAbox stand to your network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stand Application Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Location
              </label>
              <input
                type="text"
                placeholder="e.g., Stockholm Central Station"
                className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stand Type
              </label>
              <select className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/60">
                <option value="" className="bg-gray-800">Select stand type</option>
                <option value="classic" className="bg-gray-800">Classic IXTAbox</option>
                <option value="pro" className="bg-gray-800">Pro IXTAbox</option>
                <option value="premium" className="bg-gray-800">Premium IXTAbox</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expected Monthly Traffic
              </label>
              <input
                type="number"
                placeholder="e.g., 5000"
                className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                rows={4}
                placeholder="Tell us more about your plans for this stand..."
                className="w-full border border-white/10 bg-white/5 text-gray-200 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
            </div>

            <button className="w-full bg-cyan-500 text-white py-3 px-6 rounded-md hover:bg-cyan-400 transition-colors font-medium shadow-[0_0_24px_rgba(34,211,238,0.45)]">
              Submit Application
            </button>
          </div>

          {/* Application Info */}
          <div className="space-y-4">
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <h3 className="font-semibold text-cyan-300 mb-3">Application Process</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-300 font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Submit your application with location preferences</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-300 font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Our team reviews feasibility and location availability</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-300 font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Receive approval and contract details within 5-7 business days</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600/20 text-cyan-300 font-bold text-xs mr-3 flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <span>Stand installation and activation completed</span>
                </li>
              </ul>
            </div>

            <div className="border border-blue-400/20 bg-blue-500/10 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">Requirements</p>
                  <p className="text-sm text-gray-300">
                    Your current account type allows up to{' '}
                    {currentAccount.type === 'Owning' || currentAccount.type === 'Ixtabox Owner' ? 'unlimited' : '3'}{' '}
                    stands. You have {currentAccount.activeStands} active stand(s).
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <h3 className="font-semibold mb-3">Current Stands</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Downtown Location A</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Airport Terminal B</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Shopping Mall West</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

