-- Verify BookingStatus enum values in database
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'BookingStatus'
ORDER BY e.enumsortorder;

-- Check if any bookings still have Confirmed status (should be 0)
SELECT COUNT(*) as confirmed_count
FROM public.bookings
WHERE status = 'Confirmed';

-- Check default value for bookings.status column
SELECT 
    column_name,
    column_default,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings' 
  AND column_name = 'status';

