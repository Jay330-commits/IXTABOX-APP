'use client';

import React from 'react';

interface ContractData {
  contractType: string;
  startDate: string;
  endDate: string;
  renewalStatus: string;
  contractNumber: string;
  autoRenewal: boolean;
}

const mockContractData: ContractData = {
  contractType: 'Hybrid Partnership',
  startDate: 'January 15, 2024',
  endDate: 'January 14, 2026',
  renewalStatus: 'Active',
  contractNumber: 'IXTA-2024-HC-00123',
  autoRenewal: true,
};

export default function Contracts() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Contract Information</h2>
        <p className="text-gray-300">View and manage your partnership agreements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Contract Details</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
              {mockContractData.renewalStatus}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Contract Type</p>
              <p className="font-medium text-cyan-300">{mockContractData.contractType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Contract Number</p>
              <p className="font-medium text-gray-200">{mockContractData.contractNumber}</p>
            </div>
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4 bg-white/5">
          <h3 className="font-semibold mb-4">Contract Period</h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Start Date</p>
              <p className="font-medium text-gray-200">{mockContractData.startDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">End Date</p>
              <p className="font-medium text-gray-200">{mockContractData.endDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Auto-Renewal</p>
              <p className="font-medium text-gray-200">
                {mockContractData.autoRenewal ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button className="flex-1 bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 py-3 px-6 rounded-md hover:bg-cyan-600/30 transition-colors font-medium">
          View Full Contract
        </button>
        <button className="flex-1 border border-white/10 text-gray-200 py-3 px-6 rounded-md hover:bg-white/5 transition-colors font-medium">
          Download PDF
        </button>
        <button className="flex-1 border border-white/10 text-gray-200 py-3 px-6 rounded-md hover:bg-white/5 transition-colors font-medium">
          Request Amendment
        </button>
      </div>

      <div className="mt-6 bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
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
            <p className="text-sm font-semibold text-blue-300">Contract Renewal Notice</p>
            <p className="text-sm text-gray-300 mt-1">
              Your contract will automatically renew in 90 days. You can disable auto-renewal at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

