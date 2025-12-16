# Schema Fixes Needed

## Critical Issues Found:

1. **bookings.user_id doesn't exist** - Users are accessed via `bookings.payments.user_id`
2. **boxStatus enum values** are: `Active`, `Inactive`, `Upcoming` (NOT `rented`, `in_use`, `maintenance`, `available`)
3. **BookingStatus enum values** are: `Pending`, `Active`, `Completed`, `Cancelled`, `Confirmed`, `Upcoming`
4. **BoxModel enum** is: `Classic`, `Pro` (NOT a string)
5. **ContractStatus enum** is: `Active`, `Expired`, `Terminated`
6. **PaymentStatus enum** is: `Pending`, `Processing`, `Completed`, `Failed`, `Refunded`

## Files That Need Fixing:

1. DashboardStatisticsService.ts - Fix box status checks, user access via payments
2. BoxInventoryService.ts - Fix boxStatus enum values
3. DistributorBookingService.ts - Fix user access via payments, BookingStatus enum
4. RentalStatisticsService.ts - Fix BookingStatus enum, user access
5. All services using box status checks

## Pattern for Getting User from Booking:

```typescript
// WRONG:
booking.users?.email

// CORRECT:
booking.payments?.users?.email
```

## Pattern for Box Status:

```typescript
// WRONG:
box.status === 'rented' || box.status === 'in_use'

// CORRECT:
box.status === 'Active' // Active means in use
box.status === 'Inactive' // Available/not in use
box.status === 'Upcoming' // Scheduled
```

