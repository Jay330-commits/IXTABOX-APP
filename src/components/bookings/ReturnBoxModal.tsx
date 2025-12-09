"use client";

import { useState } from "react";

interface ReturnBoxModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  returnPhotos: {
    boxFrontTop: File | null;
    boxFrontBackTop: File | null;
    closedStandLock: File | null;
  };
  setReturnPhotos: (photos: {
    boxFrontTop: File | null;
    boxFrontBackTop: File | null;
    closedStandLock: File | null;
  }) => void;
  returnConfirmed: boolean;
  setReturnConfirmed: (confirmed: boolean) => void;
}

export default function ReturnBoxModal({
  bookingId,
  isOpen,
  onClose,
  onSuccess,
  returnPhotos,
  setReturnPhotos,
  returnConfirmed,
  setReturnConfirmed,
}: ReturnBoxModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!returnPhotos.boxFrontTop || !returnPhotos.boxFrontBackTop || !returnPhotos.closedStandLock) {
      setError("Please upload all three required photos");
      return;
    }

    if (!returnConfirmed) {
      setError("Please confirm that the box has been returned in good status");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const authToken = localStorage.getItem("auth-token");
      const formData = new FormData();
      formData.append("boxFrontTop", returnPhotos.boxFrontTop);
      formData.append("boxFrontBackTop", returnPhotos.boxFrontBackTop);
      formData.append("closedStandLock", returnPhotos.closedStandLock);
      formData.append("confirmedGoodStatus", "true");

      const headers: HeadersInit = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/bookings/${bookingId}/return`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to return box");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return box");
      console.error("Error returning box:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Return Box</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
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

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Return Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Open right stand and unlock with the igloo lock</li>
              <li>Demount box from car</li>
              <li>
                Place box correctly on stand - fixate with straps and leave the 4 digit padlocks in
                the box
              </li>
              <li>Clean the box if needed with hose or water</li>
              <li>Take 2 photos of the box front and back</li>
              <li>Close stand and lock the igloo lock</li>
              <li>Take confirmation photo of locked stand</li>
              <li>Confirm that you are finished by checking the checkbox</li>
            </ol>
          </div>

          {/* Photo Upload */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Box Front/Top <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setReturnPhotos({ ...returnPhotos, boxFrontTop: e.target.files?.[0] || null })
                }
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Box Front Back/Top <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setReturnPhotos({
                    ...returnPhotos,
                    boxFrontBackTop: e.target.files?.[0] || null,
                  })
                }
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Closed Stand with Lock <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setReturnPhotos({
                    ...returnPhotos,
                    closedStandLock: e.target.files?.[0] || null,
                  })
                }
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 file:cursor-pointer"
              />
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={returnConfirmed}
                onChange={(e) => setReturnConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-green-600 focus:ring-green-500 focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                I confirm that the box has been returned in good status
              </span>
            </label>
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
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 flex items-center justify-center gap-2"
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
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Confirm Return</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

