-- Check for any database defaults or constraints that might reference "Confirmed"
SELECT 
    column_name,
    column_default,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings' 
  AND column_name = 'status';

-- Check the actual enum values in the database
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'BookingStatus'
ORDER BY e.enumsortorder;

