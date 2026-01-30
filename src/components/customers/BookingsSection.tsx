'use client';

import React from 'react';
import BoxProblemSelector from '@/components/bookings/BoxProblemSelector';
import type { Booking } from './DashboardSection';

interface BookingsSectionProps {
  bookings: Booking[];
  isLoadingData: boolean;
  dataError: string | null;
  expandedBookingId: string | null;
  setExpandedBookingId: (id: string | null) => void;
  cancellingBookingId: string | null;
  setCancellingBookingId: (id: string | null) => void;
  returningBookingId: string | null;
  setReturningBookingId: (id: string | null) => void;
  extendingBookingId: string | null;
  setExtendingBookingId: (id: string | null) => void;
  cancelError: string | null;
  setCancelError: (error: string | null) => void;
  setShowCancelModal: (show: boolean) => void;
  setReturnPhotos: (photos: { boxFrontView: File | null; boxBackView: File | null; closedStandLock: File | null }) => void;
  setReturnConfirmed: (confirmed: boolean) => void;
}

export default function BookingsSection({
  bookings,
  isLoadingData,
  dataError,
  expandedBookingId,
  setExpandedBookingId,
  cancellingBookingId,
  setCancellingBookingId,
  returningBookingId: _returningBookingId,
  setReturningBookingId,
  extendingBookingId,
  setExtendingBookingId,
  cancelError,
  setCancelError,
  setShowCancelModal,
  setReturnPhotos,
  setReturnConfirmed,
}: BookingsSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:pb-12">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      ) : dataError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
          {dataError}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
          No bookings found. Book your first box to get started!
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const status = booking.status || '';
            const statusLower = status.toLowerCase();
            
            const statusColor = 
              statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
              statusLower === 'upcoming' ? 'yellow' :
              statusLower === 'cancelled' ? 'red' :
              'gray';
            
            const isExpanded = expandedBookingId === booking.id;
            const startDate = booking.startDate ? new Date(booking.startDate) : new Date(booking.date);
            const endDate = booking.endDate ? new Date(booking.endDate) : new Date(booking.date);
            const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            
            const modelName = booking.model === 'Pro 190' || booking.model === 'Pro' ? 'IXTAbox Pro 190' : 'IXTAbox Pro 175';
            const modelDescription = booking.model === 'Pro 190' || booking.model === 'Pro' ? 'Premium storage box with enhanced features' : 'Standard storage box';
            const pricePerDay = booking.pricePerDay || (booking.amount / days);
            const totalPrice = booking.amount || (days * pricePerDay);

            return (
              <div 
                key={`${booking.id}-${status}`}
                className={`rounded-xl border transition-all shadow-lg ${
                  statusColor === 'green' ? 'bg-green-500/5 border-green-400/20' :
                  statusColor === 'yellow' ? 'bg-yellow-500/5 border-yellow-400/20' :
                  statusColor === 'red' ? 'bg-red-500/10 border-red-400/30' :
                  'bg-white/5 border-white/10'
                }`}
              >
                {/* Booking Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                        statusColor === 'green' ? 'bg-green-400' :
                        statusColor === 'yellow' ? 'bg-yellow-400' :
                        statusColor === 'red' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-white mb-1 truncate">{booking.location}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>
                            {startDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                          <span className="text-gray-500">-</span>
                          <span>
                            {endDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 ml-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-semibold text-lg text-white">SEK {booking.amount.toFixed(2)}</div>
                        <div className={`text-xs font-medium uppercase tracking-wide mt-1 ${
                          statusColor === 'green' ? 'text-green-400' :
                          statusColor === 'yellow' ? 'text-yellow-400' :
                          statusColor === 'red' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                        aria-label={isExpanded ? 'Collapse booking details' : 'Expand booking details'}
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
                
                {/* Action Buttons Bar */}
                <div className="px-6 pb-6">
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    {(statusLower === 'upcoming' || statusLower === 'confirmed' || statusLower === 'active') && (
                      <div className="flex gap-2">
                        {(statusLower === 'upcoming' || statusLower === 'confirmed') && (
                          <button
                            onClick={() => {
                              setCancellingBookingId(booking.id);
                              setCancelError(null);
                              setShowCancelModal(true);
                            }}
                            className="flex-1 py-3 px-5 text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <span>Cancel Booking</span>
                          </button>
                        )}
                        
                      </div>
                    )}
                    
                    {/* Report Problem Button - Show for active, confirmed, and upcoming bookings */}
                    {(statusLower === 'active' || statusLower === 'confirmed' || statusLower === 'upcoming') && !isExpanded && (
                      <button
                        onClick={() => {
                          setExpandedBookingId(booking.id);
                          // Scroll to problem selector after expansion
                          setTimeout(() => {
                            const problemSection = document.getElementById(`problem-selector-${booking.id}`);
                            if (problemSection) {
                              problemSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        }}
                        className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-yellow-600/80 hover:bg-yellow-600 active:bg-yellow-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Report Box Problem</span>
                      </button>
                    )}
                    
                    {statusLower === 'active' && (
                      <div className="relative w-full flex items-stretch overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
                        {/* Return Box Button - Main with diagonal cut on right */}
                        <button
                          onClick={() => {
                            setReturningBookingId(booking.id);
                            setReturnPhotos({
                              boxFrontView: null,
                              boxBackView: null,
                              closedStandLock: null,
                            });
                            setReturnConfirmed(false);
                          }}
                          className={`flex-1 py-3 px-5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all duration-200 flex items-center justify-center gap-2 ${
                            (booking.isExtended || (booking.extensionCount && booking.extensionCount > 0)) 
                              ? '' 
                              : ''
                          }`}
                          style={{
                            clipPath: (booking.isExtended || (booking.extensionCount && booking.extensionCount > 0))
                              ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                              : 'polygon(0 0, calc(100% - 120px) 0, calc(100% - 160px) 100%, 0 100%)'
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Return Box</span>
                        </button>
                        
                        {/* Extend Button - Only show if booking is not already extended */}
                        {/* Hide extend button if booking has been extended (check isExtended flag, extensionCount, or extensionAmount) */}
                        {!booking.isExtended && (!booking.extensionCount || booking.extensionCount === 0) && (!booking.extensionAmount || booking.extensionAmount === 0) && (
                          <button
                            onClick={() => {
                              setExtendingBookingId(booking.id);
                            }}
                            className="absolute right-0 top-0 bottom-0 w-40 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 transition-all duration-200 flex items-center justify-center gap-2 z-10"
                            style={{
                              clipPath: 'polygon(40px 0%, 100% 0%, 100% 100%, 0% 100%)'
                            }}
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="text-xs font-semibold text-white">Extend</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    {(statusLower === 'completed' || statusLower === 'cancelled') && (
                      <div className={`w-full py-3 px-5 text-sm font-medium text-center rounded-lg border ${
                        statusLower === 'cancelled' 
                          ? 'text-red-300 bg-red-500/10 border-red-400/30' 
                          : 'text-gray-400 bg-white/5 border-white/10'
                      }`}>
                        {statusLower === 'completed' ? 'Booking Completed' : 'Booking Cancelled'}
                      </div>
                    )}
                  </div>
                  
                  {cancelError && cancellingBookingId === booking.id && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-sm text-red-400 font-medium">{cancelError}</div>
                    </div>
                  )}
                </div>

                {/* Expanded Booking Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-white/10 pt-6 space-y-6">
                    {/* Lock PIN */}
                    {booking.lockPin && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Access Information</h3>
                        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-400/20">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Lock Access PIN</span>
                            <span className="text-2xl font-bold text-cyan-400 font-mono">{booking.lockPin}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Use this PIN to access your box during the booking period.</p>
                        </div>
                      </div>
                    )}

                    {/* Box Problem Reporting - Only show for active bookings */}
                    {(statusLower === 'active' || statusLower === 'confirmed' || statusLower === 'upcoming') && (
                      <div id={`problem-selector-${booking.id}`}>
                        <BoxProblemSelector
                          bookingId={booking.id}
                          onProblemReported={(problems) => {
                            console.log('Problems reported for booking:', booking.id, problems);
                          }}
                        />
                      </div>
                    )}

                    {/* Booking Details */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Booking Details</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm text-gray-400">Booking ID</span>
                          <div className="flex items-center gap-2 max-w-[60%]">
                            <span className="text-sm font-medium text-gray-200 font-mono break-all">
                              {booking.bookingDisplayId ? (
                                booking.bookingDisplayId
                              ) : (
                                <span className="text-red-400" title="Error: Booking display ID is missing">
                                  ERROR
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => {
                                if (booking.bookingDisplayId) {
                                  navigator.clipboard.writeText(booking.bookingDisplayId);
                                } else {
                                  console.error('Cannot copy: booking display ID is missing');
                                }
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Copy Booking ID"
                              aria-label="Copy Booking ID"
                            >
                              <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {booking.standDisplayId && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Stand ID</span>
                            <span className="text-sm font-medium text-gray-200">#{booking.standDisplayId}</span>
                          </div>
                        )}
                        {booking.boxDisplayId && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Box ID</span>
                            <span className="text-sm font-medium text-gray-200">#{booking.boxDisplayId}</span>
                          </div>
                        )}
                        {booking.locationAddress && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Address</span>
                            <span className="text-sm font-medium text-gray-200 text-right max-w-xs">{booking.locationAddress}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Status</span>
                          <span className={`text-sm font-medium ${
                            statusLower === 'active' || statusLower === 'completed' || statusLower === 'confirmed' ? 'text-green-400' :
                            statusLower === 'upcoming' ? 'text-yellow-400' :
                            statusLower === 'cancelled' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Model Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Model</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Type</span>
                          <span className="text-sm font-medium text-gray-200">{modelName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Description</span>
                          <span className="text-sm font-medium text-gray-200 text-right max-w-xs">{modelDescription}</span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Schedule</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">From</span>
                          <span className="text-sm font-medium text-gray-200">
                            {startDate.toLocaleString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">To</span>
                          <span className="text-sm font-medium text-gray-200">
                            {endDate.toLocaleString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Duration</span>
                          <span className="text-sm font-medium text-gray-200">{days} {days === 1 ? 'day' : 'days'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-3">Payment</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        {booking.paymentId && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm text-gray-400">Payment ID</span>
                            <div className="flex items-center gap-2 max-w-[60%]">
                              <span className="text-sm font-medium text-gray-200 font-mono break-all">{booking.paymentId}</span>
                              <button
                                onClick={() => {
                                  if (booking.paymentId) {
                                    navigator.clipboard.writeText(booking.paymentId);
                                  }
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
                        )}
                        {booking.chargeId && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm text-gray-400">Charge ID</span>
                            <div className="flex items-center gap-2 max-w-[60%]">
                              <span className="text-sm font-medium text-gray-200 font-mono break-all">{booking.chargeId}</span>
                              <button
                                onClick={() => {
                                  if (booking.chargeId) {
                                    navigator.clipboard.writeText(booking.chargeId);
                                  }
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
                        {booking.paymentStatus && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Payment Status</span>
                            <span className={`text-sm font-medium ${
                              booking.paymentStatus === 'Completed' || booking.paymentStatus === 'Refunded' ? 'text-green-400' :
                              booking.paymentStatus === 'Pending' ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Base Price/Day</span>
                          <span className="text-sm font-medium text-gray-200">SEK {pricePerDay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Days</span>
                          <span className="text-sm font-medium text-gray-200">{days}</span>
                        </div>
                        {booking.extensionAmount && booking.extensionAmount > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">Original Booking</span>
                              <span className="text-sm font-medium text-gray-200">SEK {(booking.originalAmount || booking.amount - (booking.extensionAmount || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-400">Extensions</span>
                              <span className="text-sm font-medium text-green-400">+ SEK {booking.extensionAmount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="border-t border-white/10 pt-3 flex justify-between">
                          <span className="text-sm font-medium text-gray-200">Total</span>
                          <span className="text-sm font-medium text-cyan-400">SEK {totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Created Date */}
                    {booking.createdAt && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Booking Information</h3>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-400">Booked On</span>
                            <span className="text-sm font-medium text-gray-200">
                              {new Date(booking.createdAt).toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Return Photos */}
                    {(booking.boxFrontView || booking.boxBackView || booking.closedStandLock) && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Return Photos</h3>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {booking.boxFrontView && (
                              <div>
                                <p className="text-gray-400 text-xs mb-2">Box Front View</p>
                                <a
                                  href={booking.boxFrontView}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={booking.boxFrontView}
                                    alt="Box Front View"
                                    className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                    onError={(e) => {
                                      console.error('[BookingsSection] Failed to load boxFrontView image:', booking.boxFrontView);
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                      }
                                    }}
                                  />
                                </a>
                              </div>
                            )}
                            {booking.boxBackView && (
                              <div>
                                <p className="text-gray-400 text-xs mb-2">Box Back View</p>
                                <a
                                  href={booking.boxBackView}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={booking.boxBackView}
                                    alt="Box Back View"
                                    className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                    onError={(e) => {
                                      console.error('[BookingsSection] Failed to load boxBackView image:', booking.boxBackView);
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                      }
                                    }}
                                  />
                                </a>
                              </div>
                            )}
                            {booking.closedStandLock && (
                              <div>
                                <p className="text-gray-400 text-xs mb-2">Closed Stand Lock</p>
                                <a
                                  href={booking.closedStandLock}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={booking.closedStandLock}
                                    alt="Closed Stand Lock"
                                    className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                    onError={(e) => {
                                      console.error('[BookingsSection] Failed to load closedStandLock image:', booking.closedStandLock);
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                      }
                                    }}
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {cancelError && cancellingBookingId === booking.id && (
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-sm text-red-400">{cancelError}</div>
                      </div>
                    )}
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

