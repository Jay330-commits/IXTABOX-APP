"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentButtonProps {
  amount: number;
  currency?: string;
  standId?: string;
  bookingId?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function PaymentButton({ 
  amount, 
  currency = 'sek', 
  standId, 
  bookingId, 
  className = '',
  children 
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Create payment intent
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
            bookingId,
            source: 'booking-payment',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();
      
      // Navigate to payment page with the client secret
      const params = new URLSearchParams({
        amount: amount.toString(),
        currency,
        clientSecret,
        ...(standId && { standId }),
        ...(bookingId && { bookingId }),
      });
      
      router.push(`/payment?${params.toString()}`);
    } catch (error) {
      console.error('Payment setup failed:', error);
      alert('Failed to setup payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Processing...
        </>
      ) : (
        children || `Pay ${amount.toFixed(2)} ${currency.toUpperCase()}`
      )}
    </button>
  );
}
