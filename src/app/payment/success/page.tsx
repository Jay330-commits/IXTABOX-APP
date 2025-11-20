"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

interface PaymentIntentState {
  id: string;
  status: string;
}


interface BookingDetails {
  standId?: string;
  standName?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

interface LockPin {
  pin?: string;
  pinCode?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentState | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [lockPin, setLockPin] = useState<LockPin | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const generateLockPin = async (
    startDate: string,
    endDate: string,
    startTime?: string | null,
    endTime?: string | null
  ) => {
    console.log('generateLockPin called with:', { startDate, endDate, startTime, endTime });
    setPinLoading(true);
    setPinError(null);

    try {
      // Use current date/time if start date/time is not set
      const actualStartDate = startDate || getCurrentDate();
      const actualStartTime = startTime || getCurrentTime();
      
      // Combine date and time to create full datetime strings
      const startDateTime = `${actualStartDate}T${actualStartTime}:00`;
      const endDateTime = endTime
        ? `${endDate}T${endTime}:00`
        : `${endDate}T17:00:00`; // Default to 5 PM if no time provided

      // Check if start date/time is in the past - if so, use current date/time
      const startDateObj = new Date(startDateTime);
      const now = new Date();
      
      let finalStartDateTime = startDateTime;
      if (startDateObj < now) {
        // Start time is in the past, use current date/time
        const currentDate = getCurrentDate();
        const currentTime = getCurrentTime();
        finalStartDateTime = `${currentDate}T${currentTime}:00`;
      }

      console.log('Calling API with:', {
        startDate: finalStartDateTime,
        endDate: endDateTime,
        accessName: 'Customer'
      });

      const response = await fetch('/api/igloo/generate-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: finalStartDateTime,
          endDate: endDateTime,
          accessName: 'Customer'
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate lock PIN');
      }

      const pinData = await response.json();
      console.log('[Payment Success] PIN Response received:', pinData);
      console.log('[Payment Success] PIN Response keys:', Object.keys(pinData));
      console.log('[Payment Success] PIN value:', pinData.pin || pinData.pinCode || pinData.code || pinData.unlockCode || 'NOT FOUND');
      setLockPin(pinData);
    } catch (error) {
      console.error('Error generating lock PIN:', error);
      setPinError(error instanceof Error ? error.message : 'Failed to generate lock PIN');
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    const standId = searchParams.get('standId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const fetchBookingData = async () => {
      if (!paymentIntentId) {
        setLoading(false);
        return;
      }

      // Securely validate payment and fetch booking information
      try {
        const validationResponse = await fetch('/api/payment/validate-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for session
          body: JSON.stringify({
            paymentIntentId: paymentIntentId,
          }),
        });

        if (validationResponse.ok) {
          const data = await validationResponse.json();
          
          // Set payment intent information
          setPaymentIntent({
            id: data.paymentIntent.id,
            status: data.paymentIntent.status,
          });

          // Set booking details from validated data
          if (data.booking) {
            setBookingDetails({
              standId: data.booking.standId,
              standName: data.booking.standName,
              location: data.booking.location,
              startDate: data.booking.startDate,
              endDate: data.booking.endDate,
              startTime: startTime || undefined, // Time might not be in DB, use URL param if available
              endTime: endTime || undefined,
            });
          } else {
            // If booking not in DB yet, use metadata from payment intent
            const metadata = data.paymentIntent.metadata || {};
            setBookingDetails({
              standId: metadata.standId || standId || undefined,
              startDate: metadata.startDate || startDate || undefined,
              endDate: metadata.endDate || endDate || undefined,
              startTime: metadata.startTime || startTime || undefined,
              endTime: metadata.endTime || endTime || undefined,
            });
          }
        } else {
          // If validation fails, still set payment intent from URL but don't show booking details
          setPaymentIntent({
            id: paymentIntentId,
            status: 'succeeded',
          });
          
          // Use URL params as fallback
          setBookingDetails({
            standId: standId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
          });
        }

        // Always generate lock PIN - use booking dates if available, otherwise use defaults
        const currentBookingDetails = bookingDetails || {
          standId: standId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        };
        
        const bookingStartDate = currentBookingDetails.startDate || startDate || '';
        const bookingEndDate = currentBookingDetails.endDate || endDate;
        
        // If no endDate provided, default to tomorrow
        let finalEndDate = bookingEndDate;
        if (!finalEndDate) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          finalEndDate = tomorrow.toISOString().split('T')[0];
        }
        
        try {
          await generateLockPin(bookingStartDate, finalEndDate, currentBookingDetails.startTime || startTime, currentBookingDetails.endTime || endTime || '17:00');
        } catch (error) {
          console.error('[Payment Success] Error calling generateLockPin:', error);
        }
      } catch (error) {
        console.error('Error in fetchBookingData:', error);
        // Fallback to URL params
        setPaymentIntent({
          id: paymentIntentId,
          status: 'succeeded',
        });
        setBookingDetails({
          standId: standId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
            <svg
              className="h-8 w-8 text-green-400"
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
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Thank you for your payment. Your booking has been confirmed and you will receive a confirmation email shortly.
          </p>

          {/* Booking Summary */}
          {bookingDetails && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6 max-w-2xl mx-auto text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Booking Confirmation</h3>
              <div className="space-y-3 text-sm">
                {bookingDetails.standId && (
                  <div>
                    <span className="text-gray-400">Stand:</span>
                    <span className="text-white ml-2 font-medium">
                      {bookingDetails.standName || `Stand ${bookingDetails.standId.substring(0, 6).toUpperCase()}`}
                    </span>
                  </div>
                )}
                {bookingDetails.location && (
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white ml-2">{bookingDetails.location}</span>
                  </div>
                )}
                {bookingDetails.startDate && bookingDetails.endDate && (
                  <div>
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white ml-2">
                      {new Date(bookingDetails.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' – '}
                      {new Date(bookingDetails.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {bookingDetails.startTime && bookingDetails.endTime && (
                  <div>
                    <span className="text-gray-400">Time:</span>
                    <span className="text-white ml-2">
                      {bookingDetails.startTime} – {bookingDetails.endTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Lock PIN Section */}
          {paymentIntent && (lockPin || pinLoading || pinError) && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Lock Access PIN</h3>
              {pinLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mr-3"></div>
                  <span className="text-gray-300">Generating your lock PIN...</span>
                </div>
              ) : pinError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{pinError}</p>
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowDate = tomorrow.toISOString().split('T')[0];
                      generateLockPin('', tomorrowDate, null, '17:00');
                    }}
                    className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : lockPin ? (
                <div className="space-y-3">
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Your Lock PIN</p>
                        <p className="text-3xl font-bold text-cyan-400 font-mono tracking-wider">
                          {(lockPin.pin || lockPin.pinCode || lockPin.code || lockPin.unlockCode || 'N/A') as string}
                        </p>
                        {(() => {
                          const pinId = lockPin.id || lockPin.pinId || (lockPin as Record<string, unknown>).id;
                          return pinId ? (
                            <div className="mt-3 pt-3 border-t border-cyan-500/20">
                              <p className="text-xs text-gray-400 mb-1">PIN ID</p>
                              <p className="text-sm font-mono text-cyan-300">
                                {String(pinId)}
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="text-right">
                        <svg
                          className="h-12 w-12 text-cyan-400/50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                    <p className="text-yellow-200 text-xs">
                      <strong>Important:</strong> Save this PIN securely. You&apos;ll need it to access your stand during your booking period.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Payment Details */}
          {paymentIntent && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment ID:</span>
                  <span className="text-white font-mono text-xs">{paymentIntent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 capitalize">{paymentIntent.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mb-8 max-w-2xl mx-auto text-center">
            <p className="text-gray-300 mb-2">Need help?</p>
            <Link
              href="https://ixtarent.com/help"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              https://ixtarent.com/help
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/guest/bookings"
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]"
            >
              View My Bookings
            </Link>
            <Link
              href="/guest"
              className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-6 py-3 text-base font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading payment confirmation...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
