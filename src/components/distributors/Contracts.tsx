'use client';

import React, { useState } from 'react';
// PaymentButton removed - use secure booking payment flow instead

interface ContractData {
  contractType: string;
  startDate: string;
  endDate: string;
  renewalStatus: string;
  contractNumber: string;
  autoRenewal: boolean;
}

interface PaymentData {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: string;
  transactionId?: string;
}

const mockPayments: PaymentData[] = [
  {
    id: 'pay-001',
    description: 'Monthly Distributorship Fee - January 2024',
    amount: 2500,
    dueDate: '2024-01-15',
    status: 'paid',
    paymentDate: '2024-01-14',
    transactionId: 'pi_3OjK8m2eZvKYlo2C0jK8m2eZ'
  },
  {
    id: 'pay-002',
    description: 'Monthly Distributorship Fee - February 2024',
    amount: 2500,
    dueDate: '2024-02-15',
    status: 'paid',
    paymentDate: '2024-02-13',
    transactionId: 'pi_3OjK8m2eZvKYlo2C0jK8m2eZ'
  },
  {
    id: 'pay-003',
    description: 'Monthly Distributorship Fee - March 2024',
    amount: 2500,
    dueDate: '2024-03-15',
    status: 'pending',
  },
  {
    id: 'pay-004',
    description: 'Setup Fee - Stand Installation',
    amount: 5000,
    dueDate: '2024-01-01',
    status: 'paid',
    paymentDate: '2023-12-28',
    transactionId: 'pi_3OjK8m2eZvKYlo2C0jK8m2eZ'
  },
  {
    id: 'pay-005',
    description: 'Performance Bonus - Q4 2023',
    amount: 1500,
    dueDate: '2024-01-31',
    status: 'paid',
    paymentDate: '2024-01-30',
    transactionId: 'pi_3OjK8m2eZvKYlo2C0jK8m2eZ'
  }
];

const mockContractData: ContractData = {
  contractType: 'Hybrid Distributorship',
  startDate: 'January 15, 2024',
  endDate: 'January 14, 2026',
  renewalStatus: 'Active',
  contractNumber: 'IXTA-2024-HC-00123',
  autoRenewal: true,
};

export default function Contracts() {
  const [activeTab, setActiveTab] = useState<'contract' | 'payments'>('contract');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-400/40';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/40';
      case 'overdue':
        return 'bg-red-500/20 text-red-400 border-red-400/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
    }
  };

  const totalPaid = mockPayments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalPending = mockPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Contract & Payments</h2>
        <p className="text-gray-300">View and manage your distributorship agreements and payments.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('contract')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'contract'
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Contract Details
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Payments & Invoices
        </button>
      </div>

      {activeTab === 'contract' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-300">Total Paid</h3>
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-300">${totalPaid.toLocaleString()}</p>
              <p className="text-xs text-green-400 mt-1">Successfully processed</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-yellow-300">Pending Payment</h3>
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-yellow-300">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-yellow-400 mt-1">Due soon</p>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-cyan-300">Next Due Date</h3>
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-cyan-300">Mar 15</p>
              <p className="text-xs text-cyan-400 mt-1">Monthly fee</p>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <div className="space-y-3">
              {mockPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{payment.description}</h4>
                      <p className="text-sm text-gray-400">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                        {payment.paymentDate && (
                          <span className="ml-2">
                            • Paid: {new Date(payment.paymentDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-bold text-cyan-300">
                        ${payment.amount.toLocaleString()}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {payment.status === 'pending' && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-yellow-400">Payment due in 5 days</span>
                      </div>
                      <button
                        className="text-sm py-2 px-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold transition-colors"
                        onClick={() => {
                          // TODO: Implement secure payment flow for contract payments
                          alert('Payment functionality for contracts will be implemented soon.');
                        }}
                      >
                        Pay Now
                      </button>
                    </div>
                  )}

                  {payment.status === 'paid' && payment.transactionId && (
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-green-400">Transaction ID: {payment.transactionId}</span>
                      </div>
                      <button className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
                        View Receipt →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

