'use client';

import React from 'react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'scheduled' | 'draft';
  startDate: string;
  impressions: number;
  clicks: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Promotion 2025',
    status: 'active',
    startDate: 'May 1, 2025',
    impressions: 15420,
    clicks: 1230,
  },
  {
    id: '2',
    name: 'Weekend Special Offer',
    status: 'active',
    startDate: 'Oct 10, 2025',
    impressions: 8950,
    clicks: 745,
  },
  {
    id: '3',
    name: 'Holiday Campaign',
    status: 'scheduled',
    startDate: 'Dec 1, 2025',
    impressions: 0,
    clicks: 0,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400';
    case 'scheduled':
      return 'bg-blue-500/20 text-blue-400';
    case 'draft':
      return 'bg-gray-500/20 text-gray-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

export default function MarketingTools() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Marketing Tools</h2>
        <p className="text-gray-300">
          Access promotional materials and manage your marketing campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button className="flex items-center justify-center bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 py-4 px-6 rounded-md hover:bg-cyan-600/30 transition-colors">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Marketing Kit
        </button>

        <button className="flex items-center justify-center border border-white/10 text-gray-200 py-4 px-6 rounded-md hover:bg-white/5 transition-colors">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create New Promotion
        </button>

        <button className="flex items-center justify-center border border-white/10 text-gray-200 py-4 px-6 rounded-md hover:bg-white/5 transition-colors">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          View Active Campaigns
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Active Campaigns</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="border border-white/10 rounded-lg p-4 bg-white/5 hover:border-cyan-400/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold">{campaign.name}</h4>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    campaign.status
                  )}`}
                >
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                Started: {campaign.startDate}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Impressions</p>
                  <p className="text-lg font-bold text-cyan-300">
                    {campaign.impressions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Clicks</p>
                  <p className="text-lg font-bold text-cyan-300">
                    {campaign.clicks.toLocaleString()}
                  </p>
                </div>
              </div>

              {campaign.status === 'active' && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">CTR</span>
                    <span className="font-semibold text-gray-200">
                      {((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-cyan-400 mt-0.5 mr-3 flex-shrink-0"
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
            <p className="text-sm font-semibold text-cyan-300">Marketing Resources</p>
            <p className="text-sm text-gray-200 mt-1">
              Access brand guidelines, logos, templates, and promotional materials in the marketing kit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

