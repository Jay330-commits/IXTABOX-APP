"use client";

import { useState, useEffect } from "react";

interface ExtendBookingModalProps {
  bookingId: string;
  currentEndDate: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newEndDate: string, newEndTime: string) => Promise<void>;
}

export default function ExtendBookingModal({
  bookingId,
  currentEndDate,
  isOpen,
  onClose,
  onConfirm,
}: ExtendBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [newEndTime, setNewEndTime] = useState("17:00");
  const [extensionInfo, setExtensionInfo] = useState<{
    canExtend?: boolean;
    additionalDays?: number;
    additionalCost?: number;
    pricePerDay?: number;
    reason?: string;
    error?: string;
  } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  // Initialize with current end date + 1 day as default
  useEffect(() => {
    if (isOpen && currentEndDate) {
      const currentDate = new Date(currentEndDate);
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dateStr = nextDay.toISOString().split('T')[0];
      setNewEndDate(dateStr);
      setNewEndTime("17:00");
      setError(null);
      setExtensionInfo(null);
      setHasUserSelectedDate(false); // Reset flag when modal opens
    }
  }, [isOpen, currentEndDate]);

  // Fetch extension info when date changes
  useEffect(() => {
    if (isOpen && newEndDate && bookingId) {
      const fetchExtensionInfo = async () => {
        setIsLoadingInfo(true);
        setExtensionInfo(null); // Clear previous extension info while loading
        setError(null);
        try {
          const authToken = localStorage.getItem("auth-token");
          const headers: HeadersInit = {};
          if (authToken) {
            headers["Authorization"] = `Bearer ${authToken}`;
          }

          const response = await fetch(
            `/api/bookings/${bookingId}/extend?newEndDate=${newEndDate}&newEndTime=${newEndTime}`,
            {
              method: "GET",
              headers,
            }
          );

          const data = await response.json();

          if (response.ok) {
            // Only set extension info if canExtend is explicitly true
            if (data.canExtend !== true) {
              setError(data.error || data.reason || 'Cannot extend booking');
              setExtensionInfo(null);
            } else {
              // Ensure canExtend is explicitly set to true and validate data
              if (data.additionalDays >= 1 && data.additionalCost > 0) {
                setExtensionInfo({
                  ...data,
                  canExtend: true,
                });
                setError(null);
              } else {
                setError('Invalid extension: must add at least 1 day');
                setExtensionInfo(null);
              }
            }
          } else {
            setError(data.error || data.message || 'Failed to calculate extension cost');
            setExtensionInfo(null);
          }
        } catch (err) {
          console.error("Error fetching extension info:", err);
          setError(err instanceof Error ? err.message : 'Failed to calculate extension cost');
          setExtensionInfo(null);
        } finally {
          setIsLoadingInfo(false);
        }
      };

      // Debounce the API call
      const timeoutId = setTimeout(fetchExtensionInfo, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // Reset when modal closes or date is cleared
      setExtensionInfo(null);
      setIsLoadingInfo(false);
    }
  }, [isOpen, newEndDate, newEndTime, bookingId]);

  if (!isOpen) return null;

  // Helper function to check if extension is valid
  const isExtensionValid = (): boolean => {
    // Must have all required fields
    if (!newEndDate || !newEndTime || !extensionInfo) {
      return false;
    }

    // Must have valid extension info with canExtend explicitly true
    if (extensionInfo.canExtend !== true) {
      return false;
    }

    // Check date is after current end date
    const currentDate = new Date(currentEndDate);
    const selectedDate = new Date(`${newEndDate}T${newEndTime}`);
    
    // Must be strictly after current end date
    if (selectedDate <= currentDate) {
      return false;
    }

    // Check that we're adding at least a full calendar day
    // Compare dates (not times) to ensure it's a different day
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    
    // Selected date must be at least 1 day after current date
    if (selectedDateOnly <= currentDateOnly) {
      return false;
    }

    // Check additional days and cost are positive
    // Additional days must be at least 1 (full day)
    if (typeof extensionInfo.additionalDays !== 'number' || extensionInfo.additionalDays < 1) {
      return false;
    }

    if (typeof extensionInfo.additionalCost !== 'number' || extensionInfo.additionalCost <= 0) {
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!newEndDate || !newEndTime) {
      setError("Please select a new end date and time");
      return;
    }

    const currentDate = new Date(currentEndDate);
    const selectedDate = new Date(`${newEndDate}T${newEndTime}`);
    
    if (selectedDate <= currentDate) {
      setError("New end date must be after current end date");
      return;
    }

    if (!extensionInfo || !extensionInfo.additionalCost) {
      setError("Please wait for cost calculation");
      return;
    }

    // Validate that additional days and cost are positive
    if (!extensionInfo.additionalDays || extensionInfo.additionalDays <= 0) {
      setError("You must add at least one additional day to extend your booking");
      return;
    }

    if (extensionInfo.additionalCost <= 0) {
      setError("Invalid extension cost. Please select a valid end date.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Create payment session
      const authToken = localStorage.getItem("auth-token");
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newEndDate, newEndTime }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Failed to create payment session';
        console.error('Extension request failed:', {
          status: response.status,
          error: data.error,
          message: data.message,
          data
        });
        throw new Error(errorMessage);
      }

      // Redirect to payment page
      window.location.href = `/payment?payment_intent=${data.paymentIntentId}&type=extension&bookingId=${bookingId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment session");
      setIsSubmitting(false);
    }
  };


  const currentEndDateObj = currentEndDate ? new Date(currentEndDate) : null;
  const minDate = currentEndDateObj 
    ? new Date(currentEndDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Extend Booking</h2>
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

          {/* Current Booking Info */}
          {currentEndDateObj && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-300">
                <span className="text-blue-400 font-medium">Current end:</span>{' '}
                {currentEndDateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Date/Time Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                New End Date
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => {
                  setNewEndDate(e.target.value);
                  setHasUserSelectedDate(true);
                }}
                min={minDate}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                New End Time
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => {
                  setNewEndTime(e.target.value);
                  setHasUserSelectedDate(true);
                }}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Extension Info */}
          {isLoadingInfo ? (
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center py-1">
                <svg
                  className="animate-spin h-4 w-4 text-yellow-400"
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
                <span className="ml-2 text-xs text-yellow-400">Calculating...</span>
              </div>
            </div>
          ) : extensionInfo ? (
            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">
                  {extensionInfo.additionalDays !== undefined && `${extensionInfo.additionalDays} ${extensionInfo.additionalDays === 1 ? 'day' : 'days'}`}
                </span>
                <span className="font-semibold text-white">
                  {extensionInfo.additionalCost !== undefined && `SEK ${extensionInfo.additionalCost.toFixed(2)}`}
                </span>
              </div>
            </div>
          ) : null}

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-300">
              Extension will be processed automatically. If your box is needed by another customer, they will be reassigned to a different box.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="text-red-400 text-xs font-medium">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 border border-white/20 rounded-lg text-sm font-medium text-gray-200 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  isSubmitting || 
                  !!error || 
                  isLoadingInfo || 
                  !hasUserSelectedDate ||
                  !extensionInfo ||
                  extensionInfo.canExtend !== true ||
                  !extensionInfo.additionalDays ||
                  extensionInfo.additionalDays < 1 ||
                  !extensionInfo.additionalCost ||
                  extensionInfo.additionalCost <= 0 ||
                  !isExtensionValid()
                }
                className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-600 flex items-center justify-center gap-2"
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Continue to Payment</span>
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
