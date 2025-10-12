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
  
  // Get booking details from URL params or state
  const amount = parseFloat(searchParams.get('amount') || '299.99');
  const currency = searchParams.get('currency') || 'sek';
  const standId = searchParams.get('standId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
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
  }, [amount, currency, standId, modelId, startDate, endDate, bookingId]);

  const handlePaymentSuccess = (paymentIntent: PaymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    // Redirect to success page or handle success
    window.location.href = `/payment/success?payment_intent=${paymentIntent.id}`;
  };

  const handlePaymentError = (error: StripeError) => {
    console.error('Payment failed:', error);
    setError(error.message || 'Payment failed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <GuestHeader />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Setting up secure payment...</p>
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
      
      <main className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-white mb-4">
              Complete Your Payment
            </h1>
            <p className="text-gray-300">
              Secure payment powered by Stripe
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-white mb-4">Booking Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stand ID:</span>
                    <span className="text-white">{standId || 'N/A'}</span>
                  </div>
                  {modelId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Model:</span>
                      <span className="text-white">{modelId}</span>
                    </div>
                  )}
                  {startDate && endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dates:</span>
                      <span className="text-white">
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Booking ID:</span>
                    <span className="text-white">{bookingId || 'N/A'}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-cyan-400">{amount.toFixed(2)} {currency.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="lg:col-span-2">
              {clientSecret && (
                <StripeBankPayment
                  amount={amount}
                  currency={currency}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
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
