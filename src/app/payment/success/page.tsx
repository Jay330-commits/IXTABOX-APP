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

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');

    if (paymentIntentId) {
      // In a real app, you might want to fetch payment details from your backend
      setPaymentIntent({
        id: paymentIntentId,
        status: 'succeeded',
      });
    }
    setLoading(false);
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

          {paymentIntent && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment ID:</span>
                  <span className="text-white font-mono">{paymentIntent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 capitalize">{paymentIntent.status}</span>
                </div>
              </div>
            </div>
          )}

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
