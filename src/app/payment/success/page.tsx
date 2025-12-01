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
      // Helper to create ISO datetime string with timezone
      const createISOString = (dateStr: string, timeStr: string): string => {
        if (!dateStr) return new Date().toISOString();
        
        // If date already has timezone info, use it directly
        if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) {
          return new Date(dateStr).toISOString();
        }
        
        // Combine date and time, then create a Date object in local timezone
        // This ensures the date represents the correct moment in user's timezone
        const localDateTime = `${dateStr}T${timeStr}:00`;
        const dateObj = new Date(localDateTime);
        
        // Return as ISO string (UTC) - the server will convert back to Swedish timezone
        return dateObj.toISOString();
      };

      // Use current date/time if start date/time is not set
      const actualStartDate = startDate || getCurrentDate();
      const actualStartTime = startTime || getCurrentTime();
      
      // Create ISO datetime strings with proper timezone handling
      let startDateTime = createISOString(actualStartDate, actualStartTime);
      
      // Default end time if not provided
      const defaultEndTime = endTime || '17:00';
      const endDateTime = createISOString(endDate, defaultEndTime);

      // Check if start date/time is in the past - if so, use current date/time
      const startDateObj = new Date(startDateTime);
      const now = new Date();
      
      if (startDateObj < now) {
        // Start time is in the past, use current date/time as ISO string
        startDateTime = new Date().toISOString();
      }

      console.log('Calling API with:', {
        startDate: startDateTime,
        endDate: endDateTime,
        accessName: 'Customer'
      });

      const response = await fetch('/api/igloo/generate-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDateTime,
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
    // Stripe redirects add payment_intent to URL, but we should also check for it
    // The payment_intent parameter comes from either:
    // 1. Stripe redirect (automatic): payment_intent=pi_xxx
    // 2. Manual redirect from payment page: payment_intent=pi_xxx
    const paymentIntentId = searchParams.get('payment_intent');

    const fetchBookingData = async () => {
      if (!paymentIntentId) {
        console.error('No payment_intent found in URL');
        setLoading(false);
        return;
      }

      console.log('Fetching booking data for payment intent:', paymentIntentId);

      // Securely fetch payment and booking details from server (no URL params)
      // Use cache: 'no-store' to prevent Next.js from caching and showing stale data
      try {
        const response = await fetch(`/api/payments/${paymentIntentId}`, {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment details');
        }

        const data = await response.json();
        
        console.log('📋 Payment data received:', {
          paymentIntentStatus: data.paymentIntent?.status,
          bookingExists: data.bookingExists,
          hasBooking: !!data.booking,
        });
        
        // CRITICAL: Verify payment actually succeeded before showing success page
        if (data.paymentIntent.status !== 'succeeded') {
          console.error('Payment not succeeded:', data.paymentIntent.status);
          setLoading(false);
          // Redirect to error page or show error
          return;
        }

        // Verify payment amount is valid
        if (!data.paymentIntent.amount || data.paymentIntent.amount <= 0) {
          console.error('Invalid payment amount:', data.paymentIntent.amount);
          setLoading(false);
          return;
        }
        
        // Set payment intent information
        setPaymentIntent({
          id: data.paymentIntent.id,
          status: data.paymentIntent.status,
        });

        // Create booking if payment succeeded and booking doesn't exist yet
        let bookingWasCreated = false;
        if (data.paymentIntent.status === 'succeeded' && !data.bookingExists) {
          console.log('🔄 Payment succeeded, creating booking for:', paymentIntentId);
          console.log('📊 Booking creation check:', {
            status: data.paymentIntent.status,
            bookingExists: data.bookingExists,
            willCreate: true,
          });
          
          try {
            const createBookingResponse = await fetch(`/api/payments/${paymentIntentId}/process-success`, {
              method: 'POST',
              cache: 'no-store',
            });
            
            if (createBookingResponse.ok) {
              const bookingData = await createBookingResponse.json();
              console.log('✅ Booking creation response:', {
                bookingId: bookingData.booking?.id,
                message: bookingData.message,
                success: bookingData.success,
              });
              
              // If booking was created or already exists, fetch updated payment data
              if (bookingData.success) {
                // Fetch updated payment data to get the newly created booking
                const updatedResponse = await fetch(`/api/payments/${paymentIntentId}`, {
                  cache: 'no-store',
                });
                if (updatedResponse.ok) {
                  const updatedData = await updatedResponse.json();
                  if (updatedData.bookingExists && updatedData.booking) {
                    console.log('✅ Booking found in database after creation');
                    data.booking = updatedData.booking;
                    data.bookingExists = true;
                    bookingWasCreated = true;
                    
                    // Update state immediately
                    const bookingDetails = {
                      standId: updatedData.booking.standId,
                      startDate: updatedData.booking.startDate,
                      endDate: updatedData.booking.endDate,
                      startTime: updatedData.booking.startTime || undefined,
                      endTime: updatedData.booking.endTime || undefined,
                    };
                    setBookingDetails(bookingDetails);
                    
                    // PIN is already generated during booking creation and stored in lock_pin
                    // Use it directly from the booking data
                    const pinValue = updatedData.booking.lockPin || updatedData.booking.lock_pin;
                    if (pinValue) {
                      setLockPin({
                        pin: String(pinValue),
                        pinCode: String(pinValue),
                      });
                      console.log('✅ Booking created with PIN:', pinValue);
                    } else {
                      console.warn('⚠️ Booking created but PIN not found in response');
                    }
                  } else {
                    console.warn('⚠️ Booking creation succeeded but booking not found in updated data');
                  }
                } else {
                  console.error('❌ Failed to fetch updated payment data after booking creation');
                }
              } else {
                console.warn('⚠️ Booking creation returned success=false:', bookingData);
              }
            } else {
              const errorData = await createBookingResponse.json().catch(() => ({}));
              console.error('❌ Failed to create booking - API error:', {
                status: createBookingResponse.status,
                statusText: createBookingResponse.statusText,
                error: errorData,
              });
              // Continue - webhook may still create it
            }
          } catch (bookingError) {
            console.error('❌ Error creating booking - exception:', {
              error: bookingError,
              message: bookingError instanceof Error ? bookingError.message : String(bookingError),
              stack: bookingError instanceof Error ? bookingError.stack : undefined,
            });
            // Continue - webhook may still create it
          }
        }

        // Wait a moment for webhook to process, then check if booking exists
        // Only poll if booking wasn't just created above
        // If booking doesn't exist after payment succeeded, webhook may still be processing
        if (data.paymentIntent.status === 'succeeded' && !data.bookingExists && !bookingWasCreated) {
          console.log('Payment succeeded, waiting for webhook to create booking...');
          // Poll for booking creation (webhook should create it)
          let attempts = 0;
          const maxAttempts = 5;
          const pollInterval = 1000; // 1 second
          
          const pollForBooking = async () => {
            if (attempts >= maxAttempts) {
              console.warn('Booking not created after webhook processing time');
              return;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            try {
              const pollResponse = await fetch(`/api/payments/${paymentIntentId}`, {
                cache: 'no-store',
              });
              if (pollResponse.ok) {
                const pollData = await pollResponse.json();
                if (pollData.bookingExists && pollData.booking) {
                  console.log('✅ Booking found after webhook processing');
                  data.booking = pollData.booking;
                  data.bookingExists = true;
                  // Trigger re-render with booking data
                  setBookingDetails({
                    standId: pollData.booking.standId,
                    startDate: pollData.booking.startDate,
                    endDate: pollData.booking.endDate,
                    startTime: pollData.booking.startTime || undefined,
                    endTime: pollData.booking.endTime || undefined,
                  });
                  
                  // Use PIN from booking data (already generated during booking creation)
                  const pinValue = pollData.booking.lockPin || pollData.booking.lock_pin;
                  if (pinValue) {
                    setLockPin({
                      pin: String(pinValue),
                      pinCode: String(pinValue),
                    });
                    console.log('✅ PIN found in booking:', pinValue);
                  }
                  return;
                }
              }
              // Continue polling if booking not found yet
              if (attempts < maxAttempts) {
                await pollForBooking();
              }
            } catch (pollError) {
              console.error('Error polling for booking:', pollError);
            }
          };
          
          // Start polling in background (don't block UI)
          pollForBooking().catch(console.error);
        }

        // Set booking details from server response (secure, not from URL)
        // Only if booking existed in DATABASE from initial fetch (not from metadata, not from our creation above)
        // IMPORTANT: data.booking can exist from metadata even when bookingExists is false
        // Only process if booking actually exists in database
        if (data.bookingExists && data.booking && !bookingWasCreated) {
          const booking = {
            standId: data.booking.standId,
            startDate: data.booking.startDate,
            endDate: data.booking.endDate,
            startTime: data.booking.startTime || undefined,
            endTime: data.booking.endTime || undefined,
          };
          setBookingDetails(booking);

          // PIN is already generated during booking creation and stored in lock_pin
          // If booking has lock_pin, use it directly; otherwise it should be in the booking data
          if (data.booking.lockPin || data.booking.lock_pin) {
            const pinValue = data.booking.lockPin || data.booking.lock_pin;
            setLockPin({
              pin: String(pinValue),
              pinCode: String(pinValue),
            });
            console.log('✅ Using PIN from existing booking:', pinValue);
          } else {
            console.warn('⚠️ PIN not found in booking data, but should have been generated during creation');
          }
        }
      } catch (error) {
        console.error('Error in fetchBookingData:', error);
        // Show error but don't expose sensitive data
        setPaymentIntent({
          id: paymentIntentId || '',
          status: 'unknown',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
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
