"use client";

import { useState, useEffect, useRef } from "react";

interface ReturnBoxModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  returnPhotos: {
    boxFrontView: File | null;
    boxBackView: File | null;
    closedStandLock: File | null;
  };
  setReturnPhotos: (photos: {
    boxFrontView: File | null;
    boxBackView: File | null;
    closedStandLock: File | null;
  }) => void;
  returnConfirmed: boolean;
  setReturnConfirmed: (confirmed: boolean) => void;
}

type TabType = "instructions" | "photos";

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
  const [activeTab, setActiveTab] = useState<TabType>("instructions");
  const [cameraActive, setCameraActive] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cleanup camera stream on unmount or when camera is closed
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Handle video element when camera becomes active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      
      const handleLoadedMetadata = () => {
        video.play().catch(err => {
          console.error("Error playing video:", err);
          setError("Unable to start camera preview");
        });
      };

      const handleError = () => {
        setError("Camera stream error. Please try again.");
        stopCamera();
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    }
  }, [cameraActive]);

  const startCamera = async (photoType: "boxFrontView" | "boxBackView" | "closedStandLock") => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      setCameraActive(photoType);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
      setCameraActive(null);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = (photoType: "boxFrontView" | "boxBackView" | "closedStandLock") => {
    if (!videoRef.current || videoRef.current.readyState !== 4) {
      setError("Camera is not ready. Please wait a moment and try again.");
      return;
    }

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    // Use actual video dimensions
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setError("Unable to capture photo. Please try again.");
      return;
    }

    // Flip the image back since we mirrored the video
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoType}.jpg`, { type: 'image/jpeg' });
        setReturnPhotos({ ...returnPhotos, [photoType]: file });
        stopCamera();
        setError(null); // Clear any previous errors
      } else {
        setError("Failed to capture photo. Please try again.");
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, photoType: "boxFrontView" | "boxBackView" | "closedStandLock") => {
    const file = e.target.files?.[0];
    if (file) {
      setReturnPhotos({ ...returnPhotos, [photoType]: file });
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!returnPhotos.boxFrontView || !returnPhotos.boxBackView || !returnPhotos.closedStandLock) {
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
      formData.append("boxFrontView", returnPhotos.boxFrontView);
      formData.append("boxBackView", returnPhotos.boxBackView);
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

  const renderPhotoInput = (photoType: "boxFrontView" | "boxBackView" | "closedStandLock", label: string) => {
    const isCameraActive = cameraActive === photoType;
    const hasPhoto = returnPhotos[photoType] !== null;

    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          {label} <span className="text-red-400">*</span>
        </label>
        
        {isCameraActive ? (
          <div className="space-y-2">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
              />
              {!videoRef.current?.readyState && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                  Loading camera...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => capturePhoto(photoType)}
                className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {hasPhoto && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-xs text-green-400">
                ✓ Photo selected
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => startCamera(photoType)}
                className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
              <label className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileInput(e, photoType)}
                  className="hidden"
                />
                Choose File
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Return Box</h2>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
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

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                stopCamera();
                setActiveTab("instructions");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "instructions"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => {
                stopCamera();
                setActiveTab("photos");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "photos"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Take Photos
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "instructions" && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3 text-sm">Return Instructions:</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
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
          )}

          {activeTab === "photos" && (
            <div className="space-y-4">
              {renderPhotoInput("boxFrontView", "Box Front View")}
              {renderPhotoInput("boxBackView", "Box Back View")}
              {renderPhotoInput("closedStandLock", "Closed Stand with Lock")}
            </div>
          )}
          </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 space-y-4">
          {/* Confirmation Checkbox */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={returnConfirmed}
                onChange={(e) => setReturnConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-600 focus:ring-green-500 focus:ring-2 cursor-pointer"
              />
              <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                I confirm that the box has been returned in good status
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-red-400 text-xs font-medium">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 border border-white/20 rounded-lg text-xs font-medium text-gray-200 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 border border-transparent rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 flex items-center justify-center gap-2"
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

