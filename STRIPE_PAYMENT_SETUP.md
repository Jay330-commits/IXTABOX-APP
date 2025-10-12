# Stripe Bank Payment Integration

## 🎉 What's Been Created

I've created a complete Stripe payment system for your IXTAbox app that supports bank account payments and more. Here's what you now have:

### 📁 New Files Created

1. **`src/components/payments/StripeBankPayment.tsx`** - Main payment component
2. **`src/components/payments/PaymentButton.tsx`** - Simple payment button for integration
3. **`src/components/payments/PaymentExample.tsx`** - Example usage
4. **`src/app/api/create-payment-intent/route.ts`** - Server-side API for payment intents
5. **`src/app/payment/page.tsx`** - Payment page
6. **`src/app/payment/success/page.tsx`** - Success page
7. **`src/components/payments/README.md`** - Detailed documentation

### 📦 Dependencies Added

- `@stripe/stripe-js` - Stripe JavaScript SDK
- `@stripe/react-stripe-js` - React components for Stripe
- `stripe` - Server-side Stripe SDK

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file in your project root:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Get Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. Add them to your `.env.local` file

## 💳 Payment Methods Supported

- ✅ **Credit/Debit Cards** (Visa, Mastercard, Amex)
- ✅ **SEPA Direct Debit** (European bank transfers)
- ✅ **Klarna** (Buy now, pay later)

## 🎨 Features

- **Dark Theme** - Matches your app's design
- **Mobile Responsive** - Works on all devices
- **Secure** - PCI DSS compliant, no sensitive data on your servers
- **Error Handling** - Comprehensive error states
- **Loading States** - Smooth user experience
- **Billing Address** - Automatic collection

## 🔧 How to Use

### Option 1: Simple Payment Button
```tsx
import PaymentButton from '@/components/payments/PaymentButton';

<PaymentButton
  amount={299.99}
  currency="sek"
  standId="123"
  bookingId="456"
>
  Pay Now
</PaymentButton>
```

### Option 2: Full Payment Component
```tsx
import StripeBankPayment from '@/components/payments/StripeBankPayment';

// First create payment intent
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
  onSuccess={(paymentIntent) => console.log('Success!', paymentIntent)}
  onError={(error) => console.error('Failed:', error)}
/>
```

## 🧪 Testing

### Test Card Numbers
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test SEPA IBAN
Use any valid German IBAN: `DE89370400440532013000`

## 🔗 Integration Points

### In Your Booking Flow
1. User selects a stand and dates
2. Calculate total amount
3. Show `PaymentButton` with amount
4. User clicks → redirects to `/payment`
5. After payment → redirects to `/payment/success`

### Example Integration
```tsx
// In your booking component
const totalAmount = calculateBookingTotal(stand, dates, model);

<PaymentButton
  amount={totalAmount}
  currency="sek"
  standId={stand.id}
  bookingId={booking.id}
  className="w-full mt-4"
>
  Complete Booking - ${totalAmount.toFixed(2)}
</PaymentButton>
```

## 🛡️ Security Features

- All payment data handled by Stripe
- No sensitive information on your servers
- PCI DSS compliant
- 3D Secure authentication
- Fraud protection included

## 📱 Mobile Optimized

The payment forms are fully responsive and work great on mobile devices with:
- Touch-friendly inputs
- Optimized layouts
- Fast loading
- Native mobile payment methods

## 🎯 Next Steps

1. **Set up Stripe account** and get your API keys
2. **Add environment variables** to `.env.local`
3. **Test with test cards** to ensure everything works
4. **Integrate into your booking flow** using `PaymentButton`
5. **Go live** by switching to live Stripe keys

## 🆘 Need Help?

- Check the detailed README in `src/components/payments/README.md`
- Stripe documentation: https://stripe.com/docs
- Test the example component: `src/components/payments/PaymentExample.tsx`

Your payment system is now ready to accept bank account payments and more! 🎉
