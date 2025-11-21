"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentIntent, StripeError } from '@stripe/stripe-js';
import StripeBankPayment from '@/components/payments/StripeBankPayment';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

function PaymentContent() {
  const searchParams = useSearchParams();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isProcessingSuccess, setIsProcessingSuccess] = useState(false);
  
  // Notification preferences
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [emailNotification, setEmailNotification] = useState(true);
  const [smsNotification, setSmsNotification] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Get booking details from URL params or state
  const amount = parseFloat(searchParams.get('amount') || '299.99');
  const currency = searchParams.get('currency') || 'sek';
  const standId = searchParams.get('standId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';
  const modelId = searchParams.get('modelId') || '';
  const bookingId = searchParams.get('bookingId') || '';

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency,
            metadata: {
              standId,
              modelId,
              startDate,
              endDate,
              startTime,
              endTime,
              bookingId,
              source: 'booking-payment',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, currency, standId, modelId, startDate, endDate, startTime, endTime, bookingId]);

  const handlePaymentSuccess = async (paymentIntent: PaymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    
    // Verify payment is actually succeeded before redirecting
    if (paymentIntent.status !== 'succeeded') {
      console.warn('Payment status is not succeeded:', paymentIntent.status);
      return;
    }

    // Validate customer email before proceeding
    if (!customerEmail || !customerEmail.includes('@')) {
      setError('Please provide a valid email address before completing payment.');
      setEmailError('Valid email required');
      return;
    }

    // Show processing overlay with smooth transition
    setIsProcessingSuccess(true);
    
    // Update payment intent with customer contact and notification preferences
    try {
      await fetch('/api/create-payment-intent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          metadata: {
            customerEmail,
            customerPhone,
            emailNotification: emailNotification.toString(),
            smsNotification: smsNotification.toString(),
          },
        }),
      });
    } catch (error) {
      console.error('Failed to update payment with contact info:', error);
    }
    
    // Small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Redirect to success page with booking details for unlock code generation
    const params = new URLSearchParams({
      payment_intent: paymentIntent.id,
      email: customerEmail,
    });
    
    if (standId) params.append('standId', standId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (startTime) params.append('startTime', startTime);
    if (endTime) params.append('endTime', endTime);
    
    window.location.href = `/payment/success?${params.toString()}`;
  };

  // Real-time email validation
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
    } else {
      setEmailError('');
    }
  };

  // Real-time phone validation
  const validatePhone = (phone: string) => {
    if (!phone) {
      setPhoneError('');
      return;
    }
    const phoneRegex = /^[+]?[\d\s-()]+$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 8) {
      setPhoneError('Please enter a valid phone number');
    } else {
      setPhoneError('');
    }
  };

  const handlePaymentError = (error: StripeError | null | undefined) => {
    console.error('Payment failed:', error);
    // Safely extract error message from StripeError
    const errorMessage = error?.message || error?.type || 'Payment failed. Please try again.';
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <GuestHeader />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-fadeIn">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/20 border-t-cyan-500 mx-auto mb-6"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-cyan-500/10 animate-pulse"></div>
            </div>
            <p className="text-lg text-gray-300 mb-2 animate-pulse">Setting up secure payment...</p>
            <div className="flex items-center justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <GuestHeader />
        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 mb-6">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Payment Setup Failed
            </h1>
            <p className="text-gray-300 mb-8">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      
      {/* Success Processing Overlay */}
      {isProcessingSuccess && (
        <div className="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
              <svg className="absolute inset-0 m-auto w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">Payment Successful!</h2>
            <p className="text-gray-300">Preparing your booking details...</p>
            <div className="flex items-center justify-center gap-1 mt-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}
      
      <main className="py-8 sm:py-16 animate-fadeIn">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-4 animate-slideDown">
              Complete Your Payment
            </h1>
            <p className="text-sm sm:text-base text-gray-300 animate-slideDown" style={{animationDelay: '100ms'}}>
              Secure payment powered by Stripe
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Payment Summary & Notifications */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="lg:sticky lg:top-6 space-y-4 sm:space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Booking Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 flex-shrink-0">Stand ID:</span>
                    <span className="text-white text-right font-medium">{standId || 'N/A'}</span>
                  </div>
                  {modelId && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-400 flex-shrink-0">Model:</span>
                      <span className="text-white text-right font-medium">{modelId}</span>
                    </div>
                  )}
                  {(startDate || endDate) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-gray-400 flex-shrink-0">Start:</span>
                        <span className="text-white text-right font-medium">
                          {startDate ? new Date(startDate).toLocaleDateString() : '—'}
                          {startTime && <span className="block text-xs text-gray-400 mt-0.5">{startTime}</span>}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-gray-400 flex-shrink-0">End:</span>
                        <span className="text-white text-right font-medium">
                          {endDate ? new Date(endDate).toLocaleDateString() : '—'}
                          {endTime && <span className="block text-xs text-gray-400 mt-0.5">{endTime}</span>}
                        </span>
                      </div>
                    </div>
                  )}
                  {bookingId && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-400 flex-shrink-0">Reference:</span>
                      <span className="text-white text-right font-mono text-xs">{bookingId}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">Total:</span>
                      <span className="text-cyan-400 text-lg sm:text-xl font-bold">{amount.toFixed(2)} {currency.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Notification Preferences */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Contact Information</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1.5 sm:mb-2">Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => {
                          setCustomerEmail(e.target.value);
                          validateEmail(e.target.value);
                        }}
                        onBlur={(e) => validateEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        className={`w-full px-3 py-2 text-sm rounded-md bg-gray-900 border text-gray-100 placeholder-gray-500 focus:ring-2 transition-all duration-200 ${
                          emailError 
                            ? 'border-red-500/50 focus:ring-red-500/60 focus:border-red-500' 
                            : customerEmail && !emailError
                            ? 'border-green-500/50 focus:ring-green-500/60 focus:border-green-500'
                            : 'border-white/10 focus:ring-cyan-500/60 focus:border-cyan-500'
                        }`}
                      />
                      {customerEmail && !emailError && (
                        <svg className="absolute right-3 top-2.5 w-5 h-5 text-green-400 animate-scaleIn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {emailError && (
                      <p className="text-red-400 text-xs mt-1 animate-slideDown">{emailError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1.5 sm:mb-2">Phone Number (optional)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          validatePhone(e.target.value);
                        }}
                        onBlur={(e) => validatePhone(e.target.value)}
                        placeholder="+46 70 123 4567"
                        className={`w-full px-3 py-2 text-sm rounded-md bg-gray-900 border text-gray-100 placeholder-gray-500 focus:ring-2 transition-all duration-200 ${
                          phoneError 
                            ? 'border-red-500/50 focus:ring-red-500/60 focus:border-red-500' 
                            : customerPhone && !phoneError
                            ? 'border-green-500/50 focus:ring-green-500/60 focus:border-green-500'
                            : 'border-white/10 focus:ring-cyan-500/60 focus:border-cyan-500'
                        }`}
                      />
                      {customerPhone && !phoneError && (
                        <svg className="absolute right-3 top-2.5 w-5 h-5 text-green-400 animate-scaleIn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {phoneError && (
                      <p className="text-red-400 text-xs mt-1 animate-slideDown">{phoneError}</p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3 sm:pt-4 mt-3 sm:mt-4">
                    <h4 className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3">Notification Preferences</h4>
                    <div className="space-y-2.5 sm:space-y-3">
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={emailNotification}
                          onChange={(e) => setEmailNotification(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-cyan-500 bg-gray-900 border-white/10 rounded focus:ring-cyan-500 focus:ring-offset-gray-900"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-white group-hover:text-cyan-400 transition-colors block">Email Confirmation</span>
                          <p className="text-xs text-gray-400 mt-0.5">Receive booking confirmation via email</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={smsNotification}
                          onChange={(e) => setSmsNotification(e.target.checked)}
                          disabled={!customerPhone}
                          className="mt-0.5 w-4 h-4 text-cyan-500 bg-gray-900 border-white/10 rounded focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-white group-hover:text-cyan-400 transition-colors block">SMS Notifications</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {customerPhone ? 'Receive booking reminders via SMS' : 'Add phone number to enable'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <svg className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-cyan-100">
                      <strong className="font-semibold">Important:</strong> Fill in your contact information to receive booking confirmation and updates.
                    </p>
                  </div>
                </div>
              </div>
              {clientSecret ? (
                <StripeBankPayment
                  amount={amount}
                  currency={currency}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white">
        <GuestHeader />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading payment page...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
