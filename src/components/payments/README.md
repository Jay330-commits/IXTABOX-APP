# Stripe Bank Payment Component

This component provides a secure payment interface for bank account payments using Stripe.

## Setup

1. Install dependencies:
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

2. Add environment variables to your `.env.local` file:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

3. Get your Stripe keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## Usage

```tsx
import StripeBankPayment from '@/components/payments/StripeBankPayment';

// First, create a payment intent on your server
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 299.99,
    currency: 'sek',
    metadata: { standId: '123', bookingId: '456' }
  })
});

const { clientSecret } = await response.json();

// Then use the component
<StripeBankPayment
  amount={299.99}
  currency="sek"
  clientSecret={clientSecret}
  onSuccess={(paymentIntent) => console.log('Payment succeeded!', paymentIntent)}
  onError={(error) => console.error('Payment failed:', error)}
/>
```

## Features

- ✅ Card payments
- ✅ SEPA Direct Debit (European bank transfers)
- ✅ Klarna payments
- ✅ Billing address collection
- ✅ Dark theme optimized for the app
- ✅ Loading states and error handling
- ✅ Mobile responsive

## Payment Methods Supported

- **Cards**: Visa, Mastercard, American Express
- **Bank Transfers**: SEPA Direct Debit (EU)
- **Buy Now, Pay Later**: Klarna

## Security

- All payment data is handled securely by Stripe
- No sensitive payment information touches your servers
- PCI DSS compliant
- 3D Secure authentication when required

## Testing

Use Stripe's test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires authentication: 4000 0025 0000 3155

For SEPA Direct Debit testing, use any valid IBAN starting with DE.
