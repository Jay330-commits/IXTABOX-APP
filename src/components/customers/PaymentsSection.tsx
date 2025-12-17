'use client';

import React from 'react';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  currency?: string;
  completedAt?: string;
  chargeId?: string;
}

interface PaymentsSectionProps {
  payments: Payment[];
  isLoadingData: boolean;
  dataError: string | null;
  expandedPaymentId: string | null;
  setExpandedPaymentId: (id: string | null) => void;
}

export default function PaymentsSection({
  payments,
  isLoadingData,
  dataError,
  expandedPaymentId,
  setExpandedPaymentId,
}: PaymentsSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:pb-12">
      <h1 className="text-3xl font-bold mb-6">Payment History</h1>
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      ) : dataError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
          {dataError}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
          No payment history found.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const isExpanded = expandedPaymentId === payment.id;
            const statusColor = 
              payment.status === 'Completed' ? 'green' :
              payment.status === 'Refunded' ? 'orange' :
              payment.status === 'Pending' ? 'yellow' :
              payment.status === 'Failed' ? 'red' :
              'gray';

            return (
              <div 
                key={payment.id}
                className={`rounded-xl border overflow-hidden ${
                  statusColor === 'green' ? 'bg-green-500/5 border-green-400/20' :
                  statusColor === 'yellow' ? 'bg-yellow-500/5 border-yellow-400/20' :
                  statusColor === 'red' ? 'bg-red-500/10 border-red-400/30' :
                  statusColor === 'orange' ? 'bg-orange-500/10 border-orange-400/30' :
                  'bg-white/5 border-white/10'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{payment.currency || 'SEK'} {payment.amount.toFixed(2)}</div>
                      <div className="text-gray-400">{payment.method}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-gray-300">{payment.date}</div>
                        <div className={`font-medium ${
                          payment.status === 'Completed' ? 'text-green-400' :
                          payment.status === 'Refunded' ? 'text-orange-400 font-semibold' :
                          payment.status === 'Pending' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {payment.status === 'Refunded' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/30">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {payment.status}
                            </span>
                          ) : (
                            payment.status
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                        aria-label={isExpanded ? 'Collapse payment details' : 'Expand payment details'}
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-400 group-hover:text-white transition-all duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-white/10 pt-6">
                    <div className="bg-white/5 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Payment ID</span>
                        <div className="flex items-center gap-2 max-w-[60%]">
                          <span className="text-sm font-medium text-gray-200 font-mono break-all">{payment.id}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(payment.id);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy Payment ID"
                            aria-label="Copy Payment ID"
                          >
                            <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {payment.chargeId && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm text-gray-400">Charge ID</span>
                          <div className="flex items-center gap-2 max-w-[60%]">
                            <span className="text-sm font-medium text-gray-200 font-mono break-all">{payment.chargeId}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(payment.chargeId!);
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Copy Charge ID"
                              aria-label="Copy Charge ID"
                            >
                              <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Amount</span>
                        <span className="text-sm font-medium text-gray-200">{payment.currency || 'SEK'} {payment.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Status</span>
                        <span className={`text-sm font-medium ${
                          payment.status === 'Completed' ? 'text-green-400' :
                          payment.status === 'Refunded' ? 'text-orange-400 font-semibold' :
                          payment.status === 'Pending' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {payment.status === 'Refunded' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/30">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {payment.status}
                            </span>
                          ) : (
                            payment.status
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Method</span>
                        <span className="text-sm font-medium text-gray-200">{payment.method}</span>
                      </div>
                      {payment.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Completed At</span>
                          <span className="text-sm font-medium text-gray-200">
                            {new Date(payment.completedAt).toLocaleString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

