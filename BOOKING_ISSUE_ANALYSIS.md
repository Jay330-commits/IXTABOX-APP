# Booking Display Issue Analysis

## Problem
Bookings are not showing in the online version of the application.

## Root Cause Analysis

### Primary Issue: Payment `user_id` Not Set

The `/api/customer/bookings` route queries bookings by:
1. Finding payments with `user_id` matching the logged-in user
2. Finding bookings linked to those payments

**If payments don't have `user_id` set, no bookings will be found.**

### Potential Causes

#### 1. **Email Extraction Failure** (Most Likely)
- Location: `PaymentProcessingService.processPaymentSuccess()` lines 232-263
- Issue: If email extraction fails from Stripe payment intent, `user_id` cannot be set
- Symptoms: Payments exist but have `user_id = null`
- Check: Look for console logs: `"CRITICAL: No email available in payment intent"`

#### 2. **Webhook Processing Before User Linking**
- Location: `src/app/api/webhooks/stripe/route.ts`
- Issue: Webhook might process payment before user linking completes
- Symptoms: Payment created, booking created, but `user_id` not set on payment
- Check: Webhook logs for timing issues

#### 3. **Guest User Creation Failure**
- Location: `PaymentProcessingService.getOrCreateGuestUser()` 
- Issue: If guest user creation fails, `user_id` won't be set
- Symptoms: Error logs during payment processing
- Check: Database errors or validation failures

#### 4. **Authentication Context Missing in Webhook**
- Location: `src/app/api/webhooks/stripe/route.ts`
- Issue: Webhooks don't have authenticated user context
- Symptoms: `getCurrentUser()` returns null in webhook context
- Check: Webhook logs for "No authenticated user"

#### 5. **Empty Payment Array**
- Location: `src/app/api/customer/bookings/route.ts` line 33-40
- Issue: If `userPayments` is empty, bookings query returns empty array
- Symptoms: Console log shows "Found payments for user: 0"
- Check: Database query for payments with `user_id = null`

## Diagnostic Steps

### Step 1: Check Database
```sql
-- Check if payments exist but don't have user_id
SELECT id, charge_id, user_id, amount, completed_at 
FROM payments 
WHERE user_id IS NULL;

-- Check if bookings exist but payments don't have user_id
SELECT b.id, b.payment_id, p.user_id, p.charge_id
FROM bookings b
LEFT JOIN payments p ON b.payment_id = p.id
WHERE p.user_id IS NULL;
```

### Step 2: Check Logs
Look for these log messages:
- `"CRITICAL: No email available in payment intent"`
- `"Payment has no user_id and we could not determine it"`
- `"[Bookings API] Found payments for user: 0"`
- `"[Bookings API] Found bookings: 0"`

### Step 3: Verify Email Flow
1. Check if email is being passed to payment processing
2. Check if Stripe payment intent has email in metadata
3. Check if `receipt_email` is set on payment intent

## Solutions

### Solution 1: Fix Email Extraction (Recommended)
Ensure email is always available:
1. Always pass email from frontend to payment intent metadata
2. Set `receipt_email` on payment intent creation
3. Add fallback to use customer email from Stripe customer object

### Solution 2: Backfill Missing user_id
Create a migration script to link existing payments to users:
```typescript
// Script to backfill user_id on payments
const paymentsWithoutUserId = await prisma.payments.findMany({
  where: { user_id: null },
  include: { bookings: true }
});

for (const payment of paymentsWithoutUserId) {
  // Try to find user by email from Stripe
  // Or link to guest user if email exists
}
```

### Solution 3: Improve Query Logic
Modify `/api/customer/bookings` to also check bookings directly:
```typescript
// Alternative: Query bookings directly if user_id linking fails
const bookings = await prisma.bookings.findMany({
  where: {
    OR: [
      { payments: { user_id: user.id } },
      { payments: { charge_id: { in: stripeChargeIds } } }
    ]
  }
});
```

### Solution 4: Add Debugging Endpoint
Create `/api/debug/user-bookings` to diagnose:
- List all payments for user
- List all bookings for user
- Show user_id linking status

## Immediate Fix

The most likely issue is that payments are being created without `user_id`. Check:

1. **Payment creation logs**: Look for "Created payment record" without user_id
2. **Email extraction logs**: Look for "CRITICAL: No email available"
3. **Database state**: Query payments table for `user_id IS NULL`

If payments exist without `user_id`, you need to:
1. Backfill user_id on existing payments
2. Fix email extraction to ensure user_id is always set
3. Add validation to prevent payment creation without user_id

