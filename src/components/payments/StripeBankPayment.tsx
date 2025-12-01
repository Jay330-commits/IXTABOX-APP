"use client";

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from '@stripe/react-stripe-js';
import { PaymentIntent, StripeError } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  onError?: (error: StripeError) => void;
  clientSecret: string;
}

function PaymentForm({ amount, currency = 'sek', onSuccess, onError, clientSecret }: PaymentFormProps) {
  // Extract payment intent ID from client secret (format: pi_xxx_secret_xxx)
  const paymentIntentId = clientSecret.split('_secret_')[0];
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    if (!clientSecret) {
      return;
    }

    // Only check payment status if we're returning from Stripe redirect
    // Check for payment_intent and payment_intent_client_secret in URL
    const urlParams = new URLSearchParams(window.location.search);
    const isReturningFromStripe = urlParams.has('payment_intent') && urlParams.has('payment_intent_client_secret');

    if (!isReturningFromStripe) {
      // User just landed on payment page, don't auto-redirect
      return;
    }

    // User is returning from Stripe redirect, check the payment status
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          onSuccess?.(paymentIntent);
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, clientSecret, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // Add smooth scroll to top for better mobile UX
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?payment_intent=${paymentIntentId}`,
      },
    });

    // Only handle errors if they exist (payment success returns no error)
    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'An unexpected error occurred.');
        onError?.(error);
      } else {
        setMessage('An unexpected error occurred.');
        onError?.(error);
      }
      
      // Smooth scroll to error message
      setTimeout(() => {
        const errorElement = document.getElementById('payment-message');
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 transition-all duration-300 hover:border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">1</div>
          Payment Information
        </h3>
        <PaymentElement 
          id="payment-element"
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 transition-all duration-300 hover:border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">2</div>
          Billing Address
        </h3>
        <AddressElement 
          options={{
            mode: 'billing',
            allowedCountries: ['SE', 'NO', 'DK', 'FI'],
          }}
        />
      </div>

      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:shadow-[0_0_32px_rgba(34,211,238,0.6)] transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
      >
        <span id="button-text">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              <span className="animate-pulse">Processing payment...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pay {amount.toFixed(2)} {currency.toUpperCase()}
            </span>
          )}
        </span>
      </button>

      {message && (
        <div 
          id="payment-message" 
          className={`p-4 rounded-lg animate-slideDown ${
            message.includes('succeeded') 
              ? 'bg-green-500/20 border border-green-500/50 text-green-200' 
              : 'bg-red-500/20 border border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.includes('succeeded') ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        </div>
      )}
    </form>
  );
}

interface StripeBankPaymentProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  onError?: (error: StripeError) => void;
  clientSecret: string;
}

export default function StripeBankPayment({ 
  amount, 
  currency = 'sek', 
  onSuccess, 
  onError, 
  clientSecret 
}: StripeBankPaymentProps) {
  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#06b6d4',
      colorBackground: '#1f2937',
      colorText: '#ffffff',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
      },
      '.Input:focus': {
        border: '1px solid #06b6d4',
        boxShadow: '0 0 0 1px #06b6d4',
      },
      '.Label': {
        color: '#ffffff',
      },
      '.Tab': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
        minHeight: '44px',
        fontSize: '14px',
      },
      '.Tab:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
      },
      '.Tab--selected': {
        backgroundColor: '#06b6d4',
        border: '1px solid #06b6d4',
      },
      // Fix Klarna card size
      '.PaymentMethodIcon': {
        height: '24px',
        width: 'auto',
        maxWidth: '40px',
      },
      '.TabIcon': {
        height: '20px',
        width: 'auto',
        maxWidth: '32px',
      },
      // Ensure consistent card sizes
      '.Tab--selected .TabIcon': {
        height: '20px',
        width: 'auto',
        maxWidth: '32px',
      },
      // Additional fixes for payment method icons
      '.Tab img': {
        height: '20px !important',
        width: 'auto !important',
        maxWidth: '32px !important',
        objectFit: 'contain !important',
      },
      '.Tab svg': {
        height: '20px !important',
        width: 'auto !important',
        maxWidth: '32px !important',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="w-full">
      <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Secure Payment</h2>
          <p className="text-gray-300">
            Complete your payment securely with Stripe
          </p>
        </div>

        <Elements options={options} stripe={stripePromise}>
          <PaymentForm 
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onError={onError}
            clientSecret={clientSecret}
          />
        </Elements>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Your payment information is encrypted and secure
          </p>
          <div className="flex justify-center items-center mt-2 space-x-4">
            <Image 
              src="https://js.stripe.com/v3/fingerprinted/img/stripe-logo.svg" 
              alt="Stripe" 
              width={72}
              height={24}
              className="h-6 opacity-60"
            />
            <span className="text-xs text-gray-500">Powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
