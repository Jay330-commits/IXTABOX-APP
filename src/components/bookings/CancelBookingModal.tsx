"use client";

import { useState, useEffect } from "react";

interface CancelBookingModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function CancelBookingModal({
  bookingId,
  isOpen,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellationInfo, setCancellationInfo] = useState<{
    refundAmount?: number;
    refundPercentage?: number;
    transactionFee?: number;
    reason?: string;
    eligible?: boolean;
  } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  useEffect(() => {
    // Reset state when modal opens/closes or bookingId changes
    setError(null);
    setCancellationInfo(null);
    
    // Fetch cancellation info when modal opens
    if (isOpen && bookingId) {
      setIsLoadingInfo(true);
      const fetchCancellationInfo = async () => {
        try {
          const authToken = localStorage.getItem("auth-token");
          const headers: HeadersInit = {};
          if (authToken) {
            headers["Authorization"] = `Bearer ${authToken}`;
          }

          const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: "GET",
            headers,
          });

          const data = await response.json();
          console.log('[CancelBookingModal] Response status:', response.status, 'Data:', data);
          
          if (response.ok) {
            // API returns: { canCancel, refundCalculation, error }
            if (data.refundCalculation) {
              setCancellationInfo(data.refundCalculation);
              console.log('[CancelBookingModal] Set cancellation info:', data.refundCalculation);
            } else if (data.error) {
              // If there's an error in the response, show it
              setError(data.error);
            } else {
              // If no refundCalculation but no error, something went wrong
              setError('Cancellation policy information not available');
            }
          } else {
            console.error('[CancelBookingModal] API error response:', data);
            setError(data.error || data.message || 'Failed to load cancellation policy');
          }
        } catch (err) {
          console.error("Error fetching cancellation info:", err);
          setError(err instanceof Error ? err.message : 'Failed to load cancellation policy');
        } finally {
          setIsLoadingInfo(false);
        }
      };

      fetchCancellationInfo();
    }
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm();
      // Modal will be closed by parent after success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Cancel Booking</h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

           {/* Cancellation Policy Info */}
           {isLoadingInfo ? (
             <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
               <div className="flex items-center justify-center py-4">
                 <svg
                   className="animate-spin h-5 w-5 text-yellow-400"
                   xmlns="http://www.w3.org/2000/svg"
                   fill="none"
                   viewBox="0 0 24 24"
                 >
                   <circle
                     className="opacity-25"
                     cx="12"
                     cy="12"
                     r="10"
                     stroke="currentColor"
                     strokeWidth="4"
                   ></circle>
                   <path
                     className="opacity-75"
                     fill="currentColor"
                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                   ></path>
                 </svg>
                 <span className="ml-2 text-yellow-400">Loading cancellation policy...</span>
               </div>
             </div>
           ) : error && !cancellationInfo ? (
             <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
               <h3 className="font-semibold text-red-400 mb-2">Error</h3>
               <p className="text-sm text-red-300">{error}</p>
             </div>
           ) : cancellationInfo ? (
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-400 mb-2">Cancellation Policy</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>{cancellationInfo.reason}</p>
                {cancellationInfo.eligible && cancellationInfo.refundAmount !== undefined && (
                  <div className="mt-3 pt-3 border-t border-yellow-400/20">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Refund Amount:</span>
                      <span className="font-semibold text-white">
                        SEK {cancellationInfo.refundAmount.toFixed(2)}
                      </span>
                    </div>
                    {cancellationInfo.refundPercentage !== undefined && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-300">Refund Percentage:</span>
                        <span className="font-semibold text-white">
                          {cancellationInfo.refundPercentage}%
                        </span>
                      </div>
                    )}
                    {cancellationInfo.transactionFee !== undefined && cancellationInfo.transactionFee > 0 && (
                      <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                        <span>Transaction Fee:</span>
                        <span>SEK {cancellationInfo.transactionFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                {cancellationInfo.eligible === false && (
                  <p className="text-yellow-400 font-medium mt-2">No refund will be issued.</p>
                )}
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-400 mb-2">Error</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : null}

          {/* Warning Message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-gray-300">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="text-red-400 text-sm font-medium">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 border border-white/20 rounded-lg text-sm font-medium text-gray-200 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Booking
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-600 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Cancel Booking</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

